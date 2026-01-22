#!/usr/bin/env node

/**
 * Test Script: Multi-Tenant Implementation
 * 
 * Tests:
 * 1. JWT token contains tenantId after login
 * 2. Tenant validation middleware (missing header)
 * 3. Tenant validation middleware (mismatched tenant)
 * 4. Valid request with correct tenant
 * 5. Refresh token contains tenantId
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
const https = require('https');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3002'; // HR Service
const AUTH_URL = process.env.AUTH_URL || 'http://localhost:3001'; // Auth Service

// Test credentials (update these for your local setup)
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@lenstrack.etelios.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Lenstrack@Admin123';
const TEST_TENANT = process.env.TEST_TENANT || 'lenstrack';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.blue}━━━ ${msg} ━━━${colors.reset}\n`)
};

// Create axios instance with SSL verification disabled for local/production testing
const api = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  timeout: 30000, // Increased timeout to 30 seconds for production
  validateStatus: function (status) {
    return status < 500; // Don't throw on 4xx errors, we want to test them
  }
});

let passedTests = 0;
let failedTests = 0;

// Test 1: JWT Token Contains TenantId After Login
async function testJWTContainsTenantId() {
  log.section('Test 1: JWT Token Contains TenantId After Login');
  
  try {
    log.info(`Logging in as: ${TEST_EMAIL}`);
    log.info(`Tenant: ${TEST_TENANT}`);
    log.info(`Connecting to: ${AUTH_URL}/api/auth/login`);
    
    // First, try a simple health check
    try {
      const healthCheck = await axios.get(`${AUTH_URL}/health`, {
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        timeout: 5000
      });
      log.info(`Health check passed: ${healthCheck.status}`);
    } catch (healthError) {
      log.warn(`Health check failed (continuing anyway): ${healthError.message}`);
    }
    
    const loginRes = await api.post(`${AUTH_URL}/api/auth/login`, {
      emailOrEmployeeId: TEST_EMAIL,
      password: TEST_PASSWORD
    }, {
      headers: { 
        'X-Tenant-Id': TEST_TENANT,
        'Content-Type': 'application/json',
        'Host': 'api.etelios.com' // Important for ingress routing in production
      }
    });
    
    if (!loginRes.data.success && !loginRes.data.data) {
      throw new Error('Login failed - unexpected response format');
    }
    
    const token = loginRes.data.data?.accessToken || loginRes.data.accessToken;
    if (!token) {
      throw new Error('No access token in response');
    }
    
    log.info('Token received, decoding...');
    const decoded = jwt.decode(token);
    
    log.info('Token payload:', JSON.stringify(decoded, null, 2));
    
    if (!decoded.tenantId) {
      log.error('Token missing tenantId claim');
      throw new Error('FAILED: Token missing tenantId');
    }
    
    if (decoded.tenantId !== TEST_TENANT) {
      log.error(`Token has wrong tenantId: ${decoded.tenantId}, expected: ${TEST_TENANT}`);
      throw new Error(`FAILED: Token has wrong tenantId: ${decoded.tenantId}`);
    }
    
    log.success(`Token contains correct tenantId: ${decoded.tenantId}`);
    passedTests++;
    
    return { token, refreshToken: loginRes.data.data?.refreshToken || loginRes.data.refreshToken };
  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      log.error(`Connection issue: ${error.code || 'timeout'}`);
      log.warn('⚠️  Production server may not be accessible from your network');
      log.warn('💡 Suggestion: Test locally or wait for deployment');
      log.warn('   Local testing: Start services and use http://localhost:3001 and http://localhost:3002');
    }
    if (error.response) {
      log.error(`Response status: ${error.response.status}`);
      log.error(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      log.error('No response received - server may be unreachable');
    }
    failedTests++;
    return null;
  }
}

// Test 2: Missing X-Tenant-Id Header (Should Fail with 400)
async function testMissingHeader(token) {
  log.section('Test 2: Missing X-Tenant-Id Header (Should Fail with 400)');
  
  try {
    log.info('Making request without X-Tenant-Id header...');
    
    await api.get(`${BASE_URL}/api/hr/employees`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Host': 'api.etelios.com' // Important for ingress routing in production
        // Missing X-Tenant-Id header
      }
    });
    
    log.error('Request should have been rejected but was accepted');
    failedTests++;
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.error === 'TENANT_REQUIRED') {
      log.success('Correctly rejected request with missing header (400 TENANT_REQUIRED)');
      passedTests++;
    } else if (error.response?.status === 400) {
      log.warn(`Got 400 but wrong error code: ${error.response?.data?.error}`);
      log.info('This might be expected if validation middleware is not yet deployed');
      failedTests++;
    } else {
      log.warn(`Got ${error.response?.status} instead of 400`);
      log.info('This might be expected if validation middleware is not yet deployed');
      failedTests++;
    }
  }
}

// Test 3: Mismatched Tenant (Should Fail with 403)
async function testMismatchedTenant(token) {
  log.section('Test 3: Mismatched Tenant (Should Fail with 403)');
  
  try {
    log.info('Making request with wrong tenant in header...');
    
    await api.get(`${BASE_URL}/api/hr/employees`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': 'different-tenant', // Wrong tenant
        'Host': 'api.etelios.com' // Important for ingress routing in production
      }
    });
    
    log.error('Request should have been rejected but was accepted');
    failedTests++;
  } catch (error) {
    if (error.response?.status === 403 && error.response?.data?.error === 'TENANT_MISMATCH') {
      log.success('Correctly rejected request with mismatched tenant (403 TENANT_MISMATCH)');
      passedTests++;
    } else if (error.response?.status === 403) {
      log.warn(`Got 403 but wrong error code: ${error.response?.data?.error}`);
      log.info('This might be expected if validation middleware is not yet deployed');
      failedTests++;
    } else {
      log.warn(`Got ${error.response?.status} instead of 403`);
      log.info('This might be expected if validation middleware is not yet deployed');
      failedTests++;
    }
  }
}

// Test 4: Valid Request with Correct Tenant (Should Succeed)
async function testValidRequest(token) {
  log.section('Test 4: Valid Request with Correct Tenant (Should Succeed)');
  
  try {
    log.info('Making request with correct tenant...');
    
    const res = await api.get(`${BASE_URL}/api/hr/employees`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': TEST_TENANT,
        'Host': 'api.etelios.com' // Important for ingress routing in production
      }
    });
    
    if (res.status === 200) {
      log.success('Request accepted with correct tenant (200 OK)');
      log.info(`Response contains ${res.data.data?.length || res.data.length || 0} employees`);
      passedTests++;
    } else {
      log.error(`Unexpected status: ${res.status}`);
      failedTests++;
    }
  } catch (error) {
    log.error(`Request failed: ${error.message}`);
    if (error.response) {
      log.error(`Status: ${error.response.status}`);
      log.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    failedTests++;
  }
}

// Test 5: Refresh Token Contains TenantId
async function testRefreshToken(refreshToken) {
  log.section('Test 5: Refresh Token Contains TenantId');
  
  try {
    log.info('Refreshing access token...');
    
    const refreshRes = await api.post(`${AUTH_URL}/api/auth/refresh`, {
      refreshToken: refreshToken
    }, {
      headers: { 
        'X-Tenant-Id': TEST_TENANT,
        'Content-Type': 'application/json',
        'Host': 'api.etelios.com' // Important for ingress routing in production
      }
    });
    
    if (!refreshRes.data.success && !refreshRes.data.data) {
      throw new Error('Token refresh failed - unexpected response format');
    }
    
    const newToken = refreshRes.data.data?.accessToken || refreshRes.data.accessToken;
    if (!newToken) {
      throw new Error('No access token in refresh response');
    }
    
    log.info('New token received, decoding...');
    const decoded = jwt.decode(newToken);
    
    log.info('Refreshed token payload:', JSON.stringify(decoded, null, 2));
    
    if (!decoded.tenantId) {
      log.error('Refreshed token missing tenantId claim');
      throw new Error('FAILED: Refreshed token missing tenantId');
    }
    
    if (decoded.tenantId !== TEST_TENANT) {
      log.error(`Refreshed token has wrong tenantId: ${decoded.tenantId}, expected: ${TEST_TENANT}`);
      throw new Error(`FAILED: Refreshed token has wrong tenantId: ${decoded.tenantId}`);
    }
    
    log.success(`Refreshed token contains correct tenantId: ${decoded.tenantId}`);
    passedTests++;
  } catch (error) {
    log.error(`Test failed: ${error.message}`);
    if (error.response) {
      log.error(`Response status: ${error.response.status}`);
      log.error(`Response data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    failedTests++;
  }
}

// Main test runner
async function runTests() {
  log.section('Multi-Tenant Implementation Test Suite');
  log.info(`Base URL: ${BASE_URL}`);
  log.info(`Auth URL: ${AUTH_URL}`);
  log.info(`Test Email: ${TEST_EMAIL}`);
  log.info(`Test Tenant: ${TEST_TENANT}`);
  
  // Test 1: Login and verify token
  const loginResult = await testJWTContainsTenantId();
  if (!loginResult) {
    log.error('Login failed - cannot continue with other tests');
    log.section('Test Summary');
    log.info(`Total Tests: ${passedTests + failedTests}`);
    log.success(`Passed: ${passedTests}`);
    log.error(`Failed: ${failedTests}`);
    process.exit(1);
  }
  
  const { token, refreshToken } = loginResult;
  
  // Test 2: Missing header
  await testMissingHeader(token);
  
  // Test 3: Mismatched tenant
  await testMismatchedTenant(token);
  
  // Test 4: Valid request
  await testValidRequest(token);
  
  // Test 5: Refresh token
  if (refreshToken) {
    await testRefreshToken(refreshToken);
  } else {
    log.warn('No refresh token available, skipping refresh test');
  }
  
  // Summary
  log.section('Test Summary');
  log.info(`Total Tests: ${passedTests + failedTests}`);
  log.success(`Passed: ${passedTests}`);
  if (failedTests > 0) {
    log.error(`Failed: ${failedTests}`);
  } else {
    log.success('All tests passed! 🎉');
  }
  
  if (failedTests > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  log.error(`Test suite failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
