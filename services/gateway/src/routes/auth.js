import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { services } from '../config/services.js';
import { validateJWT, requireRole, requireAdmin } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { logger } from '@gocart/shared';

const router = express.Router();

// Health check
router.get('/health', async (req, res) => {
  try {
    // Check auth service health
    const response = await fetch(`${services.auth.url}/health`);
    const authHealthy = response.ok;

    res.json({
      service: 'gateway',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      dependencies: {
        auth: authHealthy ? 'healthy' : 'unhealthy'
      }
    });
  } catch (error) {
    res.status(503).json({
      service: 'gateway',
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Auth routes that need special handling (no JWT required)
const publicAuthRoutes = [
  '/auth/register',
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email'
];

// Apply rate limiting to auth endpoints
router.use('/auth', authLimiter);

// Proxy auth requests to auth service
router.use('/auth', createProxyMiddleware({
  target: services.auth.url,
  changeOrigin: true,
  pathRewrite: {
    '^/auth': '' // Remove /auth prefix when forwarding
  },
  onProxyReq: (proxyReq, req, res) => {
    // Add gateway info to headers
    proxyReq.setHeader('X-Gateway', 'true');
    proxyReq.setHeader('X-Forwarded-For', req.ip);
    proxyReq.setHeader('X-Real-IP', req.ip);

    logger.debug('Proxying auth request', {
      originalUrl: req.originalUrl,
      target: `${services.auth.url}${req.url}`,
      method: req.method
    });
  },
  onProxyRes: (proxyRes, req, res) => {
    logger.debug('Auth proxy response', {
      status: proxyRes.statusCode,
      url: req.originalUrl
    });
  },
  onError: (err, req, res) => {
    logger.error('Auth proxy error', {
      error: err.message,
      url: req.originalUrl
    });

    res.status(502).json({
      success: false,
      message: 'Authentication service unavailable',
      code: 'AUTH_SERVICE_UNAVAILABLE'
    });
  }
}));

export default router;
