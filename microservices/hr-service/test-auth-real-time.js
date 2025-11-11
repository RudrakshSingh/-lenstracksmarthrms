/**
 * Test Auth APIs with Real-Time Data
 * Tests login, refresh, me, and logout endpoints according to frontend spec
 */

require('dotenv').config();
const http = require('http');
const https = require('https');
const mongoose = require('mongoose');

const BASE_URL = process.env.BASE_URL || process.env.AZURE_BACKEND_URL || 'http://localhost:3002';
const User = require('./src/models/User.model');
const Role = require('./src/models/Role.model');
const Store = require('./src/models/Store.model');

// Test credentials (will be created if they don't exist)
const TEST_EMAIL = 'test.auth@example.com';
const TEST_PASSWORD = 'Test123456';
const TEST_ROLE = 'hr';

let accessToken = null;
let refreshToken = null;
let testUserId = null;

// Colors for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

// Helper to make HTTP requests
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      timeout: 30000
    };

    if (accessToken && !path.includes('/login') && !path.includes('/refresh')) {
      options.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Setup test user
async function setupTestUser() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/etelios_hr_service';
    await mongoose.connect(mongoUri);
    console.log(`${colors.cyan}✓ Connected to database${colors.reset}\n`);

    // Get or create role
    let role = await Role.findOne({ name: TEST_ROLE.toLowerCase() });
    if (!role) {
      const { seedRoles } = require('./src/utils/seedRoles');
      await seedRoles();
      role = await Role.findOne({ name: TEST_ROLE.toLowerCase() });
    }

    // Check if user exists
    let user = await User.findOne({ email: TEST_EMAIL.toLowerCase() });
    if (!user) {
      user = new User({
        employeeId: 'AUTH' + Date.now(),
        firstName: 'Test',
        lastName: 'User',
        email: TEST_EMAIL.toLowerCase(),
        password: TEST_PASSWORD,
        phone: '9876543210',
        role: role._id,
        status: 'active',
        is_active: true
      });
      await user.save();
      console.log(`${colors.green}✓ Created test user: ${TEST_EMAIL}${colors.reset}`);
    } else {
      // Update password and role if needed
      user.password = TEST_PASSWORD;
      user.role = role._id;
      user.status = 'active';
      user.is_active = true;
      await user.save();
      console.log(`${colors.green}✓ Test user exists: ${TEST_EMAIL}${colors.reset}`);
    }

    testUserId = user._id.toString();
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Setup failed:${colors.reset}`, error.message);
    return false;
  }
}

// Test functions
async function testLogin() {
  console.log(`${colors.cyan}[TEST] Login${colors.reset}`);
  try {
    const response = await makeRequest('POST', '/api/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      rememberMe: false
    });

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
    }

    // Validate response format according to spec
    if (!response.data.user) {
      throw new Error('Response missing user object');
    }
    if (!response.data.user.id) {
      throw new Error('Response missing user.id');
    }
    if (!response.data.user.email) {
      throw new Error('Response missing user.email');
    }
    if (!response.data.user.name) {
      throw new Error('Response missing user.name');
    }
    if (!response.data.user.role) {
      throw new Error('Response missing user.role');
    }
    if (!Array.isArray(response.data.user.permissions)) {
      throw new Error('Response missing user.permissions array');
    }
    if (response.data.user.tenantId === undefined) {
      throw new Error('Response missing user.tenantId (can be null)');
    }
    if (!response.data.accessToken) {
      throw new Error('Response missing accessToken');
    }
    if (!response.data.refreshToken) {
      throw new Error('Response missing refreshToken');
    }
    if (response.data.expiresIn !== 3600) {
      throw new Error(`Expected expiresIn to be 3600, got ${response.data.expiresIn}`);
    }

    accessToken = response.data.accessToken;
    refreshToken = response.data.refreshToken;

    console.log(`${colors.green}✓ Login successful${colors.reset}`);
    console.log(`  User ID: ${response.data.user.id}`);
    console.log(`  Email: ${response.data.user.email}`);
    console.log(`  Name: ${response.data.user.name}`);
    console.log(`  Role: ${response.data.user.role}`);
    console.log(`  Permissions: ${response.data.user.permissions.length} permissions`);
    console.log(`  Tenant ID: ${response.data.user.tenantId || 'null'}`);
    console.log(`  Access Token: ${accessToken.substring(0, 20)}...`);
    console.log(`  Expires In: ${response.data.expiresIn} seconds\n`);

    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Login failed:${colors.reset} ${error.message}\n`);
    return false;
  }
}

