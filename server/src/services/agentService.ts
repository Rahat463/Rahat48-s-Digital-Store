import Anthropic from '@anthropic-ai/sdk';
import config from '../config/index.js';
import { toolDefinitions, executeTool } from './agentTools.js';
import { getHistory, addMessage } from './conversationStore.js';

const anthropic = config.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: config.ANTHROPIC_API_KEY })
  : null;

const SYSTEM_PROMPT = `You are a helpful AI shopping assistant for a digital products store that sells programming courses, books, and learning materials. The store accepts payments via bKash (a mobile banking service in Bangladesh).

Your capabilities:
- Search products by topic, skill level, or description
- Show product details and reviews
- Check order status and order history
- Provide personalized recommendations
- Process refunds (ONLY after explicit user confirmation)

Guidelines:
- Be friendly, concise, and helpful
- When showing products, include name and price (in BDT)
- For refunds, ALWAYS ask the user to confirm before processing. Say something like "I'll process a refund for Order #X (amount BDT). Should I go ahead?"
- If the user is not logged in, let them know they need to log in for order-related features
- Don't make up product information — use the search and detail tools
- If you're unsure about something, say so honestly`;

const MAX_TOOL_ROUNDS = 5;

interface StreamChunk {
  type: 'text' | 'tool_use' | 'tool_result' | 'done' | 'error';
  data: string;
}

/**
 * Run the agent loop for a user message.
 * Yields streaming chunks: text tokens, tool usage info, and completion.
 */
async function* runAgent(
  userMessage: string,
  userId?: number
): AsyncGenerator<StreamChunk> {
  if (!anthropic) {
    yield { type: 'error', data: 'ANTHROPIC_API_KEY is not configured' };
    return;
  }

  // Add user message to conversation history
  if (userId) {
    addMessage(userId, { role: 'user', content: userMessage });
  }

  const messages: Anthropic.MessageParam[] = userId
    ? [...getHistory(userId)]
    : [{ role: 'user', content: userMessage }];

  let rounds = 0;

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds++;

    // Call Claude with tools
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: toolDefinitions,
      messages,
    });

    // Process response content blocks
    const assistantContent: Anthropic.ContentBlockParam[] = [];
    let hasToolUse = false;

    for (const block of response.content) {
      if (block.type === 'text') {
        assistantContent.push({ type: 'text', text: block.text });
        // Stream text to client
        yield { type: 'text', data: block.text };
      } else if (block.type === 'tool_use') {
        hasToolUse = true;
        assistantContent.push({
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        });

        // Notify client which tool is being called
        yield {
          type: 'tool_use',
          data: JSON.stringify({ tool: block.name, input: block.input }),
        };

        // Execute the tool
        const result = await executeTool(
          block.name,
          block.input as Record<string, unknown>,
          userId
        );

        // Add assistant message with tool_use and tool result to messages
        messages.push({ role: 'assistant', content: assistantContent.splice(0) });
        messages.push({
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          }],
        });

        yield {
          type: 'tool_result',
          data: JSON.stringify({ tool: block.name, result: JSON.parse(result) }),
        };
      }
    }

    // If there were no tool calls, we're done
    if (!hasToolUse) {
      // Save the final assistant message
      if (userId && assistantContent.length > 0) {
        const textContent = assistantContent
          .filter((b): b is Anthropic.TextBlockParam => b.type === 'text')
          .map(b => b.text)
          .join('');
        if (textContent) {
          addMessage(userId, { role: 'assistant', content: textContent });
        }
      }
      break;
    }

    // If there were tool calls, the loop continues to get Claude's response
    // after seeing the tool results
  }

  yield { type: 'done', data: '' };
}

export { runAgent };
export type { StreamChunk };
