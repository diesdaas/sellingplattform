import { requestLogger } from '@gocart/shared';

// Enhanced request logging for gateway
export const gatewayLogger = (req, res, next) => {
  const start = Date.now();

  // Log incoming request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${req.ip}`);

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const contentLength = res.get('Content-Length') || 0;

    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${status} - ${duration}ms - ${contentLength} bytes`);
  });

  next();
};

// Request body logging (sensitive data filtered)
export const bodyLogger = (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const originalBody = req.body;

    // Create a sanitized copy for logging
    const sanitizedBody = { ...originalBody };

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'refreshToken', 'creditCard', 'cvv'];
    sensitiveFields.forEach(field => {
      if (sanitizedBody[field]) {
        sanitizedBody[field] = '[FILTERED]';
      }
    });

    console.log(`[${new Date().toISOString()}] Request Body:`, JSON.stringify(sanitizedBody, null, 2));
  }

  next();
};

// Error logging
export const errorLogger = (error, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    params: req.params,
    query: req.query
  });

  next(error);
};
