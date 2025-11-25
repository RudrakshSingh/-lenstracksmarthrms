#!/usr/bin/env node

/**
 * Simple API Endpoints Test Script (No external dependencies)
 * Uses Node.js built-in modules only
 */

const http = require('http');
const https = require('https');

// Configuration
const BASE_URL = process.env.API_BASE_URL || process.env.BASE_URL || 'http://localhost:3002';
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@company.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password123';

// Production URL (if testing against production)
const PRODUCTION_URL = 'https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net';

// Parse URL
const url = new URL(BASE_URL);
const isHttps = url.protocol === 'https:';
const client = isHttps ? https : http;

let authToken = null;
let refreshToken = null;

// Test results
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  details: []
};

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            data: parsed,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body,
            headers: res.headers
          });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test function
async function testEndpoint(name, method, path, options = {}) {
  const { data, expectedStatus = 200, skip = false } = options;
  
  if (skip) {
    results.skipped++;
    results.details.push({ name, status: 'SKIPPED' });
    console.log(`⏭️  SKIPPED: ${name}`);
    return { success: true, skipped: true };
  }

  try {
    const startTime = Date.now();
    const response = await makeRequest(method, path, data, authToken);
    const duration = Date.now() - startTime;

    const success = response.status === expectedStatus || 
                   (expectedStatus === 'any' && response.status < 500);

    if (success) {
      results.passed++;
      results.details.push({ name, status: 'PASSED', code: response.status, duration });
      console.log(`✅ ${name} - ${response.status} (${duration}ms)`);
      return { success: true, data: response.data, status: response.status };
    } else {
      results.failed++;
      results.details.push({ 
        name, 
        status: 'FAILED', 
        expected: expectedStatus, 
        actual: response.status,
        error: response.data?.message || response.statusText
      });
      console.log(`❌ ${name} - Expected ${expectedStatus}, got ${response.status}`);
      if (response.data?.message) {
        console.log(`   Error: ${response.data.message}`);
      }
      return { success: false, error: response.data, status: response.status };
    }
  } catch (error) {
    results.failed++;
    const errorMsg = error.code === 'ECONNREFUSED' 
      ? 'Connection refused - Service may not be running'
      : error.code === 'ENOTFOUND'
      ? 'Host not found - Check API_BASE_URL'
      : error.message;
    results.details.push({ name, status: 'ERROR', error: errorMsg, code: error.code });
    console.log(`❌ ${name} - ${errorMsg}${error.code ? ` (${error.code})` : ''}`);
    return { success: false, error: errorMsg };
  }
}

