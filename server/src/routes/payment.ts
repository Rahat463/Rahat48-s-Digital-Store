import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { db } from '../db/database.js';
import * as bkashService from '../services/bkashService.js';
import config from '../config/index.js';
import type { Payment } from '../types/index.js';
import { CreatePaymentSchema, RefundSchema, type CreatePaymentInput } from '../schemas/payment.js';
import { validate } from '../middleware/validate.js';

const router = Router();

/**
 * POST /api/payment/create
 * Called by frontend when user clicks "Pay with bKash".
 */
router.post('/create', validate(CreatePaymentSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { customerName, cartItems } = req.body as CreatePaymentInput;

    // Calculate total
    const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Create order in DB
    const orderResult = db.prepare(
      'INSERT INTO orders (customer_name, total_amount, status) VALUES (?, ?, ?)'
    ).run(customerName, totalAmount, 'pending');

    const orderId = orderResult.lastInsertRowid;

    // Insert order items
    const insertItem = db.prepare(
      'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)'
    );
    const insertItems = db.transaction((items: CreatePaymentInput['cartItems']) => {
      for (const item of items) {
        insertItem.run(orderId, item.productId, item.quantity, item.price);
      }
    });
    insertItems(cartItems);

    // Create bKash payment
    const invoiceNumber = `INV-${orderId}-${Date.now()}`;
    const paymentResponse = await bkashService.createPayment(totalAmount, invoiceNumber);

    // Save payment record
    db.prepare(
      'INSERT INTO payments (order_id, bkash_payment_id, amount, status) VALUES (?, ?, ?, ?)'
    ).run(orderId, paymentResponse.paymentID, totalAmount, 'initiated');

    res.json({
      orderId,
      paymentID: paymentResponse.paymentID,
      bkashURL: paymentResponse.bkashURL,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/payment/callback
 * bKash redirects the user here after they authorize (or cancel) payment.
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { paymentID, status } = req.query as { paymentID: string; status: string };

    // Find the payment record
    const payment = db.prepare('SELECT * FROM payments WHERE bkash_payment_id = ?').get(paymentID) as Payment | undefined;

    if (!payment) {
      res.redirect(`${config.CLIENT_URL}/payment-status?error=Payment not found`);
      return;
    }

    if (status === 'success') {
      // Execute the payment
      const executeResult = await bkashService.executePayment(paymentID);

      if (executeResult.statusCode === '0000' || executeResult.transactionStatus === 'Completed') {
        db.prepare(
          'UPDATE payments SET status = ?, bkash_trx_id = ? WHERE bkash_payment_id = ?'
        ).run('completed', executeResult.trxID, paymentID);

        db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('paid', payment.order_id);

        res.redirect(
          `${config.CLIENT_URL}/payment-status?orderId=${payment.order_id}&status=success&trxID=${executeResult.trxID}`
        );
        return;
      }

      // Execution failed
      db.prepare('UPDATE payments SET status = ? WHERE bkash_payment_id = ?').run('failed', paymentID);
      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('failed', payment.order_id);

      res.redirect(
        `${config.CLIENT_URL}/payment-status?orderId=${payment.order_id}&status=failed&reason=${executeResult.statusMessage || 'Execution failed'}`
      );
      return;
    }

    // User cancelled or payment failed at bKash end
    db.prepare('UPDATE payments SET status = ? WHERE bkash_payment_id = ?').run(status === 'cancel' ? 'cancelled' : 'failed', paymentID);
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status === 'cancel' ? 'cancelled' : 'failed', payment.order_id);

    res.redirect(
      `${config.CLIENT_URL}/payment-status?orderId=${payment.order_id}&status=${status}`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Callback error:', message);
    res.redirect(`${config.CLIENT_URL}/payment-status?status=error&reason=${message}`);
  }
});

/**
 * GET /api/payment/status/:orderId
 */
router.get('/status/:orderId', (req, res) => {
  const payment = db.prepare(`
    SELECT p.*, o.status as order_status, o.total_amount, o.customer_name
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    WHERE p.order_id = ?
  `).get(req.params.orderId) as (Payment & { order_status: string; total_amount: number; customer_name: string }) | undefined;

  if (!payment) {
    res.status(404).json({ error: 'Payment not found' });
    return;
  }

  res.json(payment);
});

/**
 * POST /api/payment/refund/:orderId
 */
router.post('/refund/:orderId', validate(RefundSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = db.prepare(
      'SELECT * FROM payments WHERE order_id = ? AND status = ?'
    ).get(req.params.orderId, 'completed') as Payment | undefined;

    if (!payment) {
      res.status(404).json({ error: 'No completed payment found for this order' });
      return;
    }

    const { reason } = req.body as { reason: string };
    const result = await bkashService.refundPayment(
      payment.bkash_payment_id!,
      payment.bkash_trx_id!,
      payment.amount,
      reason
    );

    if (result.statusCode === '0000' || result.transactionStatus === 'Completed') {
      db.prepare('UPDATE payments SET status = ? WHERE id = ?').run('refunded', payment.id);
      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('refunded', payment.order_id);
      res.json({ message: 'Refund successful', result });
      return;
    }

    res.status(400).json({ error: 'Refund failed', details: result });
  } catch (err) {
    next(err);
  }
});

export default router;
