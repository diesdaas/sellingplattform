import { AppError } from '../errors/AppError.js';
import { sendError } from '../utils/response.js';
import logger from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  // Simple error handler for debugging
  console.error('Error:', err.message);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
};

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 404 handler
export const notFound = (req, res, next) => {
  const error = new AppError(`Not found - ${req.originalUrl}`, 404);
  next(error);
};
