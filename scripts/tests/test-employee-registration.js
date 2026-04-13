#!/usr/bin/env node

/**
 * Test Employee Registration Endpoint
 * Tests POST /api/auth/register with real backend
 * 
 * Usage:
 *   node scripts/test-employee-registration.js
 * 
 * Environment Variables:
 *   BACKEND_URL - Backend API URL (default: https://98.70.245.87)
 *   ADMIN_TOKEN - Admin/HR token for authentication (optional if using HR service public endpoint)
 */

require('dotenv').config();
const https = require('https');
const http = require('http');

// Backend URL
const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://98.70.245.87';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@etelios.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123456';

// Generate unique employee ID
const timestamp = Date.now();
const randomNum = Math.floor(Math.random() * 1000000);
const employeeId = `EMP-2026-${randomNum}`;

// Test data
const testEmployee = {
  employee_id: employeeId,
  name: 'Test Employee',
  email: `test.employee.${timestamp}@etelios.com`,
  phone: '+91-9876543210',
  password: 'Test@123456',
  role: 'employee',
  department: 'TECH',
  designation: 'Software Developer',
  joining_date: '2026-01-02',
  tenantId: 'default', // Add tenantId if required
  address: {
    street: '123 Test Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    pincode: '400001'
  }
};

console.log('🧪 Testing Employee Registration');
console.log('================================');
console.log('');
console.log('Backend URL:', BACKEND_URL);
console.log('Endpoint: POST /api/auth/register');
console.log('');

// Function to make HTTP/HTTPS request
function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    // For self-signed certificates
    if (isHttps) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    const req = client.request(url, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test 1: Try Auth Service endpoint (requires authentication)
async function testAuthServiceEndpoint() {
  console.log('📋 Test 1: Auth Service Endpoint (with authentication)');
  console.log('------------------------------------------------------');
  
  const token = ADMIN_TOKEN || process.env.ADMIN_TOKEN || '';
  const url = `${BACKEND_URL}/api/auth/register`;
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  };

  console.log('Request URL:', url);
  console.log('Request Headers:', JSON.stringify(options.headers, null, 2));
  console.log('Request Body:', JSON.stringify(testEmployee, null, 2));
  console.log('');

  try {
    const response = await makeRequest(url, options, testEmployee);
    
    console.log('Response Status:', response.status);
    console.log('Response Headers:', JSON.stringify(response.headers, null, 2));
    console.log('Response Body:', JSON.stringify(response.data, null, 2));
    console.log('');

    if (response.status === 201 || response.status === 200) {
      console.log('✅ SUCCESS: Employee registered successfully!');
      console.log('Employee ID:', response.data.data?.employee_id || response.data.data?.employeeId);
      console.log('User ID:', response.data.data?.user_id || response.data.data?.id);
      console.log('Full Response:', JSON.stringify(response.data, null, 2));
      return { success: true, response };
    } else {
      console.log('❌ FAILED: Registration failed');
      console.log('Status:', response.status);
      console.log('Error:', response.data.message || response.data.error);
      console.log('Full Error Response:', JSON.stringify(response.data, null, 2));
      if (response.data.errors) {
        console.log('Validation Errors:', JSON.stringify(response.data.errors, null, 2));
      }
      return { success: false, response };
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    console.log('Stack:', error.stack);
    return { success: false, error: error.message };
  }
}

// Test 2: Try HR Service endpoint (public, no authentication)
async function testHRServiceEndpoint() {
  console.log('📋 Test 2: HR Service Endpoint (public, no authentication)');
  console.log('-----------------------------------------------------------');
  
  const url = `${BACKEND_URL}/api/auth/register`;
  const hrServiceData = {
    employee_id: `EMP-2026-${randomNum + 1}`,
    name: 'Test Employee HR',
    email: `test.employee.hr.${timestamp}@etelios.com`,
    phone: '+91-9876543210',
    password: 'Test@123456',
    role: 'employee',
    address: {
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'India'
    }
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  console.log('Request URL:', url);
  console.log('Request Headers:', JSON.stringify(options.headers, null, 2));
  console.log('Request Body:', JSON.stringify(hrServiceData, null, 2));
  console.log('');

  try {
    const response = await makeRequest(url, options, hrServiceData);
    
    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(response.data, null, 2));
    console.log('');

    if (response.status === 201 || response.status === 200) {
      console.log('✅ SUCCESS: Employee registered successfully!');
      console.log('Employee ID:', response.data.data?.employee_id || response.data.data?.employeeId);
      return { success: true, response };
    } else {
      console.log('❌ FAILED: Registration failed');
      console.log('Error:', response.data.message || response.data.error);
      return { success: false, response };
    }
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    return { success: false, error: error.message };
  }
}

// Test 3: Try with different roles
async function testDifferentRoles() {
  console.log('📋 Test 3: Testing Different Roles');
  console.log('----------------------------------');
  
  const roles = ['employee', 'hr', 'manager', 'admin'];
  const results = [];

  for (const role of roles) {
    console.log(`\nTesting role: ${role}`);
    const testData = {
      ...testEmployee,
      employee_id: `EMP-2026-${randomNum}-${role}`,
      email: `test.${role}.${timestamp}@etelios.com`,
      role: role
    };

    const token = ADMIN_TOKEN || process.env.ADMIN_TOKEN || '';
    const url = `${BACKEND_URL}/api/auth/register`;
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };

    try {
      const response = await makeRequest(url, options, testData);
      const success = response.status === 201 || response.status === 200;
      results.push({ role, success, status: response.status, message: response.data.message || response.data.error });
      console.log(`  Status: ${response.status} - ${success ? '✅' : '❌'}`);
    } catch (error) {
      results.push({ role, success: false, error: error.message });
      console.log(`  ❌ Error: ${error.message}`);
    }
  }

  console.log('\nRole Test Results:');
  results.forEach(r => {
    console.log(`  ${r.role}: ${r.success ? '✅' : '❌'} (${r.status || 'ERROR'})`);
  });

  return results;
}

