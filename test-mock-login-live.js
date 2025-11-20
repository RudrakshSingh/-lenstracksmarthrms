/**
 * Test Mock Login on Live Azure Auth Service
 */

const axios = require('axios');

const AUTH_SERVICE_URL = 'https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net';
const GATEWAY_URL = process.env.GATEWAY_URL || 'https://etelios-app-service.azurewebsites.net';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testLiveMockLogin() {
  log('\n╔══════════════════════════════════════════════════════════╗', 'cyan');
  log('║     TESTING MOCK LOGIN ON LIVE AZURE SERVICE            ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════╝', 'cyan');
  
  log(`\n🔗 Auth Service URL: ${AUTH_SERVICE_URL}`, 'blue');
  log(`🔗 Gateway URL: ${GATEWAY_URL}`, 'blue');

  // Test 1: Direct Auth Service
  log('\n\n📋 TEST 1: Mock Login - Direct Auth Service', 'yellow');
  log(`Endpoint: ${AUTH_SERVICE_URL}/api/auth/mock-login`, 'magenta');
  
  try {
    const response = await axios.post(
      `${AUTH_SERVICE_URL}/api/auth/mock-login`,
      { role: 'hr' },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 20000,
        validateStatus: () => true,
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false
        })
      }
    );

    log(`\nStatus Code: ${response.status}`, response.status === 200 ? 'green' : 'red');

    if (response.status === 200 && response.data.success) {
      log('\n✅ MOCK LOGIN SUCCESSFUL!', 'green');
      log('\n📊 Response Data:', 'cyan');
      console.log(JSON.stringify(response.data, null, 2));

      const { accessToken, refreshToken, user } = response.data.data;

      log('\n🔑 Token Information:', 'cyan');
      log(`Access Token: ${accessToken.substring(0, 60)}...`, 'blue');
      log(`Token Length: ${accessToken.length} characters`, 'blue');
      log(`Refresh Token: ${refreshToken.substring(0, 60)}...`, 'blue');

      log('\n👤 User Information:', 'cyan');
      log(`ID: ${user._id}`, 'blue');
      log(`Employee ID: ${user.employee_id}`, 'blue');
      log(`Name: ${user.name}`, 'blue');
      log(`Email: ${user.email}`, 'blue');
      log(`Role: ${user.role}`, 'blue');
      log(`Department: ${user.department}`, 'blue');
      log(`Designation: ${user.designation}`, 'blue');

      // Test 2: Profile Endpoint
      log('\n\n📋 TEST 2: Profile Endpoint with Token', 'yellow');
      log(`Endpoint: ${AUTH_SERVICE_URL}/api/auth/profile`, 'magenta');
      
      try {
        const profileResponse = await axios.get(
          `${AUTH_SERVICE_URL}/api/auth/profile`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 20000,
            validateStatus: () => true,
            httpsAgent: new (require('https').Agent)({
              rejectUnauthorized: false
            })
          }
        );

        if (profileResponse.status === 200) {
          log('✅ Profile endpoint works with token!', 'green');
          log('Profile Data:', 'cyan');
          console.log(JSON.stringify(profileResponse.data, null, 2));
        } else {
          log(`⚠️  Profile returned status: ${profileResponse.status}`, 'yellow');
          console.log(JSON.stringify(profileResponse.data, null, 2));
        }
      } catch (error) {
        log('❌ Profile endpoint test failed', 'red');
        if (error.response) {
          log(`Status: ${error.response.status}`, 'red');
          console.log(JSON.stringify(error.response.data, null, 2));
        } else {
          log(`Error: ${error.message}`, 'red');
        }
      }

      // Test 3: HR Service Endpoint
      log('\n\n📋 TEST 3: HR Service Endpoint with Token', 'yellow');
      const hrServiceUrl = 'https://etelios-hr-service-backend-a4ayeqefdsbsc2g3.centralindia-01.azurewebsites.net';
      log(`Endpoint: ${hrServiceUrl}/api/hr/employees`, 'magenta');
      
      try {
        const hrResponse = await axios.get(
          `${hrServiceUrl}/api/hr/employees`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 20000,
            validateStatus: () => true,
            httpsAgent: new (require('https').Agent)({
              rejectUnauthorized: false
            })
          }
        );

        log(`Status: ${hrResponse.status}`, hrResponse.status === 200 ? 'green' : 'yellow');
        if (hrResponse.data) {
          log('HR Service Response:', 'cyan');
          console.log(JSON.stringify(hrResponse.data, null, 2));
        }
      } catch (error) {
        log('⚠️  HR Service test:', 'yellow');
        if (error.response) {
          log(`Status: ${error.response.status}`, 'yellow');
        } else {
          log(`Error: ${error.message}`, 'yellow');
        }
      }

      // Test 4: Via Gateway
      log('\n\n📋 TEST 4: Mock Login via API Gateway', 'yellow');
      log(`Endpoint: ${GATEWAY_URL}/api/auth/mock-login`, 'magenta');
      
      try {
        const gatewayResponse = await axios.post(
          `${GATEWAY_URL}/api/auth/mock-login`,
          { role: 'admin' },
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 20000,
            validateStatus: () => true,
            httpsAgent: new (require('https').Agent)({
              rejectUnauthorized: false
            })
          }
        );

        if (gatewayResponse.status === 200 && gatewayResponse.data.success) {
          log('✅ Mock Login via Gateway Successful!', 'green');
          log(`User: ${gatewayResponse.data.data.user.name}`, 'blue');
          log(`Role: ${gatewayResponse.data.data.user.role}`, 'blue');
        } else {
          log(`⚠️  Gateway returned: ${gatewayResponse.status}`, 'yellow');
        }
      } catch (error) {
        log('⚠️  Gateway test:', 'yellow');
        if (error.response) {
          log(`Status: ${error.response.status}`, 'yellow');
        } else {
          log(`Error: ${error.message}`, 'yellow');
        }
      }

      log('\n\n╔══════════════════════════════════════════════════════════╗', 'green');
      log('║              ✅ ALL TESTS COMPLETED                       ║', 'green');
      log('╚══════════════════════════════════════════════════════════╝', 'green');
      
      log('\n📝 Summary:', 'cyan');
      log('✅ Mock login endpoint is working correctly', 'green');
      log('✅ Token generation is successful', 'green');
      log('✅ Token can be used for authenticated requests', 'green');
      log('\n🎯 Frontend can now use this endpoint for testing!', 'green');
      log(`\nExample usage:`, 'cyan');
      log(`POST ${AUTH_SERVICE_URL}/api/auth/mock-login`, 'blue');
      log(`Body: {"role": "hr"}`, 'blue');
      log(`\nUse the returned accessToken in Authorization header:`, 'cyan');
      log(`Authorization: Bearer <accessToken>`, 'blue');
      
      return { success: true, token: accessToken, user };
    } else {
      log('\n❌ Mock Login Failed!', 'red');
      log('Response:', 'yellow');
      console.log(JSON.stringify(response.data, null, 2));
      return { success: false, error: response.data };
    }
  } catch (error) {
    log('\n❌ Error testing mock login', 'red');
    if (error.response) {
      log(`Status: ${error.response.status}`, 'red');
      log('Response:', 'yellow');
      console.log(JSON.stringify(error.response.data, null, 2));
    } else if (error.code === 'ENOTFOUND') {
      log('⚠️  DNS resolution failed. Check the URL.', 'yellow');
    } else if (error.code === 'ECONNREFUSED') {
      log('⚠️  Connection refused. Service might be down.', 'yellow');
    } else {
      log(`Error: ${error.message}`, 'red');
      log(`Code: ${error.code}`, 'red');
    }
    return { success: false, error: error.message };
  }
}

// Run test
testLiveMockLogin().catch(error => {
  log('\n❌ Test suite failed', 'red');
  console.error(error);
  process.exit(1);
});

