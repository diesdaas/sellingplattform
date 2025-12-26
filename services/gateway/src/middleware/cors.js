import cors from 'cors';

// CORS configuration
export const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',      // Next.js dev server
      'http://localhost:3001',      // Auth service for testing
      'http://localhost:3002',      // Payment service for testing
      'https://gocart.com',         // Production domain
      'https://www.gocart.com',     // Production www domain
      'https://admin.gocart.com',   // Admin subdomain
      'https://artist.gocart.com',  // Artist subdomain
    ];

    // Allow localhost for development
    if (origin.includes('localhost')) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
    'X-API-Key',
    'X-CSRF-Token'
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset'
  ],
  maxAge: 86400 // 24 hours
};

export const corsMiddleware = cors(corsOptions);
