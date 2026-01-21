#!/usr/bin/env node

/**
 * Complete Flow Test: Tenant Creation → Admin Login → Employee Creation → All APIs
 * Tests the full workflow with new fields (gender, annual_ctc, salary_breakdown)
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

let tenantToken = null;
let adminToken = null;
let testTenantId = null;
let testEmployeeId = null;
let testCompanyId = null;

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

    if (tenantToken) headers['X-Tenant-Id'] = testTenantId || '';
    if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

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

async function testHealth() {
  log.section('1. Health Checks');
  
  const services = [
    { name: 'Tenant Registry', path: '/api/tenants/health' },
    { name: 'Auth Service', path: '/api/auth/status' },
    { name: 'HR Service', path: '/api/hr/health' }
  ];

  let allHealthy = true;
  for (const service of services) {
    try {
      const response = await makeRequest('GET', service.path);
      if (response.status === 200) {
        log.success(`${service.name}: Healthy`);
      } else {
        log.error(`${service.name}: ${response.status}`);
        allHealthy = false;
      }
    } catch (error) {
      log.error(`${service.name}: ${error.message}`);
      allHealthy = false;
    }
  }
  
  return allHealthy;
}

async function getSuperAdminToken() {
  log.section('2. Get Super Admin Token');
  
  // Try common admin credentials
  const adminCredentials = [
    { email: 'admin@etelios.com', password: 'Admin@123456' },
    { email: 'superadmin@etelios.com', password: 'Admin@123456' }
  ];

  for (const creds of adminCredentials) {
    log.info(`Trying login: ${creds.email}`);
    try {
      const response = await makeRequest('POST', '/api/auth/login', {
        body: {
          emailOrEmployeeId: creds.email,
          password: creds.password
        }
      });

      if (response.status === 200 && response.data.success) {
        adminToken = response.data.data?.accessToken || response.data.accessToken;
        if (adminToken) {
          log.success(`✓ Login successful: ${creds.email}`);
          return true;
        }
      }
    } catch (error) {
      // Continue to next credential
    }
  }

  log.warn('⚠ Could not login with known credentials');
  log.info('  Will test APIs that don\'t require authentication');
  return false;
}

async function createTenant() {
  log.section('3. Tenant Creation');
  
  if (!adminToken) {
    log.warn('Skipping tenant creation - no admin token');
    return false;
  }

  const timestamp = Date.now();
  const tenantData = {
    companyName: `Test Company ${timestamp}`,
    domain: `testcompany${timestamp}`,
    email: `admin${timestamp}@testcompany.com`,
    phone: '9876543210',
    address: {
      street: '123 Test Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'India'
    },
    adminUser: {
      name: 'Test Admin',
      email: `admin${timestamp}@testcompany.com`,
      password: 'Admin@1234',
      role: 'admin'
    }
  };

  log.info('Creating tenant...');
  try {
    const response = await makeRequest('POST', '/api/tenants', {
      body: tenantData
    });

    if (response.status === 201 || response.status === 200) {
      if (response.data.success) {
        testTenantId = response.data.data?.tenantId || response.data.data?.id;
        testCompanyId = response.data.data?.companyId || response.data.data?.id;
        log.success(`✓ Tenant created: ${testTenantId}`);
        log.info(`  Company ID: ${testCompanyId}`);
        log.info(`  Admin Email: ${tenantData.adminUser.email}`);
        return true;
      } else {
        log.error(`✗ Tenant creation failed: ${response.data.message}`);
        return false;
      }
    } else {
      log.error(`✗ Tenant creation failed: ${response.status}`);
      log.info(`  Response: ${JSON.stringify(response.data).substring(0, 200)}`);
      return false;
    }
  } catch (error) {
    log.error(`✗ Tenant creation error: ${error.message}`);
    return false;
  }
}

async function adminLogin() {
  log.section('3. Admin Login');
  
  if (!testTenantId) {
    log.warn('Skipping admin login - no tenant ID');
    return false;
  }

  const timestamp = Date.now();
  const loginData = {
    emailOrEmployeeId: `admin${timestamp}@testcompany.com`,
    password: 'Admin@1234'
  };

  log.info('Logging in as admin...');
  try {
    const response = await makeRequest('POST', '/api/auth/login', {
      body: loginData,
      headers: {
        'X-Tenant-Id': testTenantId
      }
    });

    if (response.status === 200 && response.data.success) {
      adminToken = response.data.data?.accessToken || response.data.accessToken;
      if (adminToken) {
        log.success('✓ Admin login successful');
        log.info(`  Token: ${adminToken.substring(0, 20)}...`);
        return true;
      } else {
        log.error('✗ No token in response');
        return false;
      }
    } else {
      log.error(`✗ Login failed: ${response.status}`);
      log.info(`  Response: ${JSON.stringify(response.data).substring(0, 200)}`);
      log.warn('  Note: Admin user might need to be created first');
      return false;
    }
  } catch (error) {
    log.error(`✗ Login error: ${error.message}`);
    return false;
  }
}

async function createEmployee() {
  log.section('4. Employee Creation with New Fields');
  
  if (!adminToken) {
    log.warn('Skipping employee creation - no admin token');
    return false;
  }

  const timestamp = Date.now();
  const employeeData = {
    employee_id: `EMP-${timestamp}`,
    name: `Test Employee ${timestamp}`,
    email: `employee${timestamp}@testcompany.com`,
    phone: '9876543210',
    password: 'Employee@1234',
    role: 'employee',
    date_of_birth: '1990-01-01',
    gender: 'Male', // NEW FIELD
    address: {
      address_line_1: '456 Employee Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400002',
      country: 'India'
    }
  };

  log.info('Creating employee with gender field...');
  log.info(`  Gender: ${employeeData.gender}`);
  
  try {
    const response = await makeRequest('POST', '/api/hr/onboarding/personal-details', {
      body: employeeData
    });

    if (response.status === 201 || response.status === 200) {
      if (response.data.success) {
        testEmployeeId = response.data.data?.employee_id || response.data.data?.employeeId || employeeData.employee_id;
        log.success(`✓ Employee created: ${testEmployeeId}`);
        log.info(`  Name: ${employeeData.name}`);
        log.info(`  Email: ${employeeData.email}`);
        log.info(`  Gender: ${employeeData.gender}`);
        return true;
      } else {
        log.error(`✗ Employee creation failed: ${response.data.message}`);
        return false;
      }
    } else {
      log.error(`✗ Employee creation failed: ${response.status}`);
      log.info(`  Response: ${JSON.stringify(response.data).substring(0, 300)}`);
      return false;
    }
  } catch (error) {
    log.error(`✗ Employee creation error: ${error.message}`);
    return false;
  }
}

async function addWorkDetails() {
  log.section('5. Add Work Details with Salary Fields');
  
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
      log.info(`  Response: ${JSON.stringify(response.data).substring(0, 300)}`);
      return false;
    }
  } catch (error) {
    log.error(`✗ Work details error: ${error.message}`);
    return false;
  }
}

async function getEmployee() {
  log.section('6. GET Employee - Verify New Fields');
  
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

      log.info('\nNew Fields Check:');
      Object.entries(fieldChecks).forEach(([field, value]) => {
        if (value !== undefined && value !== null) {
          log.success(`  ✓ ${field}: Present`);
          if (field === 'salary_breakdown' && typeof value === 'object') {
            log.info(`    - Basic: ${value.basic || 'N/A'}`);
            log.info(`    - HRA: ${value.hra || 'N/A'}`);
          } else {
            log.info(`    - Value: ${JSON.stringify(value).substring(0, 50)}`);
          }
        } else {
          log.error(`  ✗ ${field}: Missing`);
        }
      });

      const allPresent = Object.values(fieldChecks).every(v => v !== undefined && v !== null);
      return allPresent;
    } else {
      log.error(`✗ Get employee failed: ${response.status}`);
      log.info(`  Response: ${JSON.stringify(response.data).substring(0, 300)}`);
      return false;
    }
  } catch (error) {
    log.error(`✗ Get employee error: ${error.message}`);
    return false;
  }
}

async function testOtherAPIs() {
  log.section('7. Testing Other APIs');
  
  const apis = [
    { name: 'Get Departments', method: 'GET', path: '/api/hr/departments' },
    { name: 'Get Stores', method: 'GET', path: '/api/hr/stores?limit=5' },
    { name: 'List Employees', method: 'GET', path: '/api/hr/employees?limit=5' }
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

  return passed === apis.length;
}

async function runTests() {
  console.log('\n🚀 Complete Flow Test: Tenant → Admin → Employee → All APIs\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  const results = {
    health: await testHealth(),
    tenant: await createTenant(),
    login: await adminLogin(),
    employee: await createEmployee(),
    workDetails: await addWorkDetails(),
    getEmployee: await getEmployee(),
    otherAPIs: await testOtherAPIs()
  };

  log.section('Final Summary');
  
  const passed = Object.values(results).filter(v => v).length;
  const total = Object.keys(results).length;
  
  console.log(`\nResults: ${passed}/${total} tests passed\n`);
  
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✓' : '✗';
    const color = passed ? colors.green : colors.red;
    const name = test.replace(/([A-Z])/g, ' $1').trim();
    console.log(`${color}${icon}${colors.reset} ${name}`);
  });

  console.log('\n━━━ Test Details ━━━\n');
  if (testTenantId) console.log(`Tenant ID: ${testTenantId}`);
  if (testCompanyId) console.log(`Company ID: ${testCompanyId}`);
  if (testEmployeeId) console.log(`Employee ID: ${testEmployeeId}`);
  
  if (passed === total) {
    log.success('\n✅ All tests passed! Complete flow is working.');
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
