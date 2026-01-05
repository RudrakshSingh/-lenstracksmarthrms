#!/usr/bin/env node

/**
 * Test Employee Registration Endpoint - LOCAL
 * Tests POST /api/auth/register on localhost
 * 
 * Usage:
 *   1. Start HR service locally: cd microservices/hr-service && npm start
 *   2. Run this script: node scripts/test-employee-registration-local.js
 */

require('dotenv').config();
const http = require('http');

// Local backend URL
const BACKEND_URL = process.env.LOCAL_BACKEND_URL || 'http://localhost:3002';

// Generate unique employee ID
const timestamp = Date.now();
const randomNum = Math.floor(Math.random() * 1000000);
const employeeId = `EMP-2026-${randomNum}`;

// Test data for HR Service (public endpoint)
const testEmployeeHR = {
  employee_id: employeeId,
  name: 'Test Employee Local',
  email: `test.employee.local.${timestamp}@etelios.com`,
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

console.log('🧪 Testing Employee Registration - LOCAL');
console.log('======================================');
console.log('');
console.log('Backend URL:', BACKEND_URL);
console.log('Endpoint: POST /api/auth/register');
console.log('');

// Function to make HTTP request
function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const req = http.request(url, options, (res) => {
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

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test HR Service endpoint (public, no authentication)
async function testHRServiceEndpoint() {
  console.log('📋 Test: HR Service Endpoint (public, no authentication)');
  console.log('--------------------------------------------------------');
  
  const url = `${BACKEND_URL}/api/auth/register`;
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  console.log('Request URL:', url);
  console.log('Request Headers:', JSON.stringify(options.headers, null, 2));
  console.log('Request Body:', JSON.stringify(testEmployeeHR, null, 2));
  console.log('');

  try {
    const response = await makeRequest(url, options, testEmployeeHR);
    
    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(response.data, null, 2));
    console.log('');

    if (response.status === 201 || response.status === 200) {
      console.log('✅ SUCCESS: Employee registered successfully!');
      console.log('Employee ID:', response.data.data?.employee_id || response.data.data?.employeeId);
      console.log('User ID:', response.data.data?.user_id || response.data.data?.id);
      return { success: true, response };
    } else {
      console.log('❌ FAILED: Registration failed');
      console.log('Error:', response.data.message || response.data.error);
      if (response.data.errors) {
        console.log('Validation Errors:', JSON.stringify(response.data.errors, null, 2));
      }
      return { success: false, response };
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ ERROR: Cannot connect to server');
      console.log('Make sure HR service is running on', BACKEND_URL);
      console.log('Start it with: cd microservices/hr-service && npm start');
    } else {
      console.log('❌ ERROR:', error.message);
      console.log('Stack:', error.stack);
    }
    return { success: false, error: error.message };
  }
}

// Test different roles
async function testDifferentRoles() {
  console.log('📋 Test: Testing Different Roles');
  console.log('--------------------------------');
  
  const roles = ['employee', 'hr', 'manager', 'admin'];
  const results = [];

  for (const role of roles) {
    console.log(`\nTesting role: ${role}`);
    const testData = {
      ...testEmployeeHR,
      employee_id: `EMP-2026-${randomNum}-${role}`,
      email: `test.${role}.local.${timestamp}@etelios.com`,
      role: role
    };

    const url = `${BACKEND_URL}/api/auth/register`;
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    try {
      const response = await makeRequest(url, options, testData);
      const success = response.status === 201 || response.status === 200;
      results.push({ role, success, status: response.status, message: response.data.message || response.data.error });
      console.log(`  Status: ${response.status} - ${success ? '✅' : '❌'}`);
      if (!success) {
        console.log(`  Error: ${response.data.message || response.data.error}`);
      }
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

// Main test function
async function runTests() {
  try {
    console.log('Starting local tests...\n');

    // Test 1: HR Service
    const result1 = await testHRServiceEndpoint();
    console.log('\n');

    // Test 2: Different roles (only if first test succeeded)
    if (result1.success) {
      await testDifferentRoles();
    }

    console.log('\n✅ Tests completed!');
    
    if (!result1.success && result1.error && result1.error.includes('ECONNREFUSED')) {
      console.log('\n💡 TIP: Make sure HR service is running:');
      console.log('   cd microservices/hr-service');
      console.log('   npm start');
    }
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();

