// Simple test to isolate the issue
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

console.log('🔍 Testing Auth Service imports...');

try {
  console.log('1. Testing basic Express...');
  const app = express();
  console.log('✅ Express OK');

  console.log('2. Testing middleware...');
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  console.log('✅ Middleware OK');

  console.log('3. Testing Shared Libraries...');
  const { logger } = await import('@gocart/shared');
  console.log('✅ Shared Libraries OK');

  console.log('4. Testing routes...');
  app.get('/health', (req, res) => {
    res.json({
      service: 'auth-simple-test',
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  });
  console.log('✅ Routes OK');

  console.log('🎉 All basic components work!');
  process.exit(0);

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
