/**
 * Test Mock Login against Azure deployed services
 * This tests the actual production/staging endpoints
 */

const axios = require('axios');

// Azure URLs
const GATEWAY_URL = process.env.GATEWAY_URL || 'https://etelios-app-service.azurewebsites.net';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net';

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

async function testAzureMockLogin() {
  log('\n╔══════════════════════════════════════════════════════════╗', 'cyan');
  log('║     TESTING MOCK LOGIN ON AZURE SERVICES                ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════╝', 'cyan');

  // Test 1: Direct Auth Service
  log('\n\n📋 TEST 1: Direct Auth Service Mock Login', 'yellow');
  log(`URL: ${AUTH_SERVICE_URL}/api/auth/mock-login`, 'blue');
  
  try {
    const response = await axios.post(
      `${AUTH_SERVICE_URL}/api/auth/mock-login`,
      { role: 'hr' },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
        validateStatus: () => true,
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false
        })
      }
    );

    if (response.status === 200 && response.data.success) {
      log('✅ Mock Login Successful!', 'green');
      log(`User: ${response.data.data.user.name}`, 'blue');
      log(`Role: ${response.data.data.user.role}`, 'blue');
      log(`Email: ${response.data.data.user.email}`, 'blue');
      log(`Token: ${response.data.data.accessToken.substring(0, 50)}...`, 'blue');
      
      // Test profile with token
      log('\n📋 Testing Profile Endpoint...', 'yellow');
      const profileRes = await axios.get(
        `${AUTH_SERVICE_URL}/api/auth/profile`,
        {
          headers: {
            'Authorization': `Bearer ${response.data.data.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000,
          validateStatus: () => true,
          httpsAgent: new (require('https').Agent)({
            rejectUnauthorized: false
          })
        }
      );

      if (profileRes.status === 200) {
        log('✅ Profile endpoint works!', 'green');
      } else {
        log(`⚠️  Profile returned: ${profileRes.status}`, 'yellow');
      }

      return response.data.data.accessToken;
    } else {
      log(`❌ Failed: Status ${response.status}`, 'red');
      console.log(JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    log('❌ Error:', 'red');
    if (error.response) {
      log(`Status: ${error.response.status}`, 'red');
      console.log(JSON.stringify(error.response.data, null, 2));
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      log('⚠️  Cannot connect to Azure service', 'yellow');
      log('   This might be because:', 'yellow');
      log('   1. Service is not deployed yet', 'yellow');
      log('   2. Service URL is incorrect', 'yellow');
      log('   3. Network/firewall issue', 'yellow');
    } else {
      log(`Error: ${error.message}`, 'red');
    }
  }

  // Test 2: Via API Gateway
  log('\n\n📋 TEST 2: Mock Login via API Gateway', 'yellow');
  log(`URL: ${GATEWAY_URL}/api/auth/mock-login`, 'blue');
  
  try {
    const response = await axios.post(
      `${GATEWAY_URL}/api/auth/mock-login`,
      { role: 'hr' },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
        validateStatus: () => true,
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false
        })
      }
    );

    if (response.status === 200 && response.data.success) {
      log('✅ Mock Login via Gateway Successful!', 'green');
      log(`User: ${response.data.data.user.name}`, 'blue');
      log(`Role: ${response.data.data.user.role}`, 'blue');
    } else {
      log(`❌ Failed: Status ${response.status}`, 'red');
      console.log(JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    log('❌ Error:', 'red');
    if (error.response) {
      log(`Status: ${error.response.status}`, 'red');
      console.log(JSON.stringify(error.response.data, null, 2));
    } else {
      log(`Error: ${error.message}`, 'red');
    }
  }

  log('\n\n╔══════════════════════════════════════════════════════════╗', 'cyan');
  log('║                    TEST COMPLETED                        ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════╝', 'cyan');
  log('\n');
}

// Run test
testAzureMockLogin().catch(error => {
  log('\n❌ Test failed', 'red');
  console.error(error);
  process.exit(1);
});

