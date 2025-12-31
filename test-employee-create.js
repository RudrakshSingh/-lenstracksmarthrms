#!/usr/bin/env node

const http = require('http');

const BASE_URL = 'http://localhost:3002';
let authToken = null;

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

async function login() {
  console.log('🔐 Logging in...');
  const response = await makeRequest('POST', `${BASE_URL}/api/auth/mock-login`, {
    email: 'hr@company.com',
    role: 'hr'
  });
  
  if (response.status === 200) {
    authToken = response.data?.data?.accessToken || response.data?.accessToken;
    if (authToken) {
      console.log('✅ Login successful\n');
      return true;
    }
  }
  console.log('❌ Login failed');
  return false;
}

async function testEmployeeCreation() {
  console.log('📋 Testing Employee Creation API\n');
  console.log('='.repeat(60));
  
  if (!await login()) return;

  const timestamp = Date.now();
  const employeeId = `EMP${timestamp}`;
  const email = `employee${timestamp}@test.com`;

  // Create Employee
  console.log('👤 Step 1: Creating Employee...');
  const employeeData = {
    employeeId: employeeId,
    fullName: 'John Doe', // Required by controller
    firstName: 'John',    // Required by validation schema
    lastName: 'Doe',      // Required by validation schema
    email: email,
    password: 'Test@123456',
    roleName: 'employee',
    phone: '9876543210',
    jobTitle: 'Software Engineer',
    department: 'IT',     // Required by controller
    dateOfBirth: '1990-01-15',
    address: {
      street: '123 Test Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      zip: '400001',
      country: 'India'
    }
  };

  const createResponse = await makeRequest('POST', `${BASE_URL}/api/hr/employees`, employeeData);
  console.log(`Status: ${createResponse.status}`);
  console.log('Response:', JSON.stringify(createResponse.data, null, 2));
  
  if (createResponse.status === 201 || createResponse.status === 200) {
    console.log('\n✅ Employee created successfully!');
    
    // Get Employee by ID
    const employeeIdFromResponse = createResponse.data?.data?._id || createResponse.data?.data?.id;
    if (employeeIdFromResponse) {
      console.log(`\n🔍 Step 2: Getting Employee Details (ID: ${employeeIdFromResponse})...`);
      const getResponse = await makeRequest('GET', `${BASE_URL}/api/hr/employees/${employeeIdFromResponse}`);
      console.log(`Status: ${getResponse.status}`);
      if (getResponse.status === 200) {
        console.log('Employee Details:', JSON.stringify(getResponse.data, null, 2));
      }
    }

    // Search for Employee
    console.log(`\n🔍 Step 3: Searching for Employee (${employeeId})...`);
    const searchResponse = await makeRequest('GET', `${BASE_URL}/api/hr/employees?search=${employeeId}`);
    console.log(`Status: ${searchResponse.status}`);
    if (searchResponse.status === 200 && searchResponse.data?.data?.employees) {
      const found = searchResponse.data.data.employees.find(e => e.employeeId === employeeId);
      if (found) {
        console.log('✅ Employee found in search results');
        console.log('Employee:', JSON.stringify(found, null, 2));
      }
    }
  } else {
    console.log('\n❌ Failed to create employee');
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\nEmployee ID: ${employeeId}`);
  console.log(`Email: ${email}`);
}

testEmployeeCreation().catch(console.error);