// Login to get admin token
async function loginAsAdmin() {
  console.log('🔐 Step 1: Logging in as Admin to get token');
  console.log('--------------------------------------------');
  
  const loginUrl = `${BACKEND_URL}/api/auth/login`;
  const loginData = {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  console.log('Login URL:', loginUrl);
  console.log('Login Email:', ADMIN_EMAIL);
  console.log('');

  try {
    const response = await makeRequest(loginUrl, options, loginData);
    
    if (response.status === 200 && response.data.success) {
      const token = response.data.data?.accessToken || response.data.accessToken || response.data.token;
      console.log('✅ Login successful!');
      console.log('Token received:', token ? token.substring(0, 50) + '...' : 'NOT FOUND');
      console.log('');
      return token;
    } else {
      console.log('❌ Login failed');
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(response.data, null, 2));
      return null;
    }
  } catch (error) {
    console.log('❌ Login error:', error.message);
    return null;
  }
}

// Main test function
async function runTests() {
  try {
    console.log('Starting tests...\n');

    // Step 1: Login to get token
    let token = ADMIN_TOKEN;
    if (!token) {
      token = await loginAsAdmin();
      if (!token) {
        console.log('\n⚠️  Could not get admin token. Trying without authentication...\n');
      }
    } else {
      console.log('Using provided ADMIN_TOKEN\n');
    }

    // Update global token for tests
    if (token) {
      process.env.ADMIN_TOKEN = token;
    }

    // Test 2: HR Service FIRST (this is the actual employee registration endpoint)
    console.log('🎯 Testing HR Service endpoint (employee registration happens here)\n');
    const hrResult = await testHRServiceEndpoint();
    console.log('\n');

    // Test 1: Auth Service (optional, requires authentication)
    if (token) {
      console.log('📋 Testing Auth Service endpoint (requires authentication)\n');
      const result1 = await testAuthServiceEndpoint();
      console.log('\n');
    } else {
      console.log('⏭️  Skipping Auth Service test (no token available)\n');
    }

    // Test 3: Different roles (only if we have token)
    if (token) {
      await testDifferentRoles();
    }

    console.log('\n✅ Tests completed!');
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();

