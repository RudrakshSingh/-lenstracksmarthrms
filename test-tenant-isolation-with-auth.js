#!/usr/bin/env node

/**
 * Tenant Isolation Test Script with Authentication
 * 
 * This script logs in as admin users and tests tenant isolation
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'https://98.70.245.87';
const TENANT_A = 'lenstrack';
const TENANT_B = 'test-tenant';

// Lenstrack credentials
const LENSTRACK_ADMIN_EMAIL = 'admin@lenstrack.etelios.com';
const LENSTRACK_ADMIN_PASSWORD = 'Lenstrack@Admin123';

// Colors
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

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function recordTest(name, passed, message = '') {
  results.tests.push({ name, passed, message });
  if (passed) {
    results.passed++;
    log.success(`${name}: ${message || 'PASSED'}`);
  } else {
    results.failed++;
    log.error(`${name}: ${message || 'FAILED'}`);
  }
}

async function apiCall(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      validateStatus: () => true,
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false // Allow self-signed certificates for testing
      })
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response;
  } catch (error) {
    return {
      status: 500,
      data: { error: error.message },
      error
    };
  }
}

async function login(email, password, tenantId) {
  log.info(`Logging in as ${email} for tenant ${tenantId}...`);
  
  const response = await apiCall('POST', '/api/auth/login', {
    emailOrEmployeeId: email,
    password: password
  }, {
    'X-Tenant-Id': tenantId
  });
  
  if (response.status === 200 && response.data.success) {
    const token = response.data.data?.accessToken || response.data.data?.token || response.data.token;
    if (token) {
      log.success(`Login successful for ${tenantId}`);
      return token;
    } else {
      log.error(`Login response missing token: ${JSON.stringify(response.data)}`);
      return null;
    }
  } else {
    log.error(`Login failed: ${response.status} - ${JSON.stringify(response.data)}`);
    return null;
  }
}

async function testEmployeeIsolation(tokenA, tokenB) {
  log.section('Testing Employee Tenant Isolation');
  
  // Create employee in Tenant A
  const employeeDataA = {
    employeeId: `EMP-TEST-A-${Date.now()}`,
    firstName: 'TenantA',
    lastName: 'Employee',
    email: `tenanta-${Date.now()}@test.com`,
    department: 'Sales',
    status: 'active'
  };
  
  const createA = await apiCall('POST', '/api/hr/employees', employeeDataA, {
    'Authorization': `Bearer ${tokenA}`,
    'X-Tenant-Id': TENANT_A
  });
  
  if (createA.status !== 201 && createA.status !== 200) {
    recordTest('Create employee in Tenant A', false, `Status: ${createA.status}`);
    return;
  }
  
  const employeeA = createA.data.data || createA.data;
  recordTest('Create employee in Tenant A', true, `Employee ID: ${employeeA.employeeId}`);
  
  // Create employee in Tenant B
  const employeeDataB = {
    employeeId: `EMP-TEST-B-${Date.now()}`,
    firstName: 'TenantB',
    lastName: 'Employee',
    email: `tenantb-${Date.now()}@test.com`,
    department: 'Sales',
    status: 'active'
  };
  
  const createB = await apiCall('POST', '/api/hr/employees', employeeDataB, {
    'Authorization': `Bearer ${tokenB}`,
    'X-Tenant-Id': TENANT_B
  });
  
  if (createB.status !== 201 && createB.status !== 200) {
    recordTest('Create employee in Tenant B', false, `Status: ${createB.status}`);
    return;
  }
  
  const employeeB = createB.data.data || createB.data;
  recordTest('Create employee in Tenant B', true, `Employee ID: ${employeeB.employeeId}`);
  
  // Get employees for Tenant A
  const listA = await apiCall('GET', '/api/hr/employees', null, {
    'Authorization': `Bearer ${tokenA}`,
    'X-Tenant-Id': TENANT_A
  });
  
  if (listA.status === 200) {
    const employeesA = listA.data.data || listA.data.employees || [];
    const foundA = employeesA.find(emp => 
      emp.employeeId === employeeA.employeeId ||
      emp._id === employeeA._id ||
      emp.id === employeeA.id
    );
    const foundB = employeesA.find(emp => 
      emp.employeeId === employeeB.employeeId ||
      emp._id === employeeB._id ||
      emp.id === employeeB.id
    );
    
    recordTest('Tenant A sees its own employee', !!foundA, foundA ? 'Found' : 'Not found');
    recordTest('Tenant A does NOT see Tenant B employee', !foundB, foundB ? 'ISOLATION BREACH!' : 'Correctly isolated');
    
    // Verify tenantId in response
    const allHaveTenantId = employeesA.every(emp => {
      const empTenantId = emp.tenantId || 'default';
      return empTenantId === TENANT_A || empTenantId === TENANT_A.toLowerCase();
    });
    recordTest('All employees in Tenant A have correct tenantId', allHaveTenantId,
      allHaveTenantId ? 'All correct' : 'Some have wrong tenantId');
  }
  
  // Get employees for Tenant B
  const listB = await apiCall('GET', '/api/hr/employees', null, {
    'Authorization': `Bearer ${tokenB}`,
    'X-Tenant-Id': TENANT_B
  });
  
  if (listB.status === 200) {
    const employeesB = listB.data.data || listB.data.employees || [];
    const foundA = employeesB.find(emp => 
      emp.employeeId === employeeA.employeeId ||
      emp._id === employeeA._id ||
      emp.id === employeeA.id
    );
    const foundB = employeesB.find(emp => 
      emp.employeeId === employeeB.employeeId ||
      emp._id === employeeB._id ||
      emp.id === employeeB.id
    );
    
    recordTest('Tenant B sees its own employee', !!foundB, foundB ? 'Found' : 'Not found');
    recordTest('Tenant B does NOT see Tenant A employee', !foundA, foundA ? 'ISOLATION BREACH!' : 'Correctly isolated');
  }
  
  // Try to access Tenant B's employee from Tenant A
  const employeeBId = employeeB._id || employeeB.id;
  const accessAttempt = await apiCall('GET', `/api/hr/employees/${employeeBId}`, null, {
    'Authorization': `Bearer ${tokenA}`,
    'X-Tenant-Id': TENANT_A
  });
  
  recordTest('Tenant A cannot access Tenant B employee by ID', 
    accessAttempt.status === 404 || accessAttempt.status === 403,
    accessAttempt.status === 404 || accessAttempt.status === 403 ? 
      'Correctly blocked' : `Unexpected access: Status ${accessAttempt.status}`);
}

async function testStoreIsolation(tokenA, tokenB) {
  log.section('Testing Store Tenant Isolation');
  
  // Create store in Tenant A
  const storeDataA = {
    name: `Store A ${Date.now()}`,
    code: `STORE-A-${Date.now()}`,
    address: {
      street: '123 A St',
      city: 'City A',
      state: 'State A',
      pincode: '111111'
    },
    status: 'active'
  };
  
  const createA = await apiCall('POST', '/api/hr/stores', storeDataA, {
    'Authorization': `Bearer ${tokenA}`,
    'X-Tenant-Id': TENANT_A
  });
  
  if (createA.status !== 201 && createA.status !== 200) {
    recordTest('Create store in Tenant A', false, `Status: ${createA.status}`);
    return;
  }
  
  const storeA = createA.data.data || createA.data;
  recordTest('Create store in Tenant A', true, `Store Code: ${storeA.code}`);
  
  // Get stores for Tenant A
  const listA = await apiCall('GET', '/api/hr/stores', null, {
    'Authorization': `Bearer ${tokenA}`,
    'X-Tenant-Id': TENANT_A
  });
  
  if (listA.status === 200) {
    const storesA = listA.data.data || listA.data.stores || [];
    const foundA = storesA.find(store => 
      store.code === storeA.code ||
      store._id === storeA._id ||
      store.id === storeA.id
    );
    
    recordTest('Tenant A sees its own store', !!foundA, foundA ? 'Found' : 'Not found');
    
    // Verify tenantId
    const allHaveTenantId = storesA.every(store => {
      const storeTenantId = store.tenantId || 'default';
      return storeTenantId === TENANT_A || storeTenantId === TENANT_A.toLowerCase();
    });
    recordTest('All stores in Tenant A have correct tenantId', allHaveTenantId,
      allHaveTenantId ? 'All correct' : 'Some have wrong tenantId');
  }
}

async function testDepartmentIsolation(tokenA, tokenB) {
  log.section('Testing Department Tenant Isolation');
  
  // Create department in Tenant A
  const deptDataA = {
    name: `Dept A ${Date.now()}`,
    code: `DEPT-A-${Date.now()}`,
    description: 'Test Department A',
    status: 'active'
  };
  
  const createA = await apiCall('POST', '/api/hr/departments', deptDataA, {
    'Authorization': `Bearer ${tokenA}`,
    'X-Tenant-Id': TENANT_A
  });
  
  if (createA.status !== 201 && createA.status !== 200) {
    recordTest('Create department in Tenant A', false, `Status: ${createA.status}`);
    return;
  }
  
  const deptA = createA.data.data || createA.data;
  recordTest('Create department in Tenant A', true, `Dept Code: ${deptA.code}`);
  
  // Get departments for Tenant A
  const listA = await apiCall('GET', '/api/hr/departments', null, {
    'Authorization': `Bearer ${tokenA}`,
    'X-Tenant-Id': TENANT_A
  });
  
  if (listA.status === 200) {
    const deptsA = listA.data.data || listA.data.departments || listA.data || [];
    const foundA = deptsA.find(dept => 
      dept.code === deptA.code ||
      dept._id === deptA._id ||
      dept.id === deptA.id
    );
    
    recordTest('Tenant A sees its own department', !!foundA, foundA ? 'Found' : 'Not found');
    
    // Verify tenantId
    const allHaveTenantId = deptsA.every(dept => {
      const deptTenantId = dept.tenantId || 'default';
      return deptTenantId === TENANT_A || deptTenantId === TENANT_A.toLowerCase();
    });
    recordTest('All departments in Tenant A have correct tenantId', allHaveTenantId,
      allHaveTenantId ? 'All correct' : 'Some have wrong tenantId');
  }
}

async function runTests() {
  log.section('Tenant Isolation Test Suite with Authentication');
  log.info(`Base URL: ${BASE_URL}`);
  log.info(`Testing Tenant A: ${TENANT_A}`);
  log.info(`Testing Tenant B: ${TENANT_B}`);
  
  // Login for Tenant A (Lenstrack)
  const tokenA = await login(LENSTRACK_ADMIN_EMAIL, LENSTRACK_ADMIN_PASSWORD, TENANT_A);
  if (!tokenA) {
    log.error('Failed to login for Tenant A. Cannot continue tests.');
    process.exit(1);
  }
  
  // For Tenant B, we'll use the same token (in real scenario, you'd have different credentials)
  // Or skip Tenant B tests if we don't have credentials
  const tokenB = tokenA; // Using same token for now - in production, use different tenant credentials
  
  // Run tests
  await testEmployeeIsolation(tokenA, tokenB);
  await testStoreIsolation(tokenA, tokenB);
  await testDepartmentIsolation(tokenA, tokenB);
  
  // Summary
  log.section('Test Summary');
  log.info(`Total Tests: ${results.tests.length}`);
  log.success(`Passed: ${results.passed}`);
  log.error(`Failed: ${results.failed}`);
  
  if (results.failed > 0) {
    log.section('Failed Tests');
    results.tests.filter(t => !t.passed).forEach(test => {
      log.error(`${test.name}: ${test.message}`);
    });
  }
  
  console.log('\n');
  if (results.failed === 0) {
    log.success('All tests passed! ✅');
    process.exit(0);
  } else {
    log.error('Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

if (require.main === module) {
  runTests().catch(error => {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { runTests };
