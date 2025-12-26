import { PrismaClient } from '@prisma/client';
import { logger } from '@gocart/shared';

const prisma = new PrismaClient();

class TransactionService {
  // Record payment transaction
  async recordPayment({
    userId,
    orderId,
    stripePaymentIntentId,
    amount,
    currency = 'usd',
    status = 'PENDING'
  }) {
    try {
      const payment = await prisma.payment.create({
        data: {
          userId,
          orderId,
          stripePaymentIntentId,
          amount: Math.round(amount * 100), // Store in cents
          currency,
          status
        }
      });

      logger.info('Payment recorded', {
        paymentId: payment.id,
        userId,
        orderId,
        amount,
        currency,
        status
      });

      return payment;

    } catch (error) {
      logger.error('Failed to record payment', {
        error: error.message,
        userId,
        orderId
      });
      throw error;
    }
  }

  // Update payment status
  async updatePaymentStatus(paymentId, status, metadata = {}) {
    try {
      const payment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status,
          metadata,
          updatedAt: new Date()
        }
      });

      logger.info('Payment status updated', {
        paymentId,
        status,
        metadata
      });

      return payment;

    } catch (error) {
      logger.error('Failed to update payment status', {
        error: error.message,
        paymentId
      });
      throw error;
    }
  }

  // Record payment transaction details
  async recordTransaction({
    paymentId,
    stripeChargeId,
    amount,
    fee,
    netAmount,
    currency = 'usd',
    type,
    status = 'PENDING',
    metadata = {}
  }) {
    try {
      const transaction = await prisma.paymentTransaction.create({
        data: {
          paymentId,
          stripeChargeId,
          amount: Math.round(amount * 100),
          fee: fee ? Math.round(fee * 100) : null,
          netAmount: netAmount ? Math.round(netAmount * 100) : null,
          currency,
          type,
          status,
          metadata,
          processedAt: status === 'SUCCEEDED' ? new Date() : null
        }
      });

      logger.info('Transaction recorded', {
        transactionId: transaction.id,
        paymentId,
        type,
        amount,
        status
      });

      return transaction;

    } catch (error) {
      logger.error('Failed to record transaction', {
        error: error.message,
        paymentId
      });
      throw error;
    }
  }

  // Record refund
  async recordRefund({
    paymentId,
    stripeRefundId,
    amount,
    currency = 'usd',
    reason,
    status = 'PENDING'
  }) {
    try {
      const refund = await prisma.refund.create({
        data: {
          paymentId,
          stripeRefundId,
          amount: Math.round(amount * 100),
          currency,
          reason,
          status
        }
      });

      logger.info('Refund recorded', {
        refundId: refund.id,
        paymentId,
        amount,
        reason,
        status
      });

      return refund;

    } catch (error) {
      logger.error('Failed to record refund', {
        error: error.message,
        paymentId
      });
      throw error;
    }
  }

  // Update refund status
  async updateRefundStatus(refundId, status, metadata = {}) {
    try {
      const refund = await prisma.refund.update({
        where: { id: refundId },
        data: {
          status,
          metadata,
          processedAt: status === 'SUCCEEDED' ? new Date() : null
        }
      });

      logger.info('Refund status updated', {
        refundId,
        status
      });

      return refund;

    } catch (error) {
      logger.error('Failed to update refund status', {
        error: error.message,
        refundId
      });
      throw error;
    }
  }

  // Get payment with transactions
  async getPaymentWithTransactions(paymentId) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' }
          },
          refunds: {
            orderBy: { requestedAt: 'desc' }
          }
        }
      });

      if (!payment) {
        return null;
      }

      return {
        ...payment,
        amount: payment.amount / 100,
        transactions: payment.transactions.map(tx => ({
          ...tx,
          amount: tx.amount / 100,
          fee: tx.fee ? tx.fee / 100 : null,
          netAmount: tx.netAmount ? tx.netAmount / 100 : null
        })),
        refunds: payment.refunds.map(refund => ({
          ...refund,
          amount: refund.amount / 100
        }))
      };

    } catch (error) {
      logger.error('Failed to get payment with transactions', {
        error: error.message,
        paymentId
      });
      throw error;
    }
  }

  // Get payments by user
  async getPaymentsByUser(userId, limit = 20, offset = 0) {
    try {
      const payments = await prisma.payment.findMany({
        where: { userId },
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 1 // Only latest transaction
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      });

      return payments.map(payment => ({
        ...payment,
        amount: payment.amount / 100,
        latestTransaction: payment.transactions[0] ? {
          ...payment.transactions[0],
          amount: payment.transactions[0].amount / 100,
          fee: payment.transactions[0].fee ? payment.transactions[0].fee / 100 : null,
          netAmount: payment.transactions[0].netAmount ? payment.transactions[0].netAmount / 100 : null
        } : null
      }));

    } catch (error) {
      logger.error('Failed to get payments by user', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  // Get payment statistics
  async getPaymentStats(timeframe = '30d') {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(timeframe));

      const [
        totalPayments,
        successfulPayments,
        totalAmount,
        refundCount,
        refundAmount
      ] = await Promise.all([
        prisma.payment.count({
          where: { createdAt: { gte: startDate } }
        }),
        prisma.payment.count({
          where: {
            createdAt: { gte: startDate },
            status: 'SUCCEEDED'
          }
        }),
        prisma.payment.aggregate({
          where: {
            createdAt: { gte: startDate },
            status: 'SUCCEEDED'
          },
          _sum: { amount: true }
        }),
        prisma.refund.count({
          where: { requestedAt: { gte: startDate } }
        }),
        prisma.refund.aggregate({
          where: { requestedAt: { gte: startDate } },
          _sum: { amount: true }
        })
      ]);

      return {
        timeframe,
        totalPayments,
        successfulPayments,
        successRate: totalPayments > 0 ? (successfulPayments / totalPayments * 100).toFixed(2) : 0,
        totalAmount: (totalAmount._sum.amount || 0) / 100,
        refundCount,
        refundAmount: (refundAmount._sum.amount || 0) / 100,
        netAmount: ((totalAmount._sum.amount || 0) - (refundAmount._sum.amount || 0)) / 100
      };

    } catch (error) {
      logger.error('Failed to get payment stats', {
        error: error.message,
        timeframe
      });
      throw error;
    }
  }

  // Process Stripe webhook for payments
  async processPaymentWebhook(event) {
    try {
      const { type, data } = event;

      switch (type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(data.object);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(data.object);
          break;

        case 'charge.succeeded':
          await this.handleChargeSucceeded(data.object);
          break;

        case 'charge.refunded':
          await this.handleChargeRefunded(data.object);
          break;

        default:
          logger.debug('Unhandled payment webhook event', { type });
      }

    } catch (error) {
      logger.error('Failed to process payment webhook', {
        error: error.message,
        eventType: event.type
      });
      throw error;
    }
  }

  // Handle payment success
  async handlePaymentSucceeded(paymentIntent) {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id }
    });

    if (payment) {
      await this.updatePaymentStatus(payment.id, 'SUCCEEDED', {
        stripeData: paymentIntent
      });
    }
  }

  // Handle payment failure
  async handlePaymentFailed(paymentIntent) {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id }
    });

    if (payment) {
      await this.updatePaymentStatus(payment.id, 'FAILED', {
        stripeData: paymentIntent,
        failureReason: paymentIntent.last_payment_error?.message
      });
    }
  }

  // Handle charge success
  async handleChargeSucceeded(charge) {
    const paymentIntent = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: charge.payment_intent }
    });

    if (paymentIntent) {
      await this.recordTransaction({
        paymentId: paymentIntent.id,
        stripeChargeId: charge.id,
        amount: charge.amount / 100,
        fee: (charge.fee || 0) / 100,
        netAmount: (charge.amount - (charge.fee || 0)) / 100,
        currency: charge.currency,
        type: 'CHARGE',
        status: 'SUCCEEDED',
        metadata: charge
      });
    }
  }

  // Handle charge refund
  async handleChargeRefunded(charge) {
    // Find existing refund or create new one
    const existingRefund = await prisma.refund.findFirst({
      where: { stripeRefundId: charge.refunds.data[0]?.id }
    });

    if (!existingRefund) {
      const payment = await prisma.payment.findFirst({
        where: { stripePaymentIntentId: charge.payment_intent }
      });

      if (payment) {
        await this.recordRefund({
          paymentId: payment.id,
          stripeRefundId: charge.refunds.data[0]?.id,
          amount: charge.amount_refunded / 100,
          currency: charge.currency,
          reason: 'requested_by_customer',
          status: 'SUCCEEDED'
        });
      }
    }
  }
}

export default new TransactionService();
