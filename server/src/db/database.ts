import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db: DatabaseType = new Database(path.join(__dirname, '../../store.db'));

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDB(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      image_url TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      price REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      bkash_payment_id TEXT,
      bkash_trx_id TEXT,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      title TEXT,
      body TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(product_id, user_id)
    );
  `);

  // Add user_id column to orders if it doesn't exist
  const orderColumns = db.prepare("PRAGMA table_info(orders)").all() as { name: string }[];
  if (!orderColumns.some(col => col.name === 'user_id')) {
    db.exec('ALTER TABLE orders ADD COLUMN user_id INTEGER REFERENCES users(id)');
  }

  // Seed products if table is empty
  const count = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
  if (count.count === 0) {
    const insert = db.prepare(
      'INSERT INTO products (name, description, price, image_url) VALUES (?, ?, ?, ?)'
    );

    const products: [string, string, number, string][] = [
      ['JavaScript Mastery Course', 'Complete JS course from basics to advanced. Includes ES6+, async/await, and more.', 499, 'https://placehold.co/300x200/E91E63/white?text=JS+Course'],
      ['React Developer Handbook', 'In-depth guide to React, hooks, state management, and best practices.', 349, 'https://placehold.co/300x200/2196F3/white?text=React+Book'],
      ['Node.js Backend Bootcamp', 'Build production-ready APIs with Express, databases, and authentication.', 599, 'https://placehold.co/300x200/4CAF50/white?text=Node+Bootcamp'],
      ['Python for Data Science', 'Learn Python, pandas, NumPy, and data visualization from scratch.', 449, 'https://placehold.co/300x200/FF9800/white?text=Python+DS'],
      ['System Design Interview Prep', 'Master system design concepts for technical interviews at top companies.', 299, 'https://placehold.co/300x200/9C27B0/white?text=System+Design'],
      ['DSA Problem Solving Kit', '200+ curated coding problems with detailed solutions and patterns.', 199, 'https://placehold.co/300x200/00BCD4/white?text=DSA+Kit'],
    ];

    const insertMany = db.transaction((items: [string, string, number, string][]) => {
      for (const item of items) {
        insert.run(...item);
      }
    });

    insertMany(products);
    console.log('Seeded 6 products');
  }
}

export { db, initDB };
