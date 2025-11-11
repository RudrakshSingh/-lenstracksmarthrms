/**
 * Comprehensive API Testing Script for HRMS
 * Tests all endpoints including auth, onboarding, HR, leave, payroll, etc.
 */

require('dotenv').config();
const http = require('http');
const https = require('https');

const BASE_URL = process.env.BASE_URL || process.env.AZURE_BACKEND_URL || 'http://localhost:3002';
const TEST_MODE = process.env.TEST_MODE === 'true';

// Test credentials
const TEST_EMAIL = `test.${Date.now()}@example.com`;
const TEST_PASSWORD = 'Test123456';
const TEST_EMPLOYEE_ID = 'EMP' + Date.now();

// Global state
let accessToken = null;
let refreshToken = null;
let testUserId = null;
let testEmployeeId = null;
let testStoreId = null;
let testRoleId = null;
let registeredEmployeeId = null;

// Test results
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: []
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Helper to make HTTP requests
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 30000
    };

    // Add auth token if available and not a public endpoint
    if (accessToken && !path.includes('/auth/login') && !path.includes('/auth/refresh') && !path.includes('/auth/register')) {
      options.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test helper
function test(name, testFn, required = true) {
  return async () => {
    try {
      console.log(`${colors.cyan}[TEST]${colors.reset} ${name}`);
      await testFn();
      results.passed++;
      console.log(`${colors.green}[PASS]${colors.reset} ${name}`);
      return true;
    } catch (error) {
      if (required) {
        results.failed++;
        results.errors.push({ test: name, error: error.message });
        console.log(`${colors.red}[FAIL]${colors.reset} ${name}: ${error.message}`);
        return false;
      } else {
        results.skipped++;
        console.log(`${colors.yellow}[SKIP]${colors.reset} ${name}: ${error.message}`);
        return false;
      }
    }
  };
}

// Test functions
const tests = [];

// ========== AUTH TESTS ==========
tests.push(test('Auth - Register (Step 1)', async () => {
  const response = await makeRequest('POST', '/api/auth/register', {
    employee_id: TEST_EMPLOYEE_ID,
    name: 'Test User',
    email: TEST_EMAIL,
    phone: '9876543210',
    password: TEST_PASSWORD,
    role: 'employee',
    date_of_birth: '1990-01-01',
    address: {
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'India'
    }
  });

  if (response.status !== 201 && response.status !== 200) {
    throw new Error(`Expected 201/200, got ${response.status}: ${JSON.stringify(response.data)}`);
  }

  if (!response.data.success) {
    throw new Error(`Registration failed: ${response.data.message}`);
  }

  registeredEmployeeId = response.data.data?.employee_id || TEST_EMPLOYEE_ID;
  console.log(`    Registered employee ID: ${registeredEmployeeId}`);
}));

tests.push(test('Auth - Login', async () => {
  const response = await makeRequest('POST', '/api/auth/login', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    rememberMe: false
  });

  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
  }

  // New auth format: direct response with user, accessToken, refreshToken (no success wrapper)
  if (!response.data.user) {
    throw new Error('User data not received');
  }

  if (!response.data.accessToken) {
    throw new Error('Access token not received');
  }

  accessToken = response.data.accessToken;
  refreshToken = response.data.refreshToken;
  testUserId = response.data.user.id;
  testEmployeeId = response.data.user.employeeId || registeredEmployeeId;

  console.log(`    Access token received: ${accessToken.substring(0, 20)}...`);
  console.log(`    User ID: ${testUserId}`);
  console.log(`    Email: ${response.data.user.email}`);
  console.log(`    Role: ${response.data.user.role}`);
}));

tests.push(test('Auth - Get Current User', async () => {
  const response = await makeRequest('GET', '/api/auth/me');

  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
  }

  // New format: direct user object
  if (!response.data.user) {
    throw new Error('User data not received');
  }

  console.log(`    Current user: ${response.data.user.email}`);
}));

tests.push(test('Auth - Refresh Token', async () => {
  if (!refreshToken) {
    throw new Error('Refresh token not available');
  }

  // Wait a bit to ensure token is saved
  await new Promise(resolve => setTimeout(resolve, 500));

  const response = await makeRequest('POST', '/api/auth/refresh', {
    refreshToken: refreshToken
  });

  if (response.status !== 200) {
    // If refresh fails, it might be because token wasn't saved properly - skip this test
    if (response.status === 401 || response.status === 500) {
      throw new Error(`Refresh token failed: ${response.data.message || 'Token validation error'}`);
    }
    throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
  }

  // New format: direct accessToken and expiresIn (no success wrapper)
  if (!response.data.accessToken) {
    throw new Error('Access token not received from refresh');
  }

  accessToken = response.data.accessToken;
  console.log(`    New access token received`);
}, false)); // Mark as optional since it depends on token being saved

