require('dotenv').config();
const axios = require('axios');

// Configuration
const GATEWAY_URL = process.env.GATEWAY_URL || 'https://etelios-app-service-cxf6hvgjb7gah7dr.centralindia-01.azurewebsites.net';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'https://etelios-auth-service-h8btakd4byhncmgc.centralindia-01.azurewebsites.net';
const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'https://etelios-hr-service-backend-a4ayeqefdsbsc2g3.centralindia-01.azurewebsites.net';

// Test configuration
const TIMEOUT = 30000; // 30 seconds
let authToken = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  total: 0
};

// Helper function to test an endpoint
async function testEndpoint(name, method, url, options = {}) {
  results.total++;
  const { data, headers, expectedStatus = [200, 201], skipAuth = false, description } = options;
  
  try {
    const config = {
      method,
      url,
      timeout: TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && !skipAuth ? { 'Authorization': `Bearer ${authToken}` } : {}),
        ...(options.headers || {})
      },
      ...(data ? { data } : {})
    };

    const startTime = Date.now();
    const response = await axios(config);
    const duration = Date.now() - startTime;
    
    const statusOk = Array.isArray(expectedStatus) 
      ? expectedStatus.includes(response.status) 
      : response.status === expectedStatus;
    
    if (statusOk) {
      results.passed++;
      console.log(`${colors.green}✓${colors.reset} ${name} - ${response.status} (${duration}ms)`);
      if (description) console.log(`  ${colors.cyan}→${colors.reset} ${description}`);
      return { success: true, response, duration };
    } else {
      results.failed++;
      console.log(`${colors.red}✗${colors.reset} ${name} - Expected ${expectedStatus}, got ${response.status} (${duration}ms)`);
      if (description) console.log(`  ${colors.cyan}→${colors.reset} ${description}`);
      return { success: false, response, duration, error: `Expected ${expectedStatus}, got ${response.status}` };
    }
  } catch (error) {
    const duration = error.response ? Date.now() - (Date.now() - (error.response.config?.timeout || TIMEOUT)) : 0;
    const status = error.response?.status || 'TIMEOUT/ERROR';
    
    // Some endpoints are expected to fail (like 401 for unauthorized, 404 for not found)
    if (options.expectedStatus && Array.isArray(options.expectedStatus) && options.expectedStatus.includes(error.response?.status)) {
      results.passed++;
      console.log(`${colors.green}✓${colors.reset} ${name} - ${status} (expected) (${duration}ms)`);
      if (description) console.log(`  ${colors.cyan}→${colors.reset} ${description}`);
      return { success: true, response: error.response, duration };
    }
    
    results.failed++;
    const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
    console.log(`${colors.red}✗${colors.reset} ${name} - ${status}: ${errorMsg.substring(0, 100)}`);
    if (description) console.log(`  ${colors.cyan}→${colors.reset} ${description}`);
    if (error.response?.data) {
      console.log(`  ${colors.yellow}Response:${colors.reset}`, JSON.stringify(error.response.data).substring(0, 200));
    }
    return { success: false, error: errorMsg, duration };
  }
}

// Test Gateway endpoints
async function testGateway() {
  console.log(`\n${colors.blue}=== Testing Gateway Endpoints ===${colors.reset}\n`);
  
  await testEndpoint('Gateway Health', 'GET', `${GATEWAY_URL}/health`, {
    expectedStatus: 200,
    skipAuth: true,
    description: 'Gateway health check'
  });
  
  await testEndpoint('Gateway API Info', 'GET', `${GATEWAY_URL}/api`, {
    expectedStatus: 200,
    skipAuth: true,
    description: 'Gateway API information'
  });
  
  await testEndpoint('Gateway Root', 'GET', `${GATEWAY_URL}/`, {
    expectedStatus: 200,
    skipAuth: true,
    description: 'Gateway root endpoint'
  });
}

// Test Auth Service endpoints
async function testAuthService() {
  console.log(`\n${colors.blue}=== Testing Auth Service Endpoints ===${colors.reset}\n`);
  
  // Public endpoints
  await testEndpoint('Auth Health', 'GET', `${AUTH_SERVICE_URL}/health`, {
    expectedStatus: 200,
    skipAuth: true,
    description: 'Auth service health check'
  });
  
  await testEndpoint('Auth Status', 'GET', `${AUTH_SERVICE_URL}/api/auth/status`, {
    expectedStatus: 200,
    skipAuth: true,
    description: 'Auth service status'
  });
  
  await testEndpoint('Auth Health Endpoint', 'GET', `${AUTH_SERVICE_URL}/api/auth/health`, {
    expectedStatus: 200,
    skipAuth: true,
    description: 'Auth service health endpoint'
  });
  
  // Test login (this will fail without valid credentials, but we test the endpoint exists)
  await testEndpoint('Auth Login Endpoint', 'POST', `${GATEWAY_URL}/api/auth/login`, {
    expectedStatus: [400, 401, 422],
    skipAuth: true,
    data: { emailOrEmployeeId: 'test@example.com', password: 'test123' },
    description: 'Auth login endpoint (expected to fail without valid credentials)'
  });
  
  // Test through Gateway
  await testEndpoint('Auth Login via Gateway', 'POST', `${GATEWAY_URL}/api/auth/login`, {
    expectedStatus: [400, 401, 422],
    skipAuth: true,
    data: { emailOrEmployeeId: 'test@example.com', password: 'test123' },
    description: 'Auth login via Gateway (expected to fail without valid credentials)'
  });
  
  // Protected endpoints (will fail without auth, but we test they exist)
  await testEndpoint('Auth Profile (Unauthorized)', 'GET', `${GATEWAY_URL}/api/auth/profile`, {
    expectedStatus: [401, 403],
    skipAuth: true,
    description: 'Auth profile endpoint (expected 401/403 without token)'
  });
  
  await testEndpoint('Auth Refresh Token', 'POST', `${GATEWAY_URL}/api/auth/refresh-token`, {
    expectedStatus: [400, 401],
    skipAuth: true,
    description: 'Auth refresh token endpoint'
  });
}

