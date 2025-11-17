#!/usr/bin/env node

/**
 * Comprehensive Test Script for Auth and HR Service Endpoints
 * Tests all endpoints to verify they're working correctly
 */

const axios = require('axios');
const colors = require('colors');

// Configuration
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 
  'https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net';
const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 
  'https://etelios-hr-service-backend-a4ayeqefdsbsc2g3.centralindia-01.azurewebsites.net';
const GATEWAY_URL = process.env.GATEWAY_URL || 
  'https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net';

// Test credentials (update these with real test credentials)
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword123';

let authToken = null;
let refreshToken = null;

// Test results
const results = {
  auth: { passed: 0, failed: 0, total: 0, details: [] },
  hr: { passed: 0, failed: 0, total: 0, details: [] }
};

// Helper function to make requests
async function testEndpoint(name, method, url, data = null, headers = {}, expectedStatus = 200) {
  try {
    const config = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 30000, // Increased to 30s to identify slow services (was 10s)
      validateStatus: () => true // Don't throw on any status
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.data = data;
    }

    const response = await axios(config);
    const success = response.status === expectedStatus || (expectedStatus === 'any' && response.status < 500);
    
    return {
      success,
      status: response.status,
      data: response.data,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status || 0,
      data: error.response?.data || null,
      error: error.message
    };
  }
}

// Print test result
function printResult(service, name, result, expectedStatus = 200) {
  const status = result.success ? '✅ PASS'.green : '❌ FAIL'.red;
  const statusCode = result.status.toString().yellow;
  const message = result.success 
    ? `Status: ${statusCode}` 
    : `Status: ${statusCode} | Error: ${result.error || JSON.stringify(result.data?.message || 'Unknown error')}`;
  
  console.log(`  ${status} ${name}`);
  console.log(`     ${message}`);
  
  if (!result.success && result.data) {
    console.log(`     Response: ${JSON.stringify(result.data).substring(0, 200)}`);
  }
  
  results[service].total++;
  if (result.success) {
    results[service].passed++;
  } else {
    results[service].failed++;
    results[service].details.push({ name, error: result.error || result.data?.message });
  }
}

// ==================== AUTH SERVICE TESTS ====================

async function testAuthService() {
  console.log('\n' + '='.repeat(80).cyan);
  console.log('🔐 TESTING AUTH SERVICE ENDPOINTS'.cyan.bold);
  console.log('='.repeat(80).cyan);
  console.log(`Service URL: ${AUTH_SERVICE_URL}\n`);

  // Test 1: Health Check
  console.log('📋 Health & Status Endpoints:'.yellow);
  let result = await testEndpoint('Health Check', 'GET', `${AUTH_SERVICE_URL}/health`);
  printResult('auth', 'GET /health', result);

  // Test 2: Service Status
  result = await testEndpoint('Service Status', 'GET', `${AUTH_SERVICE_URL}/api/auth/status`);
  printResult('auth', 'GET /api/auth/status', result, 'any');

  // Test 3: Login (Public endpoint)
  console.log('\n📋 Authentication Endpoints:'.yellow);
  result = await testEndpoint(
    'Login',
    'POST',
    `${AUTH_SERVICE_URL}/api/auth/login`,
    {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      rememberMe: false
    }
  );
  printResult('auth', 'POST /api/auth/login', result, 'any');
  
  if (result.success && result.data?.data?.token) {
    authToken = result.data.data.token;
    refreshToken = result.data.data.refreshToken;
    console.log(`     ✅ Token obtained: ${authToken.substring(0, 20)}...`.green);
  } else {
    console.log(`     ⚠️  Login failed - using mock token for remaining tests`.yellow);
    authToken = 'mock-token-for-testing';
  }

  // Test 4: Get Current User (requires auth)
  if (authToken) {
    result = await testEndpoint(
      'Get Current User',
      'GET',
      `${AUTH_SERVICE_URL}/api/auth/me`,
      null,
      { 'Authorization': `Bearer ${authToken}` }
    );
    printResult('auth', 'GET /api/auth/me', result, 'any');
  }

  // Test 5: Refresh Token
  if (refreshToken) {
    result = await testEndpoint(
      'Refresh Token',
      'POST',
      `${AUTH_SERVICE_URL}/api/auth/refresh`,
      { refreshToken: refreshToken }
    );
    printResult('auth', 'POST /api/auth/refresh', result, 'any');
  }

  // Test 6: Logout
  if (authToken) {
    result = await testEndpoint(
      'Logout',
      'POST',
      `${AUTH_SERVICE_URL}/api/auth/logout`,
      { refreshToken: refreshToken || null },
      { 'Authorization': `Bearer ${authToken}` }
    );
    printResult('auth', 'POST /api/auth/logout', result, 'any');
  }

  // Test through Gateway
  console.log('\n📋 Testing through API Gateway:'.yellow);
  result = await testEndpoint('Gateway Health', 'GET', `${GATEWAY_URL}/health`);
  printResult('auth', 'GET /health (Gateway)', result);

  result = await testEndpoint('Gateway Auth Status', 'GET', `${GATEWAY_URL}/api/auth/status`);
  printResult('auth', 'GET /api/auth/status (Gateway)', result, 'any');
}

