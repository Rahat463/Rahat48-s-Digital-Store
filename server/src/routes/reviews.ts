import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/database.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { CreateReviewSchema, UpdateReviewSchema, type CreateReviewInput, type UpdateReviewInput } from '../schemas/review.js';
import type { Review, ReviewWithUser } from '../types/index.js';
import { upsertProduct } from '../services/embeddingService.js';

const router = Router({ mergeParams: true });

// GET /api/products/:productId/reviews
router.get('/', (req: Request, res: Response) => {
  const reviews = db.prepare(`
    SELECT r.*, u.name as user_name, u.email as user_email
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.product_id = ?
    ORDER BY r.created_at DESC
  `).all(req.params.productId) as ReviewWithUser[];

  const stats = db.prepare(`
    SELECT
      COUNT(*) as count,
      AVG(rating) as average_rating
    FROM reviews WHERE product_id = ?
  `).get(req.params.productId) as { count: number; average_rating: number | null };

  res.json({
    reviews,
    stats: {
      count: stats.count,
      averageRating: stats.average_rating ? Math.round(stats.average_rating * 10) / 10 : null,
    },
  });
});

// POST /api/products/:productId/reviews
router.post('/', authenticate, validate(CreateReviewSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rating, title, body } = req.body as CreateReviewInput;
    const productId = parseInt(req.params.productId as string);
    const userId = req.user!.id;

    // Check product exists
    const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    // Check for existing review
    const existing = db.prepare(
      'SELECT id FROM reviews WHERE product_id = ? AND user_id = ?'
    ).get(productId, userId);
    if (existing) {
      res.status(409).json({ error: 'You have already reviewed this product' });
      return;
    }

    const result = db.prepare(
      'INSERT INTO reviews (product_id, user_id, rating, title, body) VALUES (?, ?, ?, ?, ?)'
    ).run(productId, userId, rating, title || null, body);

    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(result.lastInsertRowid) as Review;

    // Re-embed product with new review context
    upsertProduct(productId).catch(() => {});

    res.status(201).json(review);
  } catch (err) {
    next(err);
  }
});

// PUT /api/reviews/:id
router.put('/:id', authenticate, validate(UpdateReviewSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id) as Review | undefined;

    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    if (review.user_id !== req.user!.id) {
      res.status(403).json({ error: 'You can only edit your own reviews' });
      return;
    }

    const updates = req.body as UpdateReviewInput;
    db.prepare(`
      UPDATE reviews SET
        rating = COALESCE(?, rating),
        title = COALESCE(?, title),
        body = COALESCE(?, body)
      WHERE id = ?
    `).run(updates.rating ?? null, updates.title ?? null, updates.body ?? null, req.params.id);

    const updated = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id) as Review;

    // Re-embed product with updated review
    upsertProduct(review.product_id).catch(() => {});

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/reviews/:id
router.delete('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id) as Review | undefined;

    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    if (review.user_id !== req.user!.id) {
      res.status(403).json({ error: 'You can only delete your own reviews' });
      return;
    }

    db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);

    // Re-embed product without deleted review
    upsertProduct(review.product_id).catch(() => {});

    res.json({ message: 'Review deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
