#!/usr/bin/env node

/**
 * Test Suite for All Newly Created Endpoints
 * Tests all the endpoints that were just created
 */

const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = process.env.BASE_URL || 'https://98.70.245.87';
const LOCAL_BASE_URL = process.env.LOCAL_BASE_URL || 'http://localhost:3002';
const USE_LOCAL = process.argv.includes('--local');
const API_BASE = USE_LOCAL ? LOCAL_BASE_URL : BASE_URL;

// Test results
const results = {
  passed: [],
  failed: [],
  summary: { total: 0, passed: 0, failed: 0 }
};

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[1m\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.blue}━━━ ${msg} ━━━${colors.reset}\n`)
};

// Authentication token
let authToken = null;

/**
 * Make HTTP request
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

      if (authToken) {
        requestHeaders['Authorization'] = `Bearer ${authToken}`;
      }

      if (!USE_LOCAL && url.includes('98.70.245.87')) {
        requestHeaders['Host'] = 'api.etelios.com';
      }

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: requestHeaders,
        timeout: 15000,
        rejectUnauthorized: false
      };

      const req = client.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            const jsonBody = body ? JSON.parse(body) : {};
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: jsonBody,
              body: body
            });
          } catch (e) {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: null,
              body: body
            });
          }
        });
      });

      req.on('error', (err) => {
        resolve({
          status: 0,
          error: err.message,
          data: null
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          status: 0,
          error: 'Request timeout',
          data: null
        });
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    } catch (error) {
      resolve({
        status: 0,
        error: error.message,
        data: null
      });
    }
  });
}

/**
 * Test an endpoint
 */
async function testEndpoint(name, method, path, expectedStatus = 200, data = null, description = '') {
  results.summary.total++;
  const url = `${API_BASE}${path}`;
  
  try {
    log.info(`Testing: ${method} ${path}${description ? ` - ${description}` : ''}`);
    const response = await makeRequest(method, url, data);
    
    if (response.status === 0) {
      // Connection error
      results.failed.push({ 
        name, 
        method, 
        path, 
        error: response.error || 'Connection failed - Server may not be running',
        connectionError: true
      });
      log.error(`✗ ${name} - Connection Error: ${response.error || 'Server not reachable'}`);
      return false;
    } else if (response.status === expectedStatus || (expectedStatus === 200 && response.status < 400)) {
      results.passed.push({ name, method, path, status: response.status });
      log.success(`✓ ${name} - Status: ${response.status}`);
      return true;
    } else {
      results.failed.push({ 
        name, 
        method, 
        path, 
        expected: expectedStatus, 
        actual: response.status,
        error: response.data?.message || response.body || response.error
      });
      log.error(`✗ ${name} - Expected: ${expectedStatus}, Got: ${response.status}`);
      if (response.data?.message) {
        log.error(`  Error: ${response.data.message}`);
      }
      return false;
    }
  } catch (error) {
    results.failed.push({ name, method, path, error: error.message });
    log.error(`✗ ${name} - Error: ${error.message}`);
    return false;
  }
}

/**
 * Login to get authentication token
 */
async function login() {
  log.section('Authentication');
  
  // Try mock login first
  const mockLoginUrl = `${API_BASE}/api/auth/mock-login`;
  log.info('Attempting mock login...');
  
  const mockResponse = await makeRequest('POST', mockLoginUrl, {
    role: 'hr'
  });
  
  if (mockResponse.status === 200 && mockResponse.data?.data?.accessToken) {
    authToken = mockResponse.data.data.accessToken;
    log.success('Mock login successful');
    return true;
  }
  
  // Try real login
  log.info('Mock login failed, trying real login...');
  const loginUrl = `${API_BASE}/api/auth/login`;
  const loginResponse = await makeRequest('POST', loginUrl, {
    email: 'hr@example.com',
    password: 'password123'
  });
  
  if (loginResponse.status === 200 && loginResponse.data?.data?.accessToken) {
    authToken = loginResponse.data.data.accessToken;
    log.success('Login successful');
    return true;
  }
  
  log.error('Login failed - some tests may fail');
  return false;
}

/**
 * Run all tests
 */
async function runTests() {
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  Testing All Newly Created Endpoints${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);
  
  log.info(`Base URL: ${API_BASE}`);
  log.info(`Mode: ${USE_LOCAL ? 'Local' : 'Production'}\n`);
  
  // Login first
  await login();
  
  // Dashboard Endpoints
  log.section('Dashboard Endpoints');
  await testEndpoint('Dashboard Stats', 'GET', '/api/hr/dashboard/stats');
  await testEndpoint('Recent Activities', 'GET', '/api/hr/dashboard/recent-activities');
  await testEndpoint('Dashboard Departments', 'GET', '/api/hr/dashboard/departments');
  
  // Department Endpoints
  log.section('Department Management');
  await testEndpoint('Get Departments', 'GET', '/api/hr/departments');
  await testEndpoint('Get Department by ID', 'GET', '/api/hr/departments/507f1f77bcf86cd799439011', 404); // Non-existent ID
  await testEndpoint('Create Department', 'POST', '/api/hr/departments', 201, {
    name: 'Test Department',
    code: 'TEST',
    description: 'Test Department Description'
  });
  
  // Payroll Endpoints
  log.section('Payroll Endpoints');
  await testEndpoint('Payroll Stats', 'GET', '/api/hr/payroll/stats');
  await testEndpoint('Payroll Employees', 'GET', '/api/hr/payroll/employees');
  await testEndpoint('Payroll Approvals', 'GET', '/api/hr/payroll/approvals');
  await testEndpoint('Payroll Payslips', 'GET', '/api/hr/payroll/payslips');
  await testEndpoint('Salary Preview', 'POST', '/api/hr/payroll/salary/preview', 400, {
    employeeId: 'test',
    month: '01',
    year: '2025'
  });
  
  // Attendance Endpoints
  log.section('Attendance Endpoints');
  await testEndpoint('Attendance Stats', 'GET', '/api/attendance/stats');
  await testEndpoint('Attendance Reports', 'GET', '/api/attendance/reports?dateFrom=2025-01-01&dateTo=2025-01-31');
  
  // Statutory Endpoints
  log.section('Statutory Endpoints');
  await testEndpoint('Statutory Exports', 'GET', '/api/hr/statutory/exports');
  await testEndpoint('Form-16 by Year', 'GET', '/api/hr/statutory/form-16/2024', 404);
  await testEndpoint('My Documents', 'GET', '/api/hr/statutory/my-documents');
  await testEndpoint('Statutory Deductions', 'GET', '/api/hr/statutory/deductions');
  
  // Benefits Endpoints
  log.section('Benefits Management');
  await testEndpoint('Get Benefits', 'GET', '/api/hr/benefits');
  await testEndpoint('Benefits Stats', 'GET', '/api/hr/benefits/stats');
  await testEndpoint('Benefits Activity', 'GET', '/api/hr/benefits/activity');
  await testEndpoint('Pending Tasks', 'GET', '/api/hr/benefits/pending-tasks');
  await testEndpoint('Create Benefit', 'POST', '/api/hr/benefits', 201, {
    name: 'Health Insurance',
    category: 'Health',
    type: 'Mandatory',
    cost: 5000,
    description: 'Health insurance benefit'
  });
  
  // Training Endpoints
  log.section('Training Management');
  await testEndpoint('Get Training Programs', 'GET', '/api/hr/training/programs');
  await testEndpoint('Training Progress', 'GET', '/api/hr/training/progress');
  await testEndpoint('Training Stats', 'GET', '/api/hr/training/stats');
  await testEndpoint('Training Activity', 'GET', '/api/hr/training/activity');
  await testEndpoint('Training Leaderboard', 'GET', '/api/hr/training/leaderboard');
  await testEndpoint('Create Training Program', 'POST', '/api/hr/training/programs', 201, {
    programName: 'Test Training',
    programCode: 'TEST001',
    description: 'Test training program',
    category: 'Technical'
  });
  
  // Performance Endpoints
  log.section('Performance Management');
  await testEndpoint('My Metrics', 'GET', '/api/hr/performance/me/metrics?period=monthly');
  await testEndpoint('My Trends', 'GET', '/api/hr/performance/me/trends?period=monthly');
  await testEndpoint('My Peers', 'GET', '/api/hr/performance/me/peers?period=monthly');
  await testEndpoint('Performance Reviews', 'GET', '/api/hr/performance/reviews');
  await testEndpoint('Performance Analytics', 'GET', '/api/hr/performance/analytics');
  
  // Roster Endpoints
  log.section('Roster Management');
  await testEndpoint('Get Roster', 'GET', '/api/hr/roster');
  await testEndpoint('Roster Settings', 'GET', '/api/hr/roster/settings');
  
  // Time Tracking Endpoints
  log.section('Time Tracking');
  await testEndpoint('Get Time Tracking', 'GET', '/api/hr/time-tracking');
  await testEndpoint('Time Tracking Stats', 'GET', '/api/hr/time-tracking/stats');
  
  // Recruitment Endpoints
  log.section('Recruitment');
  await testEndpoint('Recruitment Jobs', 'GET', '/api/hr/recruitment/jobs');
  
  // Workforce Endpoint
  log.section('Workforce Management');
  await testEndpoint('Get Workforce', 'GET', '/api/hr/workforce');
  
  // Alias Routes
  log.section('Alias Routes (Path Compatibility)');
  await testEndpoint('Leave Alias', 'GET', '/api/hr/leave');
  await testEndpoint('Leaves Alias', 'GET', '/api/hr/leaves');
  await testEndpoint('Incentive Claims Alias', 'GET', '/api/hr/incentive/claims');
  await testEndpoint('My Claims Alias', 'GET', '/api/hr/incentive/my-claims');
  await testEndpoint('Letters Alias', 'GET', '/api/hr/letters');
  
  // Print Summary
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  Test Summary${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);
  
  console.log(`Total Tests: ${results.summary.total}`);
  console.log(`${colors.green}Passed: ${results.passed.length}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed.length}${colors.reset}`);
  console.log(`Success Rate: ${((results.passed.length / results.summary.total) * 100).toFixed(2)}%\n`);
  
  if (results.failed.length > 0) {
    console.log(`${colors.red}Failed Tests:${colors.reset}`);
    results.failed.forEach(test => {
      console.log(`  ✗ ${test.name} (${test.method} ${test.path})`);
      if (test.expected) {
        console.log(`    Expected: ${test.expected}, Got: ${test.actual}`);
      }
      if (test.error) {
        console.log(`    Error: ${test.error}`);
      }
    });
  }
  
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);
  
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

