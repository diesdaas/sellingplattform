import express from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { corsMiddleware } from './middleware/cors.js';
import { gatewayLogger, bodyLogger, errorLogger } from './middleware/logging.js';
import authRoutes from './routes/auth.js';
import paymentRoutes from './routes/payments.js';
import apiRoutes from './routes/api.js';
import { notFound, errorHandler, asyncHandler } from '@gocart/shared';
import { logger } from '@gocart/shared';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 8080;

// Trust proxy (important for rate limiting and IP detection)
app.set('trust proxy', 1);

// Global middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(gatewayLogger);
if (process.env.NODE_ENV === 'development') {
  app.use(bodyLogger);
}

// Request timing middleware
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Health check endpoint
app.get('/health', asyncHandler(async (req, res) => {
  res.json({
    service: 'gateway',
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
}));

// Service status endpoint
app.get('/status', asyncHandler(async (req, res) => {
  const { getAllServiceStatus } = await import('./config/services.js');
  const status = await getAllServiceStatus();

  res.json({
    service: 'gateway',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: status
  });
}));

// API routes
app.use('/auth', authRoutes);
app.use('/payments', paymentRoutes);
app.use('/payouts', paymentRoutes); // Payouts are handled by payment service
app.use('/api', apiRoutes);

// Error logging middleware
app.use(errorLogger);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Gateway server running on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    port: PORT
  });

  // Log service URLs
  console.log('\n📋 Gateway Configuration:');
  console.log(`   Port: ${PORT}`);
  console.log(`   Auth Service: ${process.env.AUTH_SERVICE_URL || 'http://localhost:3001'}`);
  console.log(`   Payment Service: ${process.env.PAYMENT_SERVICE_URL || 'http://localhost:3002'}`);
  console.log(`   Backend Service: ${process.env.BACKEND_URL || 'http://localhost:5000'}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;
