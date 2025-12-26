import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { requestLogger, errorHandler, asyncHandler, notFound } from '@gocart/shared';
import { eventPublisher } from '@gocart/shared';
import sessionService from './services/sessionService.js';
import routes from './routes/index.js';
import { logger } from '@gocart/shared';

// Load environment variables
dotenv.config();

// Initialize Prisma
const prisma = new PrismaClient();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

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
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Health check with service status
app.get('/health', asyncHandler(async (req, res) => {
  const dbHealthy = await prisma.$queryRaw`SELECT 1`.catch(() => false);
  const redisHealthy = await sessionService.client?.ping().catch(() => false);

  const isHealthy = dbHealthy && redisHealthy;

  res.status(isHealthy ? 200 : 503).json({
    service: 'auth-service',
    status: isHealthy ? 'healthy' : 'unhealthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dependencies: {
      database: dbHealthy ? 'healthy' : 'unhealthy',
      redis: redisHealthy ? 'healthy' : 'unhealthy',
      rabbitmq: eventPublisher.connected ? 'healthy' : 'unhealthy'
    }
  });
}));

// API routes
app.use('/', routes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Initialize services
const initializeServices = async () => {
  try {
    // Connect to database
    await prisma.$connect();
    logger.info('Database connected');

    // Initialize session service (non-blocking)
    sessionService.connect().catch(error => {
      logger.warn('Session service failed to connect', { error: error.message });
    });
    logger.info('Session service initialization started');

    // Connect to RabbitMQ
    await eventPublisher.connect();
    logger.info('Event publisher connected');

  } catch (error) {
    logger.error('Service initialization failed', { error: error.message });
    // Continue without failing - services might connect later
  }
};

// Start server
const startServer = async () => {
  await initializeServices();

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Auth service running on port ${PORT}`, {
      environment: process.env.NODE_ENV || 'development',
      port: PORT,
      host: '0.0.0.0'
    });

    console.log('\n📋 Auth Service Configuration:');
    console.log(`   Port: ${PORT}`);
    console.log(`   Database: ${process.env.DATABASE_URL ? 'Configured' : 'Not configured'}`);
    console.log(`   Redis: ${process.env.REDIS_URL || 'redis://localhost:6379'}`);
    console.log(`   RabbitMQ: ${process.env.RABBITMQ_URL || 'amqp://localhost'}`);
    console.log(`   JWT Secret: ${process.env.JWT_SECRET ? 'Set' : 'Not set'}`);
    console.log(`   Email: ${process.env.SMTP_HOST ? 'Configured' : 'Not configured'}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });
};

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Received shutdown signal, closing services...');

  try {
    await prisma.$disconnect();
    await sessionService.close();
    await eventPublisher.close();

    logger.info('All services closed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});

// Start the server
startServer().catch((error) => {
  logger.error('Failed to start server', { error: error.message });
  process.exit(1);
});

export default app;