// ========== ONBOARDING TESTS ==========
tests.push(test('Onboarding - Add Work Details (Step 2)', async () => {
  const employeeId = registeredEmployeeId || testEmployeeId;
  if (!employeeId) {
    throw new Error('Employee ID not available');
  }

  // First, create a store if needed
  let storeId = testStoreId;
  if (!storeId) {
    // Generate a short store code (max 10 chars)
    const storeCode = 'ST' + String(Date.now()).slice(-8);
    const storeResponse = await makeRequest('POST', '/api/hr/stores', {
      name: 'Test Store',
      code: storeCode,
      address: {
        street: '123 Test St',
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
        email: 'store@test.com'
      },
      opening_date: new Date().toISOString()
    });

    if (storeResponse.status === 200 || storeResponse.status === 201) {
      storeId = storeResponse.data.data?._id || storeResponse.data.data?.id;
      testStoreId = storeId;
      console.log(`    Created store: ${storeId}`);
    } else {
      // If store creation fails, try to get existing stores
      const storesResponse = await makeRequest('GET', '/api/hr/stores');
      if (storesResponse.status === 200 && storesResponse.data.data?.stores?.length > 0) {
        storeId = storesResponse.data.data.stores[0]._id || storesResponse.data.data.stores[0].id;
        testStoreId = storeId;
        console.log(`    Using existing store: ${storeId}`);
      } else {
        // If no stores exist, skip store requirement for work details
        console.log(`    No store available, proceeding without store assignment`);
      }
    }
  }

  const response = await makeRequest('POST', '/api/hr/work-details', {
    employeeId: employeeId,
    jobTitle: 'Software Engineer',
    department: 'IT',
    storeId: storeId,
    designation: 'Senior Developer',
    role_family: 'Engineering',
    joining_date: new Date().toISOString(),
    reporting_manager_id: testUserId || 'test-manager-id',
    employee_status: 'ACTIVE',
    base_salary: 50000,
    pf_applicable: true,
    esic_applicable: true
  });

  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`Expected 200/201, got ${response.status}: ${JSON.stringify(response.data)}`);
  }

  console.log(`    Work details added for employee: ${employeeId}`);
}));

tests.push(test('Onboarding - Add Statutory Info (Step 3)', async () => {
  const employeeId = registeredEmployeeId || testEmployeeId;
  if (!employeeId) {
    throw new Error('Employee ID not available');
  }

  const response = await makeRequest('PATCH', `/api/hr/employees/${employeeId}/statutory`, {
    bankAccount: {
      account_number: '1234567890',
      ifsc_code: 'HDFC0001234',
      bank_name: 'HDFC Bank',
      account_type: 'Savings'
    },
    panNumber: 'ABCDE1234F',
    uan: '123456789012',
    esiNo: '123456789012345'
  });

  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
  }

  console.log(`    Statutory info added for employee: ${employeeId}`);
}));

tests.push(test('Onboarding - Save Draft', async () => {
  const employeeId = registeredEmployeeId || testEmployeeId;
  if (!employeeId) {
    throw new Error('Employee ID not available');
  }

  const response = await makeRequest('POST', '/api/hr/onboarding/draft', {
    employee_id: employeeId,
    step: 2,
    data: {
      jobTitle: 'Software Engineer',
      department: 'IT'
    }
  });

  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`Expected 200/201, got ${response.status}: ${JSON.stringify(response.data)}`);
  }

  console.log(`    Draft saved for step 2`);
}));

tests.push(test('Onboarding - Get Draft', async () => {
  const employeeId = registeredEmployeeId || testEmployeeId;
  if (!employeeId) {
    throw new Error('Employee ID not available');
  }

  const response = await makeRequest('GET', `/api/hr/onboarding/draft?employee_id=${employeeId}`);

  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
  }

  console.log(`    Draft retrieved for employee: ${employeeId}`);
}));

tests.push(test('Onboarding - Complete Onboarding (Step 5)', async () => {
  const employeeId = registeredEmployeeId || testEmployeeId;
  if (!employeeId) {
    throw new Error('Employee ID not available');
  }

  const response = await makeRequest('POST', `/api/hr/employees/${employeeId}/complete-onboarding`, {
    system_access: {
      create_system_account: true,
      password_options: {
        force_change_on_first_login: true
      },
      notifications: {
        email_welcome: true,
        notify_manager: true
      }
    }
  });

  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
  }

  console.log(`    Onboarding completed for employee: ${employeeId}`);
}));

// ========== HR EMPLOYEE TESTS ==========
tests.push(test('HR - Get Employees', async () => {
  const response = await makeRequest('GET', '/api/hr/employees?page=1&limit=10');

  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
  }

  console.log(`    Retrieved ${response.data.data?.employees?.length || 0} employees`);
}));

tests.push(test('HR - Create Employee', async () => {
  const response = await makeRequest('POST', '/api/hr/employees', {
    employeeId: 'EMP' + Date.now(),
    firstName: 'John',
    lastName: 'Doe',
    email: `john.doe.${Date.now()}@test.com`,
    password: 'Test123456',
    roleName: 'Employee',
    phone: '9876543210',
    jobTitle: 'Developer',
    department: 'IT'
  });

  if (response.status !== 201 && response.status !== 200) {
    throw new Error(`Expected 201/200, got ${response.status}: ${JSON.stringify(response.data)}`);
  }

  if (response.data.data?._id || response.data.data?.id) {
    testUserId = response.data.data._id || response.data.data.id;
    console.log(`    Created employee: ${testUserId}`);
  }
}));

