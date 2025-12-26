import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { services } from '../config/services.js';
import { validateJWT, optionalAuth, requireRole, requireAdmin, requireArtistOrAdmin } from '../middleware/auth.js';
import { apiLimiter, uploadLimiter } from '../middleware/rateLimit.js';
import { logger } from '@gocart/shared';

const router = express.Router();

// Apply general rate limiting to all API routes
router.use(apiLimiter);

// Health check
router.get('/health', async (req, res) => {
  try {
    // Check backend service health
    const response = await fetch(`${services.backend.url}/health`);
    const backendHealthy = response.ok;

    res.json({
      service: 'gateway',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      dependencies: {
        backend: backendHealthy ? 'healthy' : 'unhealthy'
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

// Public routes (no auth required)
const publicRoutes = [
  '/products',           // GET /products (with optional auth for personalization)
  '/products/:id',       // GET /products/:id
  '/artists',            // GET /artists
  '/artists/:id',        // GET /artists/:id
  '/portfolios/:username', // GET /portfolios/:username
  '/shops/:username',    // GET /shops/:username
  '/reviews',            // GET /reviews (with product filter)
  '/categories',         // GET /categories
  '/search'              // GET /search
];

// Apply optional auth to public routes
router.use(publicRoutes, optionalAuth);

// Admin routes (admin only)
const adminRoutes = [
  '/admin/stores',
  '/admin/coupons',
  '/admin/analytics'
];

router.use(adminRoutes, validateJWT);
router.use(adminRoutes, requireAdmin);

// Artist routes (artist or admin)
const artistRoutes = [
  '/store',
  '/artworks',
  '/orders'  // Artists can view their own orders
];

router.use(artistRoutes, validateJWT);
router.use(artistRoutes, requireArtistOrAdmin);

// User routes (authenticated users)
const userRoutes = [
  '/user/profile',
  '/user/addresses',
  '/cart',
  '/orders',     // User's orders
  '/wishlist'
];

router.use(userRoutes, validateJWT);

// Upload routes (authenticated users, stricter rate limiting)
const uploadRoutes = [
  '/upload',
  '/media'
];

router.use(uploadRoutes, validateJWT);
router.use(uploadRoutes, uploadLimiter);

// Proxy all API requests to backend service
router.use('/', createProxyMiddleware({
  target: services.backend.url,
  changeOrigin: true,
  pathRewrite: (path, req) => {
    // Rewrite /api/products to /api/catalog/products
    if (path.startsWith('/api/products')) {
      return path.replace('/api/products', '/api/catalog/products');
    }
    // Rewrite /api/artworks to /api/catalog/artworks
    if (path.startsWith('/api/artworks')) {
      return path.replace('/api/artworks', '/api/catalog/artworks');
    }
    // Keep other /api paths as is
    return path;
  },
  onProxyReq: (proxyReq, req, res) => {
    // Forward JWT token if present
    if (req.token) {
      proxyReq.setHeader('authorization', `Bearer ${req.token}`);
    }

    // Add gateway and user info headers
    proxyReq.setHeader('X-Gateway', 'true');
    proxyReq.setHeader('X-Forwarded-For', req.ip);
    proxyReq.setHeader('X-Real-IP', req.ip);
    proxyReq.setHeader('X-User-ID', req.user?.id || '');
    proxyReq.setHeader('X-User-Role', req.user?.role || '');
    proxyReq.setHeader('X-Request-ID', req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

    logger.debug('Proxying API request', {
      originalUrl: req.originalUrl,
      target: `${services.backend.url}${req.url}`,
      method: req.method,
      userId: req.user?.id,
      hasAuth: !!req.token
    });
  },
  onProxyRes: (proxyRes, req, res) => {
    logger.debug('API proxy response', {
      status: proxyRes.statusCode,
      url: req.originalUrl,
      userId: req.user?.id,
      responseTime: Date.now() - req.startTime
    });
  },
  onError: (err, req, res) => {
    logger.error('API proxy error', {
      error: err.message,
      url: req.originalUrl,
      userId: req.user?.id,
      target: services.backend.url
    });

    // Return service unavailable error
    if (!res.headersSent) {
      res.status(502).json({
        success: false,
        message: 'Backend service unavailable',
        code: 'BACKEND_SERVICE_UNAVAILABLE',
        timestamp: new Date().toISOString()
      });
    }
  }
}));

export default router;
