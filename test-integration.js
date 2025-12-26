#!/usr/bin/env node

// GoCart Integration Tests
import { execSync } from 'child_process';

const BASE_URL = 'http://localhost:8080';

console.log('🧪 Running GoCart Integration Tests...\n');

// Test helper
async function testEndpoint(name, url, options = {}) {
  try {
    const cmd = `curl -s ${options.method ? `-X ${options.method}` : ''} "${url}" ${options.data ? `-H "Content-Type: application/json" -d '${JSON.stringify(options.data)}'` : ''}`;
    const result = execSync(cmd, { encoding: 'utf8' });
    const response = JSON.parse(result);

    if (response.success !== false) {
      console.log(`✅ ${name}: PASSED`);
      return true;
    } else {
      console.log(`❌ ${name}: FAILED - ${response.message}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: ERROR - ${error.message}`);
    return false;
  }
}

// Test health endpoints
async function runHealthTests() {
  console.log('🏥 Testing Service Health...');

  const tests = [
    ['API Gateway', `${BASE_URL}/health`],
    ['Auth Service', `${BASE_URL}/auth/health`],
    ['Payment Service', `${BASE_URL}/payments/health`],
    ['Backend Service', `${BASE_URL}/api/health`]
  ];

  let passed = 0;
  for (const [name, url] of tests) {
    if (await testEndpoint(name, url)) passed++;
  }

  console.log(`Health Tests: ${passed}/${tests.length} passed\n`);
  return passed === tests.length;
}

// Test catalog endpoints
async function runCatalogTests() {
  console.log('📦 Testing Catalog API...');

  const tests = [
    ['List Products', `${BASE_URL}/api/catalog/products`],
    ['List Artworks', `${BASE_URL}/api/catalog/artworks`],
    ['Catalog Module Info', `${BASE_URL}/api/catalog/`]
  ];

  let passed = 0;
  for (const [name, url] of tests) {
    if (await testEndpoint(name, url)) passed++;
  }

  console.log(`Catalog Tests: ${passed}/${tests.length} passed\n`);
  return passed === tests.length;
}

// Test auth endpoints (basic)
async function runAuthTests() {
  console.log('🔐 Testing Auth API (Basic)...');

  // Test with invalid data to verify validation
  const invalidRegister = await testEndpoint(
    'Invalid Registration',
    `${BASE_URL}/auth/register`,
    {
      method: 'POST',
      data: { email: 'invalid', password: '123' }
    }
  );

  // This should fail validation, so if it returns success=false, that's actually correct
  const passed = !invalidRegister; // We expect this to fail

  console.log(`${passed ? '✅' : '❌'} Auth Validation: ${passed ? 'PASSED' : 'FAILED'}\n`);
  return passed;
}

// Test API Gateway routing
async function runGatewayTests() {
  console.log('🌐 Testing API Gateway Routing...');

  let passed = 0;

  // Test auth routing
  try {
    const result = execSync(`curl -s "${BASE_URL}/auth/health"`, { encoding: 'utf8' });
    if (result.includes('auth-service')) {
      console.log('✅ Auth Routing: PASSED');
      passed++;
    }
  } catch (error) {
    console.log('❌ Auth Routing: FAILED');
  }

  // Test catalog routing
  try {
    const result = execSync(`curl -s "${BASE_URL}/api/catalog/products"`, { encoding: 'utf8' });
    if (result.includes('Products retrieved successfully')) {
      console.log('✅ Catalog Routing: PASSED');
      passed++;
    }
  } catch (error) {
    console.log('❌ Catalog Routing: FAILED');
  }

  console.log(`Gateway Tests: ${passed}/2 passed\n`);
  return passed === 2;
}

// Main test runner
async function runTests() {
  console.log('🚀 GoCart Integration Test Suite\n');

  const results = await Promise.all([
    runHealthTests(),
    runCatalogTests(),
    runAuthTests(),
    runGatewayTests()
  ]);

  const totalPassed = results.filter(Boolean).length;
  const totalTests = results.length;

  console.log('='.repeat(50));
  console.log(`📊 Test Results: ${totalPassed}/${totalTests} test suites passed`);

  if (totalPassed === totalTests) {
    console.log('🎉 All integration tests PASSED!');
    process.exit(0);
  } else {
    console.log('❌ Some tests FAILED. Check the output above.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});
