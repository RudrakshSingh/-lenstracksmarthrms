/**
 * Local Test Script - All Fixes
 * Tests all the fixes locally before pushing to production
 */

const BASE_URL = 'http://localhost';
const services = {
  auth: 3001,
  hr: 3002,
  attendance: 3003,
  tenantRegistry: 3020
};

const results = {
  passed: [],
  failed: [],
  skipped: []
};

async function makeRequest(service, path, options = {}) {
  const port = services[service] || service;
  const url = `${BASE_URL}:${port}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return {
      status: response.status,
      ok: response.ok,
      data
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
      data: null
    };
  }
}

async function test(name, service, path, options = {}) {
  const result = await makeRequest(service, path, options);
  
  const success = result.ok || (options.expectStatus && result.status === options.expectStatus);
  
  if (success) {
    results.passed.push({ name, status: result.status });
    console.log(`✅ ${name} (${result.status})`);
  } else {
    results.failed.push({ name, status: result.status, error: result.error || result.data?.message });
    console.log(`❌ ${name} (${result.status})`);
    if (result.data && typeof result.data === 'object' && result.data.message) {
      console.log(`   Error: ${result.data.message}`);
    }
  }

  return { success, result };
}

async function runTests() {
  console.log('\n================================================================================');
  console.log('🧪 LOCAL TEST - ALL FIXES');
  console.log('================================================================================');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('================================================================================\n');

  // Get auth token first
  console.log('📋 STEP 1: Getting Auth Token...');
  console.log('─────────────────────────────────────────────────────────────────────────────');
  
  const tokenResult = await makeRequest('auth', '/api/auth/mock-login-fast', {
    method: 'POST',
    body: { role: 'admin' }
  });

  let authToken = null;
  if (tokenResult.ok && tokenResult.data?.data?.accessToken) {
    authToken = tokenResult.data.data.accessToken;
    console.log(`✅ Auth token obtained: ${authToken.substring(0, 50)}...`);
  } else {
    console.log(`❌ Failed to get auth token`);
    console.log(`   Status: ${tokenResult.status}`);
    console.log(`   Error: ${tokenResult.data?.message || tokenResult.error || 'Unknown error'}`);
    return;
  }

  console.log('\n📋 STEP 2: Testing Auth Profile Endpoint (Mock Token Fix)...');
  console.log('─────────────────────────────────────────────────────────────────────────────');
  
  await test('Auth Profile', 'auth', '/api/auth/profile', {
    method: 'GET',
    token: authToken
  });

  console.log('\n📋 STEP 3: Testing HR Service...');
  console.log('─────────────────────────────────────────────────────────────────────────────');
  
  await test('HR Health', 'hr', '/api/hr/health', { method: 'GET' });
  
  if (authToken) {
    await test('HR Employees', 'hr', '/api/hr/employees', {
      method: 'GET',
      token: authToken
    });
  }

  console.log('\n📋 STEP 4: Testing Attendance Service (Clock-In Payload Fix)...');
  console.log('─────────────────────────────────────────────────────────────────────────────');
  
  await test('Attendance Health', 'attendance', '/api/attendance/health', { method: 'GET' });
  
  if (authToken) {
    await test('Attendance Clock-In', 'attendance', '/api/attendance/clock-in', {
      method: 'POST',
      token: authToken,
      body: {
        latitude: 28.6139,
        longitude: 77.2090,
        notes: 'Local test clock-in'
      }
    });

    await test('Attendance Stats', 'attendance', '/api/attendance/stats', {
      method: 'GET',
      token: authToken
    });
  }

  console.log('\n📋 STEP 5: Testing Tenant Registry Service (Health Endpoint Fix)...');
  console.log('─────────────────────────────────────────────────────────────────────────────');
  
  await test('Tenant Registry Health', 'tenantRegistry', '/health', { method: 'GET' });
  
  if (authToken) {
    await test('Tenant Registry List', 'tenantRegistry', '/api/tenants', {
      method: 'GET',
      token: authToken
    });
  }

  // Summary
  console.log('\n================================================================================');
  console.log('📊 TEST SUMMARY');
  console.log('================================================================================');
  console.log(`Total Tests: ${results.passed.length + results.failed.length}`);
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`Success Rate: ${((results.passed.length / (results.passed.length + results.failed.length)) * 100).toFixed(1)}%`);
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.failed.forEach(test => {
      console.log(`  - ${test.name} (${test.status})`);
      if (test.error) console.log(`    Error: ${test.error}`);
    });
  }

  console.log('\n================================================================================');
  
  if (results.failed.length === 0) {
    console.log('🎉 ALL TESTS PASSED! Ready to push to production.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please fix issues before pushing.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test execution error:', error);
  process.exit(1);
});

