const express = require('express');
const { db } = require('../db/database');

const router = express.Router();

// GET /api/orders - List all orders with payment info
router.get('/', (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, p.bkash_payment_id, p.bkash_trx_id, p.status as payment_status
    FROM orders o
    LEFT JOIN payments p ON o.id = p.order_id
    ORDER BY o.created_at DESC
  `).all();
  res.json(orders);
});

// GET /api/orders/:id - Get order details with items
router.get('/:id', (req, res) => {
  const order = db.prepare(`
    SELECT o.*, p.bkash_payment_id, p.bkash_trx_id, p.status as payment_status
    FROM orders o
    LEFT JOIN payments p ON o.id = p.order_id
    WHERE o.id = ?
  `).get(req.params.id);

  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const items = db.prepare(`
    SELECT oi.*, pr.name as product_name
    FROM order_items oi
    JOIN products pr ON oi.product_id = pr.id
    WHERE oi.order_id = ?
  `).all(req.params.id);

  res.json({ ...order, items });
});

module.exports = router;
