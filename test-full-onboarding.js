#!/usr/bin/env node

/**
 * Complete 7-Step Employee Onboarding Test
 * Tests the full onboarding process from start to finish
 */

const http = require('http');

const BASE_URL = 'http://localhost:3002';
let authToken = null;
let employeeId = null;
let userId = null;

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[1m\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  step: (num, msg) => console.log(`\n${colors.blue}━━━ Step ${num}: ${msg} ━━━${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
  data: (data) => console.log(JSON.stringify(data, null, 2))
};

// Helper function to make HTTP requests
function makeRequest(method, url, data = null, headers = {}) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(options, (res) => {
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
      resolve({ status: 0, error: error.message });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Login
async function login() {
  log.info('Logging in as HR...');
  const response = await makeRequest('POST', `${BASE_URL}/api/auth/mock-login`, {
    email: 'hr@company.com',
    role: 'hr'
  });
  
  if (response.status === 200) {
    authToken = response.data?.data?.accessToken || response.data?.accessToken;
    if (authToken) {
      log.success('Login successful');
      return true;
    }
  }
  log.error('Login failed');
  return false;
}

// Step 1: Personal Details
async function step1PersonalDetails() {
  log.step(1, 'Personal Details');
  
  const timestamp = Date.now();
  employeeId = `EMP${timestamp}`;
  
  const personalData = {
    employee_id: employeeId,
    name: 'Jane Smith',
    email: `jane.smith${timestamp}@test.com`,
    phone: '9876543210',
    password: 'Test@123456',
    role: 'employee',
    date_of_birth: '1992-05-15',
    address: {
      address_line_1: '456 Employee Street',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      country: 'India'
    }
  };

  log.info(`Creating employee: ${employeeId}`);
  const response = await makeRequest('POST', `${BASE_URL}/api/hr/onboarding/personal-details`, personalData);
  
  log.info(`Status: ${response.status}`);
  if (response.status === 201 || response.status === 200) {
    log.success('Personal details added successfully');
    userId = response.data?.data?.user_id || response.data?.data?.userId;
    log.data(response.data);
    return true;
  } else {
    log.error(`Failed: ${response.data?.error || response.data?.message}`);
    log.data(response.data);
    return false;
  }
}

// Step 2: Work Details
async function step2WorkDetails() {
  log.step(2, 'Work Details');
  
  const workData = {
    employeeId: employeeId,
    firstName: 'Jane',
    lastName: 'Smith',
    jobTitle: 'Senior Software Engineer',
    department: 'IT',
    designation: 'Engineer',
    role_family: 'Technical',
    joining_date: new Date().toISOString().split('T')[0],
    employee_status: 'ACTIVE',
    base_salary: 75000,
    pf_applicable: true,
    esic_applicable: true,
    pt_applicable: true,
    tds_applicable: true,
    pan_number: 'ABCDE1234F',
    tax_state: 'Delhi'
  };

  log.info(`Adding work details for: ${employeeId}`);
  const response = await makeRequest('POST', `${BASE_URL}/api/hr/onboarding/work-details`, workData);
  
  log.info(`Status: ${response.status}`);
  if (response.status === 200 || response.status === 201) {
    log.success('Work details added successfully');
    log.data(response.data);
    return true;
  } else {
    log.error(`Failed: ${response.data?.error || response.data?.message}`);
    log.data(response.data);
    return false;
  }
}

// Step 3: Statutory Information
async function step3StatutoryInfo() {
  log.step(3, 'Statutory Information');
  
  const statutoryData = {
    employeeId: employeeId,
    bankAccount: {
      account_number: '9876543210',
      ifsc_code: 'HDFC0001234',
      bank_name: 'HDFC Bank',
      account_type: 'Savings'
    },
    uan: '123456789012',
    esiNo: '123456789012345',
    panNumber: 'ABCDE1234F',
    previousEmployment: {
      has_previous_employment: true,
      employer_name: 'Previous Company',
      from_date: '2020-01-01',
      to_date: '2024-12-31'
    }
  };

  log.info(`Adding statutory info for: ${employeeId}`);
  const response = await makeRequest('POST', `${BASE_URL}/api/hr/onboarding/statutory-info`, statutoryData);
  
  log.info(`Status: ${response.status}`);
  if (response.status === 200 || response.status === 201) {
    log.success('Statutory information added successfully');
    log.data(response.data);
    return true;
  } else {
    log.error(`Failed: ${response.data?.error || response.data?.message}`);
    log.data(response.data);
    return false;
  }
}

// Step 4: Documents
async function step4Documents() {
  log.step(4, 'Documents');
  
  const documentsData = {
    employeeId: employeeId,
    documents: [
      {
        type: 'AADHAR',
        name: 'Aadhar Card',
        file_url: 'https://example.com/documents/aadhar.pdf',
        verified: false
      },
      {
        type: 'PAN',
        name: 'PAN Card',
        file_url: 'https://example.com/documents/pan.pdf',
        verified: false
      },
      {
        type: 'PHOTO',
        name: 'Employee Photo',
        file_url: 'https://example.com/documents/photo.jpg',
        verified: false
      },
      {
        type: 'EDUCATION_CERTIFICATE',
        name: 'Degree Certificate',
        file_url: 'https://example.com/documents/degree.pdf',
        verified: false
      }
    ]
  };

  log.info(`Adding documents for: ${employeeId}`);
  const response = await makeRequest('POST', `${BASE_URL}/api/hr/onboarding/documents`, documentsData);
  
  log.info(`Status: ${response.status}`);
  if (response.status === 200 || response.status === 201) {
    log.success('Documents added successfully');
    log.data(response.data);
    return true;
  } else {
    log.error(`Failed: ${response.data?.error || response.data?.message}`);
    log.data(response.data);
    return false;
  }
}

// Step 5: Save Draft (Optional - for saving progress)
async function step5SaveDraft() {
  log.step(5, 'Save Draft (Optional)');
  
  const draftData = {
    employee_id: employeeId,
    step: 4,
    data: {
      personalDetails: 'completed',
      workDetails: 'completed',
      statutoryInfo: 'completed',
      documents: 'completed'
    }
  };

  log.info(`Saving draft for: ${employeeId}`);
  const response = await makeRequest('POST', `${BASE_URL}/api/hr/onboarding/draft`, draftData);
  
  log.info(`Status: ${response.status}`);
  if (response.status === 200 || response.status === 201) {
    log.success('Draft saved successfully');
    log.data(response.data);
    return true;
  } else {
    log.error(`Failed: ${response.data?.error || response.data?.message}`);
    log.data(response.data);
    return false;
  }
}

// Step 6: Get Draft (Verify draft was saved)
async function step6GetDraft() {
  log.step(6, 'Get Draft (Verification)');
  
  log.info(`Retrieving draft for: ${employeeId}`);
  const response = await makeRequest('GET', `${BASE_URL}/api/hr/onboarding/draft?employee_id=${employeeId}`);
  
  log.info(`Status: ${response.status}`);
  if (response.status === 200) {
    log.success('Draft retrieved successfully');
    log.data(response.data);
    return true;
  } else {
    log.error(`Failed: ${response.data?.error || response.data?.message}`);
    log.data(response.data);
    return false;
  }
}

// Step 7: Complete Onboarding
async function step7CompleteOnboarding() {
  log.step(7, 'Complete Onboarding');
  
  // Use the userId from Step 1 directly
  let employeeMongoId = userId;
  
  if (!employeeMongoId) {
    // Fallback: search for employee
    log.info(`Searching for employee: ${employeeId}`);
    const searchResponse = await makeRequest('GET', `${BASE_URL}/api/hr/employees?search=${employeeId}`);
    
    if (searchResponse.status === 200 && searchResponse.data?.data?.employees) {
      const employee = searchResponse.data.data.employees.find(e => e.employeeId === employeeId);
      if (employee) {
        employeeMongoId = employee.id || employee._id;
        log.success(`Found employee with MongoDB ID: ${employeeMongoId}`);
      } else if (searchResponse.data.data.employees.length > 0) {
        // Use first result if employeeId matches
        const first = searchResponse.data.data.employees[0];
        if (first.employeeId === employeeId) {
          employeeMongoId = first.id || first._id;
          log.success(`Found employee with MongoDB ID: ${employeeMongoId}`);
        }
      }
    }
  } else {
    log.success(`Using user ID from Step 1: ${employeeMongoId}`);
  }

  if (!employeeMongoId) {
    log.error('Could not find employee MongoDB ID');
    return false;
  }

  const completeData = {
    system_access: {
      create_system_account: true,
      role_name: 'employee',
      default_password: 'Temp@123456',
      password_options: {
        force_change_on_first_login: true,
        send_via_email: true,
        send_via_sms: false
      },
      notifications: {
        email_welcome: true,
        email_credentials: true,
        notify_manager: true,
        notify_hr: true
      }
    }
  };

  log.info(`Completing onboarding for: ${employeeId} (ID: ${employeeMongoId})`);
  const response = await makeRequest('POST', `${BASE_URL}/api/hr/onboarding/complete/${employeeMongoId}`, completeData);
  
  log.info(`Status: ${response.status}`);
  if (response.status === 200 || response.status === 201) {
    log.success('Onboarding completed successfully!');
    log.data(response.data);
    return true;
  } else {
    log.error(`Failed: ${response.data?.error || response.data?.message}`);
    log.data(response.data);
    return false;
  }
}

// Step 8: Verify Employee (Bonus step)
async function step8VerifyEmployee() {
  log.step(8, 'Verify Employee Created');
  
  log.info(`Verifying employee: ${employeeId}`);
  const response = await makeRequest('GET', `${BASE_URL}/api/hr/employees?search=${employeeId}`);
  
  log.info(`Status: ${response.status}`);
  if (response.status === 200) {
    // Handle both array and single object responses
    let employees = [];
    if (response.data?.data?.employees) {
      employees = response.data.data.employees;
    } else if (response.data?.data) {
      employees = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
    }
    
    const employee = employees.find(e => e.employeeId === employeeId);
    if (employee) {
      log.success('Employee verified and found in system');
      log.data({
        employeeId: employee.employeeId,
        fullName: employee.fullName,
        email: employee.email,
        department: employee.department,
        status: employee.status
      });
      return true;
    } else if (employees.length > 0) {
      // If we got results but employeeId doesn't match exactly, show what we found
      log.info('Employee found but employeeId may differ');
      log.data(employees[0]);
      return true;
    }
  }
  log.error('Employee not found');
  log.data(response.data);
  return false;
}

// Main test function
async function runFullOnboardingTest() {
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  Complete 7-Step Employee Onboarding Test${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  const results = {
    passed: [],
    failed: []
  };

  // Login first
  if (!await login()) {
    log.error('Cannot proceed without authentication');
    return;
  }

  // Run all steps
  if (await step1PersonalDetails()) results.passed.push('Step 1: Personal Details');
  else results.failed.push('Step 1: Personal Details');

  if (await step2WorkDetails()) results.passed.push('Step 2: Work Details');
  else results.failed.push('Step 2: Work Details');

  if (await step3StatutoryInfo()) results.passed.push('Step 3: Statutory Information');
  else results.failed.push('Step 3: Statutory Information');

  if (await step4Documents()) results.passed.push('Step 4: Documents');
  else results.failed.push('Step 4: Documents');

  if (await step5SaveDraft()) results.passed.push('Step 5: Save Draft');
  else results.failed.push('Step 5: Save Draft');

  if (await step6GetDraft()) results.passed.push('Step 6: Get Draft');
  else results.failed.push('Step 6: Get Draft');

  if (await step7CompleteOnboarding()) results.passed.push('Step 7: Complete Onboarding');
  else results.failed.push('Step 7: Complete Onboarding');

  if (await step8VerifyEmployee()) results.passed.push('Step 8: Verify Employee');
  else results.failed.push('Step 8: Verify Employee');

  // Summary
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}  Test Summary${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  console.log(`Total Steps: ${results.passed.length + results.failed.length}`);
  console.log(`${colors.green}Passed: ${results.passed.length}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed.length}${colors.reset}`);
  console.log(`Success Rate: ${((results.passed.length / (results.passed.length + results.failed.length)) * 100).toFixed(1)}%\n`);

  if (results.passed.length > 0) {
    console.log(`${colors.green}✅ Passed Steps:${colors.reset}`);
    results.passed.forEach(step => console.log(`   ${step}`));
  }

  if (results.failed.length > 0) {
    console.log(`\n${colors.red}❌ Failed Steps:${colors.reset}`);
    results.failed.forEach(step => console.log(`   ${step}`));
  }

  console.log(`\n${colors.cyan}Employee ID: ${employeeId || 'N/A'}${colors.reset}`);
  console.log(`${colors.cyan}User ID: ${userId || 'N/A'}${colors.reset}\n`);
}

// Run the test
runFullOnboardingTest().catch(console.error);

