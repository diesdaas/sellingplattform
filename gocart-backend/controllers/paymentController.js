const { query } = require('../config/database');
const stripeService = require('../services/stripeService');
const fulfillmentService = require('../services/fulfillmentService');
const AppError = require('../utils/AppError');

/**
 * Create payment intent for order (protected)
 * POST /api/payments/create-intent
 */
async function createPaymentIntent(req, res, next) {
  try {
    const userId = req.user.id;
    const { orderId } = req.body;

    if (!orderId) {
      throw new AppError('Order ID is required', 400);
    }

    const orderResult = await query('SELECT * FROM "Order" WHERE id = $1', [orderId]);

    if (orderResult.rows.length === 0) {
      throw new AppError('Order not found', 404);
    }

    const order = orderResult.rows[0];

    if (order.userId !== userId) {
      throw new AppError('You do not have permission to pay for this order', 403);
    }

    if (order.isPaid) {
      throw new AppError('Order is already paid', 400);
    }

    if (order.paymentIntentId) {
      const existingIntent = await stripeService.getPaymentIntent(order.paymentIntentId);
      
      if (existingIntent.status === 'succeeded') {
        throw new AppError('Order is already paid', 400);
      }

      return res.status(200).json({
        success: true,
        message: 'Payment intent already exists',
        data: { clientSecret: existingIntent.client_secret, paymentIntentId: existingIntent.id },
      });
    }

    const paymentIntent = await stripeService.createPaymentIntent(order.total, 'usd', {
      orderId: order.id,
      userId: userId,
      storeId: order.storeId,
    });

    await query('UPDATE "Order" SET "paymentIntentId" = $1 WHERE id = $2', [paymentIntent.id, orderId]);

    res.status(200).json({
      success: true,
      message: 'Payment intent created',
      data: { clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Confirm payment (protected)
 * POST /api/payments/confirm
 */
async function confirmPayment(req, res, next) {
  try {
    const userId = req.user.id;
    const { orderId, paymentIntentId } = req.body;

    if (!orderId || !paymentIntentId) {
      throw new AppError('Order ID and Payment Intent ID are required', 400);
    }

    const orderResult = await query('SELECT * FROM "Order" WHERE id = $1', [orderId]);

    if (orderResult.rows.length === 0) {
      throw new AppError('Order not found', 404);
    }

    const order = orderResult.rows[0];

    if (order.userId !== userId) {
      throw new AppError('You do not have permission to confirm this payment', 403);
    }

    const paymentIntent = await stripeService.getPaymentIntent(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      throw new AppError('Payment has not been completed', 400);
    }

    await query('UPDATE "Order" SET "isPaid" = true, status = $1, "updatedAt" = NOW() WHERE id = $2', ['PROCESSING', orderId]);

    // Get updated order
    const updatedResult = await query('SELECT * FROM "Order" WHERE id = $1', [orderId]);

    // Fulfill order
    try {
      await fulfillmentService.fulfillOrder(orderId);
    } catch (fulfillmentError) {
      console.error('Fulfillment error:', fulfillmentError);
    }

    res.status(200).json({
      success: true,
      message: 'Payment confirmed and order is being processed',
      data: { order: updatedResult.rows[0] },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Stripe webhook handler
 * POST /api/payments/webhook
 */
async function webhookHandler(req, res, next) {
  try {
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return res.status(400).json({ success: false, message: 'Webhook secret not configured' });
    }

    let event;
    try {
      event = stripeService.verifyWebhookSignature(req.body, signature, webhookSecret);
    } catch (error) {
      return res.status(400).json({ success: false, message: 'Webhook signature verification failed' });
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ success: true, received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
}

async function handlePaymentSuccess(paymentIntent) {
  const orderId = paymentIntent.metadata?.orderId;
  if (!orderId) return;

  try {
    await query('UPDATE "Order" SET "isPaid" = true, status = $1 WHERE id = $2', ['PROCESSING', orderId]);
    await fulfillmentService.fulfillOrder(orderId);
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

async function handlePaymentFailure(paymentIntent) {
  const orderId = paymentIntent.metadata?.orderId;
  if (!orderId) return;

  try {
    await query('UPDATE "Order" SET "isPaid" = false WHERE id = $1', [orderId]);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

module.exports = {
  createPaymentIntent,
  confirmPayment,
  webhookHandler,
};
