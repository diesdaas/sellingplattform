import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { services } from '../config/services.js';
import { validateJWT, requireRole } from '../middleware/auth.js';
import { paymentLimiter } from '../middleware/rateLimit.js';
import { logger } from '@gocart/shared';

const router = express.Router();

// Apply rate limiting to payment endpoints
router.use('/payments', paymentLimiter);
router.use('/payouts', paymentLimiter);

// Webhook endpoints (no auth required, but validated by Stripe)
router.post('/payments/webhook', createProxyMiddleware({
  target: services.payment.url,
  changeOrigin: true,
  pathRewrite: {
    '^/payments/webhook': '/webhook'
  },
  onProxyReq: (proxyReq, req, res) => {
    // Forward Stripe headers
    proxyReq.setHeader('X-Gateway', 'true');
    proxyReq.setHeader('X-Forwarded-For', req.ip);
    proxyReq.setHeader('X-Real-IP', req.ip);

    // Stripe signature for webhook verification
    if (req.headers['stripe-signature']) {
      proxyReq.setHeader('stripe-signature', req.headers['stripe-signature']);
    }
  },
  onError: (err, req, res) => {
    logger.error('Payment webhook proxy error', {
      error: err.message,
      url: req.originalUrl
    });

    res.status(502).json({
      success: false,
      message: 'Payment service unavailable',
      code: 'PAYMENT_SERVICE_UNAVAILABLE'
    });
  }
}));

// Public payment routes (require auth)
router.use('/payments', validateJWT);
router.use('/payouts', validateJWT);

// Proxy payment requests to payment service
router.use('/payments', createProxyMiddleware({
  target: services.payment.url,
  changeOrigin: true,
  pathRewrite: {
    '^/payments': '' // Remove /payments prefix when forwarding
  },
  onProxyReq: (proxyReq, req, res) => {
    // Forward JWT token
    if (req.token) {
      proxyReq.setHeader('authorization', `Bearer ${req.token}`);
    }

    proxyReq.setHeader('X-Gateway', 'true');
    proxyReq.setHeader('X-Forwarded-For', req.ip);
    proxyReq.setHeader('X-User-ID', req.user?.id || '');
    proxyReq.setHeader('X-User-Role', req.user?.role || '');
  },
  onProxyRes: (proxyRes, req, res) => {
    logger.debug('Payment proxy response', {
      status: proxyRes.statusCode,
      url: req.originalUrl,
      userId: req.user?.id
    });
  },
  onError: (err, req, res) => {
    logger.error('Payment proxy error', {
      error: err.message,
      url: req.originalUrl,
      userId: req.user?.id
    });

    res.status(502).json({
      success: false,
      message: 'Payment service unavailable',
      code: 'PAYMENT_SERVICE_UNAVAILABLE'
    });
  }
}));

// Payout routes (artist/admin only)
router.use('/payouts', requireRole('artist', 'admin'));

router.use('/payouts', createProxyMiddleware({
  target: services.payment.url,
  changeOrigin: true,
  pathRewrite: {
    '^/payouts': '/payouts'
  },
  onProxyReq: (proxyReq, req, res) => {
    // Forward JWT token
    if (req.token) {
      proxyReq.setHeader('authorization', `Bearer ${req.token}`);
    }

    proxyReq.setHeader('X-Gateway', 'true');
    proxyReq.setHeader('X-Forwarded-For', req.ip);
    proxyReq.setHeader('X-User-ID', req.user?.id || '');
    proxyReq.setHeader('X-User-Role', req.user?.role || '');
  },
  onProxyRes: (proxyRes, req, res) => {
    logger.debug('Payout proxy response', {
      status: proxyRes.statusCode,
      url: req.originalUrl,
      userId: req.user?.id
    });
  },
  onError: (err, req, res) => {
    logger.error('Payout proxy error', {
      error: err.message,
      url: req.originalUrl,
      userId: req.user?.id
    });

    res.status(502).json({
      success: false,
      message: 'Payment service unavailable',
      code: 'PAYMENT_SERVICE_UNAVAILABLE'
    });
  }
}));

export default router;
