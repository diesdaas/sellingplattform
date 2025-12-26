require('dotenv').config();

/**
 * Environment configuration and validation
 */
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'PORT',
];

const optionalEnvVars = {
  PRODIGI_API_KEY: null,
  PRODIGI_ENVIRONMENT: 'sandbox',
  STRIPE_SECRET_KEY: null,
  NODE_ENV: 'development',
};

// Validate required environment variables
function validateEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((key) => console.error(`   - ${key}`));
    process.exit(1);
  }

  // Set optional defaults
  Object.entries(optionalEnvVars).forEach(([key, defaultValue]) => {
    if (!process.env[key] && defaultValue !== null) {
      process.env[key] = defaultValue;
    }
  });

  console.log('✅ Environment variables validated');
}

// Export configuration
const config = {
  database: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  prodigi: {
    apiKey: process.env.PRODIGI_API_KEY,
    environment: process.env.PRODIGI_ENVIRONMENT || 'sandbox',
    baseUrl: process.env.PRODIGI_ENVIRONMENT === 'sandbox'
      ? 'https://api.sandbox.prodigi.com/v4.0'
      : 'https://api.prodigi.com/v4.0',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
  },
  server: {
    port: parseInt(process.env.PORT, 10) || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
  },
};

module.exports = {
  config,
  validateEnv,
};

