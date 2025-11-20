/**
 * Simple Mock Login Test
 * Tests the mock login endpoint on live Azure service
 */

const https = require('https');

const AUTH_URL = 'https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net';

function testMockLogin(role = 'hr') {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ role });
    
    const options = {
      hostname: 'etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net',
      port: 443,
      path: '/api/auth/mock-login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      },
      rejectUnauthorized: false,
      timeout: 30000
    };

    console.log(`\n🔍 Testing Mock Login...`);
    console.log(`URL: ${AUTH_URL}/api/auth/mock-login`);
    console.log(`Role: ${role}\n`);

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        console.log(`Status: ${res.statusCode}\n`);
        
        try {
          const json = JSON.parse(responseData);
          
          if (res.statusCode === 200 && json.success) {
            console.log('✅ MOCK LOGIN SUCCESSFUL!\n');
            console.log('User Data:');
            console.log(`  Name: ${json.data.user.name}`);
            console.log(`  Email: ${json.data.user.email}`);
            console.log(`  Role: ${json.data.user.role}`);
            console.log(`  Employee ID: ${json.data.user.employee_id}`);
            console.log(`\nAccess Token: ${json.data.accessToken.substring(0, 50)}...`);
            console.log(`Token Length: ${json.data.accessToken.length} characters\n`);
            
            // Test profile endpoint
            testProfileEndpoint(json.data.accessToken);
            
            resolve(json);
          } else {
            console.log('❌ Mock Login Failed\n');
            console.log('Response:', JSON.stringify(json, null, 2));
            reject(new Error(json.message || 'Login failed'));
          }
        } catch (e) {
          console.log('❌ Invalid JSON response\n');
          console.log('Raw response:', responseData);
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Request Error:', error.message);
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      console.log('❌ Request Timeout (30s)');
      console.log('⚠️  This might be due to:');
      console.log('   1. Database connection is slow');
      console.log('   2. Service is still deploying');
      console.log('   3. Database operations taking too long');
      reject(new Error('Request timeout'));
    });

    req.write(data);
    req.end();
  });
}

function testProfileEndpoint(token) {
  const options = {
    hostname: 'etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net',
    port: 443,
    path: '/api/auth/profile',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    rejectUnauthorized: false,
    timeout: 15000
  };

  console.log('🔍 Testing Profile Endpoint with Token...\n');

  const req = https.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ Profile endpoint works with token!\n');
        try {
          const json = JSON.parse(responseData);
          console.log('Profile:', JSON.stringify(json, null, 2));
        } catch (e) {
          console.log('Response:', responseData);
        }
      } else {
        console.log(`⚠️  Profile returned: ${res.statusCode}\n`);
      }
    });
  });

  req.on('error', (error) => {
    console.log('⚠️  Profile test error:', error.message);
  });

  req.on('timeout', () => {
    req.destroy();
    console.log('⚠️  Profile test timeout');
  });

  req.end();
}

// Run test
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║         MOCK LOGIN ENDPOINT TEST                        ║');
console.log('╚══════════════════════════════════════════════════════════╝');

testMockLogin('hr')
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    console.log('\n📝 Frontend can now use this endpoint:');
    console.log(`   POST ${AUTH_URL}/api/auth/mock-login`);
    console.log('   Body: {"role": "hr"}');
  })
  .catch((error) => {
    console.log('\n❌ Test failed:', error.message);
    process.exit(1);
  });

