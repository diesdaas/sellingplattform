import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
// Temporary local implementations to avoid shared library issues
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

const sendError = (res, message, statusCode = 500, code = null) => {
  res.status(statusCode).json({
    success: false,
    message,
    code,
    timestamp: new Date().toISOString()
  });
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const notFound = (req, res) => {
  sendError(res, `Not found - ${req.originalUrl}`, 404);
};

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  console.error(err.stack);
  sendError(res, err.message || 'Internal server error', err.statusCode || 500);
};

const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
};

// Simple logger
const logger = {
  info: (message, context = {}) => console.log(`INFO: ${message}`, context),
  error: (message, context = {}) => console.error(`ERROR: ${message}`, context),
  warn: (message, context = {}) => console.warn(`WARN: ${message}`, context)
};

// Simple event publisher mock
const eventPublisher = {
  connect: async () => console.log('Event publisher connected (mock)'),
  publish: async (event, data) => console.log('Event published (mock):', event, data)
};

// import eventSubscriber from './shared/events/subscriber.js';
import { catalogModule } from './modules/catalog/index.js';
import { orderModule } from './modules/order/index.js';
import { mediaModule } from './modules/media/index.js';
import { notificationModule } from './modules/notification/index.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Global middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Test route to verify mounting works (before other middleware)
app.get('/api/test', (req, res) => {
  res.json({ message: 'API mounting works', timestamp: new Date().toISOString() });
});

// Health check
app.get('/health', (req, res) => {
  sendSuccess(res, {
    service: 'gocart-backend',
    status: 'healthy',
    version: '1.0.0',
    uptime: process.uptime(),
    modules: 'Modules commented out for testing'
  });
});

// Register modules
const modules = [catalogModule, orderModule, mediaModule, notificationModule];

modules.forEach(module => {
  if (Array.isArray(module.routes)) {
    // Module has multiple route files
    module.routes.forEach(routeFile => {
      app.use(`/api/${module.name}`, routeFile);
    });
  } else {
    // Module has single route file
    app.use(`/api/${module.name}`, module.routes);
  }

  logger.info(`Module ${module.name} registered`, {
    version: module.version,
    placeholder: module.placeholder || false
  });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Initialize services
const initializeServices = async () => {
  try {
    // Connect to event publisher
    await eventPublisher.connect();
    logger.info('Event publisher connected');

    // Initialize notification queue consumer (mock for now)
    logger.info('Notification services initialized (mock)');

  } catch (error) {
    logger.error('Service initialization failed', { error: error.message });
    // Don't fail startup if event system fails
  }
};

// Initialize services
initializeServices();

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Database: ${process.env.DATABASE_URL ? 'Configured' : 'Not configured'}`);
  console.log(`   JWT Secret: ${process.env.JWT_SECRET ? 'Set' : 'Not set'}`);
});

export default app;
