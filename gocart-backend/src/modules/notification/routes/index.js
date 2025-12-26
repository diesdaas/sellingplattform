import express from 'express';
import {
  sendNotification,
  sendTestNotification,
  getNotificationHistory,
  updateNotificationPreferences,
  getNotificationPreferences,
  getNotificationStats
} from '../controllers/notificationController.js';
import { asyncHandler } from '@gocart/shared';

const router = express.Router();

// Simple admin check middleware
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      code: 'ADMIN_REQUIRED'
    });
  }
  next();
};

// Module info
router.get('/', (req, res) => {
  res.json({
    module: 'notification',
    message: 'Notification module API',
    routes: ['POST /send', 'POST /test', 'GET /history/:userId', 'PUT /preferences', 'GET /preferences', 'GET /stats', 'GET /health']
  });
});

// Send notification
router.post('/send', asyncHandler(sendNotification));

// Send test notification (admin only)
router.post('/test', requireAdmin, asyncHandler(sendTestNotification));

// Get notification history
router.get('/history/:userId', asyncHandler(getNotificationHistory));

// Update notification preferences
router.put('/preferences', asyncHandler(updateNotificationPreferences));

// Get notification preferences
router.get('/preferences', asyncHandler(getNotificationPreferences));

// Get notification statistics (admin only)
router.get('/stats', requireAdmin, asyncHandler(getNotificationStats));

// Health check for notification module
router.get('/health', (req, res) => {
  res.json({
    module: 'notification',
    status: 'healthy',
    version: '1.0.0',
    emailConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
    queueConfigured: !!process.env.RABBITMQ_URL
  });
});

export default router;
