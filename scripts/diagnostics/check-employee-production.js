#!/usr/bin/env node

/**
 * Check if employee exists in production database
 * Usage: node scripts/check-employee-production.js EMP-2026-287810
 */

const axios = require('axios');

const EMPLOYEE_ID = process.argv[2] || 'EMP-2026-287810';
const API_BASE_URL = process.env.API_BASE_URL || 'https://98.70.245.87';
const API_HOST = process.env.API_HOST || 'api.etelios.com';

// Disable SSL verification for self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkEmployee() {
  try {
    console.log('🔍 Checking Employee in Production');
    console.log('==================================');
    console.log(`Employee ID: ${EMPLOYEE_ID}`);
    console.log(`API Base URL: ${API_BASE_URL}`);
    console.log('');

    // First, try to get employee
    console.log('📥 Checking if employee exists...');
    const employeeUrl = `${API_BASE_URL}/api/hr/employees/${EMPLOYEE_ID}`;
    
    try {
      const response = await axios.get(employeeUrl, {
        headers: {
          'Host': API_HOST,
          'Content-Type': 'application/json'
        },
        validateStatus: () => true // Don't throw on 404
      });

      if (response.status === 200) {
        console.log('✅ Employee found!');
        console.log(JSON.stringify(response.data, null, 2));
        return true;
      } else if (response.status === 404) {
        console.log('❌ Employee NOT found (404)');
        console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
        return false;
      } else if (response.status === 401) {
        console.log('⚠️  Authentication required');
        console.log('   Employee endpoint requires authentication');
        console.log('   Try with a valid token:');
        console.log(`   curl -H "Authorization: Bearer YOUR_TOKEN" ${employeeUrl}`);
        return null;
      } else {
        console.log(`⚠️  Unexpected status: ${response.status}`);
        console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Error checking employee:', error.message);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      return false;
    }

  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

async function testEndpoints() {
  console.log('');
  console.log('🧪 Testing Endpoints');
  console.log('====================');
  
  const employeeId = process.argv[2] || 'EMP-2026-287810';
  const baseUrl = process.env.API_BASE_URL || 'https://98.70.245.87';
  
  const endpoints = [
    {
      name: 'Get Employee',
      method: 'GET',
      url: `${baseUrl}/api/hr/employees/${employeeId}`
    },
    {
      name: 'Assign Role',
      method: 'POST',
      url: `${baseUrl}/api/hr/employees/${employeeId}/assign-role`,
      body: { roleName: 'Employee' }
    },
    {
      name: 'Update Status',
      method: 'PATCH',
      url: `${baseUrl}/api/hr/employees/${employeeId}/status`,
      body: { status: 'ACTIVE' }
    }
  ];

  for (const endpoint of endpoints) {
    console.log(`\n📡 ${endpoint.name}: ${endpoint.method} ${endpoint.url}`);
    try {
      const config = {
        method: endpoint.method,
        url: endpoint.url,
        headers: {
          'Host': 'api.etelios.com',
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      };
      
      if (endpoint.body) {
        config.data = endpoint.body;
      }
      
      const response = await axios(config);
      console.log(`   Status: ${response.status}`);
      if (response.status === 401) {
        console.log('   ⚠️  Requires authentication');
      } else if (response.status === 404) {
        console.log('   ❌ Not found');
        console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
      } else if (response.status === 200) {
        console.log('   ✅ Success');
      } else {
        console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

// Run checks
(async () => {
  const exists = await checkEmployee();
  await testEndpoints();
  
  console.log('');
  console.log('📋 Summary');
  console.log('==========');
  if (exists === true) {
    console.log('✅ Employee exists in production');
    console.log('   If still getting 404, check:');
    console.log('   1. Next.js proxy route is correctly forwarding');
    console.log('   2. Authentication token is valid');
    console.log('   3. User has HR/Admin role');
  } else if (exists === false) {
    console.log('❌ Employee does NOT exist in production');
    console.log('   Solution: Create employee first via registration endpoint');
  } else {
    console.log('⚠️  Could not verify (authentication required)');
    console.log('   Solution: Check with valid authentication token');
  }
})();

