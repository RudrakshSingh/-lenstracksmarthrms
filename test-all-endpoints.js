#!/usr/bin/env node

/**
 * Comprehensive API Endpoints Test Script
 * Tests all HRMS service endpoints
 */

const axios = require('axios');
const colors = require('colors');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002';
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@company.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password123';

// Test results
const results = {
  passed: [],
  failed: [],
  skipped: []
};

let authToken = null;
let refreshToken = null;
let testUserId = null;

// Helper functions
const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`.blue),
  success: (msg) => console.log(`✅ ${msg}`.green),
  error: (msg) => console.log(`❌ ${msg}`.red),
  warning: (msg) => console.log(`⚠️  ${msg}`.yellow),
  test: (msg) => console.log(`\n🧪 ${msg}`.cyan)
};

// Test function
async function testEndpoint(name, method, url, options = {}) {
  const { data, headers, expectedStatus = 200, skip = false } = options;
  
  if (skip) {
    results.skipped.push({ name, url, reason: 'Skipped' });
    log.warning(`SKIPPED: ${name}`);
    return { success: true, skipped: true };
  }

  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
        ...headers
      },
      ...(data && { data }),
      validateStatus: () => true // Don't throw on any status
    };

    const startTime = Date.now();
    const response = await axios(config);
    const duration = Date.now() - startTime;

    const success = response.status === expectedStatus || (expectedStatus === 'any' && response.status < 500);

    if (success) {
      results.passed.push({ name, url, status: response.status, duration });
      log.success(`${name} - ${response.status} (${duration}ms)`);
      return { success: true, data: response.data, status: response.status };
    } else {
      results.failed.push({ 
        name, 
        url, 
        expected: expectedStatus, 
        actual: response.status,
        error: response.data?.message || response.statusText
      });
      log.error(`${name} - Expected ${expectedStatus}, got ${response.status}`);
      if (response.data?.message) {
        log.error(`  Error: ${response.data.message}`);
      }
      return { success: false, error: response.data, status: response.status };
    }
  } catch (error) {
    results.failed.push({ 
      name, 
      url, 
      error: error.message,
      code: error.code
    });
    log.error(`${name} - ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test suites
async function testAuthentication() {
  log.test('Testing Authentication Endpoints');
  
  // Login
  const loginResult = await testEndpoint(
    'Login',
    'POST',
    '/api/auth/login',
    {
      data: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        rememberMe: false
      },
      expectedStatus: 200
    }
  );

  if (loginResult.success && loginResult.data) {
    authToken = loginResult.data.accessToken || loginResult.data.token;
    refreshToken = loginResult.data.refreshToken;
    testUserId = loginResult.data.user?.id || loginResult.data.userId;
    log.info(`Token obtained: ${authToken ? 'Yes' : 'No'}`);
  }

  // Get Current User
  await testEndpoint(
    'Get Current User',
    'GET',
    '/api/auth/me',
    { expectedStatus: 200 }
  );

  // Refresh Token
  if (refreshToken) {
    await testEndpoint(
      'Refresh Token',
      'POST',
      '/api/auth/refresh',
      {
        data: { refreshToken },
        expectedStatus: 200
      }
    );
  }
}

async function testEmployeeManagement() {
  log.test('Testing Employee Management Endpoints');
  
  // Get Employees
  await testEndpoint(
    'Get Employees',
    'GET',
    '/api/hr/employees?page=1&limit=10',
    { expectedStatus: 200 }
  );

  // Get Employee by ID (skip if no employees)
  await testEndpoint(
    'Get Employee by ID',
    'GET',
    '/api/hr/employees/507f1f77bcf86cd799439011',
    { expectedStatus: 'any' } // 200 or 404 both acceptable
  );

  // Create Employee (test with minimal data)
  const createResult = await testEndpoint(
    'Create Employee',
    'POST',
    '/api/hr/employees',
    {
      data: {
        employeeId: `TEST-${Date.now()}`,
        firstName: 'Test',
        lastName: 'User',
        email: `test${Date.now()}@example.com`,
        password: 'Test123456!',
        roleName: 'Employee',
        department: 'Testing'
      },
      expectedStatus: 201
    }
  );

  const createdEmployeeId = createResult.data?.data?.id || createResult.data?.id;

  // Update Employee
  if (createdEmployeeId) {
    await testEndpoint(
      'Update Employee',
      'PUT',
      `/api/hr/employees/${createdEmployeeId}`,
      {
        data: {
          firstName: 'Updated',
          lastName: 'Name'
        },
        expectedStatus: 200
      }
    );
  }
}

