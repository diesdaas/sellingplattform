// Simple health check test without loading complex modules
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { requestLogger, errorHandler, asyncHandler, notFound } from '@gocart/shared';
import { eventPublisher } from '@gocart/shared';
import { logger } from '@gocart/shared';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Prisma
const prisma = new PrismaClient();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Health check
app.get('/health', asyncHandler(async (req, res) => {
  const dbHealthy = await prisma.$queryRaw`SELECT 1`.catch(() => false);

  const isHealthy = dbHealthy;

  res.status(isHealthy ? 200 : 503).json({
    service: 'gocart-backend-test',
    status: isHealthy ? 'healthy' : 'unhealthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dependencies: {
      database: dbHealthy ? 'healthy' : 'unhealthy'
    }
  });
}));

app.use(notFound);
app.use(errorHandler);

// Initialize services
const initializeServices = async () => {
  try {
    await eventPublisher.connect();
    logger.info('Event publisher connected');
  } catch (error) {
    logger.warn('Event publisher failed to connect', { error: error.message });
  }
};

initializeServices();

app.listen(PORT, () => {
  logger.info(`🚀 Backend test server running on port ${PORT}`);
});
