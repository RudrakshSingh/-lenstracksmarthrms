/**
 * Comprehensive API Test - All Services
 * Tests all endpoints across all services
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
  
  const testResult = {
    name,
    method,
    path,
    status: result.status,
    success: result.ok || (options.expectStatus && result.status === options.expectStatus),
    error: result.error || (result.data && typeof result.data === 'object' && result.data.message) || null
  };

  if (testResult.success) {
    results.passed.push(testResult);
    process.stdout.write(`✅ ${name} (${result.status})\n`);
  } else {
    results.failed.push(testResult);
    process.stdout.write(`❌ ${name} (${result.status})\n`);
    if (result.data && typeof result.data === 'object') {
      const errorMsg = JSON.stringify(result.data).substring(0, 150);
      process.stdout.write(`   ${errorMsg}\n`);
    }
  }

  return testResult.success;
}

async function runTests() {
  console.log('\n================================================================================');
  console.log('🚀 COMPREHENSIVE API TEST - ALL SERVICES');
  console.log('================================================================================');
  console.log(`Backend URL: ${BASE_URL}`);
  console.log(`API Host: ${API_HOST}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('================================================================================\n');

  // ============================================================================
  // AUTH SERVICE
  // ============================================================================
  console.log('\n📋 AUTH SERVICE');
  console.log('─────────────────────────────────────────────────────────────────────────────');
  
  await test('Health Check', 'GET', '/api/auth/health');
  await test('Status Check', 'GET', '/api/auth/status');
  
  // POST endpoints
  const mockLoginResult = await makeRequest('POST', '/api/auth/mock-login-fast', {
    body: { role: 'admin' }
  });
  
  if (mockLoginResult.ok && mockLoginResult.data?.data?.accessToken) {
    results.services.authToken = mockLoginResult.data.data.accessToken;
    await test('Mock Login Fast', 'POST', '/api/auth/mock-login-fast', {
      body: { role: 'admin' }
    });
  } else {
    await test('Mock Login Fast', 'POST', '/api/auth/mock-login-fast', {
      body: { role: 'admin' },
      expectStatus: 200
    });
  }

  await test('Login (Invalid Creds)', 'POST', '/api/auth/login', {
    body: { emailOrEmployeeId: 'test', password: 'test' },
    expectStatus: 401
  });

  await test('Refresh Token (Invalid)', 'POST', '/api/auth/refresh-token', {
    body: { refreshToken: 'invalid' },
    expectStatus: 400
  });

  if (results.services.authToken) {
    await test('Get Profile', 'GET', '/api/auth/profile', {
      token: results.services.authToken
    });
  }

  // ============================================================================
  // HR SERVICE
  // ============================================================================
  console.log('\n📋 HR SERVICE');
  console.log('─────────────────────────────────────────────────────────────────────────────');
  
  await test('Health Check', 'GET', '/api/hr/health');
  await test('Status Check', 'GET', '/api/hr/status');

  if (results.services.authToken) {
    await test('Get Employees', 'GET', '/api/hr/employees', {
      token: results.services.authToken
    });
    
    await test('Get Departments', 'GET', '/api/hr/departments', {
      token: results.services.authToken
    });
  } else {
    results.skipped.push('HR endpoints (no auth token)');
  }

  // ============================================================================
  // ATTENDANCE SERVICE
  // ============================================================================
  console.log('\n📋 ATTENDANCE SERVICE');
  console.log('─────────────────────────────────────────────────────────────────────────────');
  
  await test('Health Check', 'GET', '/api/attendance/health');

  if (results.services.authToken) {
    await test('Clock In', 'POST', '/api/attendance/clock-in', {
      token: results.services.authToken,
      body: { 
        latitude: 28.6139,
        longitude: 77.2090,
        notes: 'Test clock-in'
      }
    });

    await test('Get Attendance Records', 'GET', '/api/attendance/records', {
      token: results.services.authToken
    });

    await test('Get Attendance Stats', 'GET', '/api/attendance/stats', {
      token: results.services.authToken
    });
  } else {
    results.skipped.push('Attendance endpoints (no auth token)');
  }

  // ============================================================================
  // TENANT REGISTRY SERVICE
  // ============================================================================
  console.log('\n📋 TENANT REGISTRY SERVICE');
  console.log('─────────────────────────────────────────────────────────────────────────────');
  
  await test('Health Check', 'GET', '/tenant-registry/health');

  if (results.services.authToken) {
    await test('List Tenants', 'GET', '/api/tenants', {
      token: results.services.authToken
    });
  } else {
    results.skipped.push('Tenant endpoints (no auth token)');
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n================================================================================');
  console.log('📊 TEST SUMMARY');
  console.log('================================================================================');
  
  const total = results.passed.length + results.failed.length + results.skipped.length;
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⏭️  Skipped: ${results.skipped.length}`);
  console.log(`Success Rate: ${((results.passed.length / (results.passed.length + results.failed.length)) * 100).toFixed(1)}%`);

  if (results.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.failed.forEach(f => {
      console.log(`  - ${f.name}: ${f.method} ${f.path} → ${f.status}`);
    });
  }

  if (results.skipped.length > 0) {
    console.log('\n⏭️  Skipped Tests:');
    results.skipped.forEach(s => console.log(`  - ${s}`));
  }

  // Service breakdown
  console.log('\n📊 Service Breakdown:');
  const serviceStats = {};
  [...results.passed, ...results.failed].forEach(t => {
    const service = t.path.split('/')[2] || 'unknown';
    if (!serviceStats[service]) {
      serviceStats[service] = { passed: 0, failed: 0 };
    }
    if (t.success) serviceStats[service].passed++;
    else serviceStats[service].failed++;
  });

  Object.entries(serviceStats).forEach(([service, stats]) => {
    const total = stats.passed + stats.failed;
    const rate = ((stats.passed / total) * 100).toFixed(1);
    console.log(`  ${service}: ${stats.passed}/${total} (${rate}%)`);
  });

  return results.failed.length === 0;
}

runTests()
  .then(success => {
    console.log(`\n${success ? '✅' : '❌'} Overall: ${success ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}\n`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  });

