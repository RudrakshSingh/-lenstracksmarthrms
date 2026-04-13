/**
 * Comprehensive Production API Test
 * Tests all endpoints across all services on production
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BASE_URL = 'https://98.70.245.87';
const API_HOST = 'api.etelios.com';

const results = {
  passed: [],
  failed: [],
  skipped: [],
  services: {}
};

async function makeRequest(method, path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'Host': API_HOST,
    ...options.headers
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  try {
    const response = await fetch(url, {
      method,
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
      data,
      headers: Object.fromEntries(response.headers.entries())
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

async function test(name, method, path, options = {}) {
  const result = await makeRequest(method, path, options);
  
  const success = result.ok || (options.expectStatus && result.status === options.expectStatus);
  
  if (success) {
    results.passed.push({ name, status: result.status, path });
    process.stdout.write(`✅ ${name} (${result.status})\n`);
  } else {
    results.failed.push({ 
      name, 
      status: result.status, 
      path,
      error: result.error || result.data?.message || 'Unknown error'
    });
    process.stdout.write(`❌ ${name} (${result.status})\n`);
    if (result.data && typeof result.data === 'object' && result.data.message) {
      process.stdout.write(`   Error: ${result.data.message.substring(0, 100)}\n`);
    }
  }

  return { success, result };
}

async function runTests() {
  console.log('\n================================================================================');
  console.log('🚀 COMPREHENSIVE PRODUCTION API TEST');
  console.log('================================================================================');
  console.log(`Backend URL: ${BASE_URL}`);
  console.log(`API Host: ${API_HOST}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('================================================================================\n');

  // ============================================================================
  // STEP 1: AUTH SERVICE - Get Token
  // ============================================================================
  console.log('📋 STEP 1: Authentication');
  console.log('─────────────────────────────────────────────────────────────────────────────');
  
  await test('Auth Health', 'GET', '/api/auth/health');
  await test('Auth Status', 'GET', '/api/auth/status');
  
  // Get auth token
  const mockLoginResult = await makeRequest('POST', '/api/auth/mock-login-fast', {
    body: { role: 'admin' }
  });
  
  let authToken = null;
  if (mockLoginResult.ok && mockLoginResult.data?.data?.accessToken) {
    authToken = mockLoginResult.data.data.accessToken;
    await test('Mock Login Fast', 'POST', '/api/auth/mock-login-fast', {
      body: { role: 'admin' }
    });
    console.log(`   ✅ Token obtained: ${authToken.substring(0, 50)}...\n`);
  } else {
    await test('Mock Login Fast', 'POST', '/api/auth/mock-login-fast', {
      body: { role: 'admin' },
      expectStatus: 200
    });
  }

  if (authToken) {
    await test('Get Profile', 'GET', '/api/auth/profile', { token: authToken });
  }

  // ============================================================================
  // STEP 2: HR SERVICE
  // ============================================================================
  console.log('\n📋 STEP 2: HR Service');
  console.log('─────────────────────────────────────────────────────────────────────────────');
  
  await test('HR Health', 'GET', '/api/hr/health');
  await test('HR Status', 'GET', '/api/hr/status');
  
  if (authToken) {
    await test('Get Employees', 'GET', '/api/hr/employees', { token: authToken });
    await test('Get Departments', 'GET', '/api/hr/departments', { token: authToken });
    await test('Get Workforce', 'GET', '/api/hr/workforce', { token: authToken });
  }

  // ============================================================================
  // STEP 3: ATTENDANCE SERVICE
  // ============================================================================
  console.log('\n📋 STEP 3: Attendance Service');
  console.log('─────────────────────────────────────────────────────────────────────────────');
  
  await test('Attendance Health', 'GET', '/api/attendance/health');
  
  if (authToken) {
    await test('Get Attendance Records', 'GET', '/api/attendance/records', { token: authToken });
    await test('Get Attendance Stats', 'GET', '/api/attendance/stats', { token: authToken });
    await test('Clock In', 'POST', '/api/attendance/clock-in', {
      token: authToken,
      body: {
        latitude: 28.6139,
        longitude: 77.2090,
        notes: 'API test clock-in'
      }
    });
  }

  // ============================================================================
  // STEP 4: TENANT REGISTRY SERVICE
  // ============================================================================
  console.log('\n📋 STEP 4: Tenant Registry Service');
  console.log('─────────────────────────────────────────────────────────────────────────────');
  
  await test('Tenant Registry Health', 'GET', '/tenant-registry/health');
  
  if (authToken) {
    await test('List Tenants', 'GET', '/api/tenants', { token: authToken });
  }

  // ============================================================================
  // STEP 5: DOCUMENT SERVICE (Test Azure Blob Storage)
  // ============================================================================
  console.log('\n📋 STEP 5: Document Service (Azure Blob Storage)');
  console.log('─────────────────────────────────────────────────────────────────────────────');
  
  if (authToken) {
    // Test document endpoints
    await test('Get Documents', 'GET', '/api/hr/documents', { token: authToken });
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n================================================================================');
  console.log('📊 TEST SUMMARY');
  console.log('================================================================================');
  
  const total = results.passed.length + results.failed.length;
  const successRate = total > 0 ? ((results.passed.length / total) * 100).toFixed(1) : 0;
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⏭️  Skipped: ${results.skipped.length}`);
  console.log(`Success Rate: ${successRate}%`);
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.failed.forEach((test, index) => {
      console.log(`  ${index + 1}. ${test.name} (${test.status})`);
      console.log(`     Path: ${test.path}`);
      if (test.error) {
        console.log(`     Error: ${test.error.substring(0, 100)}`);
      }
    });
  }
  
  console.log('\n✅ Passed Tests:');
  const serviceGroups = {};
  results.passed.forEach(test => {
    const service = test.path.split('/')[2] || 'unknown';
    if (!serviceGroups[service]) {
      serviceGroups[service] = [];
    }
    serviceGroups[service].push(test.name);
  });
  
  Object.entries(serviceGroups).forEach(([service, tests]) => {
    console.log(`  ${service}: ${tests.length} tests passed`);
  });
  
  console.log('\n================================================================================');
  
  if (results.failed.length === 0) {
    console.log('🎉 ALL TESTS PASSED!');
    process.exit(0);
  } else {
    console.log(`⚠️  ${results.failed.length} test(s) failed. Please review errors above.`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test execution error:', error);
  process.exit(1);
});

