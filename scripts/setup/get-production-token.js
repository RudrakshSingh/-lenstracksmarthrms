/**
 * Get Production Bearer Token
 * This script logs in via API to get a real production token
 */

const https = require('https');
const http = require('http');

// Disable SSL certificate validation for self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BASE_URL = 'https://98.70.245.87';
const ADMIN_EMAIL = 'admin@etelios.com';
const ADMIN_PASSWORD = 'Admin@123456';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Host': 'api.etelios.com',
        'Content-Type': 'application/json',
        ...options.headers
      },
      rejectUnauthorized: false
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function getMockToken() {
  try {
    console.log('🔐 Step 1: Getting mock admin token...');
    const response = await makeRequest(`${BASE_URL}/api/auth/mock-login-fast`, {
      method: 'POST',
      body: { role: 'admin' }
    });

    if (response.status === 200 && response.data.data && response.data.data.accessToken) {
      return response.data.data.accessToken;
    } else if (response.status === 200 && response.data.accessToken) {
      return response.data.accessToken;
    }
    throw new Error(`Mock login failed: ${response.status} - ${JSON.stringify(response.data)}`);
  } catch (error) {
    console.error('❌ Mock login error:', error.message);
    throw error;
  }
}

async function login() {
  try {
    console.log('🔐 Step 2: Logging in with real credentials...');
    const response = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      body: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      }
    });

    if (response.status === 200 && response.data.data && response.data.data.accessToken) {
      return response.data.data.accessToken;
    } else if (response.status === 200 && response.data.accessToken) {
      return response.data.accessToken;
    }
    throw new Error(`Login failed: ${response.status} - ${JSON.stringify(response.data)}`);
  } catch (error) {
    console.error('❌ Login error:', error.message);
    throw error;
  }
}

async function testToken(token, testName) {
  try {
    const response = await makeRequest(`${BASE_URL}/api/hr/employees?page=1&limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 200) {
      console.log(`   ✅ ${testName}: Working!`);
      return true;
    } else {
      console.log(`   ❌ ${testName}: Failed (${response.status})`);
      console.log(`   Response: ${JSON.stringify(response.data).substring(0, 100)}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ${testName}: Error - ${error.message}`);
    return false;
  }
}

async function main() {
  try {
    console.log('🚀 Getting Production Bearer Token\n');
    console.log('='.repeat(80));

    // Try mock login first
    let token = null;
    try {
      token = await getMockToken();
      console.log('✅ Mock token obtained');
      console.log(`Token: ${token.substring(0, 60)}...\n`);
    } catch (error) {
      console.log('⚠️  Mock login failed, trying real login...\n');
    }

    // Try real login
    if (!token) {
      try {
        token = await login();
        console.log('✅ Real login successful');
        console.log(`Token: ${token.substring(0, 60)}...\n`);
      } catch (error) {
        console.error('❌ Both mock and real login failed');
        process.exit(1);
      }
    }

    // Test the token
    console.log('🧪 Testing token with HR APIs...\n');
    await testToken(token, 'GET /api/hr/employees');

    // Save token
    const fs = require('fs');
    const tokenData = {
      accessToken: token,
      user: {
        email: ADMIN_EMAIL,
        role: 'admin'
      },
      createdAt: new Date().toISOString(),
      source: 'production-api'
    };

    const tokenFilePath = require('path').join(__dirname, 'production-admin-token.json');
    fs.writeFileSync(tokenFilePath, JSON.stringify(tokenData, null, 2));
    console.log(`\n💾 Token saved to: ${tokenFilePath}`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ SUCCESS: Production token obtained!');
    console.log('='.repeat(80));
    console.log('\n🔑 Bearer Token:');
    console.log(`   ${token}`);
    console.log('\n💡 Use this token in API requests:');
    console.log(`   Authorization: Bearer ${token}`);
    console.log('\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { getMockToken, login };

