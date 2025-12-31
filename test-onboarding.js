#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:3002';
let authToken = null;

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

// Login first
async function login() {
  console.log('\n🔐 Logging in...');
  const response = await makeRequest('POST', `${BASE_URL}/api/auth/mock-login`, {
    email: 'hr@company.com',
    role: 'hr'
  });
  
  if (response.status === 200) {
    // Handle both response structures
    authToken = response.data?.data?.accessToken || response.data?.accessToken;
    if (authToken) {
      console.log('✅ Login successful');
      return true;
    }
  }
  console.log('❌ Login failed:', response.data);
  return false;
}

// Generate unique employee ID
const timestamp = Date.now();
const employeeId = `EMP${timestamp}`;
const email = `employee${timestamp}@test.com`;

async function testOnboarding() {
  console.log('\n📋 Testing Employee Onboarding API\n');
  console.log('='.repeat(60));
  
  // Step 1: Login
  const loggedIn = await login();
  if (!loggedIn) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }

  // Step 2: Add Personal Details
  console.log('\n📝 Step 1: Adding Personal Details...');
  const personalDetails = {
    employee_id: employeeId,
    name: 'John Doe',
    email: email,
    phone: '9876543210',
    password: 'Test@123456',
    role: 'employee',
    date_of_birth: '1990-01-15',
    address: {
      address_line_1: '123 Test Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'India'
    }
  };

  const personalResponse = await makeRequest('POST', `${BASE_URL}/api/hr/onboarding/personal-details`, personalDetails);
  console.log(`Status: ${personalResponse.status}`);
  console.log('Response:', JSON.stringify(personalResponse.data, null, 2));

  if (personalResponse.status !== 201 && personalResponse.status !== 200) {
    console.log('❌ Failed to add personal details');
    return;
  }

  // Step 3: Add Work Details
  console.log('\n💼 Step 2: Adding Work Details...');
  const workDetails = {
    employeeId: employeeId,
    firstName: 'John',
    lastName: 'Doe',
    email: email,
    jobTitle: 'Software Engineer',
    department: 'IT',
    designation: 'Engineer',
    role_family: 'Technical',
    joining_date: new Date().toISOString().split('T')[0],
    employee_status: 'ACTIVE',
    base_salary: 50000,
    pf_applicable: true,
    esic_applicable: true,
    pt_applicable: true,
    tds_applicable: true,
    pan_number: 'ABCDE1234F'
  };

  const workResponse = await makeRequest('POST', `${BASE_URL}/api/hr/onboarding/work-details`, workDetails);
  console.log(`Status: ${workResponse.status}`);
  console.log('Response:', JSON.stringify(workResponse.data, null, 2));

  // Step 4: Add Statutory Info
  console.log('\n📄 Step 3: Adding Statutory Information...');
  const statutoryInfo = {
    employeeId: employeeId,
    bankAccount: {
      account_number: '1234567890',
      ifsc_code: 'HDFC0001234',
      bank_name: 'HDFC Bank',
      account_type: 'Savings'
    },
    uan: '123456789012',
    panNumber: 'ABCDE1234F',
    previousEmployment: {
      has_previous_employment: false
    }
  };

  const statutoryResponse = await makeRequest('POST', `${BASE_URL}/api/hr/onboarding/statutory-info`, statutoryInfo);
  console.log(`Status: ${statutoryResponse.status}`);
  console.log('Response:', JSON.stringify(statutoryResponse.data, null, 2));

  // Step 5: Verify Employee Created
  console.log('\n🔍 Step 4: Verifying Employee...');
  const verifyResponse = await makeRequest('GET', `${BASE_URL}/api/hr/employees?search=${employeeId}`);
  console.log(`Status: ${verifyResponse.status}`);
  if (verifyResponse.data?.data?.employees) {
    const employee = verifyResponse.data.data.employees.find(emp => emp.employeeId === employeeId);
    if (employee) {
      console.log('✅ Employee found:', JSON.stringify(employee, null, 2));
    } else {
      console.log('⚠️ Employee not found in list');
    }
  }

  // Step 6: Get Employee by ID
  if (verifyResponse.data?.data?.employees?.[0]?._id) {
    const empId = verifyResponse.data.data.employees[0]._id;
    console.log(`\n📋 Step 5: Getting Employee Details (ID: ${empId})...`);
    const getEmployeeResponse = await makeRequest('GET', `${BASE_URL}/api/hr/employees/${empId}`);
    console.log(`Status: ${getEmployeeResponse.status}`);
    console.log('Response:', JSON.stringify(getEmployeeResponse.data, null, 2));
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Onboarding Test Complete!');
  console.log(`\nEmployee ID: ${employeeId}`);
  console.log(`Email: ${email}`);
}

testOnboarding().catch(console.error);
