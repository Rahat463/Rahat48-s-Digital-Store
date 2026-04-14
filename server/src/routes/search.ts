import { Router } from 'express';
import type { Request, Response } from 'express';
import { searchProducts } from '../services/embeddingService.js';

const router = Router();

// GET /api/search?q=...&limit=5
router.get('/', async (req: Request, res: Response) => {
  const query = req.query.q as string | undefined;
  if (!query || query.trim().length === 0) {
    res.status(400).json({ error: 'Query parameter "q" is required' });
    return;
  }

  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 5, 1), 20);

  const results = await searchProducts(query.trim(), limit);
  res.json({ query: query.trim(), results });
});

export default router;