async function testStoreManagement() {
  log.test('Testing Store Management Endpoints');
  
  // Get Stores
  await testEndpoint(
    'Get Stores',
    'GET',
    '/api/hr/stores',
    { expectedStatus: 200 }
  );

  // Get Store by ID
  await testEndpoint(
    'Get Store by ID',
    'GET',
    '/api/hr/stores/507f1f77bcf86cd799439011',
    { expectedStatus: 'any' }
  );
}

async function testLeaveManagement() {
  log.test('Testing Leave Management Endpoints');
  
  // Get Leave Policy
  await testEndpoint(
    'Get Leave Policy',
    'GET',
    '/api/hr/policies/leave',
    { expectedStatus: 200 }
  );

  // Get Leave Requests
  await testEndpoint(
    'Get Leave Requests',
    'GET',
    '/api/hr/leave-requests?page=1&limit=10',
    { expectedStatus: 200 }
  );

  // Get Leave Ledger
  await testEndpoint(
    'Get Leave Ledger',
    'GET',
    '/api/hr/leave-ledger',
    { expectedStatus: 200 }
  );
}

async function testPayrollManagement() {
  log.test('Testing Payroll Management Endpoints');
  
  // Get Payroll Runs
  await testEndpoint(
    'Get Payroll Runs',
    'GET',
    '/api/hr/payroll-runs?page=1&limit=10',
    { expectedStatus: 200 }
  );

  // Get Payslips
  await testEndpoint(
    'Get Payslips',
    'GET',
    '/api/hr/payslips?page=1&limit=10',
    { expectedStatus: 200 }
  );
}

async function testIncentiveManagement() {
  log.test('Testing Incentive Management Endpoints');
  
  // Get Incentive Claims
  await testEndpoint(
    'Get Incentive Claims',
    'GET',
    '/api/hr/incentive-claims?page=1&limit=10',
    { expectedStatus: 200 }
  );
}

async function testFnFManagement() {
  log.test('Testing F&F Settlement Endpoints');
  
  // Get F&F Cases
  await testEndpoint(
    'Get F&F Cases',
    'GET',
    '/api/hr/fnf?page=1&limit=10',
    { expectedStatus: 200 }
  );
}

async function testTransferManagement() {
  log.test('Testing Transfer Management Endpoints');
  
  // Get Transfers
  await testEndpoint(
    'Get Transfers',
    'GET',
    '/api/transfers?page=1&limit=10',
    { expectedStatus: 200 }
  );
}

async function testHRLetters() {
  log.test('Testing HR Letters Endpoints');
  
  // Get Letters
  await testEndpoint(
    'Get HR Letters',
    'GET',
    '/api/hr-letter/letters?page=1&limit=10',
    { expectedStatus: 200 }
  );

  // Get Letter Stats
  await testEndpoint(
    'Get Letter Stats',
    'GET',
    '/api/hr-letter/stats',
    { expectedStatus: 200 }
  );
}

async function testStatutoryCompliance() {
  log.test('Testing Statutory Compliance Endpoints');
  
  // Get Stat Exports
  await testEndpoint(
    'Get Stat Exports',
    'GET',
    '/api/hr/stat-exports?page=1&limit=10',
    { expectedStatus: 200 }
  );
}

async function testReports() {
  log.test('Testing Reports Endpoints');
  
  // Payroll Cost Report
  await testEndpoint(
    'Payroll Cost Report',
    'GET',
    '/api/hr/reports/payroll-cost',
    { expectedStatus: 200 }
  );

  // Leave Utilization Report
  await testEndpoint(
    'Leave Utilization Report',
    'GET',
    '/api/hr/reports/leave-utilization',
    { expectedStatus: 200 }
  );

  // Attrition Report
  await testEndpoint(
    'Attrition Report',
    'GET',
    '/api/hr/reports/attrition',
    { expectedStatus: 200 }
  );
}

async function testOnboarding() {
  log.test('Testing Onboarding Endpoints');
  
  // Get Onboarding Draft
  await testEndpoint(
    'Get Onboarding Draft',
    'GET',
    '/api/hr/onboarding/draft?employee_id=TEST001',
    { expectedStatus: 'any' }
  );
}

