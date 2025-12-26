// Standardized error codes for consistent error handling across services
export const ERROR_CODES = {
  // Authentication & Authorization
  INVALID_CREDENTIALS: 'AUTH_001',
  TOKEN_EXPIRED: 'AUTH_002',
  TOKEN_INVALID: 'AUTH_003',
  USER_NOT_FOUND: 'AUTH_004',
  USER_NOT_VERIFIED: 'AUTH_005',
  PASSWORD_TOO_WEAK: 'AUTH_006',
  EMAIL_ALREADY_EXISTS: 'AUTH_007',
  INSUFFICIENT_PERMISSIONS: 'AUTH_008',

  // Validation
  VALIDATION_FAILED: 'VAL_001',
  MISSING_REQUIRED_FIELD: 'VAL_002',
  INVALID_FORMAT: 'VAL_003',
  INVALID_EMAIL: 'VAL_004',
  INVALID_PASSWORD: 'VAL_005',

  // Resources
  RESOURCE_NOT_FOUND: 'RES_001',
  RESOURCE_ALREADY_EXISTS: 'RES_002',
  RESOURCE_CONFLICT: 'RES_003',

  // Payments
  PAYMENT_FAILED: 'PAY_001',
  PAYMENT_DECLINED: 'PAY_002',
  INSUFFICIENT_FUNDS: 'PAY_003',
  PAYMENT_TIMEOUT: 'PAY_004',
  STRIPE_ERROR: 'PAY_005',

  // Orders
  ORDER_NOT_FOUND: 'ORD_001',
  ORDER_ALREADY_PROCESSED: 'ORD_002',
  ORDER_CANCELLED: 'ORD_003',
  INVALID_ORDER_STATUS: 'ORD_004',

  // Products
  PRODUCT_NOT_FOUND: 'PROD_001',
  PRODUCT_OUT_OF_STOCK: 'PROD_002',
  INVALID_PRODUCT_DATA: 'PROD_003',

  // Uploads
  UPLOAD_FAILED: 'UP_001',
  FILE_TOO_LARGE: 'UP_002',
  INVALID_FILE_TYPE: 'UP_003',
  UPLOAD_TIMEOUT: 'UP_004',

  // System
  INTERNAL_ERROR: 'SYS_001',
  DATABASE_ERROR: 'SYS_002',
  EXTERNAL_SERVICE_ERROR: 'SYS_003',
  RATE_LIMIT_EXCEEDED: 'SYS_004'
};

// Error messages mapped to codes
export const ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid email or password',
  [ERROR_CODES.TOKEN_EXPIRED]: 'Authentication token has expired',
  [ERROR_CODES.TOKEN_INVALID]: 'Invalid authentication token',
  [ERROR_CODES.USER_NOT_FOUND]: 'User not found',
  [ERROR_CODES.USER_NOT_VERIFIED]: 'Please verify your email address',
  [ERROR_CODES.PASSWORD_TOO_WEAK]: 'Password does not meet requirements',
  [ERROR_CODES.EMAIL_ALREADY_EXISTS]: 'Email address already registered',
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions',
  [ERROR_CODES.VALIDATION_FAILED]: 'Validation failed',
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 'Required field is missing',
  [ERROR_CODES.INVALID_FORMAT]: 'Invalid data format',
  [ERROR_CODES.INVALID_EMAIL]: 'Invalid email address',
  [ERROR_CODES.INVALID_PASSWORD]: 'Invalid password format',
  [ERROR_CODES.RESOURCE_NOT_FOUND]: 'Resource not found',
  [ERROR_CODES.RESOURCE_ALREADY_EXISTS]: 'Resource already exists',
  [ERROR_CODES.RESOURCE_CONFLICT]: 'Resource conflict',
  [ERROR_CODES.PAYMENT_FAILED]: 'Payment processing failed',
  [ERROR_CODES.PAYMENT_DECLINED]: 'Payment was declined',
  [ERROR_CODES.INSUFFICIENT_FUNDS]: 'Insufficient funds',
  [ERROR_CODES.PAYMENT_TIMEOUT]: 'Payment timeout',
  [ERROR_CODES.STRIPE_ERROR]: 'Payment service error',
  [ERROR_CODES.ORDER_NOT_FOUND]: 'Order not found',
  [ERROR_CODES.ORDER_ALREADY_PROCESSED]: 'Order already processed',
  [ERROR_CODES.ORDER_CANCELLED]: 'Order has been cancelled',
  [ERROR_CODES.INVALID_ORDER_STATUS]: 'Invalid order status',
  [ERROR_CODES.PRODUCT_NOT_FOUND]: 'Product not found',
  [ERROR_CODES.PRODUCT_OUT_OF_STOCK]: 'Product is out of stock',
  [ERROR_CODES.INVALID_PRODUCT_DATA]: 'Invalid product data',
  [ERROR_CODES.UPLOAD_FAILED]: 'File upload failed',
  [ERROR_CODES.FILE_TOO_LARGE]: 'File size exceeds limit',
  [ERROR_CODES.INVALID_FILE_TYPE]: 'Invalid file type',
  [ERROR_CODES.UPLOAD_TIMEOUT]: 'Upload timeout',
  [ERROR_CODES.INTERNAL_ERROR]: 'Internal server error',
  [ERROR_CODES.DATABASE_ERROR]: 'Database operation failed',
  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 'External service error',
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded'
};
