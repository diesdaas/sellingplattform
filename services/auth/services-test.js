// Test services initialization
console.log('🔍 Testing services initialization...');

try {
  console.log('1. Testing Shared Libraries...');
  const { logger } = await import('@gocart/shared');
  console.log('✅ Shared Libraries OK');

  console.log('2. Testing token service...');
  const { default: tokenService } = await import('./src/services/tokenService.js');
  console.log('✅ Token Service OK');

  console.log('3. Testing session service...');
  // This might hang if Redis connection fails
  console.log('Attempting to import session service...');
  const { default: sessionService } = await import('./src/services/sessionService.js');
  console.log('✅ Session Service imported');

  console.log('4. Testing email service...');
  const { default: emailService } = await import('./src/services/emailService.js');
  console.log('✅ Email Service OK');

  console.log('🎉 All services can be imported!');
  process.exit(0);

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
