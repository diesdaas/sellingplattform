import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { logger } from '@gocart/shared';

// Redis client for rate limiting
let redisClient;

const connectRedis = async () => {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    redisClient.on('error', (err) => {
      logger.error('Redis connection error for rate limiting', { error: err.message });
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected for rate limiting');
    });

    await redisClient.connect();
  }
  return redisClient;
};

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      url: req.originalUrl,
      userAgent: req.get('User-Agent')
    });
    res.status(options.statusCode).json(options.message);
  }
});

// Stricter limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      url: req.originalUrl
    });
    res.status(options.statusCode).json(options.message);
  }
});

// Payment endpoints limiter
export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 payment requests per minute
  message: {
    success: false,
    message: 'Too many payment requests, please try again later.',
    code: 'PAYMENT_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// File upload limiter
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 uploads per minute
  message: {
    success: false,
    message: 'Too many upload requests, please try again later.',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Initialize Redis-based rate limiting (optional, falls back to memory)
export const createRedisLimiter = async (options) => {
  try {
    const client = await connectRedis();
    return rateLimit({
      ...options,
      store: new RedisStore({
        sendCommand: (...args) => client.sendCommand(args),
      }),
    });
  } catch (error) {
    logger.warn('Failed to connect to Redis for rate limiting, using memory store', {
      error: error.message
    });
    return rateLimit(options);
  }
};

// Cleanup function
export const closeRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
};
