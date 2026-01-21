#!/usr/bin/env node

/**
 * Test: Verify New Employees Get Correct tenantId
 * 
 * This test creates new employees and verifies they get the correct tenantId
 * and are properly isolated
 */

require('dotenv').config();
const axios = require('axios');
const https = require('https');

const BASE_URL = process.env.BASE_URL || 'https://98.70.245.87';
const TENANT_A = 'lenstrack';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}━━━ ${msg} ━━━${colors.reset}\n`)
};

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
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
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
      data: { error: error.message }
    };
  }
}

async function login(email, password, tenantId) {
  const response = await apiCall('POST', '/api/auth/login', {
    emailOrEmployeeId: email,
    password: password
  }, {
    'X-Tenant-Id': tenantId
  });
  
  if (response.status === 200 && response.data.success) {
    return response.data.data?.accessToken || response.data.data?.token || response.data.token;
  }
  return null;
}

async function testNewEmployeeTenantId() {
  log.section('Testing New Employee tenantId Assignment');
  
  // Login
  const token = await login('admin@lenstrack.etelios.com', 'Lenstrack@Admin123', TENANT_A);
  if (!token) {
    log.error('Failed to login');
    return;
  }
  
  log.success('Logged in successfully');
  
  // Create a new employee with explicit tenantId in header
  const timestamp = Date.now();
  const employeeData = {
    employeeId: `EMP-TEST-${timestamp}`,
    firstName: 'Test',
    lastName: 'Employee',
    email: `test-${timestamp}@example.com`,
    department: 'Sales',
    status: 'active'
  };
  
  log.info(`Creating employee: ${employeeData.employeeId}`);
  const createResponse = await apiCall('POST', '/api/hr/employees', employeeData, {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': TENANT_A
  });
  
  if (createResponse.status !== 201 && createResponse.status !== 200) {
    log.error(`Failed to create employee: ${createResponse.status}`);
    log.error(JSON.stringify(createResponse.data, null, 2));
    return;
  }
  
  const createdEmployee = createResponse.data.data || createResponse.data;
  log.success(`Employee created: ${createdEmployee.employeeId || createdEmployee.employee_id}`);
  
  // Check tenantId in response
  const tenantIdInResponse = createdEmployee.tenantId;
  log.info(`tenantId in response: ${tenantIdInResponse || 'undefined'}`);
  
  if (tenantIdInResponse === TENANT_A || tenantIdInResponse === TENANT_A.toLowerCase()) {
    log.success(`✅ Employee has correct tenantId: ${tenantIdInResponse}`);
  } else {
    log.error(`❌ Employee has wrong tenantId: ${tenantIdInResponse} (expected: ${TENANT_A})`);
  }
  
  // Get employee by ID and verify tenantId
  const employeeId = createdEmployee._id || createdEmployee.id;
  log.info(`Fetching employee by ID: ${employeeId}`);
  
  const getResponse = await apiCall('GET', `/api/hr/employees/${employeeId}`, null, {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': TENANT_A
  });
  
  if (getResponse.status === 200) {
    const fetchedEmployee = getResponse.data.data || getResponse.data;
    const fetchedTenantId = fetchedEmployee.tenantId;
    log.info(`tenantId in GET response: ${fetchedTenantId || 'undefined'}`);
    
    if (fetchedTenantId === TENANT_A || fetchedTenantId === TENANT_A.toLowerCase()) {
      log.success(`✅ GET employee returns correct tenantId: ${fetchedTenantId}`);
    } else {
      log.error(`❌ GET employee returns wrong tenantId: ${fetchedTenantId} (expected: ${TENANT_A})`);
    }
  } else {
    log.error(`Failed to get employee: ${getResponse.status}`);
    log.error(JSON.stringify(getResponse.data, null, 2));
  }
  
  // Get employees list and verify this employee appears
  log.info('Fetching employees list...');
  const listResponse = await apiCall('GET', '/api/hr/employees', null, {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': TENANT_A
  });
  
  if (listResponse.status === 200) {
    const employees = listResponse.data.data || listResponse.data.employees || [];
    log.info(`Total employees in list: ${employees.length}`);
    
    const foundEmployee = employees.find(emp => 
      (emp._id || emp.id) === employeeId ||
      emp.employeeId === employeeData.employeeId
    );
    
    if (foundEmployee) {
      log.success(`✅ Employee found in list`);
      log.info(`tenantId in list: ${foundEmployee.tenantId || 'undefined'}`);
      
      if (foundEmployee.tenantId === TENANT_A || foundEmployee.tenantId === TENANT_A.toLowerCase()) {
        log.success(`✅ Employee in list has correct tenantId`);
      } else {
        log.error(`❌ Employee in list has wrong tenantId: ${foundEmployee.tenantId}`);
      }
      
      // Check how many employees have undefined tenantId
      const undefinedCount = employees.filter(emp => !emp.tenantId || emp.tenantId === 'undefined').length;
      if (undefinedCount > 0) {
        log.error(`⚠️  ${undefinedCount} employees in list have undefined tenantId (these are old employees that need migration)`);
      }
    } else {
      log.error(`❌ Employee NOT found in list`);
    }
    
    // Check tenantId distribution
    const tenantIdCounts = {};
    employees.forEach(emp => {
      const tid = emp.tenantId || 'undefined';
      tenantIdCounts[tid] = (tenantIdCounts[tid] || 0) + 1;
    });
    
    log.info('\nTenantId distribution in list:');
    Object.entries(tenantIdCounts).forEach(([tid, count]) => {
      log.info(`  ${tid}: ${count} employees`);
    });
  } else {
    log.error(`Failed to get employees list: ${listResponse.status}`);
  }
  
  // Test: Try to access with different tenantId (should fail)
  log.section('Testing Cross-Tenant Access (Should Fail)');
  const wrongTenantResponse = await apiCall('GET', `/api/hr/employees/${employeeId}`, null, {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': 'different-tenant'
  });
  
  if (wrongTenantResponse.status === 404 || wrongTenantResponse.status === 403) {
    log.success(`✅ Correctly blocked access with wrong tenantId (Status: ${wrongTenantResponse.status})`);
  } else {
    log.error(`❌ Should have blocked access but got Status: ${wrongTenantResponse.status}`);
    log.error(`Response: ${JSON.stringify(wrongTenantResponse.data, null, 2)}`);
  }
  
  log.section('Test Summary');
  log.info('If new employee has correct tenantId, tenant isolation is working for NEW data.');
  log.info('Old employees with undefined tenantId need migration.');
}

if (require.main === module) {
  testNewEmployeeTenantId().catch(error => {
    log.error(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = { testNewEmployeeTenantId };
