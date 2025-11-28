/**
 * Test Cosmos DB Connection for Auth and HR Services
 * This script tests if the services can connect to Cosmos DB
 */

const https = require('https');
const http = require('http');

const SERVICES = {
  auth: {
    name: 'Auth Service',
    url: 'https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net',
    healthEndpoint: '/health',
    loginEndpoint: '/api/auth/login'
  },
  hr: {
    name: 'HR Service',
    url: 'https://etelios-hr-service-backend-a4ayeqefdsbsc2g3.centralindia-01.azurewebsites.net',
    healthEndpoint: '/health',
    loginEndpoint: '/api/auth/mock-login'
  },
  gateway: {
    name: 'API Gateway',
    url: 'https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net',
    healthEndpoint: '/health',
    loginEndpoint: '/api/auth/login'
  }
};

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 10000,
      rejectUnauthorized: false // Allow self-signed certs
    };
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testHealth(service) {
  try {
    console.log(`\n🔍 Testing ${service.name} Health...`);
    const response = await makeRequest(`${service.url}${service.healthEndpoint}`, {
      timeout: 10000
    });
    
    if (response.status === 200) {
      console.log(`✅ ${service.name} is healthy (Status: ${response.status})`);
      return true;
    } else {
      console.log(`⚠️  ${service.name} returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${service.name} health check failed:`, error.message);
    return false;
  }
}

async function testLogin(service) {
  try {
    console.log(`\n🔍 Testing ${service.name} Login Endpoint...`);
    
    const loginData = {
      emailOrEmployeeId: 'test@example.com',
      password: 'test123'
    };
    
    const response = await makeRequest(`${service.url}${service.loginEndpoint}`, {
      method: 'POST',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      },
      body: loginData
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log(`✅ ${service.name} login endpoint is working`);
      return true;
    } else if (response.status === 400) {
      console.log(`⚠️  ${service.name} login endpoint responded with 400 (expected for invalid credentials)`);
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
      return true; // 400 is OK - means endpoint is working, just wrong credentials
    } else if (response.status === 503) {
      console.log(`❌ ${service.name} login endpoint returned 503 (Service Unavailable)`);
      console.log(`   This likely means database connection failed`);
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
      return false;
    } else if (response.status === 500) {
      console.log(`❌ ${service.name} login endpoint returned 500 (Internal Server Error)`);
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
      return false;
    } else {
      console.log(`⚠️  ${service.name} login endpoint returned status ${response.status}`);
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      console.log(`❌ ${service.name} login endpoint is not reachable:`, error.message);
    } else {
      console.log(`❌ ${service.name} login endpoint error:`, error.message);
    }
    return false;
  }
}

async function testGatewayLogin() {
  try {
    console.log(`\n🔍 Testing API Gateway Login Endpoint...`);
    
    const loginData = {
      emailOrEmployeeId: 'test@example.com',
      password: 'test123'
    };
    
    const response = await makeRequest(`${SERVICES.gateway.url}${SERVICES.gateway.loginEndpoint}`, {
      method: 'POST',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      },
      body: loginData
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 200) {
      console.log(`✅ API Gateway login endpoint is working`);
      return true;
    } else if (response.status === 400) {
      console.log(`⚠️  API Gateway login endpoint responded with 400 (expected for invalid credentials)`);
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
      return true; // 400 is OK - means endpoint is working, just wrong credentials
    } else if (response.status === 503) {
      console.log(`❌ API Gateway login endpoint returned 503 (Service Unavailable)`);
      console.log(`   This likely means auth service is not reachable or database connection failed`);
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
      return false;
    } else if (response.status === 500) {
      console.log(`❌ API Gateway login endpoint returned 500 (Internal Server Error)`);
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
      return false;
    } else {
      console.log(`⚠️  API Gateway login endpoint returned status ${response.status}`);
      console.log(`   Response:`, JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      console.log(`❌ API Gateway login endpoint is not reachable:`, error.message);
    } else {
      console.log(`❌ API Gateway login endpoint error:`, error.message);
    }
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Cosmos DB Connection Tests...\n');
  console.log('=' .repeat(60));
  
  const results = {
    authHealth: false,
    hrHealth: false,
    gatewayHealth: false,
    authLogin: false,
    hrLogin: false,
    gatewayLogin: false
  };
  
  // Test Health Endpoints
  results.authHealth = await testHealth(SERVICES.auth);
  results.hrHealth = await testHealth(SERVICES.hr);
  results.gatewayHealth = await testHealth(SERVICES.gateway);
  
  // Test Login Endpoints
  results.authLogin = await testLogin(SERVICES.auth);
  results.hrLogin = await testLogin(SERVICES.hr);
  results.gatewayLogin = await testGatewayLogin();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary:');
  console.log('='.repeat(60));
  console.log(`Auth Service Health:     ${results.authHealth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`HR Service Health:       ${results.hrHealth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`API Gateway Health:      ${results.gatewayHealth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Auth Service Login:      ${results.authLogin ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`HR Service Login:        ${results.hrLogin ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`API Gateway Login:       ${results.gatewayLogin ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(60));
  
  const allPassed = Object.values(results).every(r => r === true);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Cosmos DB connection is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
    console.log('\n💡 Troubleshooting Tips:');
    console.log('   1. Check Azure App Service logs for database connection errors');
    console.log('   2. Verify Key Vault secrets are correctly set');
    console.log('   3. Verify Managed Identity has access to Key Vault');
    console.log('   4. Check Cosmos DB firewall rules allow Azure App Services');
    console.log('   5. Verify SERVICE_NAME environment variable is set correctly');
  }
  
  return allPassed;
}

// Run tests
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

