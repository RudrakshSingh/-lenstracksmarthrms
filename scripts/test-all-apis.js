#!/usr/bin/env node

/**
 * Comprehensive API Test Suite
 * Tests all APIs across Auth, HR, and Attendance services
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.BASE_URL || 'https://98.70.245.87';
const LOCAL_BASE_URL = process.env.LOCAL_BASE_URL || 'http://localhost';
const USE_LOCAL = process.env.USE_LOCAL === 'true';
const USE_DOMAIN = process.env.USE_DOMAIN === 'true';

// Production requires Host header, but we can use domain if available
const PRODUCTION_DOMAIN = 'api.etelios.com';
const API_BASE = USE_LOCAL 
  ? LOCAL_BASE_URL 
  : (USE_DOMAIN ? `https://${PRODUCTION_DOMAIN}` : BASE_URL);

// Test results storage
const results = {
  passed: [],
  failed: [],
  skipped: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  }
};

// Authentication tokens for different roles
const tokens = {
  superadmin: null,
  admin: null,
  hr: null,
  manager: null,
  employee: null
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[1m\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Logging utilities
 */
const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.blue}━━━ ${msg} ━━━${colors.reset}\n`)
};

/**
 * Make HTTP request with error handling
 * Uses Node's http/https modules to allow setting Host header
 */
async function makeRequest(method, url, data = null, headers = {}) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;

      const requestHeaders = {
        'Content-Type': 'application/json',
        ...headers
      };

      // Add Host header for production if using IP
      if (!USE_LOCAL && !USE_DOMAIN && url.includes('98.70.245.87')) {
        requestHeaders['Host'] = PRODUCTION_DOMAIN;
      }

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: requestHeaders,
        timeout: 15000,
        // Allow self-signed certificates (needed for production server)
        rejectUnauthorized: false
      };

      const req = client.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          let parsedData = {};
          try {
            if (responseData) {
              parsedData = JSON.parse(responseData);
            }
          } catch (e) {
            // Not JSON, keep empty object
          }
          
          resolve({
            success: res.statusCode < 500,
            status: res.statusCode,
            data: parsedData,
            response: res
          });
        });
      });

      req.on('error', (error) => {
        resolve({
          success: false,
          status: 0,
          data: null,
          error: error.message
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          status: 0,
          data: null,
          error: 'Request timeout'
        });
      });

      if (data) {
        const body = JSON.stringify(data);
        req.write(body);
      }
      
      req.end();
    } catch (error) {
      resolve({
        success: false,
        status: 0,
        data: null,
        error: error.message
      });
    }
  });
}

/**
 * Test an API endpoint
 */
async function testEndpoint(name, method, endpoint, options = {}) {
  results.summary.total++;
  
  const {
    data = null,
    headers = {},
    expectedStatus = [200, 201],
    skip = false,
    auth = false,
    role = 'admin'
  } = options;

  if (skip) {
    results.skipped.push({ name, endpoint, reason: 'Skipped' });
    results.summary.skipped++;
    log.warn(`SKIP: ${name}`);
    return { success: true, skipped: true };
  }

  // Add authentication token if needed
  const requestHeaders = { ...headers };
  if (auth && tokens[role]) {
    requestHeaders['Authorization'] = `Bearer ${tokens[role]}`;
  }

  const url = `${API_BASE}${endpoint}`;
  
  try {
    const result = await makeRequest(method, url, data, requestHeaders);
    
    const statusMatch = Array.isArray(expectedStatus)
      ? expectedStatus.includes(result.status)
      : result.status === expectedStatus;

    if (statusMatch) {
      results.passed.push({
        name,
        endpoint,
        method,
        status: result.status
      });
      results.summary.passed++;
      log.success(`${method} ${endpoint} - ${name}`);
      return { success: true, result };
    } else {
      results.failed.push({
        name,
        endpoint,
        method,
        expected: expectedStatus,
        actual: result.status,
        error: result.data || result.error
      });
      results.summary.failed++;
      log.error(`${method} ${endpoint} - ${name} (Expected: ${expectedStatus}, Got: ${result.status})`);
      return { success: false, result };
    }
  } catch (error) {
    results.failed.push({
      name,
      endpoint,
      method,
      error: error.message
    });
    results.summary.failed++;
    log.error(`${method} ${endpoint} - ${name} (Error: ${error.message})`);
    return { success: false, error };
  }
}

/**
 * Authenticate and get tokens for different roles
 */
async function authenticateRoles() {
  log.section('Authentication Setup');
  
  const roles = ['superadmin', 'admin', 'hr', 'manager', 'employee'];
  
  for (const role of roles) {
    try {
      log.info(`Getting token for ${role}...`);
      const result = await makeRequest('POST', `${API_BASE}/api/auth/mock-login-fast`, {
        role: role
      });
      
      // Response structure: { success: true, data: { accessToken: "...", ... } }
      if (result.success && result.data && result.data.data && result.data.data.accessToken) {
        tokens[role] = result.data.data.accessToken;
        log.success(`✓ Authenticated as ${role}`);
      } else if (result.success && result.data && result.data.accessToken) {
        // Fallback for different response structure
        tokens[role] = result.data.accessToken;
        log.success(`✓ Authenticated as ${role}`);
      } else {
        log.warn(`⚠ Could not authenticate as ${role} - Status: ${result.status}, Data: ${JSON.stringify(result.data).substring(0, 100)}`);
      }
    } catch (error) {
      log.warn(`⚠ Authentication failed for ${role}: ${error.message}`);
    }
  }
}

/**
 * Test Auth Service APIs
 */
async function testAuthService() {
  log.section('AUTH SERVICE APIs');

  // Health & Status
  await testEndpoint('Health Check', 'GET', '/api/auth/health');
  await testEndpoint('Status Check', 'GET', '/api/auth/status');

  // Authentication
  await testEndpoint('Mock Login Fast', 'POST', '/api/auth/mock-login-fast', {
    data: { role: 'admin' },
    expectedStatus: [200, 201]
  });

  await testEndpoint('Mock Login', 'POST', '/api/auth/mock-login', {
    data: { role: 'admin' },
    expectedStatus: [200, 201]
  });

  await testEndpoint('Login (Invalid)', 'POST', '/api/auth/login', {
    data: { emailOrEmployeeId: 'invalid@test.com', password: 'wrong' },
    expectedStatus: [401, 400]
  });

  await testEndpoint('Refresh Token (Invalid)', 'POST', '/api/auth/refresh-token', {
    data: { refreshToken: 'invalid' },
    expectedStatus: [401, 400]
  });

  // Profile (requires auth)
  await testEndpoint('Get Profile', 'GET', '/api/auth/profile', {
    auth: true,
    role: 'admin'
  });

  await testEndpoint('Update Profile', 'PUT', '/api/auth/profile', {
    auth: true,
    role: 'admin',
    data: { phone: '+1234567890' }
  });

  // Password
  await testEndpoint('Request Password Reset', 'POST', '/api/auth/request-password-reset', {
    data: { email: 'test@example.com' },
    expectedStatus: [200, 201, 404] // 404 if user doesn't exist
  });

  await testEndpoint('Change Password (Unauthorized)', 'POST', '/api/auth/change-password', {
    data: { currentPassword: 'old', newPassword: 'new' },
    expectedStatus: [401, 403]
  });

  await testEndpoint('Logout', 'POST', '/api/auth/logout', {
    auth: true,
    role: 'admin'
  });

  // Real Users Management
  await testEndpoint('Get Real Users', 'GET', '/api/real-users', {
    auth: true,
    role: 'admin'
  });

  await testEndpoint('Get Real User Profile', 'GET', '/api/real-users/profile', {
    auth: true,
    role: 'admin'
  });

  // Permissions
  await testEndpoint('Get All Permissions', 'GET', '/api/permission/permissions', {
    auth: true,
    role: 'admin'
  });

  await testEndpoint('Get Users with Permissions', 'GET', '/api/permission/users', {
    auth: true,
    role: 'admin'
  });

  // Emergency Lock
  await testEndpoint('Emergency Status', 'GET', '/api/emergency/status');
  await testEndpoint('Verify Recovery Keys', 'POST', '/api/emergency/verify-keys', {
    data: { keys: ['key1', 'key2'] },
    expectedStatus: [200, 400]
  });
}

/**
 * Test HR Service APIs
 */
async function testHRService() {
  log.section('HR SERVICE APIs');

  // Health & Status
  await testEndpoint('HR Health Check', 'GET', '/api/hr/health');
  await testEndpoint('HR Status', 'GET', '/api/hr/status');
  await testEndpoint('HR Service Info', 'GET', '/api/hr');

  // Departments
  await testEndpoint('Get Departments', 'GET', '/api/hr/departments', {
    auth: true,
    role: 'admin'
  });

  await testEndpoint('Create Department', 'POST', '/api/hr/departments', {
    auth: true,
    role: 'admin',
    data: {
      name: 'Test Department',
      code: 'TEST',
      description: 'Test department for API testing'
    },
    expectedStatus: [200, 201, 409] // 409 if already exists
  });

  // Employees
  await testEndpoint('Get Employees', 'GET', '/api/hr/employees', {
    auth: true,
    role: 'admin',
    expectedStatus: [200]
  });

  await testEndpoint('Get Employees (HR)', 'GET', '/api/hr/employees', {
    auth: true,
    role: 'hr',
    expectedStatus: [200]
  });

  await testEndpoint('Get Employees (Manager)', 'GET', '/api/hr/employees', {
    auth: true,
    role: 'manager',
    expectedStatus: [200, 403]
  });

  await testEndpoint('Get Employees (Employee)', 'GET', '/api/hr/employees', {
    auth: true,
    role: 'employee',
    expectedStatus: [200, 403]
  });

  // Stores
  await testEndpoint('Get Stores', 'GET', '/api/hr/stores', {
    auth: true,
    role: 'admin'
  });

  await testEndpoint('Create Store', 'POST', '/api/hr/stores', {
    auth: true,
    role: 'admin',
    data: {
      name: 'Test Store',
      code: `TEST-${Date.now()}`,
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        zip: '12345',
        country: 'India'
      }
    },
    expectedStatus: [200, 201, 409]
  });

  // Onboarding
  await testEndpoint('Get Onboarding Draft', 'GET', '/api/hr/onboarding/draft', {
    auth: true,
    role: 'hr'
  });

  await testEndpoint('Save Onboarding Draft', 'POST', '/api/hr/onboarding/draft', {
    auth: true,
    role: 'hr',
    data: {
      personalDetails: {
        firstName: 'Test',
        lastName: 'User',
        email: `test${Date.now()}@example.com`,
        phone: '+1234567890'
      }
    },
    expectedStatus: [200, 201]
  });

  // Leave Management
  await testEndpoint('Get Leave Requests', 'GET', '/api/hr/leave', {
    auth: true,
    role: 'employee'
  });

  await testEndpoint('Get Leave Balance', 'GET', '/api/hr/leave/balance', {
    auth: true,
    role: 'employee'
  });

  await testEndpoint('Get Leave Summary', 'GET', '/api/hr/leave/summary', {
    auth: true,
    role: 'employee'
  });

  // Payroll
  await testEndpoint('Get Payroll Runs', 'GET', '/api/hr/payroll/runs', {
    auth: true,
    role: 'hr'
  });

  // Reports
  await testEndpoint('Get Employee Reports', 'GET', '/api/hr/reports/employees', {
    auth: true,
    role: 'hr'
  });

  await testEndpoint('Get Attendance Reports', 'GET', '/api/hr/reports/attendance', {
    auth: true,
    role: 'hr'
  });

  await testEndpoint('Get Leave Reports', 'GET', '/api/hr/reports/leave', {
    auth: true,
    role: 'hr'
  });

  // Admin Management
  await testEndpoint('Get All Users (Admin)', 'GET', '/api/admin/users', {
    auth: true,
    role: 'admin'
  });

  await testEndpoint('Get All Roles', 'GET', '/api/admin/roles', {
    auth: true,
    role: 'admin'
  });

  await testEndpoint('Get All Permissions', 'GET', '/api/admin/permissions', {
    auth: true,
    role: 'admin'
  });

  await testEndpoint('Get System Settings', 'GET', '/api/admin/system-settings', {
    auth: true,
    role: 'admin'
  });

  // Transfers
  await testEndpoint('Get Transfers', 'GET', '/api/transfers', {
    auth: true,
    role: 'hr'
  });

  // HR Letters
  await testEndpoint('Get HR Letters', 'GET', '/api/hr-letter/letters', {
    auth: true,
    role: 'hr'
  });

  await testEndpoint('Get HR Letter Stats', 'GET', '/api/hr-letter/stats', {
    auth: true,
    role: 'hr'
  });

  // F&F
  await testEndpoint('Get F&F Cases', 'GET', '/api/hr/fnf/cases', {
    auth: true,
    role: 'hr'
  });

  // Audit
  await testEndpoint('Get Audit Logs', 'GET', '/api/hr/audit/logs', {
    auth: true,
    role: 'admin'
  });

  // Statutory
  await testEndpoint('Get Statutory Returns', 'GET', '/api/hr/statutory/returns', {
    auth: true,
    role: 'hr'
  });

  // Incentives
  await testEndpoint('Get Incentive Claims', 'GET', '/api/hr/incentive/claims', {
    auth: true,
    role: 'employee'
  });

  // Documents
  await testEndpoint('Get Documents (Unauthorized)', 'GET', '/api/documents/invalid', {
    auth: true,
    role: 'employee',
    expectedStatus: [400, 404, 403]
  });
}

/**
 * Test Attendance Service APIs
 */
async function testAttendanceService() {
  log.section('ATTENDANCE SERVICE APIs');

  // Health & Status
  await testEndpoint('Attendance Health Check', 'GET', '/api/attendance/health');
  await testEndpoint('Attendance Status', 'GET', '/api/attendance/status');

  // Attendance
  await testEndpoint('Get Attendance History', 'GET', '/api/attendance/history', {
    auth: true,
    role: 'employee'
  });

  await testEndpoint('Get Attendance Summary', 'GET', '/api/attendance/summary', {
    auth: true,
    role: 'employee'
  });

  await testEndpoint('Get All Attendance Records', 'GET', '/api/attendance', {
    auth: true,
    role: 'hr'
  });

  await testEndpoint('Get Attendance Records', 'GET', '/api/attendance/records', {
    auth: true,
    role: 'employee'
  });

  await testEndpoint('Get Attendance Reports', 'GET', '/api/attendance/reports', {
    auth: true,
    role: 'hr'
  });

  // Geofencing
  await testEndpoint('Get Geofencing Settings', 'GET', '/api/geofencing/settings', {
    auth: true,
    role: 'employee'
  });

  await testEndpoint('Get Geofencing Users', 'GET', '/api/geofencing/users', {
    auth: true,
    role: 'admin'
  });

  await testEndpoint('Check Geofencing', 'POST', '/api/geofencing/check', {
    auth: true,
    role: 'employee',
    data: {
      latitude: 28.6139,
      longitude: 77.2090
    },
    expectedStatus: [200, 400]
  });

  // Security
  await testEndpoint('Get Security Violations', 'GET', '/api/security/violations', {
    auth: true,
    role: 'admin'
  });

  await testEndpoint('Get IP Geolocation', 'GET', '/api/security/ip-geolocation', {
    auth: true,
    role: 'admin'
  });
}

/**
 * Generate test report
 */
function generateReport() {
  log.section('TEST RESULTS SUMMARY');

  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.blue}           API TEST RESULTS SUMMARY${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);

  console.log(`Total Tests:    ${results.summary.total}`);
  console.log(`${colors.green}Passed:         ${results.summary.passed}${colors.reset}`);
  console.log(`${colors.red}Failed:         ${results.summary.failed}${colors.reset}`);
  console.log(`${colors.yellow}Skipped:        ${results.summary.skipped}${colors.reset}`);

  const passRate = ((results.summary.passed / results.summary.total) * 100).toFixed(2);
  console.log(`\nPass Rate:      ${passRate}%`);

  if (results.failed.length > 0) {
    log.section('FAILED TESTS');
    results.failed.forEach((test, index) => {
      console.log(`\n${index + 1}. ${colors.red}${test.name}${colors.reset}`);
      console.log(`   Endpoint: ${test.method} ${test.endpoint}`);
      if (test.expected) {
        console.log(`   Expected: ${test.expected}, Got: ${test.actual || 'N/A'}`);
      }
      if (test.error) {
        console.log(`   Error: ${JSON.stringify(test.error).substring(0, 200)}`);
      }
    });
  }

  // Save report to file
  const reportPath = path.join(__dirname, '..', 'test-results.json');
  const reportData = {
    timestamp: new Date().toISOString(),
    baseUrl: API_BASE,
    summary: results.summary,
    passed: results.passed,
    failed: results.failed,
    skipped: results.skipped
  };

  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  log.info(`\nDetailed report saved to: ${reportPath}`);

  // Generate HTML report
  generateHTMLReport(reportData);
}

/**
 * Generate HTML report
 */
function generateHTMLReport(data) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>API Test Results</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { color: #333; }
    .summary { display: flex; gap: 20px; margin: 20px 0; }
    .stat { flex: 1; padding: 15px; border-radius: 5px; text-align: center; }
    .stat.passed { background: #d4edda; color: #155724; }
    .stat.failed { background: #f8d7da; color: #721c24; }
    .stat.skipped { background: #fff3cd; color: #856404; }
    .stat.total { background: #d1ecf1; color: #0c5460; }
    .stat h2 { margin: 0; font-size: 2em; }
    .stat p { margin: 5px 0 0 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f8f9fa; font-weight: bold; }
    tr:hover { background: #f5f5f5; }
    .status-pass { color: green; font-weight: bold; }
    .status-fail { color: red; font-weight: bold; }
    .status-skip { color: orange; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <h1>API Test Results</h1>
    <p><strong>Timestamp:</strong> ${data.timestamp}</p>
    <p><strong>Base URL:</strong> ${data.baseUrl}</p>
    
    <div class="summary">
      <div class="stat total">
        <h2>${data.summary.total}</h2>
        <p>Total Tests</p>
      </div>
      <div class="stat passed">
        <h2>${data.summary.passed}</h2>
        <p>Passed</p>
      </div>
      <div class="stat failed">
        <h2>${data.summary.failed}</h2>
        <p>Failed</p>
      </div>
      <div class="stat skipped">
        <h2>${data.summary.skipped}</h2>
        <p>Skipped</p>
      </div>
    </div>

    <h2>Failed Tests</h2>
    <table>
      <thead>
        <tr>
          <th>Test Name</th>
          <th>Method</th>
          <th>Endpoint</th>
          <th>Status</th>
          <th>Error</th>
        </tr>
      </thead>
      <tbody>
        ${data.failed.map(test => `
          <tr>
            <td>${test.name}</td>
            <td>${test.method}</td>
            <td>${test.endpoint}</td>
            <td>${test.actual || 'N/A'}</td>
            <td>${JSON.stringify(test.error || '').substring(0, 100)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <h2>All Tests</h2>
    <table>
      <thead>
        <tr>
          <th>Status</th>
          <th>Test Name</th>
          <th>Method</th>
          <th>Endpoint</th>
        </tr>
      </thead>
      <tbody>
        ${data.passed.map(test => `
          <tr>
            <td class="status-pass">✓ PASS</td>
            <td>${test.name}</td>
            <td>${test.method}</td>
            <td>${test.endpoint}</td>
          </tr>
        `).join('')}
        ${data.failed.map(test => `
          <tr>
            <td class="status-fail">✗ FAIL</td>
            <td>${test.name}</td>
            <td>${test.method}</td>
            <td>${test.endpoint}</td>
          </tr>
        `).join('')}
        ${data.skipped.map(test => `
          <tr>
            <td class="status-skip">⊘ SKIP</td>
            <td>${test.name}</td>
            <td>-</td>
            <td>${test.endpoint}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>
  `;

  const htmlPath = path.join(__dirname, '..', 'test-results.html');
  fs.writeFileSync(htmlPath, html);
  log.info(`HTML report saved to: ${htmlPath}`);
}

/**
 * Main test runner
 */
async function runTests() {
  console.log(`\n${colors.blue}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║        COMPREHENSIVE API TEST SUITE                        ║${colors.reset}`);
  console.log(`${colors.blue}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`);

  log.info(`Base URL: ${API_BASE}`);
  log.info(`Mode: ${USE_LOCAL ? 'LOCAL' : USE_DOMAIN ? 'PRODUCTION (Domain)' : 'PRODUCTION (IP)'}`);
  
  if (!USE_LOCAL && !USE_DOMAIN) {
    log.warn(`⚠️  Note: Production server requires Host: api.etelios.com header`);
    log.warn(`⚠️  If tests fail, try: USE_DOMAIN=true npm run test:apis`);
    log.warn(`⚠️  Or set up DNS: api.etelios.com -> 98.70.245.87\n`);
  } else {
    log.info('');
  }

  try {
    // Step 1: Authenticate
    await authenticateRoles();

    // Step 2: Test all services
    await testAuthService();
    await testHRService();
    await testAttendanceService();

    // Step 3: Generate report
    generateReport();

    // Exit with appropriate code
    process.exit(results.summary.failed > 0 ? 1 : 0);
  } catch (error) {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runTests();

