import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/database.js';
import { hashPassword, comparePassword, signToken } from '../services/authService.js';
import { authenticate } from '../middleware/auth.js';
import { RegisterSchema, LoginSchema, type RegisterInput, type LoginInput } from '../schemas/auth.js';
import { validate } from '../middleware/validate.js';
import type { User } from '../types/index.js';

const router = Router();

// POST /api/auth/register
router.post('/register', validate(RegisterSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body as RegisterInput;

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const password_hash = await hashPassword(password);

    const result = db.prepare(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
    ).run(email, password_hash, name);

    const token = signToken({
      id: Number(result.lastInsertRowid),
      email,
      role: 'customer',
    });

    res.status(201).json({
      token,
      user: {
        id: Number(result.lastInsertRowid),
        email,
        name,
        role: 'customer',
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', validate(LoginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body as LoginInput;

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req: Request, res: Response) => {
  const user = db.prepare(
    'SELECT id, email, name, role, created_at FROM users WHERE id = ?'
  ).get(req.user!.id) as Omit<User, 'password_hash'> | undefined;

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json(user);
});

export default router;
