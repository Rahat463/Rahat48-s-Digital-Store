import { Router } from 'express';
import type { Request, Response } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { db } from '../db/database.js';
import { searchProducts } from '../services/embeddingService.js';
import type { Product } from '../types/index.js';

const router = Router();

// GET /api/recommendations
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  const userId = req.user?.id;
  let recommendations;

  if (userId) {
    // Content-based: find products similar to what the user has purchased
    const purchasedProducts = db.prepare(`
      SELECT DISTINCT p.name, p.description
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      WHERE o.user_id = ? AND o.status IN ('paid', 'completed')
    `).all(userId) as Pick<Product, 'name' | 'description'>[];

    if (purchasedProducts.length > 0) {
      // Build a query from purchase history
      const historyText = purchasedProducts
        .map(p => `${p.name} ${p.description || ''}`)
        .join('. ');
      recommendations = await searchProducts(historyText, 6);

      // Filter out already-purchased products
      const purchasedNames = new Set(purchasedProducts.map(p => p.name));
      recommendations = recommendations.filter(r => !purchasedNames.has(r.name));
    }
  }

  // Cold-start fallback: highest-rated products
  if (!recommendations || recommendations.length === 0) {
    const topRated = db.prepare(`
      SELECT p.*, COALESCE(AVG(r.rating), 0) as avg_rating, COUNT(r.id) as review_count
      FROM products p
      LEFT JOIN reviews r ON p.id = r.product_id
      GROUP BY p.id
      ORDER BY avg_rating DESC, review_count DESC
      LIMIT 6
    `).all() as (Product & { avg_rating: number; review_count: number })[];

    recommendations = topRated.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      image_url: p.image_url || '',
      document: p.description || '',
      distance: 0,
      avg_rating: p.avg_rating,
      review_count: p.review_count,
    }));
  }

  res.json({
    personalized: !!userId,
    recommendations: recommendations.slice(0, 4),
  });
});

export default router;
