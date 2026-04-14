import type Anthropic from '@anthropic-ai/sdk';

type Message = Anthropic.MessageParam;

const MAX_MESSAGES = 20;

// In-memory per-user conversation history
const conversations = new Map<number, Message[]>();

function getHistory(userId: number): Message[] {
  return conversations.get(userId) ?? [];
}

function addMessage(userId: number, message: Message): void {
  const history = conversations.get(userId) ?? [];
  history.push(message);

  // Sliding window: keep the most recent messages
  if (history.length > MAX_MESSAGES) {
    // Always keep pairs (user + assistant) so we don't orphan messages
    const excess = history.length - MAX_MESSAGES;
    history.splice(0, excess % 2 === 0 ? excess : excess + 1);
  }

  conversations.set(userId, history);
}

function clearHistory(userId: number): void {
  conversations.delete(userId);
}

export { getHistory, addMessage, clearHistory };
