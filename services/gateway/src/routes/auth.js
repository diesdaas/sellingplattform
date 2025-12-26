import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

console.log('🔄 AUTH ROUTES FILE LOADED');

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  console.log('Auth test route hit');
  res.json({ message: 'Auth routes working' });
});

// Simple proxy to auth service
router.use('/', createProxyMiddleware({
  target: 'http://auth:3002',
  changeOrigin: true,
  pathRewrite: {
    '^/auth': ''
  },
  timeout: 30000,
  onProxyReq: (proxyReq, req) => {
    console.log(`Proxying ${req.method} ${req.url} -> ${proxyReq.path}`);
  },
  onProxyRes: (proxyRes, req) => {
    console.log(`Auth response: ${proxyRes.statusCode} for ${req.url}`);
  },
  onError: (err, req, res) => {
    console.error('Auth proxy error:', err.message);
    if (!res.headersSent) {
      res.status(502).json({
        success: false,
        message: 'Authentication service unavailable',
        code: 'AUTH_SERVICE_UNAVAILABLE'
      });
    }
  }
}));

export default router;
