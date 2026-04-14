import Anthropic from '@anthropic-ai/sdk';
import config from '../config/index.js';
import { searchProducts } from './embeddingService.js';

const anthropic = config.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: config.ANTHROPIC_API_KEY })
  : null;

const SYSTEM_PROMPT = `You are a helpful shopping assistant for a digital products store that sells programming courses, books, and learning materials.

Your job is to answer customer questions about products using ONLY the product information provided in the context below. Do not make up products or details that aren't in the context.

Guidelines:
- Be concise and helpful
- If asked about a product not in the context, say you don't have information about it
- Include prices in BDT when relevant
- If the question is unrelated to the store's products, politely redirect to how you can help with product questions
- When comparing products, highlight the key differences`;

interface RAGSource {
  id: number;
  name: string;
  price: number;
  relevance: number;
}

/**
 * Ask a question about products using RAG.
 * Returns a readable stream for SSE.
 */
async function* askProductQuestion(question: string): AsyncGenerator<{
  type: 'sources' | 'text' | 'done';
  data: string;
}> {
  if (!anthropic) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  // Step 1: Retrieve relevant products from vector DB
  const retrieved = await searchProducts(question, 3);

  // Yield sources first so the frontend can show what docs were used
  const sources: RAGSource[] = retrieved.map(r => ({
    id: r.id,
    name: r.name,
    price: r.price,
    relevance: Math.round((1 - r.distance / 2) * 100),
  }));
  yield { type: 'sources', data: JSON.stringify(sources) };

  // Step 2: Build context from retrieved documents
  const context = retrieved
    .map((r, i) => `[Product ${i + 1}] ${r.document}`)
    .join('\n\n');

  // Step 3: Call Claude with retrieved context
  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: `${SYSTEM_PROMPT}\n\n--- PRODUCT CONTEXT ---\n${context}\n--- END CONTEXT ---`,
    messages: [{ role: 'user', content: question }],
  });

  // Step 4: Stream response tokens
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield { type: 'text', data: event.delta.text };
    }
  }

  yield { type: 'done', data: '' };
}

export { askProductQuestion };
export type { RAGSource };
