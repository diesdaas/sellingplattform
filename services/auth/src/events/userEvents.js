import { eventPublisher } from '@gocart/shared';
import { EventTypes } from '@gocart/shared';
import { logger } from '@gocart/shared';

// Publish user created event
export const publishUserCreated = async (userData) => {
  try {
    await eventPublisher.publish(EventTypes.USER_CREATED, {
      userId: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      createdAt: userData.createdAt
    }, {
      userId: userData.id,
      priority: 'normal'
    });

    logger.info('User created event published', { userId: userData.id });
  } catch (error) {
    logger.error('Failed to publish user created event', {
      error: error.message,
      userId: userData.id
    });
  }
};

// Publish user verified event
export const publishUserVerified = async (userId, email) => {
  try {
    await eventPublisher.publish(EventTypes.USER_VERIFIED, {
      userId,
      email,
      verifiedAt: new Date().toISOString()
    }, {
      userId,
      priority: 'normal'
    });

    logger.info('User verified event published', { userId });
  } catch (error) {
    logger.error('Failed to publish user verified event', {
      error: error.message,
      userId
    });
  }
};

// Publish user updated event
export const publishUserUpdated = async (userId, changes) => {
  try {
    await eventPublisher.publish(EventTypes.USER_UPDATED, {
      userId,
      changes,
      updatedAt: new Date().toISOString()
    }, {
      userId,
      priority: 'low'
    });

    logger.info('User updated event published', { userId, changes: Object.keys(changes) });
  } catch (error) {
    logger.error('Failed to publish user updated event', {
      error: error.message,
      userId
    });
  }
};

// Publish password reset event
export const publishPasswordReset = async (userId, email) => {
  try {
    await eventPublisher.publish(EventTypes.USER_PASSWORD_RESET, {
      userId,
      email,
      resetAt: new Date().toISOString()
    }, {
      userId,
      priority: 'high' // Security event
    });

    logger.info('Password reset event published', { userId });
  } catch (error) {
    logger.error('Failed to publish password reset event', {
      error: error.message,
      userId
    });
  }
};

// Publish user deleted event
export const publishUserDeleted = async (userId, email) => {
  try {
    await eventPublisher.publish(EventTypes.USER_DELETED, {
      userId,
      email,
      deletedAt: new Date().toISOString()
    }, {
      userId,
      priority: 'high'
    });

    logger.info('User deleted event published', { userId });
  } catch (error) {
    logger.error('Failed to publish user deleted event', {
      error: error.message,
      userId
    });
  }
};