async function testAudit() {
  log.test('Testing Audit Endpoints');
  
  // Get Audit Logs
  await testEndpoint(
    'Get Audit Logs',
    'GET',
    '/api/hr/audit-logs?page=1&limit=10',
    { expectedStatus: 200 }
  );
}

async function testHealthEndpoints() {
  log.test('Testing Health & Status Endpoints');
  
  // Health Check
  await testEndpoint(
    'Health Check',
    'GET',
    '/health',
    { expectedStatus: 200, skip: !authToken }
  );

  // HR Status
  await testEndpoint(
    'HR Service Status',
    'GET',
    '/api/hr/status',
    { expectedStatus: 200, skip: !authToken }
  );

  // HR Health
  await testEndpoint(
    'HR Service Health',
    'GET',
    '/api/hr/health',
    { expectedStatus: 200, skip: !authToken }
  );
}

// Main test runner
async function runAllTests() {
  console.log('\n' + '='.repeat(60).cyan);
  console.log('🧪 HRMS API ENDPOINTS TEST SUITE'.cyan.bold);
  console.log('='.repeat(60).cyan);
  console.log(`Base URL: ${BASE_URL}`.gray);
  console.log(`Test Email: ${TEST_EMAIL}`.gray);
  console.log('='.repeat(60).cyan + '\n');

  try {
    // Test authentication first
    await testAuthentication();

    if (!authToken) {
      log.error('Authentication failed! Cannot test protected endpoints.');
      log.warning('Some tests will be skipped.');
    }

    // Test all endpoints
    await testHealthEndpoints();
    await testEmployeeManagement();
    await testStoreManagement();
    await testLeaveManagement();
    await testPayrollManagement();
    await testIncentiveManagement();
    await testFnFManagement();
    await testTransferManagement();
    await testHRLetters();
    await testStatutoryCompliance();
    await testReports();
    await testOnboarding();
    await testAudit();

    // Logout
    if (authToken) {
      await testEndpoint(
        'Logout',
        'POST',
        '/api/auth/logout',
        {
          data: refreshToken ? { refreshToken } : {},
          expectedStatus: 200
        }
      );
    }

  } catch (error) {
    log.error(`Test suite error: ${error.message}`);
  }

  // Print summary
  printSummary();
}

function printSummary() {
  console.log('\n' + '='.repeat(60).cyan);
  console.log('📊 TEST SUMMARY'.cyan.bold);
  console.log('='.repeat(60).cyan);
  
  const total = results.passed.length + results.failed.length + results.skipped.length;
  const passRate = total > 0 ? ((results.passed.length / total) * 100).toFixed(1) : 0;

  console.log(`\n✅ Passed: ${results.passed.length}`.green);
  console.log(`❌ Failed: ${results.failed.length}`.red);
  console.log(`⏭️  Skipped: ${results.skipped.length}`.yellow);
  console.log(`📈 Pass Rate: ${passRate}%`.cyan);
  console.log(`📊 Total Tests: ${total}`);

  if (results.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:'.red.bold);
    results.failed.forEach((test, index) => {
      console.log(`\n${index + 1}. ${test.name}`.red);
      console.log(`   URL: ${test.url}`.gray);
      if (test.expected && test.actual) {
        console.log(`   Expected: ${test.expected}, Got: ${test.actual}`.gray);
      }
      if (test.error) {
        console.log(`   Error: ${test.error}`.gray);
      }
    });
  }

  if (results.passed.length > 0) {
    console.log('\n✅ PASSED TESTS:'.green.bold);
    results.passed.slice(0, 10).forEach((test, index) => {
      console.log(`${index + 1}. ${test.name} - ${test.status} (${test.duration}ms)`.green);
    });
    if (results.passed.length > 10) {
      console.log(`... and ${results.passed.length - 10} more`.gray);
    }
  }

  console.log('\n' + '='.repeat(60).cyan);
  
  if (results.failed.length === 0) {
    console.log('🎉 ALL TESTS PASSED!'.green.bold);
  } else {
    console.log('⚠️  SOME TESTS FAILED'.yellow.bold);
    process.exit(1);
  }
  
  console.log('='.repeat(60).cyan + '\n');
}

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    log.error(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runAllTests, testEndpoint };