async function testGetCurrentUser() {
  console.log(`${colors.cyan}[TEST] Get Current User${colors.reset}`);
  try {
    const response = await makeRequest('GET', '/api/auth/me');

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
    }

    // Validate response format
    if (!response.data.user) {
      throw new Error('Response missing user object');
    }
    if (!response.data.user.id) {
      throw new Error('Response missing user.id');
    }

    console.log(`${colors.green}✓ Get current user successful${colors.reset}`);
    console.log(`  User: ${response.data.user.name} (${response.data.user.email})`);
    console.log(`  Role: ${response.data.user.role}\n`);

    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Get current user failed:${colors.reset} ${error.message}\n`);
    return false;
  }
}

async function testRefreshToken() {
  console.log(`${colors.cyan}[TEST] Refresh Token${colors.reset}`);
  try {
    if (!refreshToken) {
      throw new Error('Refresh token not available');
    }

    const response = await makeRequest('POST', '/api/auth/refresh', {
      refreshToken: refreshToken
    });

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
    }

    // Validate response format
    if (!response.data.accessToken) {
      throw new Error('Response missing accessToken');
    }
    if (response.data.expiresIn !== 3600) {
      throw new Error(`Expected expiresIn to be 3600, got ${response.data.expiresIn}`);
    }

    accessToken = response.data.accessToken;

    console.log(`${colors.green}✓ Refresh token successful${colors.reset}`);
    console.log(`  New Access Token: ${accessToken.substring(0, 20)}...`);
    console.log(`  Expires In: ${response.data.expiresIn} seconds\n`);

    return true;
  } catch (error) {
    console.log(`${colors.yellow}⚠ Refresh token failed:${colors.reset} ${error.message}\n`);
    return false;
  }
}

async function testLogout() {
  console.log(`${colors.cyan}[TEST] Logout${colors.reset}`);
  try {
    const response = await makeRequest('POST', '/api/auth/logout', {
      refreshToken: refreshToken
    });

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}: ${JSON.stringify(response.data)}`);
    }

    console.log(`${colors.green}✓ Logout successful${colors.reset}\n`);

    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Logout failed:${colors.reset} ${error.message}\n`);
    return false;
  }
}

async function testErrorCodes() {
  console.log(`${colors.cyan}[TEST] Error Codes${colors.reset}`);
  
  // Test invalid credentials
  try {
    const response = await makeRequest('POST', '/api/auth/login', {
      email: TEST_EMAIL,
      password: 'wrongpassword'
    });

    if (response.status === 401 && response.data.error === 'INVALID_CREDENTIALS') {
      console.log(`${colors.green}✓ Invalid credentials returns correct error code${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠ Invalid credentials test: status=${response.status}, error=${response.data.error}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.yellow}⚠ Error code test failed:${colors.reset} ${error.message}`);
  }

  // Test missing fields
  try {
    const response = await makeRequest('POST', '/api/auth/login', {
      email: TEST_EMAIL
      // password missing
    });

    if (response.status === 400 && response.data.error === 'VALIDATION_ERROR') {
      console.log(`${colors.green}✓ Missing fields returns correct error code${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠ Missing fields test: status=${response.status}, error=${response.data.error}${colors.reset}`);
    }
  } catch (error) {
    console.log(`${colors.yellow}⚠ Error code test failed:${colors.reset} ${error.message}`);
  }

  console.log('');
}

// Run all tests
async function runTests() {
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}  AUTH API TESTING - REAL-TIME DATA${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
  console.log(`Base URL: ${BASE_URL}\n`);

  // Setup
  const setupSuccess = await setupTestUser();
  if (!setupSuccess) {
    console.log(`${colors.red}Setup failed. Exiting.${colors.reset}`);
    process.exit(1);
  }

  // Run tests
  const results = {
    passed: 0,
    failed: 0
  };

  if (await testLogin()) results.passed++; else results.failed++;
  if (await testGetCurrentUser()) results.passed++; else results.failed++;
  if (await testRefreshToken()) results.passed++; else results.failed++;
  await testErrorCodes();
  if (await testLogout()) results.passed++; else results.failed++;

  // Summary
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}  TEST SUMMARY${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.green}Passed:${colors.reset} ${results.passed}`);
  console.log(`${colors.red}Failed:${colors.reset} ${results.failed}`);
  console.log(`Total: ${results.passed + results.failed}\n`);

  if (results.failed === 0) {
    console.log(`${colors.green}✓ All auth tests passed!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}✗ Some tests failed${colors.reset}`);
    process.exit(1);
  }
}

// Start testing
runTests().catch((error) => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});

