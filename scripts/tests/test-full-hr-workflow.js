#!/usr/bin/env node

/**
 * Complete HR Workflow Test
 * 1. Create new employee
 * 2. Complete all 7 onboarding steps
 * 3. Test HR APIs
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.BASE_URL || 'https://api.etelios.com';
const isLocal = process.argv.includes('--local');
const actualBaseUrl = isLocal ? 'http://localhost:3002' : BASE_URL; // HR service runs on 3002

if (!isLocal) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

let authToken = null;
let createdEmployeeId = null;
let createdEmployeeMongoId = null;

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

  if (response.status === 200 && (response.data?.data?.accessToken || response.data?.accessToken)) {
    authToken = response.data?.data?.accessToken || response.data?.accessToken;
    log('✅ Login successful', 'green');
    return true;
  } else {
    log(`❌ Login failed: ${JSON.stringify(response.data)}`, 'red');
    return false;
  }
}

async function createEmployee() {
  log('\n━━━ Step 1: Create Employee ━━━', 'bright');
  const timestamp = Date.now();
  const employeeData = {
    employeeId: `EMP-${timestamp}`,
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe', // Ensure fullName is always provided
    email: `john.doe.${timestamp}@example.com`,
    password: 'Test1234!',
    roleName: 'employee',
    phone: '9876543210', // Indian format
    department: 'IT',
    jobTitle: 'Software Developer'
  };

  log(`Creating employee: ${employeeData.email}`, 'cyan');
  
  try {
    const response = await makeRequest('POST', `${actualBaseUrl}/api/hr/employees`, employeeData, authToken);
    
    if (response.status === 200 || response.status === 201) {
      createdEmployeeId = response.data?.data?.employeeId || employeeData.employeeId;
      createdEmployeeMongoId = response.data?.data?._id || response.data?.data?.id;
      log('✅ Employee created successfully', 'green');
      log(`   Employee ID: ${createdEmployeeId}`, 'cyan');
      log(`   MongoDB ID: ${createdEmployeeMongoId}`, 'cyan');
      return true;
    } else {
      log(`❌ Failed: ${JSON.stringify(response.data)}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return false;
  }
}

async function onboardingStep1() {
  log('\n━━━ Step 2: Personal Details ━━━', 'bright');
  const timestamp = Date.now();
  const personalData = {
    employee_id: createdEmployeeId,
    name: 'John Doe',
    email: `john.doe.${timestamp}@example.com`, // Required field
    phone: '9876543210', // Indian format: 10 digits starting with 6-9
    date_of_birth: '1990-01-15',
    address: {
      street: '123 Main St',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'India'
    }
  };

  try {
    const response = await makeRequest('POST', `${actualBaseUrl}/api/hr/onboarding/personal-details`, personalData, authToken);
    if (response.status === 200 || response.status === 201) {
      log('✅ Personal details added', 'green');
      return true;
    } else {
      log(`❌ Failed: ${JSON.stringify(response.data)}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return false;
  }
}

async function onboardingStep2() {
  log('\n━━━ Step 3: Work Details ━━━', 'bright');
  const workData = {
    employeeId: createdEmployeeId,
    jobTitle: 'Software Developer',
    department: 'IT',
    designation: 'Software Developer', // Required field
    role_family: 'Engineering', // Required field
    joining_date: new Date().toISOString().split('T')[0], // Required field (YYYY-MM-DD format)
    reportingManager: null,
    joiningDate: new Date().toISOString(),
    employmentType: 'Full-time',
    workLocation: 'Mumbai',
    compensation: {
      salary: 50000,
      currency: 'INR',
      payFrequency: 'Monthly'
    }
  };

  try {
    const response = await makeRequest('POST', `${actualBaseUrl}/api/hr/onboarding/work-details`, workData, authToken);
    if (response.status === 200 || response.status === 201) {
      log('✅ Work details added', 'green');
      return true;
    } else {
      log(`❌ Failed: ${JSON.stringify(response.data)}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return false;
  }
}

async function onboardingStep3() {
  log('\n━━━ Step 4: Statutory Information ━━━', 'bright');
  const statutoryData = {
    employeeId: createdEmployeeId,
    bankAccount: {
      account_number: '1234567890',
      ifsc_code: 'HDFC0001234',
      bank_name: 'HDFC Bank',
      account_type: 'Savings'
    },
    panNumber: 'ABCDE1234F',
    uan: '123456789012',
    esiNo: '123456789012345'
  };

  try {
    const response = await makeRequest('POST', `${actualBaseUrl}/api/hr/onboarding/statutory-info`, statutoryData, authToken);
    if (response.status === 200 || response.status === 201) {
      log('✅ Statutory information added', 'green');
      return true;
    } else {
      log(`❌ Failed: ${JSON.stringify(response.data)}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return false;
  }
}

async function onboardingStep4() {
  log('\n━━━ Step 5: Documents ━━━', 'bright');
  const documentsData = {
    employeeId: createdEmployeeId,
    documents: [
      {
        type: 'PAN',
        name: 'PAN Card',
        file_url: 'https://example.com/documents/pan.pdf',
        uploaded_at: new Date().toISOString(),
        verified: false
      },
      {
        type: 'AADHAR',
        name: 'Aadhar Card',
        file_url: 'https://example.com/documents/aadhar.pdf',
        uploaded_at: new Date().toISOString(),
        verified: false
      }
    ]
  };

  try {
    const response = await makeRequest('POST', `${actualBaseUrl}/api/hr/onboarding/documents`, documentsData, authToken);
    if (response.status === 200 || response.status === 201) {
      log('✅ Documents added', 'green');
      return true;
    } else {
      log(`❌ Failed: ${JSON.stringify(response.data)}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return false;
  }
}

async function onboardingStep5() {
  log('\n━━━ Step 6: Save Draft ━━━', 'bright');
  const draftData = {
    employee_id: createdEmployeeId,
    step: 5,
    data: {
      notes: 'Onboarding in progress',
      completed: false
    }
  };

  try {
    const response = await makeRequest('POST', `${actualBaseUrl}/api/hr/onboarding/draft`, draftData, authToken);
    if (response.status === 200 || response.status === 201) {
      log('✅ Draft saved', 'green');
      return true;
    } else {
      log(`❌ Failed: ${JSON.stringify(response.data)}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return false;
  }
}

async function onboardingStep6() {
  log('\n━━━ Step 7: Get Draft ━━━', 'bright');
  try {
    const response = await makeRequest('GET', `${actualBaseUrl}/api/hr/onboarding/draft?employee_id=${createdEmployeeId}`, null, authToken);
    if (response.status === 200) {
      log('✅ Draft retrieved', 'green');
      return true;
    } else {
      log(`❌ Failed: ${JSON.stringify(response.data)}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return false;
  }
}

async function onboardingStep7() {
  log('\n━━━ Step 8: Complete Onboarding ━━━', 'bright');
  const completeData = {
    system_access: {
      create_system_account: true,
      password_options: {
        force_change_on_first_login: true
      }
    }
  };

  const employeeIdForComplete = createdEmployeeMongoId || createdEmployeeId;
  log(`Completing onboarding for: ${employeeIdForComplete}`, 'cyan');

  try {
    const response = await makeRequest('POST', `${actualBaseUrl}/api/hr/onboarding/complete/${employeeIdForComplete}`, completeData, authToken);
    if (response.status === 200) {
      log('✅ Onboarding completed', 'green');
      return true;
    } else {
      log(`❌ Failed: ${JSON.stringify(response.data)}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testHRApis() {
  log('\n═══════════════════════════════════════════════════════', 'bright');
  log('  Testing HR APIs', 'bright');
  log('═══════════════════════════════════════════════════════', 'bright');

  const results = {
    passed: [],
    failed: []
  };

  // Test 1: Get all employees
  log('\n━━━ Test: GET /api/hr/employees ━━━', 'bright');
  try {
    const response = await makeRequest('GET', `${actualBaseUrl}/api/hr/employees`, null, authToken);
    if (response.status === 200) {
      log('✅ Passed', 'green');
      results.passed.push('GET /api/hr/employees');
    } else {
      log(`❌ Failed: ${JSON.stringify(response.data)}`, 'red');
      results.failed.push('GET /api/hr/employees');
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    results.failed.push('GET /api/hr/employees');
  }

  // Test 2: Get employee by ID
  if (createdEmployeeId) {
    log(`\n━━━ Test: GET /api/hr/employees/${createdEmployeeId} ━━━`, 'bright');
    try {
      const response = await makeRequest('GET', `${actualBaseUrl}/api/hr/employees/${createdEmployeeId}`, null, authToken);
      if (response.status === 200) {
        log('✅ Passed', 'green');
        results.passed.push('GET /api/hr/employees/:id');
      } else {
        log(`❌ Failed: ${JSON.stringify(response.data)}`, 'red');
        results.failed.push('GET /api/hr/employees/:id');
      }
    } catch (error) {
      log(`❌ Error: ${error.message}`, 'red');
      results.failed.push('GET /api/hr/employees/:id');
    }
  }

  // Test 3: Get departments
  log('\n━━━ Test: GET /api/hr/departments ━━━', 'bright');
  try {
    const response = await makeRequest('GET', `${actualBaseUrl}/api/hr/departments`, null, authToken);
    if (response.status === 200) {
      log('✅ Passed', 'green');
      results.passed.push('GET /api/hr/departments');
    } else {
      log(`❌ Failed: ${JSON.stringify(response.data)}`, 'red');
      results.failed.push('GET /api/hr/departments');
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    results.failed.push('GET /api/hr/departments');
  }

  // Test 4: Get dashboard stats
  log('\n━━━ Test: GET /api/hr/dashboard/stats ━━━', 'bright');
  try {
    const response = await makeRequest('GET', `${actualBaseUrl}/api/hr/dashboard/stats`, null, authToken);
    if (response.status === 200) {
      log('✅ Passed', 'green');
      results.passed.push('GET /api/hr/dashboard/stats');
    } else {
      log(`❌ Failed: ${JSON.stringify(response.data)}`, 'red');
      results.failed.push('GET /api/hr/dashboard/stats');
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    results.failed.push('GET /api/hr/dashboard/stats');
  }

  // Test 5: Get workforce
  log('\n━━━ Test: GET /api/hr/workforce ━━━', 'bright');
  try {
    const response = await makeRequest('GET', `${actualBaseUrl}/api/hr/workforce`, null, authToken);
    if (response.status === 200) {
      log('✅ Passed', 'green');
      results.passed.push('GET /api/hr/workforce');
    } else {
      log(`❌ Failed: ${JSON.stringify(response.data)}`, 'red');
      results.failed.push('GET /api/hr/workforce');
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    results.failed.push('GET /api/hr/workforce');
  }

  // Test 6: Get payroll stats
  log('\n━━━ Test: GET /api/hr/payroll/stats ━━━', 'bright');
  try {
    const response = await makeRequest('GET', `${actualBaseUrl}/api/hr/payroll/stats`, null, authToken);
    if (response.status === 200) {
      log('✅ Passed', 'green');
      results.passed.push('GET /api/hr/payroll/stats');
    } else {
      log(`❌ Failed: ${JSON.stringify(response.data)}`, 'red');
      results.failed.push('GET /api/hr/payroll/stats');
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    results.failed.push('GET /api/hr/payroll/stats');
  }

  // Test 7: Update employee status
  if (createdEmployeeId) {
    log(`\n━━━ Test: PATCH /api/hr/employees/${createdEmployeeId}/status ━━━`, 'bright');
    try {
      const response = await makeRequest('PATCH', `${actualBaseUrl}/api/hr/employees/${createdEmployeeId}/status`, {
        status: 'active'
      }, authToken);
      if (response.status === 200) {
        log('✅ Passed', 'green');
        results.passed.push('PATCH /api/hr/employees/:id/status');
      } else {
        log(`❌ Failed: ${JSON.stringify(response.data)}`, 'red');
        results.failed.push('PATCH /api/hr/employees/:id/status');
      }
    } catch (error) {
      log(`❌ Error: ${error.message}`, 'red');
      results.failed.push('PATCH /api/hr/employees/:id/status');
    }
  }

  // Summary
  log('\n═══════════════════════════════════════════════════════', 'bright');
  log('  HR API Test Summary', 'bright');
  log('═══════════════════════════════════════════════════════', 'bright');
  
  const total = results.passed.length + results.failed.length;
  log(`\nTotal Tests: ${total}`, 'cyan');
  log(`Passed: ${results.passed.length}`, 'green');
  log(`Failed: ${results.failed.length}`, 'red');
  log(`Success Rate: ${total > 0 ? ((results.passed.length / total) * 100).toFixed(1) : 0}%`, 'cyan');

  if (results.passed.length > 0) {
    log('\n✅ Passed:', 'green');
    results.passed.forEach(test => log(`   ${test}`, 'green'));
  }

  if (results.failed.length > 0) {
    log('\n❌ Failed:', 'red');
    results.failed.forEach(test => log(`   ${test}`, 'red'));
  }

  return results;
}

async function main() {
  log('═══════════════════════════════════════════════════════', 'bright');
  log('  Complete HR Workflow Test', 'bright');
  log('═══════════════════════════════════════════════════════', 'bright');

  const loggedIn = await login();
  if (!loggedIn) {
    log('Cannot proceed without authentication', 'red');
    process.exit(1);
  }

  const onboardingResults = {
    passed: [],
    failed: []
  };

  // Create employee
  if (await createEmployee()) {
    onboardingResults.passed.push('Create Employee');
  } else {
    onboardingResults.failed.push('Create Employee');
    log('\n❌ Cannot proceed without employee creation', 'red');
    process.exit(1);
  }

  // Onboarding steps
  if (await onboardingStep1()) onboardingResults.passed.push('Personal Details');
  else onboardingResults.failed.push('Personal Details');

  if (await onboardingStep2()) onboardingResults.passed.push('Work Details');
  else onboardingResults.failed.push('Work Details');

  if (await onboardingStep3()) onboardingResults.passed.push('Statutory Info');
  else onboardingResults.failed.push('Statutory Info');

  if (await onboardingStep4()) onboardingResults.passed.push('Documents');
  else onboardingResults.failed.push('Documents');

  if (await onboardingStep5()) onboardingResults.passed.push('Save Draft');
  else onboardingResults.failed.push('Save Draft');

  if (await onboardingStep6()) onboardingResults.passed.push('Get Draft');
  else onboardingResults.failed.push('Get Draft');

  if (await onboardingStep7()) onboardingResults.passed.push('Complete Onboarding');
  else onboardingResults.failed.push('Complete Onboarding');

  // Test HR APIs
  const apiResults = await testHRApis();

  // Final Summary
  log('\n═══════════════════════════════════════════════════════', 'bright');
  log('  Final Summary', 'bright');
  log('═══════════════════════════════════════════════════════', 'bright');

  log(`\nOnboarding Steps: ${onboardingResults.passed.length}/${onboardingResults.passed.length + onboardingResults.failed.length} passed`, 
    onboardingResults.failed.length === 0 ? 'green' : 'yellow');
  log(`HR API Tests: ${apiResults.passed.length}/${apiResults.passed.length + apiResults.failed.length} passed`,
    apiResults.failed.length === 0 ? 'green' : 'yellow');

  if (createdEmployeeId) {
    log(`\n✅ Employee Created: ${createdEmployeeId}`, 'green');
    log(`   All data should be in MAIN database (etelios_hr_service)`, 'cyan');
  }

  const allPassed = onboardingResults.failed.length === 0 && apiResults.failed.length === 0;
  process.exit(allPassed ? 0 : 1);
}

main().catch(console.error);

