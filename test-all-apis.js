/**
 * Comprehensive API Testing Script
 * Tests all endpoints in the HRMS system
 */

const axios = require('axios');
const https = require('https');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net';
const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'https://etelios-hr-service-backend-a4ayeqefdsbsc2g3.centralindia-01.azurewebsites.net';

// Test results storage
const results = {
  passed: [],
  failed: [],
  skipped: []
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper function to make requests
async function testEndpoint(name, method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 10000,
      validateStatus: () => true, // Don't throw on any status
      httpsAgent: new https.Agent({
        rejectUnauthorized: false // For self-signed certs
      })
    };

    if (data) {
      config.data = data;
    }

    const startTime = Date.now();
    const response = await axios(config);
    const duration = Date.now() - startTime;

    const result = {
      name,
      method,
      url,
      status: response.status,
      duration,
      success: response.status >= 200 && response.status < 300,
      error: null
    };

    if (result.success) {
      results.passed.push(result);
      console.log(`${colors.green}✓${colors.reset} ${name} - ${method} ${url} - ${response.status} (${duration}ms)`);
    } else if (response.status === 404) {
      results.failed.push(result);
      console.log(`${colors.red}✗${colors.reset} ${name} - ${method} ${url} - ${response.status} (NOT FOUND)`);
    } else if (response.status === 401 || response.status === 403) {
      results.skipped.push(result);
      console.log(`${colors.yellow}⊘${colors.reset} ${name} - ${method} ${url} - ${response.status} (Auth Required)`);
    } else {
      results.failed.push(result);
      console.log(`${colors.red}✗${colors.reset} ${name} - ${method} ${url} - ${response.status}`);
    }

    return result;
  } catch (error) {
    const result = {
      name,
      method,
      url,
      status: 0,
      duration: 0,
      success: false,
      error: error.message
    };
    results.failed.push(result);
    console.log(`${colors.red}✗${colors.reset} ${name} - ${method} ${url} - ERROR: ${error.message}`);
    return result;
  }
}

// Test Authentication Endpoints
async function testAuthEndpoints() {
  console.log(`\n${colors.cyan}=== Testing Authentication Endpoints ===${colors.reset}\n`);

  // Health check
  await testEndpoint('Auth Health', 'GET', `${AUTH_SERVICE_URL}/health`);
  await testEndpoint('Auth Status', 'GET', `${AUTH_SERVICE_URL}/api/auth/status`);

  // Login endpoints
  await testEndpoint('POST /api/auth/login', 'POST', `${BASE_URL}/api/auth/login`, {
    emailOrEmployeeId: 'test@example.com',
    password: 'testpassword'
  });

  await testEndpoint('POST /api/auth/mock-login', 'POST', `${BASE_URL}/api/auth/mock-login`, {
    role: 'hr'
  });

  await testEndpoint('POST /api/auth/mock-login-fast', 'POST', `${BASE_URL}/api/auth/mock-login-fast`, {
    role: 'hr'
  });

  // Register
  await testEndpoint('POST /api/auth/register', 'POST', `${BASE_URL}/api/auth/register`, {
    employee_id: 'TEST001',
    name: 'Test User',
    email: 'test@example.com',
    phone: '9876543210',
    password: 'testpassword123',
    role: 'employee',
    address: {
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'India'
    }
  });

  // Refresh token
  await testEndpoint('POST /api/auth/refresh-token', 'POST', `${BASE_URL}/api/auth/refresh-token`, {
    refreshToken: 'test-token'
  });
}