// Test suites
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 HRMS API ENDPOINTS TEST SUITE');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test Email: ${TEST_EMAIL}`);
  console.log('='.repeat(60) + '\n');

  // Check connectivity first
  try {
    const healthCheck = await makeRequest('GET', '/health', null, null);
    if (healthCheck.status === 200) {
      console.log('✅ Service is reachable\n');
    } else {
      console.log(`⚠️  Service returned status ${healthCheck.status}\n`);
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Cannot connect to service. Is it running?');
      console.log(`   Tried: ${BASE_URL}`);
      console.log('   Tip: Start the service or set API_BASE_URL environment variable\n');
    } else if (error.code === 'ENOTFOUND') {
      console.log('❌ Host not found. Check API_BASE_URL');
      console.log(`   Current: ${BASE_URL}\n`);
    } else {
      console.log(`⚠️  Health check failed: ${error.message}\n`);
    }
  }

  try {
    // 1. Authentication
    console.log('\n📋 Testing Authentication Endpoints...\n');
    const loginResult = await testEndpoint(
      'Login',
      'POST',
      '/api/auth/login',
      {
        data: { email: TEST_EMAIL, password: TEST_PASSWORD },
        expectedStatus: 200
      }
    );

    if (loginResult.success && loginResult.data) {
      authToken = loginResult.data.accessToken || loginResult.data.token;
      refreshToken = loginResult.data.refreshToken;
      console.log(`   Token obtained: ${authToken ? 'Yes' : 'No'}\n`);
    }

    await testEndpoint('Get Current User', 'GET', '/api/auth/me', { expectedStatus: 200 });

    // 2. Employee Management
    console.log('\n📋 Testing Employee Management...\n');
    await testEndpoint('Get Employees', 'GET', '/api/hr/employees?page=1&limit=10', { expectedStatus: 200 });
    await testEndpoint('Get Employee by ID', 'GET', '/api/hr/employees/507f1f77bcf86cd799439011', { expectedStatus: 'any' });

    // 3. Store Management
    console.log('\n📋 Testing Store Management...\n');
    await testEndpoint('Get Stores', 'GET', '/api/hr/stores', { expectedStatus: 200 });
    await testEndpoint('Get Store by ID', 'GET', '/api/hr/stores/507f1f77bcf86cd799439011', { expectedStatus: 'any' });

    // 4. Leave Management
    console.log('\n📋 Testing Leave Management...\n');
    await testEndpoint('Get Leave Policy', 'GET', '/api/hr/policies/leave', { expectedStatus: 200 });
    await testEndpoint('Get Leave Requests', 'GET', '/api/hr/leave-requests?page=1&limit=10', { expectedStatus: 200 });
    await testEndpoint('Get Leave Ledger', 'GET', '/api/hr/leave-ledger', { expectedStatus: 200 });

    // 5. Payroll Management
    console.log('\n📋 Testing Payroll Management...\n');
    await testEndpoint('Get Payroll Runs', 'GET', '/api/hr/payroll-runs?page=1&limit=10', { expectedStatus: 200 });
    await testEndpoint('Get Payslips', 'GET', '/api/hr/payslips?page=1&limit=10', { expectedStatus: 200 });

    // 6. Incentive Management
    console.log('\n📋 Testing Incentive Management...\n');
    await testEndpoint('Get Incentive Claims', 'GET', '/api/hr/incentive-claims?page=1&limit=10', { expectedStatus: 200 });

    // 7. F&F Management
    console.log('\n📋 Testing F&F Settlement...\n');
    await testEndpoint('Get F&F Cases', 'GET', '/api/hr/fnf?page=1&limit=10', { expectedStatus: 200 });

    // 8. Transfer Management
    console.log('\n📋 Testing Transfer Management...\n');
    await testEndpoint('Get Transfers', 'GET', '/api/transfers?page=1&limit=10', { expectedStatus: 200 });

    // 9. HR Letters
    console.log('\n📋 Testing HR Letters...\n');
    await testEndpoint('Get HR Letters', 'GET', '/api/hr-letter/letters?page=1&limit=10', { expectedStatus: 200 });
    await testEndpoint('Get Letter Stats', 'GET', '/api/hr-letter/stats', { expectedStatus: 200 });

    // 10. Statutory Compliance
    console.log('\n📋 Testing Statutory Compliance...\n');
    await testEndpoint('Get Stat Exports', 'GET', '/api/hr/stat-exports?page=1&limit=10', { expectedStatus: 200 });

    // 11. Reports
    console.log('\n📋 Testing Reports...\n');
    await testEndpoint('Payroll Cost Report', 'GET', '/api/hr/reports/payroll-cost', { expectedStatus: 200 });
    await testEndpoint('Leave Utilization Report', 'GET', '/api/hr/reports/leave-utilization', { expectedStatus: 200 });
    await testEndpoint('Attrition Report', 'GET', '/api/hr/reports/attrition', { expectedStatus: 200 });

    // 12. Audit
    console.log('\n📋 Testing Audit...\n');
    await testEndpoint('Get Audit Logs', 'GET', '/api/hr/audit-logs?page=1&limit=10', { expectedStatus: 200 });

    // 13. Health Endpoints
    console.log('\n📋 Testing Health Endpoints...\n');
    await testEndpoint('Health Check', 'GET', '/health', { expectedStatus: 200, skip: false });
    await testEndpoint('HR Status', 'GET', '/api/hr/status', { expectedStatus: 200, skip: false });
    await testEndpoint('HR Health', 'GET', '/api/hr/health', { expectedStatus: 200, skip: false });

    // Logout
    if (authToken) {
      console.log('\n📋 Testing Logout...\n');
      await testEndpoint('Logout', 'POST', '/api/auth/logout', {
        data: refreshToken ? { refreshToken } : {},
        expectedStatus: 200
      });
    }

  } catch (error) {
    console.error(`\n❌ Test suite error: ${error.message}`);
  }

  // Print summary
  printSummary();
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const total = results.passed + results.failed + results.skipped;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;

  console.log(`\n✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⏭️  Skipped: ${results.skipped}`);
  console.log(`📈 Pass Rate: ${passRate}%`);
  console.log(`📊 Total Tests: ${total}`);

  if (results.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.details
      .filter(t => t.status === 'FAILED' || t.status === 'ERROR')
      .forEach((test, index) => {
        console.log(`\n${index + 1}. ${test.name}`);
        if (test.expected && test.actual) {
          console.log(`   Expected: ${test.expected}, Got: ${test.actual}`);
        }
        if (test.error) {
          console.log(`   Error: ${test.error}`);
        }
      });
  }

  console.log('\n' + '='.repeat(60));
  
  if (results.failed === 0) {
    console.log('🎉 ALL TESTS PASSED!');
  } else {
    console.log('⚠️  SOME TESTS FAILED');
    process.exit(1);
  }
  
  console.log('='.repeat(60) + '\n');
}

// Run tests
if (require.main === module) {
  runTests().catch(error => {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runTests, testEndpoint };

