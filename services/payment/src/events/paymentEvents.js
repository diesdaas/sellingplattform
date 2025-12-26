import { eventPublisher } from '@gocart/shared';
import { EventTypes } from '@gocart/shared';
import { logger } from '@gocart/shared';

// Publish payment intent created event
export const publishPaymentIntentCreated = async (paymentIntentData) => {
  try {
    await eventPublisher.publish(EventTypes.PAYMENT_INTENT_CREATED, {
      paymentIntentId: paymentIntentData.id,
      userId: paymentIntentData.userId,
      orderId: paymentIntentData.orderId,
      amount: paymentIntentData.amount,
      currency: paymentIntentData.currency,
      createdAt: new Date().toISOString()
    }, {
      userId: paymentIntentData.userId,
      priority: 'normal'
    });

    logger.info('Payment intent created event published', {
      paymentIntentId: paymentIntentData.id
    });
  } catch (error) {
    logger.error('Failed to publish payment intent created event', {
      error: error.message,
      paymentIntentId: paymentIntentData.id
    });
  }
};

// Publish payment succeeded event
export const publishPaymentSucceeded = async (paymentData) => {
  try {
    await eventPublisher.publish(EventTypes.PAYMENT_SUCCEEDED, {
      paymentId: paymentData.id,
      paymentIntentId: paymentData.stripePaymentIntentId,
      userId: paymentData.userId,
      orderId: paymentData.orderId,
      amount: paymentData.amount / 100, // Convert from cents
      currency: paymentData.currency,
      succeededAt: new Date().toISOString()
    }, {
      userId: paymentData.userId,
      priority: 'high'
    });

    logger.info('Payment succeeded event published', {
      paymentId: paymentData.id
    });
  } catch (error) {
    logger.error('Failed to publish payment succeeded event', {
      error: error.message,
      paymentId: paymentData.id
    });
  }
};

// Publish payment failed event
export const publishPaymentFailed = async (paymentData, failureReason) => {
  try {
    await eventPublisher.publish(EventTypes.PAYMENT_FAILED, {
      paymentId: paymentData.id,
      paymentIntentId: paymentData.stripePaymentIntentId,
      userId: paymentData.userId,
      orderId: paymentData.orderId,
      amount: paymentData.amount / 100,
      currency: paymentData.currency,
      failureReason,
      failedAt: new Date().toISOString()
    }, {
      userId: paymentData.userId,
      priority: 'high'
    });

    logger.info('Payment failed event published', {
      paymentId: paymentData.id,
      failureReason
    });
  } catch (error) {
    logger.error('Failed to publish payment failed event', {
      error: error.message,
      paymentId: paymentData.id
    });
  }
};

// Publish payout requested event
export const publishPayoutRequested = async (payoutData) => {
  try {
    await eventPublisher.publish(EventTypes.PAYOUT_REQUESTED, {
      payoutId: payoutData.id,
      artistId: payoutData.artistId,
      amount: payoutData.amount / 100,
      currency: payoutData.currency,
      stripeAccountId: payoutData.stripeAccountId,
      requestedAt: payoutData.requestedAt
    }, {
      userId: payoutData.artistId,
      priority: 'normal'
    });

    logger.info('Payout requested event published', {
      payoutId: payoutData.id
    });
  } catch (error) {
    logger.error('Failed to publish payout requested event', {
      error: error.message,
      payoutId: payoutData.id
    });
  }
};

// Publish payout completed event
export const publishPayoutCompleted = async (payoutData) => {
  try {
    await eventPublisher.publish(EventTypes.PAYOUT_COMPLETED, {
      payoutId: payoutData.id,
      artistId: payoutData.artistId,
      amount: payoutData.amount / 100,
      currency: payoutData.currency,
      completedAt: payoutData.completedAt
    }, {
      userId: payoutData.artistId,
      priority: 'normal'
    });

    logger.info('Payout completed event published', {
      payoutId: payoutData.id
    });
  } catch (error) {
    logger.error('Failed to publish payout completed event', {
      error: error.message,
      payoutId: payoutData.id
    });
  }
};

// Publish artist connected event
export const publishArtistConnected = async (artistId, stripeAccountId) => {
  try {
    await eventPublisher.publish(EventTypes.ARTIST_CONNECTED, {
      artistId,
      stripeAccountId,
      connectedAt: new Date().toISOString()
    }, {
      userId: artistId,
      priority: 'normal'
    });

    logger.info('Artist connected event published', {
      artistId,
      stripeAccountId
    });
  } catch (error) {
    logger.error('Failed to publish artist connected event', {
      error: error.message,
      artistId
    });
  }
};

// Publish refund created event
export const publishRefundCreated = async (refundData) => {
  try {
    await eventPublisher.publish(EventTypes.PAYMENT_REFUNDED, {
      refundId: refundData.id,
      paymentId: refundData.paymentId,
      amount: refundData.amount / 100,
      currency: refundData.currency,
      reason: refundData.reason,
      requestedAt: refundData.requestedAt
    }, {
      priority: 'normal'
    });

    logger.info('Refund created event published', {
      refundId: refundData.id
    });
  } catch (error) {
    logger.error('Failed to publish refund created event', {
      error: error.message,
      refundId: refundData.id
    });
  }
};
