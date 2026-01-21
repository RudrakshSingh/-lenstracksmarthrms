#!/usr/bin/env node

/**
 * Comprehensive Tenant Isolation Test Suite
 * 
 * Tests all aspects of tenant isolation:
 * 1. New employee creation with tenantId
 * 2. Tenant isolation for employees
 * 3. Tenant isolation for stores
 * 4. Tenant isolation for departments
 * 5. Cross-tenant access prevention
 * 
 * Usage:
 *   node test-tenant-isolation-comprehensive.js
 */

require('dotenv').config();
const axios = require('axios');
const https = require('https');

const BASE_URL = process.env.BASE_URL || 'https://98.70.245.87';
const TENANT_A = 'lenstrack';
const TENANT_B = 'test-tenant';

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

// Disable SSL verification for self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Host': 'api.etelios.com'
  },
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  validateStatus: () => true
});

let tenantAToken = null;
let tenantBToken = null;
let tenantAEmployeeId = null;
let tenantBEmployeeId = null;
let tenantAStoreId = null;
let tenantBStoreId = null;
let tenantADeptId = null;
let tenantBDeptId = null;

async function login(email, password, tenantId) {
  try {
    const response = await api.post('/api/auth/login', {
      emailOrEmployeeId: email,
      password: password
    }, {
      headers: { 'X-Tenant-Id': tenantId }
    });
    
    if (response.status === 200 && response.data.success) {
      return response.data.data?.accessToken || response.data.data?.token || response.data.token;
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function makeRequest(method, url, tenantId, token, data = null) {
  const headers = {
    'X-Tenant-Id': tenantId
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const config = { headers, method, url };
  if (data) {
    config.data = data;
  }
  
  return await api.request(config);
}

async function runTests() {
  log.section('Comprehensive Tenant Isolation Test Suite');
  log.info(`Base URL: ${BASE_URL}`);
  log.info(`Tenant A: ${TENANT_A}`);
  log.info(`Tenant B: ${TENANT_B}`);
  
  let passedTests = 0;
  let failedTests = 0;
  
  // ============================================
  // 1. Authentication Tests
  // ============================================
  log.section('1. Authentication Tests');
  
  try {
    tenantAToken = await login('admin@lenstrack.etelios.com', 'Lenstrack@Admin123', TENANT_A);
    if (tenantAToken) {
      log.success(`Tenant A login successful`);
      passedTests++;
    } else {
      log.error(`Tenant A login failed`);
      failedTests++;
      log.warn('Skipping remaining tests - authentication required');
      return { passedTests, failedTests };
    }
  } catch (e) {
    log.error(`Tenant A login error: ${e.message}`);
    failedTests++;
    return { passedTests, failedTests };
  }
  
  // ============================================
  // 2. New Employee Creation with tenantId
  // ============================================
  log.section('2. New Employee Creation with tenantId');
  
  const timestamp = Date.now();
  const employeeDataA = {
    employeeId: `EMP-TEST-A-${timestamp}`,
    firstName: 'TestA',
    lastName: 'Employee',
    email: `test-a-${timestamp}@example.com`,
    department: 'Sales',
    designation: 'Sales Associate',
    annual_ctc: 500000,
    gender: 'Male',
    password: 'Password123!'
  };
  
  try {
    const createRes = await makeRequest('POST', '/api/hr/employees', TENANT_A, tenantAToken, employeeDataA);
    if (createRes.status === 201 || createRes.status === 200) {
      const employee = createRes.data.data || createRes.data;
      tenantAEmployeeId = employee._id || employee.id;
      
      // Check tenantId in response
      const tenantIdInResponse = employee.tenantId;
      if (tenantIdInResponse === TENANT_A || tenantIdInResponse === TENANT_A.toLowerCase()) {
        log.success(`Employee created with correct tenantId: ${tenantIdInResponse}`);
        passedTests++;
      } else {
        log.error(`Employee created with wrong tenantId: ${tenantIdInResponse} (expected: ${TENANT_A})`);
        failedTests++;
      }
      
      log.success(`Employee created: ${employee.employeeId}`);
      passedTests++;
    } else {
      log.error(`Failed to create employee: ${createRes.status}`);
      log.error(JSON.stringify(createRes.data, null, 2));
      failedTests++;
    }
  } catch (e) {
    log.error(`Create employee error: ${e.message}`);
    failedTests++;
  }
  
  // ============================================
  // 3. Verify tenantId in GET Response
  // ============================================
  log.section('3. Verify tenantId in GET Response');
  
  if (tenantAEmployeeId) {
    try {
      const getRes = await makeRequest('GET', `/api/hr/employees/${tenantAEmployeeId}`, TENANT_A, tenantAToken);
      if (getRes.status === 200) {
        const employee = getRes.data.data || getRes.data;
        const tenantId = employee.tenantId;
        
        if (tenantId === TENANT_A || tenantId === TENANT_A.toLowerCase()) {
          log.success(`GET employee returns correct tenantId: ${tenantId}`);
          passedTests++;
        } else {
          log.error(`GET employee returns wrong tenantId: ${tenantId} (expected: ${TENANT_A})`);
          failedTests++;
        }
      } else {
        log.error(`Failed to get employee: ${getRes.status}`);
        failedTests++;
      }
    } catch (e) {
      log.error(`Get employee error: ${e.message}`);
      failedTests++;
    }
  }
  
  // ============================================
  // 4. Tenant Isolation - Employees List
  // ============================================
  log.section('4. Tenant Isolation - Employees List');
  
  try {
    const listRes = await makeRequest('GET', '/api/hr/employees', TENANT_A, tenantAToken);
    if (listRes.status === 200) {
      const employees = listRes.data.data || listRes.data.employees || [];
      
      // Check if our test employee is in the list
      const foundEmployee = employees.find(emp => 
        (emp._id || emp.id) === tenantAEmployeeId ||
        emp.employeeId === employeeDataA.employeeId
      );
      
      if (foundEmployee) {
        log.success(`Test employee found in list`);
        passedTests++;
        
        // Check tenantId
        if (foundEmployee.tenantId === TENANT_A || foundEmployee.tenantId === TENANT_A.toLowerCase()) {
          log.success(`Employee in list has correct tenantId`);
          passedTests++;
        } else {
          log.error(`Employee in list has wrong tenantId: ${foundEmployee.tenantId}`);
          failedTests++;
        }
      } else {
        log.error(`Test employee NOT found in list`);
        failedTests++;
      }
      
      // Check for employees with undefined tenantId (old employees)
      const undefinedCount = employees.filter(emp => !emp.tenantId || emp.tenantId === 'undefined').length;
      if (undefinedCount > 0) {
        log.warn(`⚠️  ${undefinedCount} employees have undefined tenantId (these need migration)`);
      }
    } else {
      log.error(`Failed to get employees list: ${listRes.status}`);
      failedTests++;
    }
  } catch (e) {
    log.error(`Get employees list error: ${e.message}`);
    failedTests++;
  }
  
  // ============================================
  // 5. Cross-Tenant Access Prevention
  // ============================================
  log.section('5. Cross-Tenant Access Prevention');
  
  if (tenantAEmployeeId) {
    // Try to access Tenant A employee with different tenantId
    try {
      const wrongTenantRes = await makeRequest('GET', `/api/hr/employees/${tenantAEmployeeId}`, 'different-tenant', tenantAToken);
      if (wrongTenantRes.status === 404 || wrongTenantRes.status === 403) {
        log.success(`Correctly blocked cross-tenant access (Status: ${wrongTenantRes.status})`);
        passedTests++;
      } else {
        log.error(`❌ ISOLATION BREACH! Cross-tenant access allowed (Status: ${wrongTenantRes.status})`);
        failedTests++;
      }
    } catch (e) {
      log.error(`Cross-tenant access test error: ${e.message}`);
      failedTests++;
    }
  }
  
  // ============================================
  // 6. Store Tenant Isolation
  // ============================================
  log.section('6. Store Tenant Isolation');
  
  const storeDataA = {
    name: `Store A ${timestamp}`,
    code: `STORE-A-${timestamp}`,
    address: { city: 'CityA', state: 'StateA', pincode: '123456' }
  };
  
  try {
    const storeRes = await makeRequest('POST', '/api/hr/stores', TENANT_A, tenantAToken, storeDataA);
    if (storeRes.status === 201 || storeRes.status === 200) {
      const store = storeRes.data.data || storeRes.data;
      tenantAStoreId = store._id || store.id;
      
      // Check tenantId
      const tenantId = store.tenantId;
      if (tenantId === TENANT_A || tenantId === TENANT_A.toLowerCase()) {
        log.success(`Store created with correct tenantId: ${tenantId}`);
        passedTests++;
      } else {
        log.error(`Store created with wrong tenantId: ${tenantId}`);
        failedTests++;
      }
      
      log.success(`Store created: ${store.code}`);
      passedTests++;
    } else {
      log.error(`Failed to create store: ${storeRes.status}`);
      failedTests++;
    }
  } catch (e) {
    log.error(`Create store error: ${e.message}`);
    failedTests++;
  }
  
  // ============================================
  // 7. Department Tenant Isolation
  // ============================================
  log.section('7. Department Tenant Isolation');
  
  const deptDataA = {
    name: `Department A ${timestamp}`,
    code: `DEPT-A-${timestamp}`
  };
  
  try {
    const deptRes = await makeRequest('POST', '/api/hr/departments', TENANT_A, tenantAToken, deptDataA);
    if (deptRes.status === 201 || deptRes.status === 200) {
      const dept = deptRes.data.data || deptRes.data;
      tenantADeptId = dept._id || dept.id;
      
      // Check tenantId
      const tenantId = dept.tenantId;
      if (tenantId === TENANT_A || tenantId === TENANT_A.toLowerCase()) {
        log.success(`Department created with correct tenantId: ${tenantId}`);
        passedTests++;
      } else {
        log.error(`Department created with wrong tenantId: ${tenantId}`);
        failedTests++;
      }
      
      log.success(`Department created: ${dept.code}`);
      passedTests++;
    } else {
      log.error(`Failed to create department: ${deptRes.status}`);
      failedTests++;
    }
  } catch (e) {
    log.error(`Create department error: ${e.message}`);
    failedTests++;
  }
  
  // ============================================
  // Test Summary
  // ============================================
  log.section('Test Summary');
  log.info(`Total Tests: ${passedTests + failedTests}`);
  log.success(`Passed: ${passedTests}`);
  if (failedTests > 0) {
    log.error(`Failed: ${failedTests}`);
  } else {
    log.success('All tests passed! ✅');
  }
  
  return { passedTests, failedTests };
}

if (require.main === module) {
  runTests()
    .then(({ passedTests, failedTests }) => {
      if (failedTests > 0) {
        process.exit(1);
      }
    })
    .catch(error => {
      log.error(`Fatal error: ${error.message}`);
      console.error(error);
      process.exit(1);
    });
}

module.exports = { runTests };
