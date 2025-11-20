/**
 * Test Mock Login directly against Auth Service
 * This bypasses the API Gateway
 */

const axios = require('axios');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

async function testDirectAuthService() {
  console.log('\n=== Testing Mock Login Directly on Auth Service ===\n');
  console.log(`Auth Service URL: ${AUTH_SERVICE_URL}`);
  console.log(`Endpoint: ${AUTH_SERVICE_URL}/api/auth/mock-login\n`);

  try {
    // First check if service is running
    console.log('1. Checking auth service health...');
    const healthCheck = await axios.get(`${AUTH_SERVICE_URL}/health`, {
      timeout: 5000,
      validateStatus: () => true
    });
    
    if (healthCheck.status === 200) {
      console.log('✅ Auth service is running\n');
    } else {
      console.log(`⚠️  Auth service returned status: ${healthCheck.status}\n`);
    }

    // Test mock login
    console.log('2. Testing mock login...');
    const response = await axios.post(
      `${AUTH_SERVICE_URL}/api/auth/mock-login`,
      { role: 'hr' },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000,
        validateStatus: () => true
      }
    );

    console.log(`Status: ${response.status}\n`);

    if (response.status === 200 && response.data.success) {
      console.log('✅ Mock Login Successful!\n');
      console.log('User Data:');
      console.log(JSON.stringify(response.data.data.user, null, 2));
      console.log('\nToken Info:');
      console.log(`Access Token: ${response.data.data.accessToken.substring(0, 50)}...`);
      console.log(`Refresh Token: ${response.data.data.refreshToken.substring(0, 50)}...\n`);

      // Test profile endpoint with token
      console.log('3. Testing profile endpoint with token...');
      const profileResponse = await axios.get(
        `${AUTH_SERVICE_URL}/api/auth/profile`,
        {
          headers: {
            'Authorization': `Bearer ${response.data.data.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000,
          validateStatus: () => true
        }
      );

      if (profileResponse.status === 200) {
        console.log('✅ Profile endpoint works with token!\n');
      } else {
        console.log(`⚠️  Profile endpoint returned: ${profileResponse.status}\n`);
      }

      return { success: true, data: response.data };
    } else {
      console.log('❌ Mock Login Failed\n');
      console.log('Response:', JSON.stringify(response.data, null, 2));
      return { success: false, error: response.data };
    }
  } catch (error) {
    console.log('❌ Error testing auth service\n');
    if (error.code === 'ECONNREFUSED') {
      console.log('⚠️  Cannot connect to auth service. Is it running?');
      console.log(`   Expected URL: ${AUTH_SERVICE_URL}\n`);
      console.log('To start the auth service:');
      console.log('   cd microservices/auth-service');
      console.log('   npm start\n');
    } else if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
    return { success: false, error: error.message };
  }
}

testDirectAuthService();

