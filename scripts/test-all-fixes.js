#!/usr/bin/env node

/**
 * Comprehensive test script for all fixed endpoints
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.BASE_URL || 'https://api.etelios.com';
const isLocal = process.argv.includes('--local');
const actualBaseUrl = isLocal ? 'http://localhost:3001' : BASE_URL;

if (!isLocal) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

let authToken = null;
let testEmployeeId = null;

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, url, data = null, authToken = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Host': 'api.etelios.com'
      },
      rejectUnauthorized: false
    };

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function login() {
  log('Logging in as Admin...', 'cyan');
  const response = await makeRequest('POST', `${actualBaseUrl}/api/auth/mock-login`, {
    email: 'admin@company.com',
    role: 'admin'
  });

  if (response.status === 200 && response.data?.data?.accessToken) {
    authToken = response.data.data.accessToken;
    log('✅ Login successful', 'green');
    return true;
  } else {
    log(`❌ Login failed: ${JSON.stringify(response.data)}`, 'red');
    return false;
  }
}

async function getFirstEmployee() {
  log('Getting first employee for testing...', 'cyan');
  const response = await makeRequest('GET', `${actualBaseUrl}/api/hr/employees?limit=1`, null, authToken);
  
  if (response.status === 200 && response.data?.data?.employees?.length > 0) {
    const employee = response.data.data.employees[0];
    testEmployeeId = employee.employeeId || employee.employee_id || employee._id;
    log(`✅ Found test employee: ${testEmployeeId}`, 'green');
    return true;
  } else {
    log('⚠️  No employees found, will test with sample ID', 'yellow');
    testEmployeeId = 'EMP-2025-863851'; // Fallback
    return false;
  }
}

async function testAllEndpoints() {
  const results = {
    passed: [],
    failed: []
  };

  // Test 1: GET /api/hr/employees
  log('\n━━━ Test 1: GET /api/hr/employees ━━━', 'bright');
  try {
    const response = await makeRequest('GET', `${actualBaseUrl}/api/hr/employees`, null, authToken);
    if (response.status === 200) {
      log('✅ Passed', 'green');
      results.passed.push('GET /api/hr/employees');
    } else {
      log(`❌ Failed: ${JSON.stringify(response.data)}`, 'red');
      results.failed.push({ endpoint: 'GET /api/hr/employees', status: response.status, error: response.data });
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    results.failed.push({ endpoint: 'GET /api/hr/employees', error: error.message });
  }

  // Test 2: POST /api/auth/register
  log('\n━━━ Test 2: POST /api/auth/register ━━━', 'bright');
  try {
    const timestamp = Date.now();
    const joiningDate = new Date();
    joiningDate.setFullYear(2024, 0, 1); // Set to a valid date
    
    const response = await makeRequest('POST', `${actualBaseUrl}/api/auth/register`, {
      employee_id: `EMP-TEST-${timestamp}`,
      name: 'Test User',
      email: `test${timestamp}@example.com`,
      password: 'Test1234!',
      role: 'employee',
      phone: '+1234567890',
      department: 'IT',
      designation: 'Developer',
      joining_date: joiningDate.toISOString()
    }, authToken);
    
    if (response.status === 201 || response.status === 200) {
      log('✅ Passed', 'green');
      results.passed.push('POST /api/auth/register');
    } else {
      log(`❌ Failed: ${JSON.stringify(response.data)}`, 'red');
      results.failed.push({ endpoint: 'POST /api/auth/register', status: response.status, error: response.data });
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    results.failed.push({ endpoint: 'POST /api/auth/register', error: error.message });
  }

  // Test 3: POST /api/hr/employees/:id/assign-role (only if we have a real employee)
  if (testEmployeeId && testEmployeeId !== 'EMP-2025-863851') {
    log(`\n━━━ Test 3: POST /api/hr/employees/${testEmployeeId}/assign-role ━━━`, 'bright');
    try {
      const response = await makeRequest('POST', `${actualBaseUrl}/api/hr/employees/${testEmployeeId}/assign-role`, {
        roleName: 'employee'
      }, authToken);
      
      if (response.status === 200) {
        log('✅ Passed', 'green');
        results.passed.push('POST /api/hr/employees/:id/assign-role');
      } else {
        log(`❌ Failed: ${JSON.stringify(response.data)}`, 'red');
        results.failed.push({ endpoint: 'POST /api/hr/employees/:id/assign-role', status: response.status, error: response.data });
      }
    } catch (error) {
      log(`❌ Error: ${error.message}`, 'red');
      results.failed.push({ endpoint: 'POST /api/hr/employees/:id/assign-role', error: error.message });
    }
  } else {
    log(`\n━━━ Test 3: POST /api/hr/employees/:id/assign-role ━━━`, 'bright');
    log('⚠️  Skipped - No valid employee ID available', 'yellow');
  }

  // Test 4: PATCH /api/hr/employees/:id/status (only if we have a real employee)
  if (testEmployeeId && testEmployeeId !== 'EMP-2025-863851') {
    log(`\n━━━ Test 4: PATCH /api/hr/employees/${testEmployeeId}/status ━━━`, 'bright');
    try {
      const response = await makeRequest('PATCH', `${actualBaseUrl}/api/hr/employees/${testEmployeeId}/status`, {
        status: 'active'
      }, authToken);
      
      if (response.status === 200) {
        log('✅ Passed', 'green');
        results.passed.push('PATCH /api/hr/employees/:id/status');
      } else {
        log(`❌ Failed: ${JSON.stringify(response.data)}`, 'red');
        results.failed.push({ endpoint: 'PATCH /api/hr/employees/:id/status', status: response.status, error: response.data });
      }
    } catch (error) {
      log(`❌ Error: ${error.message}`, 'red');
      results.failed.push({ endpoint: 'PATCH /api/hr/employees/:id/status', error: error.message });
    }
  } else {
    log(`\n━━━ Test 4: PATCH /api/hr/employees/:id/status ━━━`, 'bright');
    log('⚠️  Skipped - No valid employee ID available', 'yellow');
  }

  // Summary
  log('\n═══════════════════════════════════════════════════════', 'bright');
  log('  Test Summary', 'bright');
  log('═══════════════════════════════════════════════════════', 'bright');
  
  const total = results.passed.length + results.failed.length;
  log(`\nTotal Tests: ${total}`, 'cyan');
  log(`Passed: ${results.passed.length}`, 'green');
  log(`Failed: ${results.failed.length}`, 'red');
  log(`Success Rate: ${total > 0 ? ((results.passed.length / total) * 100).toFixed(1) : 0}%`, 'cyan');

  if (results.passed.length > 0) {
    log('\n✅ Passed Tests:', 'green');
    results.passed.forEach(test => log(`   ${test}`, 'green'));
  }

  if (results.failed.length > 0) {
    log('\n❌ Failed Tests:', 'red');
    results.failed.forEach(test => {
      log(`   ${test.endpoint}`, 'red');
      if (test.status) log(`      Status: ${test.status}`, 'yellow');
      if (test.error) log(`      Error: ${JSON.stringify(test.error)}`, 'yellow');
    });
  }

  log(`\n${isLocal ? 'Local' : 'Production'} Server: ${actualBaseUrl}`, 'cyan');
  
  return results.failed.length === 0;
}

async function main() {
  log('═══════════════════════════════════════════════════════', 'bright');
  log('  Testing All Fixed Endpoints', 'bright');
  log('═══════════════════════════════════════════════════════', 'bright');

  const loggedIn = await login();
  if (!loggedIn) {
    log('Cannot proceed without authentication', 'red');
    process.exit(1);
  }

  await getFirstEmployee();
  const allPassed = await testAllEndpoints();
  
  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);

