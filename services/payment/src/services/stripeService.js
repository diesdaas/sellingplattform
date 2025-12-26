import Stripe from 'stripe';
import { logger } from '@gocart/shared';

class StripeService {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      appInfo: {
        name: 'GoCart Payment Service',
        version: '1.0.0',
        url: 'https://gocart.com'
      }
    });

    this.publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  }

  // Create PaymentIntent
  async createPaymentIntent({ amount, currency = 'usd', orderId, userId, metadata = {} }) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          orderId,
          userId,
          ...metadata
        }
      });

      logger.info('PaymentIntent created', {
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
        orderId,
        userId
      });

      return {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      };

    } catch (error) {
      logger.error('Failed to create PaymentIntent', {
        error: error.message,
        amount,
        currency,
        orderId,
        userId
      });
      throw error;
    }
  }

  // Confirm PaymentIntent
  async confirmPaymentIntent(paymentIntentId, paymentMethodId = null) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId, {
        ...(paymentMethodId && { payment_method: paymentMethodId })
      });

      logger.info('PaymentIntent confirmed', {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100
      });

      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        chargeId: paymentIntent.latest_charge
      };

    } catch (error) {
      logger.error('Failed to confirm PaymentIntent', {
        error: error.message,
        paymentIntentId
      });
      throw error;
    }
  }

  // Retrieve PaymentIntent
  async getPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
        charges: paymentIntent.charges
      };

    } catch (error) {
      logger.error('Failed to retrieve PaymentIntent', {
        error: error.message,
        paymentIntentId
      });
      throw error;
    }
  }

  // Cancel PaymentIntent
  async cancelPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);

      logger.info('PaymentIntent cancelled', {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status
      });

      return {
        id: paymentIntent.id,
        status: paymentIntent.status,
        cancelled: true
      };

    } catch (error) {
      logger.error('Failed to cancel PaymentIntent', {
        error: error.message,
        paymentIntentId
      });
      throw error;
    }
  }

  // Create refund
  async createRefund(paymentIntentId, amount = null, reason = 'requested_by_customer') {
    try {
      // First get the charge ID from the PaymentIntent
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

      if (!paymentIntent.latest_charge) {
        throw new Error('No charge found for this payment');
      }

      const refund = await this.stripe.refunds.create({
        charge: paymentIntent.latest_charge,
        ...(amount && { amount: Math.round(amount * 100) }),
        reason,
        metadata: {
          paymentIntentId,
          orderId: paymentIntent.metadata.orderId
        }
      });

      logger.info('Refund created', {
        refundId: refund.id,
        paymentIntentId,
        amount: refund.amount / 100,
        reason
      });

      return {
        id: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason
      };

    } catch (error) {
      logger.error('Failed to create refund', {
        error: error.message,
        paymentIntentId,
        amount
      });
      throw error;
    }
  }

  // Get refund details
  async getRefund(refundId) {
    try {
      const refund = await this.stripe.refunds.retrieve(refundId);

      return {
        id: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason,
        chargeId: refund.charge,
        paymentIntentId: refund.metadata?.paymentIntentId
      };

    } catch (error) {
      logger.error('Failed to get refund', {
        error: error.message,
        refundId
      });
      throw error;
    }
  }

  // List refunds for a charge
  async listRefunds(chargeId) {
    try {
      const refunds = await this.stripe.refunds.list({
        charge: chargeId
      });

      return refunds.data.map(refund => ({
        id: refund.id,
        amount: refund.amount / 100,
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason,
        created: refund.created
      }));

    } catch (error) {
      logger.error('Failed to list refunds', {
        error: error.message,
        chargeId
      });
      throw error;
    }
  }

  // Get publishable key (for frontend)
  getPublishableKey() {
    return this.publishableKey;
  }

  // Validate webhook signature
  constructEvent(payload, signature, webhookSecret) {
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      logger.error('Webhook signature validation failed', {
        error: error.message
      });
      throw error;
    }
  }
}

export default new StripeService();
