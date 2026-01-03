/**
 * Comprehensive Route Testing Script - Local Environment
 * Tests all API endpoints on local environment before production
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const API_HOST = 'localhost';

let authToken = null;
let adminToken = null;
let hrToken = null;

// Test results
const results = {
  passed: [],
  failed: [],
  skipped: []
};

// Helper function to make requests
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

// Test function
async function test(name, method, path, options = {}) {
  process.stdout.write(`\n🧪 Testing: ${name}... `);
  
  const result = await makeRequest(method, path, options);
  
  if (result.status === 0) {
    results.failed.push({ name, error: 'Connection failed', result });
    process.stdout.write(`❌ FAIL (Connection Error)\n`);
    return false;
  }

  if (options.expectStatus) {
    if (result.status === options.expectStatus) {
      results.passed.push({ name, status: result.status });
      process.stdout.write(`✅ PASS (${result.status})\n`);
      return true;
    } else {
      results.failed.push({ name, expected: options.expectStatus, got: result.status, result });
      process.stdout.write(`❌ FAIL (Expected ${options.expectStatus}, got ${result.status})\n`);
      return false;
    }
  }

  if (result.ok || (result.status >= 200 && result.status < 300)) {
    results.passed.push({ name, status: result.status });
    process.stdout.write(`✅ PASS (${result.status})\n`);
    return true;
  } else {
    results.failed.push({ name, status: result.status, result });
    process.stdout.write(`❌ FAIL (${result.status})\n`);
    if (result.data && typeof result.data === 'object') {
      console.log(`   Error: ${JSON.stringify(result.data).substring(0, 200)}`);
    }
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('\n================================================================================');
  console.log('🚀 Starting Comprehensive Route Tests - LOCAL ENVIRONMENT');
  console.log('================================================================================');
  console.log(`Backend URL: ${BASE_URL}`);
  console.log(`API Host: ${API_HOST}\n`);

  // ============================================================================
  // AUTH SERVICE TESTS
  // ============================================================================
  console.log('\n================================================================================');
  console.log('🔐 AUTHENTICATION SERVICE');
  console.log('================================================================================');

  // Health checks
  await test('Auth Health Check', 'GET', '/health');
  await test('Auth Status Check', 'GET', '/api/auth/status');

  // Mock login to get tokens
  console.log('\n📝 Getting authentication tokens...');
  
  const mockLoginResult = await makeRequest('POST', '/api/auth/mock-login-fast', {
    body: { role: 'admin' }
  });
  
  if (mockLoginResult.ok && mockLoginResult.data?.data?.accessToken) {
    adminToken = mockLoginResult.data.data.accessToken;
    console.log('✅ Admin token obtained');
  } else {
    console.log('❌ Failed to get admin token');
    console.log('   Response:', JSON.stringify(mockLoginResult.data).substring(0, 200));
  }

  const hrLoginResult = await makeRequest('POST', '/api/auth/mock-login-fast', {
    body: { role: 'hr' }
  });
  
  if (hrLoginResult.ok && hrLoginResult.data?.data?.accessToken) {
    hrToken = hrLoginResult.data.data.accessToken;
    console.log('✅ HR token obtained');
  }

  // POST endpoints
  await test('POST /api/auth/login', 'POST', '/api/auth/login', {
    body: { emailOrEmployeeId: 'test@test.com', password: 'test123' },
    expectStatus: 401 // Expected for invalid credentials
  });

  await test('POST /api/auth/mock-login', 'POST', '/api/auth/mock-login', {
    body: { role: 'employee' }
  });

  await test('POST /api/auth/mock-login-fast', 'POST', '/api/auth/mock-login-fast', {
    body: { role: 'employee' }
  });

  await test('POST /api/auth/refresh-token', 'POST', '/api/auth/refresh-token', {
    body: { refreshToken: 'test' },
    expectStatus: 400 // Expected for invalid token
  });

  // Protected endpoints
  if (adminToken) {
    await test('GET /api/auth/profile', 'GET', '/api/auth/profile', {
      token: adminToken
    });
  } else {
    results.skipped.push('GET /api/auth/profile (no token)');
  }

  // ============================================================================
  // HR SERVICE TESTS
  // ============================================================================
  console.log('\n================================================================================');
  console.log('👥 HR SERVICE');
  console.log('================================================================================');

  const HR_BASE = 'http://localhost:3002';
  
  await test('HR Health Check', 'GET', '/api/hr/health', {}, HR_BASE);
  await test('HR Status Check', 'GET', '/api/hr/status', {}, HR_BASE);

  if (hrToken) {
    await test('GET /api/hr/employees', 'GET', '/api/hr/employees', {
      token: hrToken
    }, HR_BASE);
  } else {
    results.skipped.push('GET /api/hr/employees (no token)');
  }

  // ============================================================================
  // ATTENDANCE SERVICE TESTS
  // ============================================================================
  console.log('\n================================================================================');
  console.log('⏰ ATTENDANCE SERVICE');
  console.log('================================================================================');

  const ATTENDANCE_BASE = 'http://localhost:3003';
  
  await test('Attendance Health Check', 'GET', '/api/attendance/health', {}, ATTENDANCE_BASE);

  if (hrToken) {
    await test('POST /api/attendance/clock-in', 'POST', '/api/attendance/clock-in', {
      token: hrToken,
      body: { employeeId: 'test-emp-001' }
    }, ATTENDANCE_BASE);
  }

  // ============================================================================
  // TENANT REGISTRY SERVICE TESTS
  // ============================================================================
  console.log('\n================================================================================');
  console.log('🏢 TENANT REGISTRY SERVICE');
  console.log('================================================================================');

  const TENANT_BASE = 'http://localhost:3020';
  
  await test('Tenant Registry Health Check', 'GET', '/health', {}, TENANT_BASE);

  if (adminToken) {
    await test('GET /api/tenants', 'GET', '/api/tenants', {
      token: adminToken
    }, TENANT_BASE);
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n================================================================================');
  console.log('📊 TEST SUMMARY');
  console.log('================================================================================');
  console.log(`Total Tests: ${results.passed.length + results.failed.length + results.skipped.length}`);
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⏭️  Skipped: ${results.skipped.length}`);

  if (results.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.failed.forEach(f => {
      console.log(`  - ${f.name}: ${f.error || `Status ${f.got || f.status}`}`);
    });
  }

  if (results.skipped.length > 0) {
    console.log('\n⏭️  Skipped Tests:');
    results.skipped.forEach(s => console.log(`  - ${s}`));
  }

  return results.failed.length === 0;
}

// Run tests
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  });

