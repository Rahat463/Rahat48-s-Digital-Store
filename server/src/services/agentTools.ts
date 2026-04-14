import type Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/database.js';
import { searchProducts } from './embeddingService.js';
import { refundPayment } from './bkashService.js';
import type { Product, OrderWithPayment, OrderDetail, OrderItem, ReviewWithUser } from '../types/index.js';

// ============================================================
// TOOL DEFINITIONS — JSON Schema sent to Claude
// ============================================================

export const toolDefinitions: Anthropic.Tool[] = [
  {
    name: 'search_products',
    description: 'Search for products using semantic similarity. Use this when the user asks about available products, wants recommendations, or describes what they are looking for.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Natural language search query describing what the user is looking for',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_product_details',
    description: 'Get detailed information about a specific product by its ID, including reviews.',
    input_schema: {
      type: 'object' as const,
      properties: {
        product_id: {
          type: 'number',
          description: 'The product ID',
        },
      },
      required: ['product_id'],
    },
  },
  {
    name: 'get_user_orders',
    description: 'Get all orders for the current authenticated user. Use this when the user asks about their orders or purchase history.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'check_order_status',
    description: 'Check the status and details of a specific order by order ID.',
    input_schema: {
      type: 'object' as const,
      properties: {
        order_id: {
          type: 'number',
          description: 'The order ID to look up',
        },
      },
      required: ['order_id'],
    },
  },
  {
    name: 'get_recommendations',
    description: 'Get personalized product recommendations based on user preferences or interests.',
    input_schema: {
      type: 'object' as const,
      properties: {
        preferences: {
          type: 'string',
          description: 'Description of user preferences, interests, or what they want to learn',
        },
      },
      required: ['preferences'],
    },
  },
  {
    name: 'process_refund',
    description: 'Process a refund for a paid order. IMPORTANT: Always confirm with the user before calling this tool. Only use this after explicit user confirmation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        order_id: {
          type: 'number',
          description: 'The order ID to refund',
        },
        reason: {
          type: 'string',
          description: 'Reason for the refund',
        },
      },
      required: ['order_id', 'reason'],
    },
  },
];

// ============================================================
// TOOL IMPLEMENTATIONS
// ============================================================

