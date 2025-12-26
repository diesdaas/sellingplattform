// Test database connection
import { PrismaClient } from '@prisma/client';

console.log('🔍 Testing database connection...');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

try {
  console.log('Connecting to database...');
  await prisma.$connect();
  console.log('✅ Database connection successful');

  console.log('Testing simple query...');
  const result = await prisma.$queryRaw`SELECT 1 as test`;
  console.log('✅ Query successful:', result);

  await prisma.$disconnect();
  console.log('✅ Database test completed');
  process.exit(0);

} catch (error) {
  console.error('❌ Database error:', error.message);
  console.error(error.code);
  process.exit(1);
}
