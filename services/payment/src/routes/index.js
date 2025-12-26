import express from 'express';
import * as paymentController from '../controllers/paymentController.js';
import * as payoutController from '../controllers/payoutController.js';
import * as webhookController from '../controllers/webhookController.js';
import { asyncHandler } from '@gocart/shared';
import { logger } from '@gocart/shared';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    service: 'payment-service',
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Webhook endpoints (public - validated by Stripe)
router.post('/webhook', express.raw({ type: 'application/json' }), asyncHandler(webhookController.handleWebhook));
router.get('/webhook/health', webhookController.webhookHealth);

// Payment endpoints (protected)
router.post('/create-intent', asyncHandler(paymentController.createPaymentIntent));
router.post('/confirm', asyncHandler(paymentController.confirmPayment));
router.get('/payment/:paymentId', asyncHandler(paymentController.getPayment));
router.get('/payments', asyncHandler(paymentController.getUserPayments));
router.post('/refund', asyncHandler(paymentController.createRefund));
router.get('/refund/:refundId', asyncHandler(paymentController.getRefund));

// Payout endpoints (artist/admin only)
router.get('/balance', asyncHandler(payoutController.getArtistBalance));
router.post('/connect/account', asyncHandler(payoutController.createConnectAccount));
router.get('/connect/account', asyncHandler(payoutController.getConnectAccount));
router.post('/connect/link/:accountId', asyncHandler(payoutController.createAccountLink));
router.post('/request', asyncHandler(payoutController.requestPayout));
router.get('/history', asyncHandler(payoutController.getPayoutHistory));
router.get('/payout/:payoutId', asyncHandler(payoutController.getPayout));
router.get('/dashboard', asyncHandler(payoutController.getDashboardLink));

// Request logging middleware
router.use((req, res, next) => {
  logger.info(`Payment route accessed: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    body: req.method !== 'GET' ? '[FILTERED]' : undefined
  });
  next();
});

export default router;
