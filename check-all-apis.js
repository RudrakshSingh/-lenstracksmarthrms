#!/usr/bin/env node

/**
 * Comprehensive API Testing Script
 * Tests all microservice APIs and endpoints
 */

const http = require('http');
const https = require('https');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// Service configuration
const services = [
  { name: 'API Gateway', port: 3000, basePath: '' },
  { name: 'auth-service', port: 3001, basePath: '/api/auth' },
  { name: 'hr-service', port: 3002, basePath: '/api/hr' },
  { name: 'attendance-service', port: 3003, basePath: '/api/attendance' },
  { name: 'payroll-service', port: 3004, basePath: '/api/payroll' },
  { name: 'crm-service', port: 3005, basePath: '/api/crm' },
  { name: 'inventory-service', port: 3006, basePath: '/api/inventory' },
  { name: 'sales-service', port: 3007, basePath: '/api/sales' },
  { name: 'purchase-service', port: 3008, basePath: '/api/purchase' },
  { name: 'financial-service', port: 3009, basePath: '/api/financial' },
  { name: 'document-service', port: 3010, basePath: '/api/document' },
  { name: 'service-management', port: 3011, basePath: '/api/service' },
  { name: 'cpp-service', port: 3012, basePath: '/api/cpp' },
  { name: 'prescription-service', port: 3013, basePath: '/api/prescription' },
  { name: 'analytics-service', port: 3014, basePath: '/api/analytics' },
  { name: 'notification-service', port: 3015, basePath: '/api/notification' },
  { name: 'monitoring-service', port: 3016, basePath: '/api/monitoring' },
  { name: 'tenant-registry-service', port: 3020, basePath: '/api/tenant' },
  { name: 'realtime-service', port: 3021, basePath: '/api/realtime' }
];

// Test results
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  services: {}
};

// Helper function to make HTTP request
function makeRequest(hostname, port, path, method = 'GET', timeout = 5000) {
  return new Promise((resolve) => {
    const options = {
      hostname,
      port,
      path,
      method,
      timeout,
      headers: {
        'User-Agent': 'Etelios-API-Checker/1.0',
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          success: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        statusCode: 0,
        error: error.message,
        success: false
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        statusCode: 0,
        error: 'Request timeout',
        success: false
      });
    });

    req.end();
  });
}

// Test a single endpoint
async function testEndpoint(service, endpoint, description) {
  results.total++;
  const startTime = Date.now();
  
  const response = await makeRequest('localhost', service.port, endpoint);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  if (response.success) {
    results.passed++;
    console.log(`${colors.green}✓${colors.reset} ${description.padEnd(50)} ${colors.green}[${response.statusCode}]${colors.reset} ${colors.gray}(${duration}s)${colors.reset}`);
    
    // Try to parse and show service name from response
    try {
      const json = JSON.parse(response.body);
      if (json.service) {
        console.log(`  ${colors.cyan}→${colors.reset} Service: ${json.service}, Status: ${json.status || 'OK'}`);
      }
    } catch (e) {
      // Not JSON, that's okay
    }
  } else {
    results.failed++;
    const errorMsg = response.error || `HTTP ${response.statusCode}`;
    console.log(`${colors.red}✗${colors.reset} ${description.padEnd(50)} ${colors.red}[${errorMsg}]${colors.reset} ${colors.gray}(${duration}s)${colors.reset}`);
  }
  
  return response;
}

// Test a service
async function testService(service) {
  console.log(`\n${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}Testing: ${service.name}${colors.reset} ${colors.gray}(Port ${service.port})${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}`);
  
  const serviceResults = { passed: 0, failed: 0 };
  
  // Test health endpoint
  await testEndpoint(service, '/health', `${service.name} - Health Check`)
    .then(r => r.success ? serviceResults.passed++ : serviceResults.failed++);
  
  // Test service-specific endpoints
  if (service.basePath) {
    // Status endpoint
    await testEndpoint(service, `${service.basePath}/status`, `${service.name} - Status`)
      .then(r => r.success ? serviceResults.passed++ : serviceResults.failed++);
    
    // Health endpoint via API path
    await testEndpoint(service, `${service.basePath}/health`, `${service.name} - API Health`)
      .then(r => r.success ? serviceResults.passed++ : serviceResults.failed++);
  }
  
  // API Gateway specific endpoints
  if (service.name === 'API Gateway') {
    await testEndpoint(service, '/', 'API Gateway - Root')
      .then(r => r.success ? serviceResults.passed++ : serviceResults.failed++);
    await testEndpoint(service, '/api', 'API Gateway - API Discovery')
      .then(r => r.success ? serviceResults.passed++ : serviceResults.failed++);
    await testEndpoint(service, '/admin/services', 'API Gateway - Admin Services')
      .then(r => r.success ? serviceResults.passed++ : serviceResults.failed++);
  }
  
  results.services[service.name] = serviceResults;
  
  const status = serviceResults.failed === 0 ? 
    `${colors.green}✓ All tests passed${colors.reset}` : 
    `${colors.red}✗ ${serviceResults.failed} test(s) failed${colors.reset}`;
  
  console.log(`\n${status} for ${service.name}`);
}

// Main function
async function main() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                  ETELIOS API COMPREHENSIVE TEST                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);
  console.log(`Testing ${services.length} microservices...\n`);
  
  const startTime = Date.now();
  
  // Test all services
  for (const service of services) {
    await testService(service);
    // Small delay between services
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Print summary
  console.log(`\n${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}TEST SUMMARY${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log(`Total Tests:    ${results.total}`);
  console.log(`${colors.green}Passed:         ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed:         ${results.failed}${colors.reset}`);
  console.log(`Duration:       ${duration}s`);
  console.log(`\n${colors.bright}Service Breakdown:${colors.reset}`);
  
  for (const [serviceName, serviceResults] of Object.entries(results.services)) {
    const total = serviceResults.passed + serviceResults.failed;
    const status = serviceResults.failed === 0 ? 
      `${colors.green}✓${colors.reset}` : 
      `${colors.red}✗${colors.reset}`;
    console.log(`  ${status} ${serviceName.padEnd(30)} ${serviceResults.passed}/${total} passed`);
  }
  
  console.log(`\n${colors.blue}${'='.repeat(70)}${colors.reset}`);
  
  if (results.failed === 0) {
    console.log(`${colors.green}${colors.bright}✅ ALL TESTS PASSED!${colors.reset}`);
  } else {
    console.log(`${colors.yellow}${colors.bright}⚠️  Some tests failed. Check the output above for details.${colors.reset}`);
  }
  
  console.log(`${colors.blue}${'='.repeat(70)}${colors.reset}\n`);
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the tests
main().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});

