import { Router } from 'express';
import { db } from '../db/database.js';
import type { Product } from '../types/index.js';

const router = Router();

// GET /api/products - List all products
router.get('/', (req, res) => {
  const products = db.prepare('SELECT * FROM products').all() as Product[];
  res.json(products);
});

// GET /api/products/:id - Get single product
router.get('/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as Product | undefined;
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  res.json(product);
});

export default router;
