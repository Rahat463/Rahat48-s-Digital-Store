import { Router } from 'express';
import type { Request, Response } from 'express';
import { askProductQuestion } from '../services/ragService.js';

const router = Router();

// POST /api/products/ask
// Body: { question: string }
// Response: SSE stream with sources, text chunks, and done event
router.post('/', async (req: Request, res: Response) => {
  const { question } = req.body as { question?: string };

  if (!question || question.trim().length === 0) {
    res.status(400).json({ error: 'Question is required' });
    return;
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    for await (const chunk of askProductQuestion(question.trim())) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.write(`data: ${JSON.stringify({ type: 'error', data: message })}\n\n`);
  }

  res.end();
});

export default router;
