const express = require('express');
const { db } = require('../db/database');
const bkashService = require('../services/bkashService');

const router = express.Router();

/**
 * POST /api/payment/create
 * Called by frontend when user clicks "Pay with bKash".
 * 1. Creates an order in the DB
 * 2. Calls bKash createPayment API
 * 3. Returns bkashURL for user redirect
 */
router.post('/create', async (req, res, next) => {
  try {
    const { customerName, cartItems } = req.body;

    if (!customerName || !cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Customer name and cart items are required' });
    }

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
    const insertItems = db.transaction((items) => {
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
 * Query params: paymentID, status
 */
router.get('/callback', async (req, res, next) => {
  try {
    const { paymentID, status } = req.query;

    // Find the payment record
    const payment = db.prepare('SELECT * FROM payments WHERE bkash_payment_id = ?').get(paymentID);

    if (!payment) {
      return res.redirect(`${process.env.CLIENT_URL}/payment-status?error=Payment not found`);
    }

    if (status === 'success') {
      // Execute the payment
      const executeResult = await bkashService.executePayment(paymentID);

      if (executeResult.statusCode === '0000' || executeResult.transactionStatus === 'Completed') {
        // Payment successful - update DB
        db.prepare(
          'UPDATE payments SET status = ?, bkash_trx_id = ? WHERE bkash_payment_id = ?'
        ).run('completed', executeResult.trxID, paymentID);

        db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('paid', payment.order_id);

        return res.redirect(
          `${process.env.CLIENT_URL}/payment-status?orderId=${payment.order_id}&status=success&trxID=${executeResult.trxID}`
        );
      }

      // Execution failed
      db.prepare('UPDATE payments SET status = ? WHERE bkash_payment_id = ?').run('failed', paymentID);
      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('failed', payment.order_id);

      return res.redirect(
        `${process.env.CLIENT_URL}/payment-status?orderId=${payment.order_id}&status=failed&reason=${executeResult.statusMessage || 'Execution failed'}`
      );
    }

    // User cancelled or payment failed at bKash end
    db.prepare('UPDATE payments SET status = ? WHERE bkash_payment_id = ?').run(status === 'cancel' ? 'cancelled' : 'failed', paymentID);
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status === 'cancel' ? 'cancelled' : 'failed', payment.order_id);

    res.redirect(
      `${process.env.CLIENT_URL}/payment-status?orderId=${payment.order_id}&status=${status}`
    );
  } catch (err) {
    console.error('Callback error:', err.message);
    res.redirect(`${process.env.CLIENT_URL}/payment-status?status=error&reason=${err.message}`);
  }
});

/**
 * GET /api/payment/status/:orderId
 * Frontend can poll this to check payment status.
 */
router.get('/status/:orderId', (req, res) => {
  const payment = db.prepare(`
    SELECT p.*, o.status as order_status, o.total_amount, o.customer_name
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    WHERE p.order_id = ?
  `).get(req.params.orderId);

  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }

  res.json(payment);
});

/**
 * POST /api/payment/refund/:orderId
 * Refund a completed payment.
 */
router.post('/refund/:orderId', async (req, res, next) => {
  try {
    const payment = db.prepare(
      'SELECT * FROM payments WHERE order_id = ? AND status = ?'
    ).get(req.params.orderId, 'completed');

    if (!payment) {
      return res.status(404).json({ error: 'No completed payment found for this order' });
    }

    const result = await bkashService.refundPayment(
      payment.bkash_payment_id,
      payment.bkash_trx_id,
      payment.amount,
      req.body.reason || 'Customer request'
    );

    if (result.statusCode === '0000' || result.transactionStatus === 'Completed') {
      db.prepare('UPDATE payments SET status = ? WHERE id = ?').run('refunded', payment.id);
      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('refunded', payment.order_id);
      return res.json({ message: 'Refund successful', result });
    }

    res.status(400).json({ error: 'Refund failed', details: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