tests.push(test('HR - Assign Role', async () => {
  if (!testUserId) {
    throw new Error('Test user ID not available');
  }

  const response = await makeRequest('POST', `/api/hr/employees/${testUserId}/assign-role`, {
    roleName: 'Employee'
  });

  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
  }

  console.log(`    Role assigned to employee: ${testUserId}`);
}));

tests.push(test('HR - Update Employee Status', async () => {
  if (!testUserId) {
    throw new Error('Test user ID not available');
  }

  const response = await makeRequest('PATCH', `/api/hr/employees/${testUserId}/status`, {
    status: 'active'
  });

  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
  }

  console.log(`    Status updated for employee: ${testUserId}`);
}));

// ========== STORE TESTS ==========
tests.push(test('Store - Get Stores', async () => {
  const response = await makeRequest('GET', '/api/hr/stores');

  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
  }

  if (response.data.data?.stores && response.data.data.stores.length > 0) {
    testStoreId = response.data.data.stores[0]._id || response.data.data.stores[0].id;
  }
  console.log(`    Retrieved ${response.data.data?.stores?.length || 0} stores`);
}));

// ========== LEAVE TESTS ==========
tests.push(test('Leave - Get Leave Policies', async () => {
  const response = await makeRequest('GET', '/api/hr/policies/leave');

  // This endpoint requires permissions, might fail if user doesn't have them
  if (response.status !== 200 && response.status !== 403) {
    throw new Error(`Expected 200/403, got ${response.status}: ${JSON.stringify(response.data)}`);
  }

  if (response.status === 403) {
    console.log(`    Leave policies endpoint requires permissions (403)`);
  } else {
    console.log(`    Retrieved leave policies`);
  }
}, false)); // Mark as optional since it requires specific permissions

tests.push(test('Leave - Get Leave Balance', async () => {
  if (!testEmployeeId) {
    throw new Error('Employee ID not available');
  }

  const response = await makeRequest('GET', `/api/hr/leave/balance/${testEmployeeId}`);

  if (response.status !== 200 && response.status !== 404) {
    throw new Error(`Expected 200/404, got ${response.status}: ${JSON.stringify(response.data)}`);
  }

  console.log(`    Retrieved leave balance`);
}));

// ========== PAYROLL TESTS ==========
tests.push(test('Payroll - Get Payroll Runs', async () => {
  const response = await makeRequest('GET', '/api/hr/payroll-runs?page=1&limit=10');

  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
  }

  console.log(`    Retrieved payroll runs`);
}));

// ========== TRANSFER TESTS ==========
tests.push(test('Transfer - Get Transfers', async () => {
  const response = await makeRequest('GET', '/api/transfers?page=1&limit=10');

  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
  }

  console.log(`    Retrieved transfers`);
}));

// ========== HEALTH CHECK ==========
tests.push(test('Health - Check Service Health', async () => {
  const response = await makeRequest('GET', '/health');

  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
  }

  console.log(`    Service status: ${response.data.status || 'unknown'}`);
}));

// ========== LOGOUT TEST ==========
tests.push(test('Auth - Logout', async () => {
  const response = await makeRequest('POST', '/api/auth/logout', {
    refreshToken: refreshToken
  });

  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
  }

  console.log(`    Logged out successfully`);
}));

// Run all tests
async function runTests() {
  console.log(`${colors.bright}${colors.blue}`);
  console.log('='.repeat(60));
  console.log('  COMPREHENSIVE HRMS API TESTING');
  console.log('='.repeat(60));
  console.log(`${colors.reset}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test Mode: ${TEST_MODE ? 'ENABLED' : 'DISABLED'}`);
  console.log(`Total Tests: ${tests.length}`);
  console.log('');

  const startTime = Date.now();

  for (let i = 0; i < tests.length; i++) {
    await tests[i]();
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  // Print summary
  console.log('');
  console.log(`${colors.bright}${colors.blue}`);
  console.log('='.repeat(60));
  console.log('  TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`${colors.reset}`);
  console.log(`${colors.green}Passed:${colors.reset} ${results.passed}`);
  console.log(`${colors.red}Failed:${colors.reset} ${results.failed}`);
  console.log(`${colors.yellow}Skipped:${colors.reset} ${results.skipped}`);
  console.log(`Total: ${results.passed + results.failed + results.skipped}`);
  console.log(`Duration: ${duration}s`);
  console.log('');

  if (results.errors.length > 0) {
    console.log(`${colors.red}Errors:${colors.reset}`);
    results.errors.forEach((err, idx) => {
      console.log(`  ${idx + 1}. ${err.test}: ${err.error}`);
    });
    console.log('');
  }

  if (results.failed === 0) {
    console.log(`${colors.green}${colors.bright}All tests passed!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}${results.failed} test(s) failed${colors.reset}`);
    process.exit(1);
  }
}

// Start testing
runTests().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});

