import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../db/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /api/analytics/overview — aggregated store metrics
router.get('/overview', authenticate, requireAdmin, (req: Request, res: Response) => {
  const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
  const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number };
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  const totalRevenue = db.prepare(
    "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status IN ('paid', 'completed')"
  ).get() as { total: number };

  const ordersByStatus = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM orders GROUP BY status
  `).all() as { status: string; count: number }[];

  const topProducts = db.prepare(`
    SELECT p.name, COUNT(oi.id) as order_count, SUM(oi.price * oi.quantity) as revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status IN ('paid', 'completed')
    GROUP BY p.id
    ORDER BY revenue DESC
    LIMIT 5
  `).all() as { name: string; order_count: number; revenue: number }[];

  const recentOrders = db.prepare(`
    SELECT o.id, o.customer_name, o.total_amount, o.status, o.created_at,
           p.status as payment_status
    FROM orders o
    LEFT JOIN payments p ON o.id = p.order_id
    ORDER BY o.created_at DESC
    LIMIT 10
  `).all();

  const reviewStats = db.prepare(`
    SELECT
      COUNT(*) as total_reviews,
      AVG(rating) as avg_rating,
      SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive_count,
      SUM(CASE WHEN sentiment = 'neutral' THEN 1 ELSE 0 END) as neutral_count,
      SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative_count
    FROM reviews
  `).get() as {
    total_reviews: number;
    avg_rating: number | null;
    positive_count: number;
    neutral_count: number;
    negative_count: number;
  };

  res.json({
    summary: {
      totalProducts: totalProducts.count,
      totalOrders: totalOrders.count,
      totalUsers: totalUsers.count,
      totalRevenue: totalRevenue.total,
    },
    ordersByStatus,
    topProducts,
    recentOrders,
    reviewStats: {
      totalReviews: reviewStats.total_reviews,
      avgRating: reviewStats.avg_rating ? Math.round(reviewStats.avg_rating * 10) / 10 : null,
      sentimentBreakdown: {
        positive: reviewStats.positive_count,
        neutral: reviewStats.neutral_count,
        negative: reviewStats.negative_count,
      },
    },
  });
});

export default router;
