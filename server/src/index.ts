import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import config from './config/index.js';
import { initDB } from './db/database.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payment.js';
import reviewRoutes from './routes/reviews.js';
import searchRoutes from './routes/search.js';
import askRoutes from './routes/ask.js';
import chatRoutes from './routes/chat.js';
import errorHandler from './middleware/errorHandler.js';
import { indexAllProducts } from './services/embeddingService.js';

const app = express();

// Middleware
app.use(cors({ origin: config.CLIENT_URL }));
app.use(express.json());

// Initialize database
initDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/products/:productId/reviews', reviewRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/products/ask', askRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling
app.use(errorHandler);

app.listen(config.PORT, () => {
  console.log(`Server running on http://localhost:${config.PORT}`);

  // Index products into ChromaDB in background on startup
  indexAllProducts()
    .then((count) => console.log(`Indexed ${count} products into ChromaDB`))
    .catch((err) => console.warn('ChromaDB indexing skipped:', err.message));
});
