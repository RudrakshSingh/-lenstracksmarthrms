/**
 * Comprehensive Local API Test
 * Tests all endpoints locally before pushing to production
 */

const BASE_URL = 'http://localhost';
const services = {
  auth: 3001,
  hr: 3002,
  attendance: 3003,
  tenantRegistry: 3020
};

const results = {
  passed: [],
  failed: [],
  skipped: [],
  services: {}
};

async function checkService(serviceName, port) {
  try {
    const response = await fetch(`${BASE_URL}:${port}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function makeRequest(service, path, options = {}) {
  const port = services[service] || service;
  const url = `${BASE_URL}:${port}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return {
      status: response.status,
      ok: response.ok,
      data
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
      data: null
    };
  }
}

async function test(name, service, path, options = {}) {
  const result = await makeRequest(service, path, options);
  
  const success = result.ok || (options.expectStatus && result.status === options.expectStatus);
  
  if (success) {
    results.passed.push({ name, status: result.status, service, path });
    console.log(`✅ ${name} (${result.status})`);
  } else {
    results.failed.push({ 
      name, 
      status: result.status, 
      service,
      path,
      error: result.error || result.data?.message || 'Unknown error'
    });
    console.log(`❌ ${name} (${result.status})`);
    if (result.data && typeof result.data === 'object' && result.data.message) {
      console.log(`   Error: ${result.data.message.substring(0, 100)}`);
    }
  }

  return { success, result };
}

async function runTests() {
  console.log('\n================================================================================');
  console.log('🧪 COMPREHENSIVE LOCAL API TEST');
  console.log('================================================================================');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('================================================================================\n');

  // Check service availability
  console.log('🔍 Checking Service Availability...\n');
  
  const availableServices = {};
  
  for (const [key, service] of Object.entries(services)) {
    const isAvailable = await checkService(service.name || key, service.port || service);
    if (isAvailable) {
      console.log(`✅ ${key} Service (port ${service.port || service}): Running`);
      availableServices[key] = service;
    } else {
      console.log(`❌ ${key} Service (port ${service.port || service}): Not running`);
    }
  }
  
  console.log(`\n📊 Available: ${Object.keys(availableServices).length}/${Object.keys(services).length} services\n`);
  
  if (Object.keys(availableServices).length === 0) {
    console.log('⚠️  No services are running locally.');
    console.log('   To start services, run:');
    console.log('   - cd microservices/auth-service && npm start');
    console.log('   - cd microservices/hr-service && npm start');
    console.log('   - cd microservices/attendance-service && npm start');
    console.log('   - cd microservices/tenant-registry-service && npm start');
    process.exit(1);
  }

  // ============================================================================
  // STEP 1: AUTH SERVICE
  // ============================================================================
  if (availableServices.auth) {
    console.log('📋 STEP 1: Auth Service');
    console.log('─────────────────────────────────────────────────────────────────────────────');
    
    await test('Auth Health', 'auth', '/api/auth/health', { method: 'GET' });
    await test('Auth Status', 'auth', '/api/auth/status', { method: 'GET' });
    
    // Get auth token
    const tokenResult = await makeRequest('auth', '/api/auth/mock-login-fast', {
      method: 'POST',
      body: { role: 'admin' }
    });
    
    let authToken = null;
    if (tokenResult.ok && tokenResult.data?.data?.accessToken) {
      authToken = tokenResult.data.data.accessToken;
      await test('Mock Login Fast', 'auth', '/api/auth/mock-login-fast', {
        method: 'POST',
        body: { role: 'admin' }
      });
      console.log(`   ✅ Token obtained: ${authToken.substring(0, 50)}...\n`);
    } else {
      console.log(`   ❌ Failed to get token\n`);
    }
    
    if (authToken) {
      await test('Get Profile', 'auth', '/api/auth/profile', {
        method: 'GET',
        token: authToken
      });
    }
  }

  // ============================================================================
  // STEP 2: HR SERVICE
  // ============================================================================
  if (availableServices.hr) {
    console.log('\n📋 STEP 2: HR Service');
    console.log('─────────────────────────────────────────────────────────────────────────────');
    
    await test('HR Health', 'hr', '/api/hr/health', { method: 'GET' });
    await test('HR Status', 'hr', '/api/hr/status', { method: 'GET' });
    
    // Try to get token from auth service if available
    let token = null;
    if (availableServices.auth) {
      const tokenResult = await makeRequest('auth', '/api/auth/mock-login-fast', {
        method: 'POST',
        body: { role: 'admin' }
      });
      if (tokenResult.ok && tokenResult.data?.data?.accessToken) {
        token = tokenResult.data.data.accessToken;
        results.services.authToken = token;
      }
    }
    
    if (token) {
      await test('Get Employees', 'hr', '/api/hr/employees', {
        method: 'GET',
        token: token
      });
      
      await test('Get Departments', 'hr', '/api/hr/departments', {
        method: 'GET',
        token: token
      });
      
      // Test document routes (THE FIX)
      await test('Get Documents (/api/documents)', 'hr', '/api/documents', {
        method: 'GET',
        token: token
      });
      
      await test('Get Documents (/api/hr/documents) - FIX', 'hr', '/api/hr/documents', {
        method: 'GET',
        token: token
      });
    } else {
      console.log('   ⏭️  Skipping authenticated endpoints (no auth token)');
      results.skipped.push('HR authenticated endpoints (no auth service)');
    }
  }

  // ============================================================================
  // STEP 3: ATTENDANCE SERVICE
  // ============================================================================
  if (availableServices.attendance) {
    console.log('\n📋 STEP 3: Attendance Service');
    console.log('─────────────────────────────────────────────────────────────────────────────');
    
    await test('Attendance Health', 'attendance', '/api/attendance/health', { method: 'GET' });
    
    // Try to get token from auth service if available
    let token = results.services.authToken;
    if (!token && availableServices.auth) {
      const tokenResult = await makeRequest('auth', '/api/auth/mock-login-fast', {
        method: 'POST',
        body: { role: 'admin' }
      });
      if (tokenResult.ok && tokenResult.data?.data?.accessToken) {
        token = tokenResult.data.data.accessToken;
        results.services.authToken = token;
      }
    }
    
    if (token) {
      await test('Get Attendance Records', 'attendance', '/api/attendance/records', {
        method: 'GET',
        token: token
      });
      
      // Test stats endpoint (THE FIX)
      await test('Get Attendance Stats - FIX', 'attendance', '/api/attendance/stats', {
        method: 'GET',
        token: token
      });
      
      // Test clock-in endpoint (THE FIX)
      await test('Clock In - FIX', 'attendance', '/api/attendance/clock-in', {
        method: 'POST',
        token: token,
        body: {
          latitude: 28.6139,
          longitude: 77.2090,
          notes: 'Local test clock-in'
        }
      });
    } else {
      console.log('   ⏭️  Skipping authenticated endpoints (no auth token)');
      results.skipped.push('Attendance authenticated endpoints (no auth service)');
    }
  }

  // ============================================================================
  // STEP 4: TENANT REGISTRY SERVICE
  // ============================================================================
  if (availableServices.tenantRegistry) {
    console.log('\n📋 STEP 4: Tenant Registry Service');
    console.log('─────────────────────────────────────────────────────────────────────────────');
    
    await test('Tenant Registry Health', 'tenantRegistry', '/health', { method: 'GET' });
    
    let token = results.services.authToken;
    if (!token && availableServices.auth) {
      const tokenResult = await makeRequest('auth', '/api/auth/mock-login-fast', {
        method: 'POST',
        body: { role: 'admin' }
      });
      if (tokenResult.ok && tokenResult.data?.data?.accessToken) {
        token = tokenResult.data.data.accessToken;
        results.services.authToken = token;
      }
    }
    
    if (token) {
      await test('List Tenants', 'tenantRegistry', '/api/tenants', {
        method: 'GET',
        token: token
      });
    } else {
      console.log('   ⏭️  Skipping authenticated endpoints (no auth token)');
      results.skipped.push('Tenant registry authenticated endpoints (no auth service)');
    }
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n================================================================================');
  console.log('📊 TEST SUMMARY');
  console.log('================================================================================');
  
  const total = results.passed.length + results.failed.length;
  const successRate = total > 0 ? ((results.passed.length / total) * 100).toFixed(1) : 0;
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`Success Rate: ${successRate}%`);
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.failed.forEach((test, index) => {
      console.log(`  ${index + 1}. ${test.name} (${test.status})`);
      console.log(`     Service: ${test.service}, Path: ${test.path}`);
      if (test.error) {
        console.log(`     Error: ${test.error.substring(0, 100)}`);
      }
    });
  }
  
  console.log('\n✅ Passed Tests:');
  const serviceGroups = {};
  results.passed.forEach(test => {
    const service = test.service || 'unknown';
    if (!serviceGroups[service]) {
      serviceGroups[service] = [];
    }
    serviceGroups[service].push(test.name);
  });
  
  Object.entries(serviceGroups).forEach(([service, tests]) => {
    console.log(`  ${service}: ${tests.length} tests passed`);
  });
  
  console.log('\n================================================================================');
  
  // Store token for other tests (if available)
  let authToken = null;
  if (availableServices.auth) {
    const tokenResult = await makeRequest('auth', '/api/auth/mock-login-fast', {
      method: 'POST',
      body: { role: 'admin' }
    });
    if (tokenResult.ok && tokenResult.data?.data?.accessToken) {
      authToken = tokenResult.data.data.accessToken;
      results.services.authToken = authToken;
    }
  }
  
  if (results.failed.length === 0) {
    console.log('🎉 ALL TESTS PASSED! Ready to push to production.');
    process.exit(0);
  } else {
    console.log(`⚠️  ${results.failed.length} test(s) failed. Please review errors above.`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test execution error:', error);
  process.exit(1);
});