// Test HR Service endpoints
async function testHRService() {
  console.log(`\n${colors.blue}=== Testing HR Service Endpoints ===${colors.reset}\n`);
  
  // Public endpoints
  await testEndpoint('HR Health', 'GET', `${HR_SERVICE_URL}/health`, {
    expectedStatus: 200,
    skipAuth: true,
    description: 'HR service health check'
  });
  
  await testEndpoint('HR Status', 'GET', `${HR_SERVICE_URL}/api/hr/status`, {
    expectedStatus: 200,
    skipAuth: true,
    description: 'HR service status'
  });
  
  await testEndpoint('HR Health Endpoint', 'GET', `${HR_SERVICE_URL}/api/hr/health`, {
    expectedStatus: 200,
    skipAuth: true,
    description: 'HR service health endpoint'
  });
  
  // Test through Gateway
  await testEndpoint('HR Service via Gateway', 'GET', `${GATEWAY_URL}/api/hr`, {
    expectedStatus: 200,
    skipAuth: true,
    description: 'HR service info via Gateway'
  });
  
  await testEndpoint('HR Health via Gateway', 'GET', `${GATEWAY_URL}/api/hr/health`, {
    expectedStatus: 200,
    skipAuth: true,
    description: 'HR health via Gateway'
  });
  
  // Protected endpoints (will fail without auth, but we test they exist)
  await testEndpoint('HR Employees (Unauthorized)', 'GET', `${GATEWAY_URL}/api/hr/employees`, {
    expectedStatus: [401, 403],
    skipAuth: true,
    description: 'HR employees endpoint (expected 401/403 without token)'
  });
  
  await testEndpoint('HR Stores (Unauthorized)', 'GET', `${GATEWAY_URL}/api/hr/stores`, {
    expectedStatus: [401, 403],
    skipAuth: true,
    description: 'HR stores endpoint (expected 401/403 without token)'
  });
  
  await testEndpoint('HR Leave Policies (Unauthorized)', 'GET', `${GATEWAY_URL}/api/hr/policies/leave`, {
    expectedStatus: [401, 403],
    skipAuth: true,
    description: 'HR leave policies endpoint (expected 401/403 without token)'
  });
  
  await testEndpoint('HR Leave Requests (Unauthorized)', 'GET', `${GATEWAY_URL}/api/hr/leave-requests`, {
    expectedStatus: [401, 403],
    skipAuth: true,
    description: 'HR leave requests endpoint (expected 401/403 without token)'
  });
  
  // Test onboarding endpoints
  await testEndpoint('HR Work Details (Unauthorized)', 'POST', `${GATEWAY_URL}/api/hr/work-details`, {
    expectedStatus: [401, 403],
    skipAuth: true,
    data: { employeeId: 'test123' },
    description: 'HR work details endpoint (expected 401/403 without token)'
  });
  
  // Test transfer routes
  await testEndpoint('HR Transfers via Gateway', 'GET', `${GATEWAY_URL}/api/transfers`, {
    expectedStatus: [200, 401, 403, 404],
    skipAuth: true,
    description: 'HR transfers endpoint via Gateway'
  });
  
  // Test HR letter routes
  await testEndpoint('HR Letters via Gateway', 'GET', `${GATEWAY_URL}/api/hr-letter`, {
    expectedStatus: [200, 401, 403, 404],
    skipAuth: true,
    description: 'HR letters endpoint via Gateway'
  });
}

// Test 404 handling
async function test404Handling() {
  console.log(`\n${colors.blue}=== Testing 404 Handling ===${colors.reset}\n`);
  
  await testEndpoint('Non-existent Gateway Route', 'GET', `${GATEWAY_URL}/api/nonexistent`, {
    expectedStatus: 404,
    skipAuth: true,
    description: 'Non-existent route should return 404'
  });
  
  await testEndpoint('Non-existent HR Route', 'GET', `${GATEWAY_URL}/api/hr/nonexistent`, {
    expectedStatus: [404, 401, 403],
    skipAuth: true,
    description: 'Non-existent HR route'
  });
}

// Main test function
async function runTests() {
  console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║     Etelios API Endpoint Testing Suite                    ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log(`\nGateway URL: ${GATEWAY_URL}`);
  console.log(`Auth Service: ${AUTH_SERVICE_URL}`);
  console.log(`HR Service: ${HR_SERVICE_URL}`);
  console.log(`Timeout: ${TIMEOUT}ms\n`);
  
  const startTime = Date.now();
  
  try {
    await testGateway();
    await testAuthService();
    await testHRService();
    await test404Handling();
  } catch (error) {
    console.error(`${colors.red}Unexpected error during testing:${colors.reset}`, error.message);
  }
  
  const totalTime = Date.now() - startTime;
  
  // Print summary
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║                    Test Summary                             ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log(`Total Tests: ${results.total}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);
  console.log(`${colors.yellow}Skipped: ${results.skipped}${colors.reset}`);
  console.log(`Total Time: ${totalTime}ms`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(2)}%`);
  
  if (results.failed > 0) {
    console.log(`\n${colors.red}⚠ Some tests failed. Check the output above for details.${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}✓ All tests passed!${colors.reset}`);
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});

