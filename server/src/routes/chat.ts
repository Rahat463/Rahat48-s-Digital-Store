import { Router } from 'express';
import type { Request, Response } from 'express';
import { runAgent } from '../services/agentService.js';
import { getHistory, clearHistory } from '../services/conversationStore.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/chat — streamed SSE response
router.post('/', optionalAuth, async (req: Request, res: Response) => {
  const { message } = req.body as { message?: string };

  if (!message || message.trim().length === 0) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  // User ID is optional — unauthenticated users can still chat
  // but won't have access to order-related features
  const userId = req.user?.id;

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    for await (const chunk of runAgent(message.trim(), userId)) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    res.write(`data: ${JSON.stringify({ type: 'error', data: errorMsg })}\n\n`);
  }

  res.end();
});

// GET /api/chat/history — get conversation history (requires auth)
router.get('/history', authenticate, (req: Request, res: Response) => {
  const history = getHistory(req.user!.id);
  res.json({ messages: history });
});

// DELETE /api/chat/history — clear conversation history (requires auth)
router.delete('/history', authenticate, (req: Request, res: Response) => {
  clearHistory(req.user!.id);
  res.json({ message: 'Conversation history cleared' });
});

export default router;