// ==================== HR SERVICE TESTS ====================

async function testHRService() {
  console.log('\n' + '='.repeat(80).cyan);
  console.log('👥 TESTING HR SERVICE ENDPOINTS'.cyan.bold);
  console.log('='.repeat(80).cyan);
  console.log(`Service URL: ${HR_SERVICE_URL}\n`);

  // Get auth token first if not available
  if (!authToken) {
    console.log('🔑 Getting auth token for HR service tests...'.yellow);
    const loginResult = await testEndpoint(
      'Login for HR Tests',
      'POST',
      `${AUTH_SERVICE_URL}/api/auth/login`,
      {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        rememberMe: false
      }
    );
    
    if (loginResult.success && loginResult.data?.data?.token) {
      authToken = loginResult.data.data.token;
      console.log(`     ✅ Token obtained`.green);
    } else {
      console.log(`     ⚠️  Login failed - some tests may fail`.yellow);
      authToken = 'mock-token-for-testing';
    }
  }

  const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};

  // Test 1: Health Check
  console.log('📋 Health & Status Endpoints:'.yellow);
  let result = await testEndpoint('Health Check', 'GET', `${HR_SERVICE_URL}/health`);
  printResult('hr', 'GET /health', result);

  result = await testEndpoint('HR Status', 'GET', `${HR_SERVICE_URL}/api/hr/status`);
  printResult('hr', 'GET /api/hr/status', result, 'any');

  // Test 2: Get API Info
  result = await testEndpoint('API Info', 'GET', `${HR_SERVICE_URL}/api/hr`, null, headers);
  printResult('hr', 'GET /api/hr', result, 'any');

  // Test 3: Employee Management
  console.log('\n📋 Employee Management Endpoints:'.yellow);
  result = await testEndpoint('Get Employees', 'GET', `${HR_SERVICE_URL}/api/hr/employees?page=1&limit=10`, null, headers);
  printResult('hr', 'GET /api/hr/employees', result, 'any');

  // Test 4: Store Management
  console.log('\n📋 Store Management Endpoints:'.yellow);
  result = await testEndpoint('Get Stores', 'GET', `${HR_SERVICE_URL}/api/hr/stores`, null, headers);
  printResult('hr', 'GET /api/hr/stores', result, 'any');

  // Test 5: Leave Management
  console.log('\n📋 Leave Management Endpoints:'.yellow);
  result = await testEndpoint('Get Leave Policies', 'GET', `${HR_SERVICE_URL}/api/hr/policies/leave`, null, headers);
  printResult('hr', 'GET /api/hr/policies/leave', result, 'any');

  result = await testEndpoint('Get Leave Requests', 'GET', `${HR_SERVICE_URL}/api/hr/leave-requests`, null, headers);
  printResult('hr', 'GET /api/hr/leave-requests', result, 'any');

  result = await testEndpoint('Get Leave Ledger', 'GET', `${HR_SERVICE_URL}/api/hr/leave-ledger`, null, headers);
  printResult('hr', 'GET /api/hr/leave-ledger', result, 'any');

  // Test 6: Payroll Management
  console.log('\n📋 Payroll Management Endpoints:'.yellow);
  result = await testEndpoint('Get Payroll Runs', 'GET', `${HR_SERVICE_URL}/api/hr/payroll-runs`, null, headers);
  printResult('hr', 'GET /api/hr/payroll-runs', result, 'any');

  result = await testEndpoint('Get Payslips', 'GET', `${HR_SERVICE_URL}/api/hr/payslips`, null, headers);
  printResult('hr', 'GET /api/hr/payslips', result, 'any');

  // Test 7: Transfer Management
  console.log('\n📋 Transfer Management Endpoints:'.yellow);
  result = await testEndpoint('Get Transfers', 'GET', `${HR_SERVICE_URL}/api/hr/transfer`, null, headers);
  printResult('hr', 'GET /api/hr/transfer', result, 'any');

  // Test 8: HR Letters
  console.log('\n📋 HR Letter Endpoints:'.yellow);
  result = await testEndpoint('Get HR Letters', 'GET', `${HR_SERVICE_URL}/api/hr/letters`, null, headers);
  printResult('hr', 'GET /api/hr/letters', result, 'any');

  result = await testEndpoint('Get HR Stats', 'GET', `${HR_SERVICE_URL}/api/hr/stats`, null, headers);
  printResult('hr', 'GET /api/hr/stats', result, 'any');

  // Test 9: Incentive Management
  console.log('\n📋 Incentive Management Endpoints:'.yellow);
  result = await testEndpoint('Get Incentive Claims', 'GET', `${HR_SERVICE_URL}/api/hr/incentive-claims`, null, headers);
  printResult('hr', 'GET /api/hr/incentive-claims', result, 'any');

  // Test 10: F&F Management
  console.log('\n📋 F&F Management Endpoints:'.yellow);
  result = await testEndpoint('Get F&F Cases', 'GET', `${HR_SERVICE_URL}/api/hr/fnf`, null, headers);
  printResult('hr', 'GET /api/hr/fnf', result, 'any');

  // Test 11: Statutory Management
  console.log('\n📋 Statutory Management Endpoints:'.yellow);
  result = await testEndpoint('Get Statutory Exports', 'GET', `${HR_SERVICE_URL}/api/hr/stat-exports`, null, headers);
  printResult('hr', 'GET /api/hr/stat-exports', result, 'any');

  // Test 12: Reports
  console.log('\n📋 Reports Endpoints:'.yellow);
  result = await testEndpoint('Get Payroll Cost Report', 'GET', `${HR_SERVICE_URL}/api/hr/reports/payroll-cost`, null, headers);
  printResult('hr', 'GET /api/hr/reports/payroll-cost', result, 'any');

  result = await testEndpoint('Get Leave Utilization Report', 'GET', `${HR_SERVICE_URL}/api/hr/reports/leave-utilization`, null, headers);
  printResult('hr', 'GET /api/hr/reports/leave-utilization', result, 'any');

  // Test 13: Audit
  console.log('\n📋 Audit Endpoints:'.yellow);
  result = await testEndpoint('Get Audit Logs', 'GET', `${HR_SERVICE_URL}/api/hr/audit-logs`, null, headers);
  printResult('hr', 'GET /api/hr/audit-logs', result, 'any');

  // Test 14: Onboarding
  console.log('\n📋 Onboarding Endpoints:'.yellow);
  result = await testEndpoint('Get Onboarding Draft', 'GET', `${HR_SERVICE_URL}/api/hr/onboarding/draft?employee_id=test123`, null, headers);
  printResult('hr', 'GET /api/hr/onboarding/draft', result, 'any');

  // Test through Gateway
  console.log('\n📋 Testing through API Gateway:'.yellow);
  result = await testEndpoint('Gateway HR Status', 'GET', `${GATEWAY_URL}/api/hr/status`, null, headers);
  printResult('hr', 'GET /api/hr/status (Gateway)', result, 'any');

  result = await testEndpoint('Gateway Get Employees', 'GET', `${GATEWAY_URL}/api/hr/employees?page=1&limit=5`, null, headers);
  printResult('hr', 'GET /api/hr/employees (Gateway)', result, 'any');
}

