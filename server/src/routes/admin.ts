import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import config from '../config/index.js';
import { db } from '../db/database.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { upsertProduct } from '../services/embeddingService.js';
import type { Product } from '../types/index.js';
import { z } from 'zod';

const router = Router();

const anthropic = config.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: config.ANTHROPIC_API_KEY })
  : null;

const CreateProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  price: z.number().positive(),
  image_url: z.string().optional(),
});

const GenerateDescriptionSchema = z.object({
  title: z.string().min(1),
  features: z.array(z.string()).min(1),
});

// POST /api/admin/products — create a new product
router.post(
  '/products',
  authenticate,
  requireAdmin,
  validate(CreateProductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, description, price, image_url } = req.body;

      const result = db.prepare(
        'INSERT INTO products (name, description, price, image_url) VALUES (?, ?, ?, ?)'
      ).run(name, description || null, price, image_url || null);

      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid) as Product;

      // Index the new product in ChromaDB
      upsertProduct(product.id).catch(() => {});

      res.status(201).json(product);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/admin/products/:id/generate-description
router.post(
  '/products/:id/generate-description',
  authenticate,
  requireAdmin,
  validate(GenerateDescriptionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!anthropic) {
        res.status(503).json({ error: 'ANTHROPIC_API_KEY is not configured' });
        return;
      }

      const productId = parseInt(req.params.id as string);
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as Product | undefined;
      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      const { title, features } = req.body;
      const featureList = features.map((f: string) => `- ${f}`).join('\n');

      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        system: 'You are a product copywriter for a digital learning store. Write compelling, concise product descriptions that highlight value and appeal to learners. Keep it under 3 sentences.',
        messages: [{
          role: 'user',
          content: `Write a product description for:\n\nTitle: ${title}\n\nKey Features:\n${featureList}`,
        }],
      });

      const description = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('');

      // Update the product description
      db.prepare('UPDATE products SET description = ? WHERE id = ?').run(description, productId);

      // Re-embed with new description
      upsertProduct(productId).catch(() => {});

      res.json({ description });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
