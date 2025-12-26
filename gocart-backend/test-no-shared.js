// Test without shared library imports
import express from 'express';
import cors from 'cors';

// Simple response helpers (copied from shared)
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

// Simple async handler
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Simple not found handler
const notFound = (req, res) => {
  sendError(res, `Not found - ${req.originalUrl}`, 404);
};

// Simple error handler
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  console.error(err.stack);

  sendError(res, err.message || 'Internal server error', err.statusCode || 500);
};

console.log('Starting test server without shared library...');

const app = express();
const PORT = 5004;

app.use(cors());
app.use(express.json());

// Test route
app.get('/api/test', (req, res) => {
  sendSuccess(res, { message: 'Test without shared library works!' });
});

// Catalog test
app.get('/api/catalog', (req, res) => {
  sendSuccess(res, { message: 'Catalog works without shared library!' });
});

// Health check
app.get('/health', (req, res) => {
  sendSuccess(res, { status: 'healthy', server: 'no-shared-test' });
});

// 404 and error handlers
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Test server without shared library running on port ${PORT}`);
});
