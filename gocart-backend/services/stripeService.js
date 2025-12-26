const stripe = require('stripe');
const { config } = require('../config/env');
const AppError = require('../utils/AppError');

/**
 * Stripe Payment Service
 */
class StripeService {
  constructor() {
    this.stripe = stripe(config.stripe.secretKey);
    
    if (!config.stripe.secretKey) {
      console.warn('⚠️  Stripe secret key not configured. Payment features will be disabled.');
    }
  }

  /**
   * Create payment intent
   * @param {number} amount - Amount in cents
   * @param {string} currency - Currency code (default: 'usd')
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Payment intent
   */
  async createPaymentIntent(amount, currency = 'usd', metadata = {}) {
    if (!config.stripe.secretKey) {
      throw new AppError('Stripe is not configured', 500);
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return paymentIntent;
    } catch (error) {
      throw new AppError(`Stripe error: ${error.message}`, 500);
    }
  }

  /**
   * Retrieve payment intent
   * @param {string} paymentIntentId - Payment intent ID
   * @returns {Promise<Object>} Payment intent
   */
  async getPaymentIntent(paymentIntentId) {
    if (!config.stripe.secretKey) {
      throw new AppError('Stripe is not configured', 500);
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      throw new AppError(`Stripe error: ${error.message}`, 500);
    }
  }

  /**
   * Confirm payment intent
   * @param {string} paymentIntentId - Payment intent ID
   * @returns {Promise<Object>} Payment intent
   */
  async confirmPaymentIntent(paymentIntentId) {
    if (!config.stripe.secretKey) {
      throw new AppError('Stripe is not configured', 500);
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      throw new AppError(`Stripe error: ${error.message}`, 500);
    }
  }

  /**
   * Cancel payment intent
   * @param {string} paymentIntentId - Payment intent ID
   * @returns {Promise<Object>} Payment intent
   */
  async cancelPaymentIntent(paymentIntentId) {
    if (!config.stripe.secretKey) {
      throw new AppError('Stripe is not configured', 500);
    }

    try {
      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);
      return paymentIntent;
    } catch (error) {
      throw new AppError(`Stripe error: ${error.message}`, 500);
    }
  }

  /**
   * Verify webhook signature
   * @param {string} payload - Raw request body
   * @param {string} signature - Stripe signature header
   * @param {string} webhookSecret - Webhook secret
   * @returns {Object} Event object
   */
  verifyWebhookSignature(payload, signature, webhookSecret) {
    if (!webhookSecret) {
      throw new AppError('Webhook secret not configured', 500);
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );
      return event;
    } catch (error) {
      throw new AppError(`Webhook signature verification failed: ${error.message}`, 400);
    }
  }
}

// Export singleton instance
module.exports = new StripeService();


