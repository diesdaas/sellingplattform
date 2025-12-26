import { sendSuccess } from '@gocart/shared';
import { NotFoundError } from '@gocart/shared';
import emailService from '../services/emailService.js';
import templateService from '../services/templateService.js';
import queueService from '../services/queueService.js';
import { logger } from '@gocart/shared';

// Send notification
export const sendNotification = async (req, res) => {
  try {
    const { type, recipient, data, channel = 'email' } = req.body;

    if (!type || !recipient) {
      throw new NotFoundError('Type and recipient are required');
    }

    logger.info('Sending notification', {
      type,
      recipient,
      channel,
      userId: req.user?.id
    });

    // Queue notification for processing
    await queueService.queueNotification({
      type,
      recipient,
      data,
      channel,
      requestedBy: req.user?.id
    });

    sendSuccess(res, {
      message: 'Notification queued successfully',
      type,
      recipient,
      channel,
      queued: true
    });

  } catch (error) {
    logger.error('Send notification failed', { error: error.message });
    throw error;
  }
};

// Send test notification
export const sendTestNotification = async (req, res) => {
  try {
    const { email, type = 'test' } = req.body;

    if (!email) {
      throw new NotFoundError('Email is required');
    }

    logger.info('Sending test notification', {
      email,
      type,
      userId: req.user?.id
    });

    // Send test email directly
    const template = templateService.getTemplate('test', {
      recipientEmail: email,
      testData: { timestamp: new Date().toISOString() }
    });

    await emailService.sendEmail(email, template.subject, template.html, template.text);

    sendSuccess(res, {
      message: 'Test notification sent successfully',
      email,
      type
    });

  } catch (error) {
    logger.error('Send test notification failed', { error: error.message });
    throw error;
  }
};

// Get notification history for user
export const getNotificationHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Verify user can access this data
    if (req.user?.id !== userId && req.user?.role !== 'admin') {
      throw new NotFoundError('Access denied');
    }

    logger.info('Getting notification history', {
      userId,
      page,
      limit,
      requestedBy: req.user?.id
    });

    // TODO: Implement notification history from database
    // For now, return empty array
    const notifications = [];

    sendSuccess(res, {
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        totalPages: 0
      }
    });

  } catch (error) {
    logger.error('Get notification history failed', { error: error.message });
    throw error;
  }
};

// Update notification preferences
export const updateNotificationPreferences = async (req, res) => {
  try {
    const { preferences } = req.body;
    const userId = req.user.id;

    logger.info('Updating notification preferences', {
      userId,
      preferences
    });

    // TODO: Save preferences to database
    // For now, just acknowledge
    sendSuccess(res, {
      message: 'Notification preferences updated',
      preferences,
      userId
    });

  } catch (error) {
    logger.error('Update notification preferences failed', { error: error.message });
    throw error;
  }
};

// Get notification preferences
export const getNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.id;

    logger.info('Getting notification preferences', { userId });

    // TODO: Get preferences from database
    // For now, return default preferences
    const preferences = {
      email: {
        orderUpdates: true,
        promotions: true,
        securityAlerts: true,
        newsletters: false
      },
      push: {
        orderUpdates: true,
        newMessages: true,
        promotions: false
      }
    };

    sendSuccess(res, { preferences });

  } catch (error) {
    logger.error('Get notification preferences failed', { error: error.message });
    throw error;
  }
};

// Get notification statistics (admin only)
export const getNotificationStats = async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;

    logger.info('Getting notification statistics', {
      timeframe,
      userId: req.user?.id
    });

    // TODO: Get real statistics from database/queue
    // For now, return mock data
    const stats = {
      timeframe,
      totalSent: 0,
      totalQueued: 0,
      totalFailed: 0,
      byType: {},
      byChannel: {
        email: 0,
        push: 0,
        sms: 0
      }
    };

    sendSuccess(res, { stats });

  } catch (error) {
    logger.error('Get notification stats failed', { error: error.message });
    throw error;
  }
};
