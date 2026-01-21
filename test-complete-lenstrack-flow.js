#!/usr/bin/env node

/**
 * Complete Flow Test for Lenstrack Tenant
 * Tests: Admin Login → Employee Creation with New Fields → All APIs
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'https://98.70.245.87';
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.blue}━━━ ${msg} ━━━${colors.reset}\n`)
};

let adminToken = null;
let testEmployeeId = null;
const TENANT_ID = 'lenstrack';

// Admin credentials (from tenant creation)
const ADMIN_EMAIL = 'admin@lenstrack.etelios.com';
// Password was changed in previous test, use new password
const ADMIN_PASSWORD = process.env.LENSTRACK_ADMIN_PASSWORD || 'Lenstrack@Admin123'; // Changed password

function makeRequest(method, path, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = BASE_URL.startsWith('https');
    const client = isHttps ? https : http;
    const url = new URL(path, BASE_URL);
    
    const headers = {
      'Content-Type': 'application/json',
      'Host': 'api.etelios.com',
      ...options.headers
    };

    if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
    if (TENANT_ID) headers['X-Tenant-Id'] = TENANT_ID;

    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers,
      rejectUnauthorized: false,
      timeout: 30000
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

async function adminLogin() {
  log.section('1. Admin Login (Lenstrack)');
  
  log.info(`Logging in: ${ADMIN_EMAIL}`);
  try {
    const response = await makeRequest('POST', '/api/auth/login', {
      body: {
        emailOrEmployeeId: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      },
      headers: {
        'X-Tenant-Id': TENANT_ID
      }
    });

    if (response.status === 200 && response.data.success) {
      adminToken = response.data.data?.accessToken || response.data.accessToken;
      if (adminToken) {
        log.success('✓ Admin login successful');
        log.info(`  Token: ${adminToken.substring(0, 30)}...`);
        
        // Check if password change required
        if (response.data.data?.mustChangePassword || response.data.mustChangePassword) {
          log.warn('⚠ Password change required on first login');
          log.info('  Will test password change...');
          return await changePassword();
        }
        return true;
      }
    } else {
      log.error(`✗ Login failed: ${response.status}`);
      log.info(`  Response: ${JSON.stringify(response.data).substring(0, 300)}`);
      return false;
    }
  } catch (error) {
    log.error(`✗ Login error: ${error.message}`);
    return false;
  }
}

async function changePassword() {
  log.section('2. Change Password (First Login)');
  
  if (!adminToken) {
    log.warn('Skipping password change - no token');
    return false;
  }

  const newPassword = 'Lenstrack@Admin123';
  log.info('Changing temporary password...');
  
  try {
    // First, we need to get user ID from profile
    const profileResponse = await makeRequest('GET', '/api/auth/profile');
    if (profileResponse.status !== 200) {
      log.warn('Could not get profile, skipping password change');
      return false;
    }

    const userId = profileResponse.data.data?.id || profileResponse.data.data?._id;
    if (!userId) {
      log.warn('Could not get user ID, skipping password change');
      return false;
    }

    const changeResponse = await makeRequest('POST', `/api/auth/change-password`, {
      body: {
        currentPassword: ADMIN_PASSWORD,
        newPassword: newPassword
      }
    });

    if (changeResponse.status === 200 && changeResponse.data.success) {
      log.success('✓ Password changed successfully');
      log.info(`  New password: ${newPassword}`);
      return true;
    } else {
      log.warn(`⚠ Password change failed: ${changeResponse.status}`);
      log.info(`  Response: ${JSON.stringify(changeResponse.data).substring(0, 200)}`);
      return false;
    }
  } catch (error) {
    log.warn(`⚠ Password change error: ${error.message}`);
    return false;
  }
}

async function createEmployee() {
  log.section('3. Create Employee with New Fields');
  
  if (!adminToken) {
    log.warn('Skipping employee creation - no admin token');
    return false;
  }

  const timestamp = Date.now();
  const employeeData = {
    employeeId: `LENSTRACK-EMP-${timestamp}`,
    firstName: 'Test',
    lastName: `Employee ${timestamp}`,
    fullName: `Test Employee ${timestamp}`,
    email: `employee${timestamp}@lenstrack.etelios.com`,
    phone: '9876543210',
    password: 'Employee@1234',
    roleName: 'employee', // Use roleName instead of role
    dob: '1990-01-01',
    gender: 'Male', // NEW FIELD
    department: 'Sales',
    designation: 'Sales Executive',
    currentAddress: {
      lines: ['456 Employee Street'],
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400002',
      country: 'India'
    }
  };

  log.info('Creating employee with gender field...');
  log.info(`  Gender: ${employeeData.gender}`);
  
  try {
    // Use POST /api/hr/employees to create employee
    const response = await makeRequest('POST', '/api/hr/employees', {
      body: employeeData
    });

    if (response.status === 201 || response.status === 200) {
      if (response.data.success) {
        const employee = response.data.data;
        testEmployeeId = employee.employeeId || employee.id || employeeData.employeeId;
        log.success(`✓ Employee created: ${testEmployeeId}`);
        log.info(`  Name: ${employee.fullName || employeeData.fullName}`);
        log.info(`  Email: ${employee.email || employeeData.email}`);
        log.info(`  Gender: ${employee.gender || employeeData.gender}`);
        return true;
      } else {
        log.error(`✗ Employee creation failed: ${response.data.message}`);
        return false;
      }
    } else {
      log.error(`✗ Employee creation failed: ${response.status}`);
      log.info(`  Response: ${JSON.stringify(response.data).substring(0, 400)}`);
      return false;
    }
  } catch (error) {
    log.error(`✗ Employee creation error: ${error.message}`);
    return false;
  }
}

async function addWorkDetails() {
  log.section('4. Add Work Details with Salary Fields');
  
  if (!testEmployeeId) {
    log.warn('Skipping work details - no employee ID');
    return false;
  }

  const workDetails = {
    employeeId: testEmployeeId,
    jobTitle: 'Sales Manager',
    department: 'Sales',
    designation: 'Sales Manager',
    role_family: 'Sales',
    joining_date: '2026-01-20',
    employee_status: 'ACTIVE',
    annual_ctc: 720000, // NEW FIELD
    salary_breakdown: { // NEW FIELD
      basic: 360000,
      hra: 144000,
      special_allowance: 120000,
      pf_employer: 43200,
      gratuity: 28800,
      other_allowances: 24000
    }
  };

  log.info('Adding work details with salary fields...');
  log.info(`  Annual CTC: ₹${workDetails.annual_ctc.toLocaleString()}`);
  log.info(`  Basic: ₹${workDetails.salary_breakdown.basic.toLocaleString()}`);
  
  try {
    const response = await makeRequest('POST', '/api/hr/onboarding/work-details', {
      body: workDetails
    });

    if (response.status === 200 && response.data.success) {
      log.success('✓ Work details added successfully');
      log.info('  ✓ Annual CTC saved');
      log.info('  ✓ Salary breakdown saved');
      return true;
    } else {
      log.error(`✗ Work details failed: ${response.status}`);
      log.info(`  Response: ${JSON.stringify(response.data).substring(0, 400)}`);
      return false;
    }
  } catch (error) {
    log.error(`✗ Work details error: ${error.message}`);
    return false;
  }
}

async function getEmployee() {
  log.section('5. GET Employee - Verify New Fields');
  
  if (!testEmployeeId) {
    log.warn('Skipping get employee - no employee ID');
    return false;
  }

  log.info(`Fetching employee: ${testEmployeeId}`);
  
  try {
    const response = await makeRequest('GET', `/api/hr/employees/${testEmployeeId}`);

    if (response.status === 200 && response.data.success) {
      const employee = response.data.data;
      
      log.success('✓ Employee fetched successfully');
      
      // Check for new fields
      const fieldChecks = {
        gender: employee.gender,
        annual_ctc: employee.annual_ctc,
        salary_breakdown: employee.salary_breakdown
      };

      log.info('\nNew Fields Verification:');
      let allPresent = true;
      Object.entries(fieldChecks).forEach(([field, value]) => {
        if (value !== undefined && value !== null) {
          log.success(`  ✓ ${field}: Present`);
          if (field === 'salary_breakdown' && typeof value === 'object') {
            log.info(`    - Basic: ₹${(value.basic || 0).toLocaleString()}`);
            log.info(`    - HRA: ₹${(value.hra || 0).toLocaleString()}`);
            log.info(`    - Special Allowance: ₹${(value.special_allowance || 0).toLocaleString()}`);
          } else if (field === 'annual_ctc') {
            log.info(`    - Value: ₹${value.toLocaleString()}`);
          } else {
            log.info(`    - Value: ${value}`);
          }
        } else {
          log.error(`  ✗ ${field}: Missing`);
          allPresent = false;
        }
      });

      return allPresent;
    } else {
      log.error(`✗ Get employee failed: ${response.status}`);
      log.info(`  Response: ${JSON.stringify(response.data).substring(0, 400)}`);
      return false;
    }
  } catch (error) {
    log.error(`✗ Get employee error: ${error.message}`);
    return false;
  }
}

async function testOtherAPIs() {
  log.section('6. Testing Other APIs');
  
  const apis = [
    { name: 'Get Departments', method: 'GET', path: '/api/hr/departments' },
    { name: 'Get Stores', method: 'GET', path: '/api/hr/stores?limit=5' },
    { name: 'List Employees', method: 'GET', path: '/api/hr/employees?limit=5' },
    { name: 'Get Tenant Info', method: 'GET', path: `/api/tenants/${TENANT_ID}` }
  ];

  let passed = 0;
  for (const api of apis) {
    try {
      const response = await makeRequest(api.method, api.path);
      if (response.status === 200) {
        log.success(`✓ ${api.name}: ${response.status}`);
        passed++;
      } else {
        log.warn(`⚠ ${api.name}: ${response.status}`);
      }
    } catch (error) {
      log.error(`✗ ${api.name}: ${error.message}`);
    }
  }

  return passed;
}

async function runTests() {
  console.log('\n🚀 Complete Flow Test: Lenstrack Tenant → Admin → Employee → All APIs\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Tenant ID: ${TENANT_ID}\n`);

  const results = {
    login: await adminLogin(),
    employee: await createEmployee(),
    workDetails: await addWorkDetails(),
    getEmployee: await getEmployee(),
    otherAPIs: await testOtherAPIs()
  };

  log.section('Final Summary');
  
  const passed = Object.values(results).filter(v => v !== false && v !== 0).length;
  const total = Object.keys(results).length;
  
  console.log(`\nResults: ${passed}/${total} tests passed\n`);
  
  Object.entries(results).forEach(([test, result]) => {
    const icon = result ? '✓' : '✗';
    const color = result ? colors.green : colors.red;
    const name = test.replace(/([A-Z])/g, ' $1').trim();
    const value = typeof result === 'number' ? ` (${result} APIs)` : '';
    console.log(`${color}${icon}${colors.reset} ${name}${value}`);
  });

  console.log('\n━━━ Test Details ━━━\n');
  if (testEmployeeId) console.log(`Employee ID: ${testEmployeeId}`);
  
  if (passed === total) {
    log.success('\n✅ All tests passed! Complete flow is working with new fields.');
  } else {
    log.warn('\n⚠️  Some tests failed. Check logs above for details.');
  }

  console.log('');
}

runTests().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
