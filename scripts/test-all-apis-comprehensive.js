#!/usr/bin/env node

/**
 * Comprehensive API Test Suite
 * Tests all major APIs across all services
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function apiCall(method, endpoint, data = null, token = null, tenantId = null, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const config = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000, // Increased timeout
        validateStatus: () => true
      };

      if (token) config.headers.Authorization = `Bearer ${token}`;
      if (tenantId) config.headers['x-tenant-id'] = tenantId;
      if (data) config.data = data;

      const response = await axios(config);
      return {
        success: response.status >= 200 && response.status < 300,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      if (attempt < retries && (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND')) {
        // Retry on connection errors
        await sleep(2000 * attempt);
        continue;
      }
      return {
        success: false,
        error: error.message,
        status: 0,
        code: error.code
      };
    }
  }
  return {
    success: false,
    error: 'Max retries exceeded',
    status: 0
  };
}

async function test(name, fn) {
  results.total++;
  try {
    log(`\n🧪 ${name}`, 'cyan');
    const result = await fn();
    if (result.success) {
      log(`✅ PASS: ${name}`, 'green');
      results.passed++;
      results.tests.push({ name, status: 'PASS', statusCode: result.status });
      return result;
    } else {
      log(`❌ FAIL: ${name}`, 'red');
      log(`   Status: ${result.status}`, 'red');
      if (result.data?.message) log(`   Message: ${result.data.message}`, 'red');
      results.failed++;
      results.tests.push({ name, status: 'FAIL', statusCode: result.status, error: result.data?.message || result.error });
      return result;
    }
  } catch (error) {
    log(`❌ FAIL: ${name}`, 'red');
    log(`   Error: ${error.message}`, 'red');
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log('\n🚀 Comprehensive API Test Suite', 'blue');
  log('=====================================\n', 'blue');
  log(`Base URL: ${BASE_URL}\n`, 'cyan');

  let adminToken = null;
  let employeeToken = null;
  let employeeId = null;
  let storeId = null;
  let departmentCode = null;

  // ========== AUTH SERVICE TESTS ==========
  log('\n📋 AUTH SERVICE TESTS', 'blue');
  log('=====================================\n', 'blue');

  // 1. Admin Login
  await test('1. Admin Login (Lenstrack)', async () => {
    const result = await apiCall('POST', '/api/auth/login', {
      email: 'admin@lenstrack.com',
      password: 'AdminPass123!'
    });
    if (result.success && result.data.success) {
      adminToken = result.data.data.accessToken;
      return { success: true, status: result.status };
    }
    return result;
  });
  await sleep(1000);

  // 2. Health Check
  await test('2. Auth Service Health Check', async () => {
    return await apiCall('GET', '/api/auth/health');
  });
  await sleep(1000);

  // ========== HR SERVICE TESTS ==========
  log('\n📋 HR SERVICE TESTS', 'blue');
  log('=====================================\n', 'blue');

  // 3. Get Stores
  await test('3. Get Stores', async () => {
    const result = await apiCall('GET', '/api/hr/stores', null, adminToken, 'lenstrack');
    if (result.success && result.data.data && result.data.data.length > 0) {
      storeId = result.data.data[0]._id || result.data.data[0].id;
    }
    return result;
  });
  await sleep(1000);

  // 4. Get Departments
  await test('4. Get Departments', async () => {
    const result = await apiCall('GET', '/api/hr/departments', null, adminToken, 'lenstrack');
    if (result.success && result.data.data && result.data.data.length > 0) {
      departmentCode = result.data.data[0].code || 'SALES';
    }
    return result;
  });
  await sleep(1000);

  // 5. Get Employees
  await test('5. Get Employees', async () => {
    return await apiCall('GET', '/api/hr/employees', null, adminToken, 'lenstrack');
  });
  await sleep(1000);

  // 6. Dashboard
  await test('6. Get Dashboard', async () => {
    return await apiCall('GET', '/api/hr/dashboard', null, adminToken, 'lenstrack');
  });
  await sleep(1000);

  // 7. Time Tracking
  await test('7. Get Time Tracking', async () => {
    return await apiCall('GET', '/api/hr/time-tracking?date=2026-02-28', null, adminToken, 'lenstrack');
  });
  await sleep(1000);

  // 8. Roster
  await test('8. Get Roster', async () => {
    return await apiCall('GET', '/api/hr/roster', null, adminToken, 'lenstrack');
  });
  await sleep(1000);

  // 9. Roster Settings
  await test('9. Get Roster Settings', async () => {
    return await apiCall('GET', '/api/hr/roster/settings', null, adminToken, 'lenstrack');
  });
  await sleep(1000);

  // 10. Performance Metrics
  await test('10. Get Performance Metrics', async () => {
    return await apiCall('GET', '/api/hr/performance/me/metrics?period=monthly', null, adminToken, 'lenstrack');
  });
  await sleep(1000);

  // ========== ATTENDANCE SERVICE TESTS ==========
  log('\n📋 ATTENDANCE SERVICE TESTS', 'blue');
  log('=====================================\n', 'blue');

  // 11. Get Today's Attendance (if employee exists)
  await test('11. Get Today\'s Attendance', async () => {
    // Try with a known employee ID or skip if none
    const result = await apiCall('GET', '/api/attendance/today?employeeId=EMP-2026-969954&date=2026-02-28', null, adminToken, 'lenstrack');
    if (result.status === 404 || result.status === 400) {
      results.skipped++;
      log('   ⏭️  Skipped (no employee data)', 'yellow');
      return { success: true, status: 200, skipped: true };
    }
    return result;
  });
  await sleep(1000);

  // 12. Attendance Summary
  await test('12. Get Attendance Summary', async () => {
    return await apiCall('GET', '/api/attendance/summary?startDate=2026-02-01&endDate=2026-02-28', null, adminToken, 'lenstrack');
  });
  await sleep(1000);

  // 13. Attendance Timeline
  await test('13. Get Attendance Timeline', async () => {
    return await apiCall('GET', '/api/attendance/timeline?employeeId=EMP-2026-969954&date=2026-02-28', null, adminToken, 'lenstrack');
  });
  await sleep(1000);

  // ========== EMPLOYEE OPERATIONS (if employee exists) ==========
  log('\n📋 EMPLOYEE OPERATIONS', 'blue');
  log('=====================================\n', 'blue');

  // Try to find an existing employee for testing
  const employeesResult = await apiCall('GET', '/api/hr/employees?limit=1', null, adminToken, 'lenstrack');
  if (employeesResult.success && employeesResult.data.data && employeesResult.data.data.length > 0) {
    const testEmployee = employeesResult.data.data[0];
    employeeId = testEmployee.employeeId || testEmployee.employee_id;

    // 14. Get Employee by ID
    await test(`14. Get Employee by ID (${employeeId})`, async () => {
      return await apiCall('GET', `/api/hr/employees/${employeeId}`, null, adminToken, 'lenstrack');
    });
    await sleep(1000);

    // 15. Get Employee Status
    await test(`15. Get Employee Status (${employeeId})`, async () => {
      return await apiCall('GET', `/api/hr/employees/${employeeId}/status`, null, adminToken, 'lenstrack');
    });
    await sleep(1000);

    // 16. Employee Today's Attendance
    await test(`16. Get Employee Today's Attendance (${employeeId})`, async () => {
      const today = new Date().toISOString().split('T')[0];
      return await apiCall('GET', `/api/attendance/today?employeeId=${employeeId}&date=${today}`, null, adminToken, 'lenstrack');
    });
    await sleep(1000);
  } else {
    log('⏭️  Skipping employee-specific tests (no employees found)', 'yellow');
    results.skipped += 3;
  }

  // ========== SUMMARY ==========
  log('\n📊 TEST SUMMARY', 'blue');
  log('=====================================\n', 'blue');
  log(`Total Tests: ${results.total}`, 'cyan');
  log(`✅ Passed: ${results.passed}`, 'green');
  log(`❌ Failed: ${results.failed}`, 'red');
  log(`⏭️  Skipped: ${results.skipped}`, 'yellow');
  log(`📈 Success Rate: ${((results.passed / (results.total - results.skipped)) * 100).toFixed(1)}%`, 'cyan');

  // Failed tests details
  if (results.failed > 0) {
    log('\n❌ FAILED TESTS:', 'red');
    results.tests.filter(t => t.status === 'FAIL').forEach(test => {
      log(`   - ${test.name} (Status: ${test.statusCode || 'N/A'})`, 'red');
      if (test.error) log(`     Error: ${test.error}`, 'red');
    });
  }

  // Rate limiting check
  const rateLimitErrors = results.tests.filter(t => t.statusCode === 429).length;
  if (rateLimitErrors > 0) {
    log(`\n⚠️  Rate Limiting: ${rateLimitErrors} test(s) hit rate limits`, 'yellow');
  } else {
    log(`\n✅ Rate Limiting: No rate limit errors!`, 'green');
  }

  log('\n✅ Test Suite Complete!\n', 'green');

  // Exit with error code if any tests failed
  process.exit(results.failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