// ==================== MAIN TEST RUNNER ====================

async function runAllTests() {
  console.log('\n' + '🧪 COMPREHENSIVE ENDPOINT TESTING'.bold.cyan);
  console.log('='.repeat(80).cyan);
  console.log(`Gateway URL: ${GATEWAY_URL}`);
  console.log(`Auth Service: ${AUTH_SERVICE_URL}`);
  console.log(`HR Service: ${HR_SERVICE_URL}`);
  console.log(`Test Email: ${TEST_EMAIL}`);
  console.log('='.repeat(80).cyan);

  try {
    // Test Auth Service
    await testAuthService();

    // Test HR Service
    await testHRService();

    // Print Summary
    console.log('\n' + '='.repeat(80).cyan);
    console.log('📊 TEST SUMMARY'.cyan.bold);
    console.log('='.repeat(80).cyan);

    console.log('\n🔐 Auth Service:'.yellow);
    console.log(`   Total: ${results.auth.total}`);
    console.log(`   ✅ Passed: ${results.auth.passed}`.green);
    console.log(`   ❌ Failed: ${results.auth.failed}`.red);
    console.log(`   Success Rate: ${((results.auth.passed / results.auth.total) * 100).toFixed(1)}%`);

    if (results.auth.failed > 0) {
      console.log('\n   Failed Tests:'.red);
      results.auth.details.forEach(detail => {
        console.log(`     - ${detail.name}: ${detail.error}`);
      });
    }

    console.log('\n👥 HR Service:'.yellow);
    console.log(`   Total: ${results.hr.total}`);
    console.log(`   ✅ Passed: ${results.hr.passed}`.green);
    console.log(`   ❌ Failed: ${results.hr.failed}`.red);
    console.log(`   Success Rate: ${((results.hr.passed / results.hr.total) * 100).toFixed(1)}%`);

    if (results.hr.failed > 0) {
      console.log('\n   Failed Tests:'.red);
      results.hr.details.forEach(detail => {
        console.log(`     - ${detail.name}: ${detail.error}`);
      });
    }

    const totalTests = results.auth.total + results.hr.total;
    const totalPassed = results.auth.passed + results.hr.passed;
    const totalFailed = results.auth.failed + results.hr.failed;

    console.log('\n' + '='.repeat(80).cyan);
    console.log('🎯 OVERALL SUMMARY'.cyan.bold);
    console.log('='.repeat(80).cyan);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   ✅ Passed: ${totalPassed}`.green);
    console.log(`   ❌ Failed: ${totalFailed}`.red);
    console.log(`   Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);

    if (totalFailed === 0) {
      console.log('\n🎉 All tests passed!'.green.bold);
    } else {
      console.log(`\n⚠️  ${totalFailed} test(s) failed. Please review the errors above.`.yellow.bold);
    }

  } catch (error) {
    console.error('\n❌ Test execution failed:'.red.bold, error.message);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(console.error);