export async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  userId?: number
): Promise<string> {
  switch (toolName) {
    case 'search_products':
      return handleSearchProducts(input);
    case 'get_product_details':
      return handleGetProductDetails(input);
    case 'get_user_orders':
      return handleGetUserOrders(userId);
    case 'check_order_status':
      return handleCheckOrderStatus(input);
    case 'get_recommendations':
      return handleGetRecommendations(input);
    case 'process_refund':
      return handleProcessRefund(input);
    default:
      return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
}

async function handleSearchProducts(input: Record<string, unknown>): Promise<string> {
  const query = input.query as string;
  const limit = (input.limit as number) || 5;

  const results = await searchProducts(query, limit);
  return JSON.stringify(results.map(r => ({
    id: r.id,
    name: r.name,
    price: r.price,
    relevance_score: Math.round((1 - r.distance / 2) * 100),
  })));
}

async function handleGetProductDetails(input: Record<string, unknown>): Promise<string> {
  const productId = input.product_id as number;

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as Product | undefined;
  if (!product) {
    return JSON.stringify({ error: 'Product not found' });
  }

  const reviews = db.prepare(`
    SELECT r.*, u.name as user_name, u.email as user_email
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.product_id = ?
    ORDER BY r.created_at DESC
  `).all(productId) as ReviewWithUser[];

  const stats = db.prepare(`
    SELECT COUNT(*) as count, AVG(rating) as avg_rating
    FROM reviews WHERE product_id = ?
  `).get(productId) as { count: number; avg_rating: number | null };

  return JSON.stringify({
    ...product,
    reviews: reviews.map(r => ({
      rating: r.rating,
      title: r.title,
      body: r.body,
      reviewer: r.user_name,
      date: r.created_at,
    })),
    review_stats: {
      count: stats.count,
      average_rating: stats.avg_rating ? Math.round(stats.avg_rating * 10) / 10 : null,
    },
  });
}

async function handleGetUserOrders(userId?: number): Promise<string> {
  if (!userId) {
    return JSON.stringify({ error: 'User not authenticated. Please log in to view your orders.' });
  }

  const orders = db.prepare(`
    SELECT o.*, p.bkash_payment_id, p.bkash_trx_id, p.status as payment_status
    FROM orders o
    LEFT JOIN payments p ON o.id = p.order_id
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
  `).all(userId) as OrderWithPayment[];

  if (orders.length === 0) {
    return JSON.stringify({ message: 'No orders found for this user.' });
  }

  return JSON.stringify(orders.map(o => ({
    order_id: o.id,
    total: o.total_amount,
    status: o.status,
    payment_status: o.payment_status,
    date: o.created_at,
  })));
}

async function handleCheckOrderStatus(input: Record<string, unknown>): Promise<string> {
  const orderId = input.order_id as number;

  const order = db.prepare(`
    SELECT o.*, p.bkash_payment_id, p.bkash_trx_id, p.status as payment_status
    FROM orders o
    LEFT JOIN payments p ON o.id = p.order_id
    WHERE o.id = ?
  `).get(orderId) as OrderWithPayment | undefined;

  if (!order) {
    return JSON.stringify({ error: `Order #${orderId} not found` });
  }

  const items = db.prepare(`
    SELECT oi.*, pr.name as product_name
    FROM order_items oi
    JOIN products pr ON oi.product_id = pr.id
    WHERE oi.order_id = ?
  `).all(orderId) as (OrderItem & { product_name: string })[];

  const detail: OrderDetail = { ...order, items };
  return JSON.stringify({
    order_id: detail.id,
    customer: detail.customer_name,
    total: detail.total_amount,
    status: detail.status,
    payment_status: detail.payment_status,
    transaction_id: detail.bkash_trx_id,
    date: detail.created_at,
    items: detail.items.map(i => ({
      product: i.product_name,
      quantity: i.quantity,
      price: i.price,
    })),
  });
}

async function handleGetRecommendations(input: Record<string, unknown>): Promise<string> {
  const preferences = input.preferences as string;
  const results = await searchProducts(preferences, 4);

  return JSON.stringify({
    recommendations: results.map(r => ({
      id: r.id,
      name: r.name,
      price: r.price,
      match_score: Math.round((1 - r.distance / 2) * 100),
    })),
  });
}

async function handleProcessRefund(input: Record<string, unknown>): Promise<string> {
  const orderId = input.order_id as number;
  const reason = (input.reason as string) || 'Customer request';

  const order = db.prepare(`
    SELECT o.*, p.bkash_payment_id, p.bkash_trx_id, p.amount as payment_amount, p.status as payment_status
    FROM orders o
    JOIN payments p ON o.id = p.order_id
    WHERE o.id = ?
  `).get(orderId) as (OrderWithPayment & { payment_amount: number }) | undefined;

  if (!order) {
    return JSON.stringify({ error: `Order #${orderId} not found` });
  }

  if (order.payment_status !== 'completed') {
    return JSON.stringify({ error: `Order #${orderId} payment status is '${order.payment_status}' — can only refund completed payments` });
  }

  if (!order.bkash_payment_id || !order.bkash_trx_id) {
    return JSON.stringify({ error: 'Missing payment information for refund' });
  }

  try {
    const result = await refundPayment(
      order.bkash_payment_id,
      order.bkash_trx_id,
      order.payment_amount,
      reason
    );

    // Update statuses in DB
    db.prepare("UPDATE orders SET status = 'refunded' WHERE id = ?").run(orderId);
    db.prepare("UPDATE payments SET status = 'refunded' WHERE order_id = ?").run(orderId);

    return JSON.stringify({
      success: true,
      message: `Refund processed for Order #${orderId}`,
      amount: order.payment_amount,
      transaction_status: result.transactionStatus,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Refund failed';
    return JSON.stringify({ error: message });
  }
}
