#!/usr/bin/env node

/**
 * Flexible API Test Script
 * 
 * Tests all APIs with available credentials
 * Tries multiple login methods and tests what's accessible
 * 
 * Usage:
 *   node scripts/test-apis-flexible.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';

const results = {
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

async function apiCall(method, endpoint, data = null, token = null, tenantId = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
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
    return {
      success: false,
      error: error.message,
      status: 0
    };
  }
}

// Try multiple login credentials
const loginAttempts = [
  { email: 'admin@upcapto.com', password: 'Upcapto@2026', tenantId: 'upcapto', role: 'superadmin' },
  { email: 'admin@lenstrack.com', password: 'AdminPass123!', tenantId: 'lenstrack', role: 'admin' },
  { email: 'lenstrack01@gmail.com', password: 'cnbxs2b9A1!', tenantId: 'lenstrack', role: 'employee' },
  { email: 'john.doe@lenstrack.com', password: 'EmployeePass123!', tenantId: 'lenstrack', role: 'employee' },
  { email: 'raviraikwar10022001@gmail.com', password: 'es93ayq8A1!', tenantId: 'lenstrack', role: 'employee' }
];

async function tryLogin(creds) {
  const result = await apiCall('POST', '/api/auth/login', {
    email: creds.email,
    password: creds.password
  });

  if (result.success && result.data.success) {
    return {
      success: true,
      token: result.data.data.accessToken,
      user: result.data.data.user,
      credentials: creds
    };
  }
  return { success: false, error: result.data?.message || result.error };
}

async function testHealthEndpoints() {
  log('\n📊 Testing Health Endpoints...', 'cyan');
  
  const healthTests = [
    { name: 'Auth Health', endpoint: '/api/auth/health' },
    { name: 'HR Health', endpoint: '/api/hr/health' },
    { name: 'Attendance Health', endpoint: '/api/attendance/health' },
    { name: 'Gateway Health', endpoint: '/api/gateway/health' }
  ];

  for (const test of healthTests) {
    const result = await apiCall('GET', test.endpoint);
    if (result.success) {
      log(`   ✅ ${test.name}: ${result.status}`, 'green');
      results.passed++;
    } else {
      log(`   ❌ ${test.name}: ${result.status} - ${result.error}`, 'red');
      results.failed++;
    }
    results.tests.push({ name: test.name, status: result.success ? 'PASS' : 'FAIL', result });
  }
}

async function testWithCredentials() {
  log('\n🔐 Trying to Login with Available Credentials...', 'cyan');
  
  let loggedInUser = null;
  
  for (const creds of loginAttempts) {
    log(`   Trying: ${creds.email}...`, 'yellow');
    const loginResult = await tryLogin(creds);
    
    if (loginResult.success) {
      log(`   ✅ Login successful: ${creds.email} (${creds.role})`, 'green');
      loggedInUser = loginResult;
      break;
    } else {
      log(`   ❌ Login failed: ${loginResult.error}`, 'red');
    }
  }

  if (!loggedInUser) {
    log('\n❌ No valid credentials found. Cannot proceed with authenticated tests.', 'red');
    log('\n💡 To test authenticated APIs:', 'yellow');
    log('   1. Create superadmin: node scripts/seed-superadmin-direct.js (with MONGODB_URI)', 'yellow');
    log('   2. Or use existing credentials in seed-credentials.json', 'yellow');
    return;
  }

  const token = loggedInUser.token;
  const user = loggedInUser.user;
  const tenantId = user.tenantId || loggedInUser.credentials.tenantId;
  const role = user.role || loggedInUser.credentials.role;
  const employeeId = user.employee_id || user.employeeId;

  log(`\n✅ Logged in as: ${user.email} (${role})`, 'green');
  log(`   Tenant: ${tenantId}`, 'cyan');
  log(`   Employee ID: ${employeeId || 'N/A'}`, 'cyan');

  // Test APIs based on role
  log('\n🧪 Testing APIs...', 'cyan');

  // Test 1: Get User Info
  log('\n1. Get Current User Info', 'blue');
  const meResult = await apiCall('GET', '/api/auth/me', null, token, tenantId);
  if (meResult.success) {
    log('   ✅ PASS', 'green');
    results.passed++;
  } else {
    log(`   ❌ FAIL: ${meResult.error}`, 'red');
    results.failed++;
  }
  results.tests.push({ name: 'Get Current User', status: meResult.success ? 'PASS' : 'FAIL', result: meResult });

  // Test 2: Dashboard (if admin/HR)
  if (role === 'admin' || role === 'superadmin' || role === 'HR') {
    log('\n2. Get Dashboard', 'blue');
    const dashboardResult = await apiCall('GET', '/api/hr/dashboard', null, token, tenantId);
    if (dashboardResult.success) {
      log('   ✅ PASS', 'green');
      results.passed++;
    } else {
      log(`   ❌ FAIL: ${dashboardResult.error}`, 'red');
      results.failed++;
    }
    results.tests.push({ name: 'Dashboard', status: dashboardResult.success ? 'PASS' : 'FAIL', result: dashboardResult });
  }

  // Test 3: Get Employees (if admin/HR)
  if (role === 'admin' || role === 'superadmin' || role === 'HR') {
    log('\n3. Get Employees List', 'blue');
    const employeesResult = await apiCall('GET', '/api/hr/employees?limit=5', null, token, tenantId);
    if (employeesResult.success) {
      log('   ✅ PASS', 'green');
      results.passed++;
    } else {
      log(`   ❌ FAIL: ${employeesResult.error}`, 'red');
      results.failed++;
    }
    results.tests.push({ name: 'Get Employees', status: employeesResult.success ? 'PASS' : 'FAIL', result: employeesResult });
  }

  // Test 4: Get Today's Attendance (if employee)
  if (employeeId) {
    log('\n4. Get Today\'s Attendance', 'blue');
    const today = new Date().toISOString().split('T')[0];
    const attendanceResult = await apiCall(
      'GET',
      `/api/attendance/today?employeeId=${employeeId}&date=${today}`,
      null,
      token,
      tenantId
    );
    if (attendanceResult.success) {
      log('   ✅ PASS', 'green');
      results.passed++;
    } else {
      log(`   ❌ FAIL: ${attendanceResult.error}`, 'red');
      results.failed++;
    }
    results.tests.push({ name: 'Get Today Attendance', status: attendanceResult.success ? 'PASS' : 'FAIL', result: attendanceResult });
  }

  // Test 5: Time Tracking (if admin/HR or employee)
  if (employeeId) {
    log('\n5. Get Time Tracking', 'blue');
    const today = new Date().toISOString().split('T')[0];
    const timeTrackingResult = await apiCall(
      'GET',
      `/api/hr/time-tracking?employeeId=${employeeId}&date=${today}`,
      null,
      token,
      tenantId
    );
    if (timeTrackingResult.success) {
      log('   ✅ PASS', 'green');
      results.passed++;
    } else {
      log(`   ❌ FAIL: ${timeTrackingResult.error}`, 'red');
      results.failed++;
    }
    results.tests.push({ name: 'Time Tracking', status: timeTrackingResult.success ? 'PASS' : 'FAIL', result: timeTrackingResult });
  }

  // Test 6: Clock-In (if employee and not already clocked in)
  if (role === 'employee' && employeeId) {
    log('\n6. Clock-In Test', 'blue');
    const clockInResult = await apiCall(
      'POST',
      '/api/attendance/clock-in',
      {
        latitude: 19.0760,
        longitude: 72.8777,
        timestamp: Date.now(),
        notes: 'Test clock-in from automated test'
      },
      token,
      tenantId
    );
    if (clockInResult.success) {
      log('   ✅ PASS', 'green');
      results.passed++;
    } else {
      // Check if already clocked in (this is OK)
      if (clockInResult.data?.message?.includes('already clocked') || 
          clockInResult.data?.message?.includes('clock out')) {
        log('   ⚠️  Already clocked in (expected)', 'yellow');
        results.skipped++;
      } else {
        log(`   ❌ FAIL: ${clockInResult.error || clockInResult.data?.message}`, 'red');
        results.failed++;
      }
    }
    results.tests.push({ name: 'Clock-In', status: clockInResult.success ? 'PASS' : 'FAIL', result: clockInResult });
  }

  // Test 7: Get Stores (if admin/HR)
  if (role === 'admin' || role === 'superadmin' || role === 'HR') {
    log('\n7. Get Stores List', 'blue');
    const storesResult = await apiCall('GET', '/api/hr/stores', null, token, tenantId);
    if (storesResult.success) {
      log('   ✅ PASS', 'green');
      results.passed++;
    } else {
      log(`   ❌ FAIL: ${storesResult.error}`, 'red');
      results.failed++;
    }
    results.tests.push({ name: 'Get Stores', status: storesResult.success ? 'PASS' : 'FAIL', result: storesResult });
  }

  // Test 8: Get Departments (if admin/HR)
  if (role === 'admin' || role === 'superadmin' || role === 'HR') {
    log('\n8. Get Departments List', 'blue');
    const deptsResult = await apiCall('GET', '/api/hr/departments', null, token, tenantId);
    if (deptsResult.success) {
      log('   ✅ PASS', 'green');
      results.passed++;
    } else {
      log(`   ❌ FAIL: ${deptsResult.error}`, 'red');
      results.failed++;
    }
    results.tests.push({ name: 'Get Departments', status: deptsResult.success ? 'PASS' : 'FAIL', result: deptsResult });
  }
}

async function runTests() {
  try {
    log('\n🚀 Starting Flexible API Tests', 'blue');
    log('=====================================\n', 'blue');
    log(`Base URL: ${BASE_URL}\n`, 'cyan');

    // Test health endpoints (no auth required)
    await testHealthEndpoints();

    // Test authenticated endpoints
    await testWithCredentials();

    // Summary
    log('\n📊 Test Summary', 'blue');
    log('=====================================\n', 'blue');
    log(`✅ Passed: ${results.passed}`, 'green');
    log(`❌ Failed: ${results.failed}`, 'red');
    log(`⏭️  Skipped: ${results.skipped}`, 'yellow');
    log(`📈 Total: ${results.passed + results.failed + results.skipped}\n`, 'cyan');

    // Save results
    const resultsPath = path.join(__dirname, '..', 'test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    log(`📄 Results saved to test-results.json\n`, 'cyan');

    if (results.failed === 0) {
      log('🎉 All tests passed!', 'green');
    } else {
      log('⚠️  Some tests failed. Check test-results.json for details.', 'yellow');
    }

  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };
