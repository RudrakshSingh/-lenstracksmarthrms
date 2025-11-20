/**
 * Test script for Mock Login Endpoint
 * Tests the mock login functionality
 */

const axios = require('axios');

// Configuration
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testMockLogin(role = 'hr') {
  log('\n=== Testing Mock Login ===', 'cyan');
  log(`Role: ${role}`, 'blue');
  log(`Endpoint: ${GATEWAY_URL}/api/auth/mock-login`, 'blue');
  
  try {
    const response = await axios.post(
      `${GATEWAY_URL}/api/auth/mock-login`,
      { role },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000,
        validateStatus: () => true
      }
    );

    log(`\nStatus Code: ${response.status}`, response.status === 200 ? 'green' : 'red');

    if (response.status === 200 && response.data.success) {
      log('\n✅ Mock Login Successful!', 'green');
      log('\nResponse Data:', 'cyan');
      console.log(JSON.stringify(response.data, null, 2));

      const { accessToken, refreshToken, user } = response.data.data;

      // Verify token structure
      log('\n=== Token Verification ===', 'cyan');
      if (accessToken) {
        log('✅ Access Token received', 'green');
        log(`Token length: ${accessToken.length} characters`, 'blue');
        
        // Decode token (without verification)
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.decode(accessToken);
          log('\nDecoded Token:', 'cyan');
          console.log(JSON.stringify(decoded, null, 2));
        } catch (e) {
          log('⚠️  Could not decode token', 'yellow');
        }
      } else {
        log('❌ No access token in response', 'red');
      }

      if (refreshToken) {
        log('✅ Refresh Token received', 'green');
      }

      // Verify user data
      log('\n=== User Data ===', 'cyan');
      if (user) {
        log('✅ User data received', 'green');
        log(`User ID: ${user._id}`, 'blue');
        log(`Employee ID: ${user.employee_id}`, 'blue');
        log(`Name: ${user.name}`, 'blue');
        log(`Email: ${user.email}`, 'blue');
        log(`Role: ${user.role}`, 'blue');
        log(`Department: ${user.department}`, 'blue');
      }

      // Test using the token
      log('\n=== Testing Protected Endpoint ===', 'cyan');
      await testProtectedEndpoint(accessToken);

      return { success: true, data: response.data };
    } else {
      log('\n❌ Mock Login Failed!', 'red');
      log('Response:', 'yellow');
      console.log(JSON.stringify(response.data, null, 2));
      return { success: false, error: response.data };
    }
  } catch (error) {
    log('\n❌ Error during mock login test', 'red');
    if (error.response) {
      log(`Status: ${error.response.status}`, 'red');
      log('Response:', 'yellow');
      console.log(JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      log('No response received', 'red');
      log('Error:', 'yellow');
      console.log(error.message);
      log('\n⚠️  Make sure the API Gateway is running!', 'yellow');
      log(`Expected URL: ${GATEWAY_URL}`, 'yellow');
    } else {
      log('Error:', 'red');
      console.log(error.message);
    }
    return { success: false, error: error.message };
  }
}

async function testProtectedEndpoint(accessToken) {
  try {
    log(`\nTesting: ${GATEWAY_URL}/api/auth/profile`, 'blue');
    
    const response = await axios.get(
      `${GATEWAY_URL}/api/auth/profile`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000,
        validateStatus: () => true
      }
    );

    if (response.status === 200) {
      log('✅ Protected endpoint accessible with token!', 'green');
      log('Profile Data:', 'cyan');
      console.log(JSON.stringify(response.data, null, 2));
    } else {
      log(`⚠️  Protected endpoint returned status: ${response.status}`, 'yellow');
      console.log(JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    log('❌ Failed to access protected endpoint', 'red');
    if (error.response) {
      log(`Status: ${error.response.status}`, 'red');
      console.log(JSON.stringify(error.response.data, null, 2));
    } else {
      log('Error:', 'red');
      console.log(error.message);
    }
  }
}

async function testHRService(accessToken) {
  try {
    log(`\n=== Testing HR Service Endpoint ===`, 'cyan');
    log(`Testing: ${GATEWAY_URL}/api/hr/employees`, 'blue');
    
    const response = await axios.get(
      `${GATEWAY_URL}/api/hr/employees`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000,
        validateStatus: () => true
      }
    );

    log(`Status: ${response.status}`, response.status === 200 ? 'green' : 'yellow');
    if (response.data) {
      log('Response:', 'cyan');
      console.log(JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    log('❌ HR Service test failed', 'red');
    if (error.response) {
      log(`Status: ${error.response.status}`, 'red');
      console.log(JSON.stringify(error.response.data, null, 2));
    }
  }
}

async function runAllTests() {
  log('\n╔══════════════════════════════════════════════════════════╗', 'cyan');
  log('║         MOCK LOGIN ENDPOINT TEST SUITE                   ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════╝', 'cyan');

  // Test 1: HR Login
  log('\n\n📋 TEST 1: HR Role Login', 'yellow');
  const hrResult = await testMockLogin('hr');
  
  if (hrResult.success && hrResult.data) {
    await testHRService(hrResult.data.data.accessToken);
  }

  // Test 2: Admin Login
  log('\n\n📋 TEST 2: Admin Role Login', 'yellow');
  await testMockLogin('admin');

  // Test 3: Manager Login
  log('\n\n📋 TEST 3: Manager Role Login', 'yellow');
  await testMockLogin('manager');

  // Test 4: Employee Login
  log('\n\n📋 TEST 4: Employee Role Login', 'yellow');
  await testMockLogin('employee');

  // Test 5: Custom User
  log('\n\n📋 TEST 5: Custom User Login', 'yellow');
  try {
    const response = await axios.post(
      `${GATEWAY_URL}/api/auth/mock-login`,
      {
        role: 'hr',
        email: 'test.hr@etelios.com',
        employeeId: 'TESTHR001',
        name: 'Test HR User'
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
        validateStatus: () => true
      }
    );

    if (response.status === 200 && response.data.success) {
      log('✅ Custom user login successful!', 'green');
      log(`User: ${response.data.data.user.name}`, 'blue');
      log(`Email: ${response.data.data.user.email}`, 'blue');
    } else {
      log('❌ Custom user login failed', 'red');
    }
  } catch (error) {
    log('❌ Custom user test error', 'red');
    console.log(error.message);
  }

  log('\n\n╔══════════════════════════════════════════════════════════╗', 'cyan');
  log('║                    TESTS COMPLETED                        ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════╝', 'cyan');
  log('\n');
}

// Run tests
runAllTests().catch(error => {
  log('\n❌ Test suite failed', 'red');
  console.error(error);
  process.exit(1);
});

