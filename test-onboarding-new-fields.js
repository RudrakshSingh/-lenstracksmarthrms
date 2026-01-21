#!/usr/bin/env node

/**
 * Test New Onboarding Fields: gender, annual_ctc, salary_breakdown
 * Tests the newly added fields in production
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.BASE_URL || 'https://98.70.245.87';
const API_BASE = BASE_URL.replace(/^https?:\/\//, '');

// Colors
const green = '\x1b[32m';
const red = '\x1b[31m';
const yellow = '\x1b[33m';
const cyan = '\x1b[36m';
const reset = '\x1b[0m';

const log = {
  info: (msg) => console.log(`${cyan}ℹ${reset} ${msg}`),
  success: (msg) => console.log(`${green}✓${reset} ${msg}`),
  error: (msg) => console.log(`${red}✗${reset} ${msg}`),
  warn: (msg) => console.log(`${yellow}⚠${reset} ${msg}`),
};

let authToken = null;

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

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers,
      rejectUnauthorized: false
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function authenticate() {
  log.info('Authenticating...');
  try {
    // Try mock-login first
    let response = await makeRequest('POST', '/api/auth/mock-login', {
      body: { role: 'admin', email: 'test@test.com' }
    });
    
    // If mock-login doesn't work, try with fast query param
    if (response.status !== 200) {
      response = await makeRequest('POST', '/api/auth/mock-login?fast=true', {
        body: { role: 'admin', email: 'test@test.com' }
      });
    }
    
    if (response.status === 200 && response.data.success && response.data.data?.accessToken) {
      authToken = response.data.data.accessToken;
      log.success('Authentication successful');
      return true;
    } else {
      log.error(`Authentication failed: ${JSON.stringify(response.data)}`);
      log.warn('Trying to proceed without auth for read-only tests...');
      return false; // Continue anyway for read tests
    }
  } catch (error) {
    log.error(`Authentication error: ${error.message}`);
    log.warn('Trying to proceed without auth for read-only tests...');
    return false; // Continue anyway for read tests
  }
}

async function testEmployeeCreation() {
  log.info('\n━━━ Testing Employee Creation with New Fields ━━━\n');
  
  const testEmployee = {
    employee_id: `TEST-${Date.now()}`,
    name: 'Test Employee New Fields',
    email: `test-${Date.now()}@test.com`,
    phone: '9876543210',
    password: 'Test@1234',
    role: 'employee',
    date_of_birth: '1990-01-01',
    gender: 'Male', // NEW FIELD
    address: {
      address_line_1: '123 Test Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'India'
    }
  };

  log.info('Creating employee with gender field...');
  try {
    const response = await makeRequest('POST', '/api/hr/onboarding/personal-details', {
      body: testEmployee
    });

    if (response.status === 201 || response.status === 200) {
      log.success('✓ Employee created with gender field');
      return testEmployee.employee_id;
    } else {
      log.error(`✗ Employee creation failed: ${response.status} - ${JSON.stringify(response.data)}`);
      return null;
    }
  } catch (error) {
    log.error(`✗ Employee creation error: ${error.message}`);
    return null;
  }
}

async function testWorkDetails(employeeId) {
  if (!employeeId) {
    log.warn('Skipping work details test - no employee ID');
    return;
  }

  log.info('\n━━━ Testing Work Details with Salary Fields ━━━\n');

  const workDetails = {
    employeeId: employeeId,
    jobTitle: 'Test Manager',
    department: 'Sales',
    designation: 'Sales Manager',
    role_family: 'Sales',
    joining_date: '2026-01-01',
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

  log.info('Adding work details with annual_ctc and salary_breakdown...');
  try {
    const response = await makeRequest('POST', '/api/hr/onboarding/work-details', {
      body: workDetails
    });

    if (response.status === 200 && response.data.success) {
      log.success('✓ Work details added with salary fields');
      return true;
    } else {
      log.error(`✗ Work details failed: ${response.status} - ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    log.error(`✗ Work details error: ${error.message}`);
    return false;
  }
}

async function testGetEmployee(employeeId) {
  if (!employeeId) {
    log.warn('Skipping get employee test - no employee ID');
    return;
  }

  log.info('\n━━━ Testing GET Employee Response ━━━\n');

  log.info(`Fetching employee ${employeeId}...`);
  try {
    const response = await makeRequest('GET', `/api/hr/employees/${employeeId}`);

    if (response.status === 200 && response.data.success) {
      const employee = response.data.data;
      
      // Check for new fields
      const checks = {
        gender: employee.gender === 'Male',
        annual_ctc: employee.annual_ctc === 720000,
        salary_breakdown: employee.salary_breakdown && 
                         employee.salary_breakdown.basic === 360000 &&
                         employee.salary_breakdown.hra === 144000
      };

      log.info('Field checks:');
      Object.entries(checks).forEach(([field, passed]) => {
        if (passed) {
          log.success(`  ✓ ${field}: Present and correct`);
        } else {
          log.error(`  ✗ ${field}: Missing or incorrect`);
          log.info(`    Current value: ${JSON.stringify(employee[field])}`);
        }
      });

      const allPassed = Object.values(checks).every(v => v);
      if (allPassed) {
        log.success('\n✓ All new fields are working correctly!');
        return true;
      } else {
        log.error('\n✗ Some fields are missing or incorrect');
        return false;
      }
    } else {
      log.error(`✗ Get employee failed: ${response.status} - ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    log.error(`✗ Get employee error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('\n🧪 Testing New Onboarding Fields in Production\n');
  console.log(`Base URL: ${BASE_URL}\n`);

  // Authenticate
  const authSuccess = await authenticate();
  if (!authSuccess) {
    log.error('Cannot proceed without authentication');
    process.exit(1);
  }

  // Test employee creation with gender
  const employeeId = await testEmployeeCreation();

  // Test work details with salary fields
  await testWorkDetails(employeeId);

  // Test GET employee to verify fields are returned
  await testGetEmployee(employeeId);

  console.log('\n━━━ Test Complete ━━━\n');
}

// Run tests
runTests().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
