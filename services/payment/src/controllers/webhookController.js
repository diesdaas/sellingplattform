import stripeService from '../services/stripeService.js';
import stripeConnectService from '../services/stripeConnectService.js';
import transactionService from '../services/transactionService.js';
import { logger } from '@gocart/shared';

// Handle Stripe webhooks
export const handleWebhook = async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig) {
      logger.warn('Webhook received without signature');
      return res.status(400).json({ error: 'Webhook signature missing' });
    }

    if (!endpointSecret) {
      logger.error('Stripe webhook secret not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Verify webhook signature
    let event;
    try {
      event = stripeService.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      logger.warn('Webhook signature verification failed', { error: err.message });
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    logger.info('Webhook received', {
      type: event.type,
      id: event.id,
      created: event.created
    });

    // Handle different event types
    try {
      switch (event.type) {
        // Payment events
        case 'payment_intent.succeeded':
        case 'payment_intent.payment_failed':
        case 'payment_intent.canceled':
        case 'payment_intent.requires_action':
          await transactionService.processPaymentWebhook(event);
          break;

        // Charge events
        case 'charge.succeeded':
        case 'charge.failed':
        case 'charge.refunded':
          await transactionService.processPaymentWebhook(event);
          break;

        // Connect account events
        case 'account.updated':
        case 'transfer.created':
        case 'transfer.failed':
        case 'payout.paid':
        case 'payout.failed':
          await stripeConnectService.handleConnectWebhook(event);
          break;

        // Invoice events (for subscriptions if implemented later)
        case 'invoice.payment_succeeded':
        case 'invoice.payment_failed':
          logger.info('Invoice event received', { type: event.type });
          // Handle invoice events if needed
          break;

        // Customer events
        case 'customer.created':
        case 'customer.updated':
        case 'customer.deleted':
          logger.info('Customer event received', { type: event.type });
          // Handle customer events if needed
          break;

        default:
          logger.info('Unhandled webhook event', { type: event.type });
      }

      // Return success response
      res.json({ received: true, type: event.type });

    } catch (error) {
      logger.error('Error processing webhook', {
        error: error.message,
        eventType: event.type,
        eventId: event.id
      });

      // Return error response but don't fail the webhook
      res.status(200).json({
        received: true,
        type: event.type,
        error: 'Processing failed',
        errorMessage: error.message
      });
    }

  } catch (error) {
    logger.error('Webhook handler error', {
      error: error.message,
      body: req.body,
      headers: req.headers
    });

    res.status(500).json({
      error: 'Webhook processing failed',
      message: error.message
    });
  }
};

// Health check for webhook endpoint
export const webhookHealth = async (req, res) => {
  res.json({
    status: 'healthy',
    service: 'payment-webhook',
    timestamp: new Date().toISOString(),
    stripeConfigured: !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET)
  });
};
