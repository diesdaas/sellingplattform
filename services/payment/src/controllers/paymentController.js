import { sendSuccess, sendError } from '@gocart/shared';
import stripeService from '../services/stripeService.js';
import transactionService from '../services/transactionService.js';
import { eventPublisher } from '@gocart/shared';
import { EventTypes } from '@gocart/shared';
import { logger } from '@gocart/shared';

// Create PaymentIntent
export const createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency, orderId } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!amount || !orderId) {
      return sendError(res, { message: 'Amount and orderId are required' }, 400);
    }

    if (amount <= 0) {
      return sendError(res, { message: 'Amount must be greater than 0' }, 400);
    }

    // Create PaymentIntent via Stripe
    const paymentIntent = await stripeService.createPaymentIntent({
      amount,
      currency: currency || 'usd',
      orderId,
      userId
    });

    // Record payment in database
    await transactionService.recordPayment({
      userId,
      orderId,
      stripePaymentIntentId: paymentIntent.id,
      amount,
      currency: currency || 'usd',
      status: 'REQUIRES_PAYMENT_METHOD'
    });

    // Publish event
    await eventPublisher.publish(EventTypes.PAYMENT_INTENT_CREATED, {
      paymentIntentId: paymentIntent.id,
      userId,
      orderId,
      amount,
      currency: currency || 'usd'
    });

    sendSuccess(res, {
      paymentIntent: {
        id: paymentIntent.id,
        clientSecret: paymentIntent.clientSecret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      }
    });

  } catch (error) {
    logger.error('Create PaymentIntent failed', {
      error: error.message,
      userId: req.user?.id,
      body: req.body
    });
    sendError(res, error);
  }
};

// Confirm payment
export const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const userId = req.user.id;

    if (!paymentIntentId) {
      return sendError(res, { message: 'PaymentIntent ID is required' }, 400);
    }

    // Confirm PaymentIntent
    const confirmedPayment = await stripeService.confirmPaymentIntent(paymentIntentId);

    // Update payment status
    const payment = await transactionService.updatePaymentStatus(
      await getPaymentIdByStripeId(paymentIntentId),
      mapStripeStatus(confirmedPayment.status),
      { stripeData: confirmedPayment }
    );

    // Publish success event
    if (confirmedPayment.status === 'succeeded') {
      await eventPublisher.publish(EventTypes.PAYMENT_SUCCEEDED, {
        paymentId: payment.id,
        paymentIntentId,
        userId,
        orderId: payment.orderId,
        amount: confirmedPayment.amount,
        currency: confirmedPayment.currency
      });
    }

    sendSuccess(res, {
      payment: {
        id: payment.id,
        status: payment.status,
        amount: confirmedPayment.amount,
        currency: confirmedPayment.currency
      }
    });

  } catch (error) {
    logger.error('Confirm payment failed', {
      error: error.message,
      userId: req.user?.id,
      paymentIntentId: req.body.paymentIntentId
    });
    sendError(res, error);
  }
};

// Get payment details
export const getPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    const payment = await transactionService.getPaymentWithTransactions(paymentId);

    if (!payment) {
      return sendError(res, { message: 'Payment not found' }, 404);
    }

    // Check if user owns this payment
    if (payment.userId !== userId) {
      return sendError(res, { message: 'Access denied' }, 403);
    }

    sendSuccess(res, { payment });

  } catch (error) {
    logger.error('Get payment failed', {
      error: error.message,
      paymentId: req.params.paymentId,
      userId: req.user?.id
    });
    sendError(res, error);
  }
};

// Get user payments
export const getUserPayments = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const payments = await transactionService.getPaymentsByUser(
      userId,
      parseInt(limit),
      offset
    );

    sendSuccess(res, { payments });

  } catch (error) {
    logger.error('Get user payments failed', {
      error: error.message,
      userId: req.user?.id
    });
    sendError(res, error);
  }
};

// Create refund
export const createRefund = async (req, res) => {
  try {
    const { paymentIntentId, amount, reason } = req.body;
    const userId = req.user.id;

    if (!paymentIntentId) {
      return sendError(res, { message: 'PaymentIntent ID is required' }, 400);
    }

    // Create refund via Stripe
    const refund = await stripeService.createRefund(paymentIntentId, amount, reason);

    // Record refund in database
    const paymentId = await getPaymentIdByStripeId(paymentIntentId);
    const dbRefund = await transactionService.recordRefund({
      paymentId,
      stripeRefundId: refund.id,
      amount: refund.amount,
      currency: refund.currency,
      reason: refund.reason,
      status: 'PENDING'
    });

    // Publish refund event
    await eventPublisher.publish(EventTypes.PAYMENT_REFUNDED, {
      refundId: dbRefund.id,
      paymentId,
      paymentIntentId,
      userId,
      amount: refund.amount,
      currency: refund.currency,
      reason: refund.reason
    });

    sendSuccess(res, {
      refund: {
        id: dbRefund.id,
        amount: refund.amount,
        currency: refund.currency,
        status: dbRefund.status,
        reason: dbRefund.reason
      }
    });

  } catch (error) {
    logger.error('Create refund failed', {
      error: error.message,
      userId: req.user?.id,
      paymentIntentId: req.body.paymentIntentId
    });
    sendError(res, error);
  }
};

// Get refund details
export const getRefund = async (req, res) => {
  try {
    const { refundId } = req.params;

    const refund = await stripeService.getRefund(refundId);

    sendSuccess(res, { refund });

  } catch (error) {
    logger.error('Get refund failed', {
      error: error.message,
      refundId: req.params.refundId
    });
    sendError(res, error);
  }
};

// Helper functions
async function getPaymentIdByStripeId(stripePaymentIntentId) {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId }
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  return payment.id;
}

function mapStripeStatus(stripeStatus) {
  const statusMap = {
    'requires_payment_method': 'REQUIRES_PAYMENT_METHOD',
    'requires_confirmation': 'REQUIRES_CONFIRMATION',
    'requires_action': 'REQUIRES_ACTION',
    'processing': 'PROCESSING',
    'succeeded': 'SUCCEEDED',
    'canceled': 'CANCELLED'
  };

  return statusMap[stripeStatus] || 'UNKNOWN';
}