// Test HR Service Endpoints
async function testHREndpoints() {
  console.log(`\n${colors.cyan}=== Testing HR Service Endpoints ===${colors.reset}\n`);

  // Health checks
  await testEndpoint('HR Health', 'GET', `${HR_SERVICE_URL}/health`);
  await testEndpoint('HR Status', 'GET', `${HR_SERVICE_URL}/api/hr/status`);
  await testEndpoint('HR Info', 'GET', `${BASE_URL}/api/hr`);

  // Employee endpoints
  await testEndpoint('GET /api/hr/employees', 'GET', `${BASE_URL}/api/hr/employees`);
  await testEndpoint('POST /api/hr/employees', 'POST', `${BASE_URL}/api/hr/employees`, {
    employeeId: 'TEST001',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: 'testpassword123',
    roleName: 'employee'
  });

  // Stores
  await testEndpoint('GET /api/hr/stores', 'GET', `${BASE_URL}/api/hr/stores`);
  await testEndpoint('POST /api/hr/stores', 'POST', `${BASE_URL}/api/hr/stores`, {
    name: 'Test Store',
    code: 'STORE001',
    address: {
      street: 'Test Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      zipCode: '400001'
    },
    coordinates: {
      latitude: 19.0760,
      longitude: 72.8777
    },
    geofenceRadius: 100,
    contact: {
      phone: '9876543210',
      email: 'store@example.com'
    }
  });

  // Onboarding endpoints
  await testEndpoint('POST /api/hr/onboarding/personal-details', 'POST', `${BASE_URL}/api/hr/onboarding/personal-details`, {
    employee_id: 'TEST002',
    name: 'Test User 2',
    email: 'test2@example.com',
    phone: '9876543211',
    password: 'testpassword123',
    role: 'employee',
    address: {
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'India'
    }
  });

  await testEndpoint('POST /api/hr/onboarding/work-details', 'POST', `${BASE_URL}/api/hr/onboarding/work-details`, {
    employeeId: 'TEST001',
    jobTitle: 'Developer',
    department: 'IT',
    designation: 'Software Engineer',
    role_family: 'Tech',
    joining_date: new Date().toISOString()
  });

  await testEndpoint('POST /api/hr/onboarding/statutory-info', 'POST', `${BASE_URL}/api/hr/onboarding/statutory-info`, {
    employeeId: 'TEST001',
    bankAccount: {
      account_number: '1234567890',
      ifsc_code: 'HDFC0001234',
      bank_name: 'HDFC Bank',
      account_type: 'Savings'
    }
  });

  await testEndpoint('POST /api/hr/onboarding/documents', 'POST', `${BASE_URL}/api/hr/onboarding/documents`, {
    employeeId: 'TEST001',
    documents: [
      {
        type: 'AADHAR',
        name: 'Aadhar Card',
        url: 'https://example.com/aadhar.pdf'
      }
    ]
  });

  await testEndpoint('POST /api/hr/onboarding/complete/:id', 'POST', `${BASE_URL}/api/hr/onboarding/complete/TEST001`, {});

  // Leave endpoints
  await testEndpoint('GET /api/hr/leave/requests', 'GET', `${BASE_URL}/api/hr/leave/requests`);
  await testEndpoint('POST /api/hr/leave/requests', 'POST', `${BASE_URL}/api/hr/leave/requests`, {
    employee_id: 'TEST001',
    leave_type: 'CL',
    from_date: new Date().toISOString(),
    to_date: new Date().toISOString(),
    reason: 'Test leave'
  });

  // Payroll endpoints
  await testEndpoint('GET /api/hr/payroll/runs', 'GET', `${BASE_URL}/api/hr/payroll/runs`);
  await testEndpoint('POST /api/hr/payroll/runs', 'POST', `${BASE_URL}/api/hr/payroll/runs`, {
    month: 1,
    year: 2024
  });

  // Transfer endpoints
  await testEndpoint('GET /api/transfers', 'GET', `${BASE_URL}/api/transfers`);
  await testEndpoint('POST /api/transfers', 'POST', `${BASE_URL}/api/transfers`, {
    requestedStoreId: 'STORE001',
    effectiveDate: new Date().toISOString()
  });

  // Incentive endpoints
  await testEndpoint('GET /api/hr/incentive/claims', 'GET', `${BASE_URL}/api/hr/incentive/claims`);
  await testEndpoint('POST /api/hr/incentive/claims', 'POST', `${BASE_URL}/api/hr/incentive/claims`, {
    employee_id: 'TEST001',
    month: 1,
    year: 2024,
    store_id: 'STORE001',
    target_sales: 100000,
    actual_sales: 120000
  });

  // F&F endpoints
  await testEndpoint('GET /api/hr/fnf/cases', 'GET', `${BASE_URL}/api/hr/fnf/cases`);
  await testEndpoint('POST /api/hr/fnf/cases', 'POST', `${BASE_URL}/api/hr/fnf/cases`, {
    employee_id: 'TEST001',
    last_working_date: new Date().toISOString()
  });

  // Statutory endpoints
  await testEndpoint('GET /api/hr/statutory/exports', 'GET', `${BASE_URL}/api/hr/statutory/exports`);
  await testEndpoint('POST /api/hr/statutory/pf', 'POST', `${BASE_URL}/api/hr/statutory/stat-exports/epf`, {
    month: 1,
    year: 2024
  });
}

// Test API Gateway
async function testAPIGateway() {
  console.log(`\n${colors.cyan}=== Testing API Gateway ===${colors.reset}\n`);

  await testEndpoint('Gateway Health', 'GET', `${BASE_URL}/health`);
  await testEndpoint('Gateway Info', 'GET', `${BASE_URL}/`);
  await testEndpoint('Gateway Services', 'GET', `${BASE_URL}/api`);
}

// Main test function
async function runAllTests() {
  console.log(`${colors.blue}╔══════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║     Comprehensive API Testing - Etelios HRMS            ║${colors.reset}`);
  console.log(`${colors.blue}╚══════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log(`\nBase URL: ${BASE_URL}`);
  console.log(`Auth Service: ${AUTH_SERVICE_URL}`);
  console.log(`HR Service: ${HR_SERVICE_URL}\n`);

  const startTime = Date.now();

  try {
    await testAPIGateway();
    await testAuthEndpoints();
    await testHREndpoints();

    const duration = Date.now() - startTime;

    // Print summary
    console.log(`\n${colors.blue}╔══════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.blue}║                    Test Summary                           ║${colors.reset}`);
    console.log(`${colors.blue}╚══════════════════════════════════════════════════════════╝${colors.reset}\n`);

    console.log(`${colors.green}✓ Passed: ${results.passed.length}${colors.reset}`);
    console.log(`${colors.red}✗ Failed: ${results.failed.length}${colors.reset}`);
    console.log(`${colors.yellow}⊘ Skipped (Auth Required): ${results.skipped.length}${colors.reset}`);
    console.log(`\nTotal Duration: ${duration}ms\n`);

    // Show failed tests
    if (results.failed.length > 0) {
      console.log(`${colors.red}Failed Tests:${colors.reset}`);
      results.failed.forEach(test => {
        console.log(`  ✗ ${test.name} - ${test.method} ${test.url}`);
        if (test.error) {
          console.log(`    Error: ${test.error}`);
        } else {
          console.log(`    Status: ${test.status}`);
        }
      });
      console.log('');
    }

    // Show 404s specifically
    const notFound = results.failed.filter(t => t.status === 404);
    if (notFound.length > 0) {
      console.log(`${colors.yellow}404 Not Found (${notFound.length}):${colors.reset}`);
      notFound.forEach(test => {
        console.log(`  - ${test.method} ${test.url}`);
      });
      console.log('');
    }

  } catch (error) {
    console.error(`${colors.red}Test execution error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run tests
runAllTests().then(() => {
  process.exit(results.failed.length > 0 ? 1 : 0);
}).catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});

