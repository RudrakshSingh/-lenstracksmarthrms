#!/usr/bin/env node

/**
 * Complete API Flow Test - For Frontend Documentation
 * 
 * Tests the complete flow:
 * 1. Tenant Creation
 * 2. Admin Login (First Time)
 * 3. Password Change
 * 4. Employee Creation with tenantId
 * 5. Employee Retrieval
 * 6. Store Creation
 * 7. Department Creation
 * 8. Tenant Isolation Verification
 * 
 * This script generates documentation with actual API responses
 */

require('dotenv').config();
const axios = require('axios');
const https = require('https');

const BASE_URL = process.env.BASE_URL || 'https://98.70.245.87';
const API_HOST = 'api.etelios.com';

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

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Host': API_HOST
  },
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  validateStatus: () => true
});

let testResults = {
  timestamp: new Date().toISOString(),
  baseUrl: BASE_URL,
  tests: []
};

function recordTest(name, method, endpoint, headers, body, response, passed) {
  testResults.tests.push({
    name,
    method,
    endpoint,
    headers: { ...headers, Authorization: headers.Authorization ? 'Bearer ***' : undefined },
    body,
    response: {
      status: response.status,
      data: response.data
    },
    passed,
    timestamp: new Date().toISOString()
  });
}

async function makeRequest(method, endpoint, headers = {}, body = null) {
  const config = { method, url: endpoint, headers };
  if (body) {
    config.data = body;
  }
  const response = await api.request(config);
  return response;
}

async function runCompleteFlowTest() {
  log.section('Complete API Flow Test - For Documentation');
  log.info(`Base URL: ${BASE_URL}`);
  log.info(`API Host: ${API_HOST}`);
  
  const timestamp = Date.now();
  const testTenantId = `test-tenant-${timestamp}`;
  
  // ============================================
  // 1. Super Admin Login
  // ============================================
  log.section('1. Super Admin Login');
  
  let superAdminToken = null;
  try {
    const loginRes = await makeRequest('POST', '/api/auth/login', {
      'Host': API_HOST
    }, {
      emailOrEmployeeId: 'admin@etelios.com',
      password: 'Admin@123456'
    });
    
    recordTest(
      'Super Admin Login',
      'POST',
      '/api/auth/login',
      { 'Host': API_HOST },
      { emailOrEmployeeId: 'admin@etelios.com', password: '***' },
      loginRes,
      loginRes.status === 200 && loginRes.data.success
    );
    
    if (loginRes.status === 200 && loginRes.data.success) {
      superAdminToken = loginRes.data.data?.accessToken || loginRes.data.data?.token;
      log.success('Super Admin login successful');
    } else {
      log.error(`Super Admin login failed: ${loginRes.status}`);
      log.error(JSON.stringify(loginRes.data, null, 2));
      return testResults;
    }
  } catch (e) {
    log.error(`Super Admin login error: ${e.message}`);
    return testResults;
  }
  
  // ============================================
  // 2. Create Tenant
  // ============================================
  log.section('2. Create Tenant');
  
  const tenantData = {
    name: `Test Company ${timestamp}`,
    email: `admin@test-${timestamp}.com`,
    domain: testTenantId,
    subdomain: testTenantId,
    plan: 'enterprise',
    modules: ['hr', 'analytics', 'reports']
  };
  
  let tenantId = null;
  let adminEmail = null;
  let adminTempPassword = null;
  
  try {
    const tenantRes = await makeRequest('POST', '/api/tenants', {
      'Host': API_HOST,
      'Authorization': `Bearer ${superAdminToken}`
    }, tenantData);
    
    recordTest(
      'Create Tenant',
      'POST',
      '/api/tenants',
      { 'Host': API_HOST, 'Authorization': 'Bearer ***' },
      tenantData,
      tenantRes,
      tenantRes.status === 201 || tenantRes.status === 200
    );
    
    if (tenantRes.status === 201 || tenantRes.status === 200) {
      const tenant = tenantRes.data.data || tenantRes.data;
      tenantId = tenant.tenantId || tenant.domain || testTenantId;
      adminEmail = tenant.adminUser?.email || tenant.email;
      adminTempPassword = tenant.adminUser?.temporaryPassword || tenant.temporaryPassword;
      
      log.success(`Tenant created: ${tenantId}`);
      log.info(`Admin Email: ${adminEmail}`);
      log.info(`Temp Password: ${adminTempPassword || 'N/A'}`);
    } else {
      log.error(`Tenant creation failed: ${tenantRes.status}`);
      log.error(JSON.stringify(tenantRes.data, null, 2));
      return testResults;
    }
  } catch (e) {
    log.error(`Tenant creation error: ${e.message}`);
    return testResults;
  }
  
  // ============================================
  // 3. Admin Login (First Time)
  // ============================================
  log.section('3. Admin Login (First Time)');
  
  let adminToken = null;
  try {
    const adminLoginRes = await makeRequest('POST', '/api/auth/login', {
      'Host': API_HOST,
      'X-Tenant-Id': tenantId
    }, {
      emailOrEmployeeId: adminEmail,
      password: adminTempPassword || 'TempPass123!'
    });
    
    recordTest(
      'Admin Login (First Time)',
      'POST',
      '/api/auth/login',
      { 'Host': API_HOST, 'X-Tenant-Id': tenantId },
      { emailOrEmployeeId: adminEmail, password: '***' },
      adminLoginRes,
      adminLoginRes.status === 200 && adminLoginRes.data.success
    );
    
    if (adminLoginRes.status === 200 && adminLoginRes.data.success) {
      adminToken = adminLoginRes.data.data?.accessToken || adminLoginRes.data.data?.token;
      const mustChangePassword = adminLoginRes.data.mustChangePassword || adminLoginRes.data.data?.mustChangePassword;
      
      log.success('Admin login successful');
      if (mustChangePassword) {
        log.info('Password change required');
      }
    } else {
      log.error(`Admin login failed: ${adminLoginRes.status}`);
      log.error(JSON.stringify(adminLoginRes.data, null, 2));
      return testResults;
    }
  } catch (e) {
    log.error(`Admin login error: ${e.message}`);
    return testResults;
  }
  
  // ============================================
  // 4. Change Password
  // ============================================
  log.section('4. Change Password');
  
  const newPassword = 'NewPassword123!';
  try {
    const changePassRes = await makeRequest('POST', '/api/auth/change-password', {
      'Host': API_HOST,
      'Authorization': `Bearer ${adminToken}`,
      'X-Tenant-Id': tenantId
    }, {
      currentPassword: adminTempPassword || 'TempPass123!',
      newPassword: newPassword
    });
    
    recordTest(
      'Change Password',
      'POST',
      '/api/auth/change-password',
      { 'Host': API_HOST, 'Authorization': 'Bearer ***', 'X-Tenant-Id': tenantId },
      { currentPassword: '***', newPassword: '***' },
      changePassRes,
      changePassRes.status === 200 && changePassRes.data.success
    );
    
    if (changePassRes.status === 200 && changePassRes.data.success) {
      log.success('Password changed successfully');
    } else {
      log.error(`Password change failed: ${changePassRes.status}`);
      log.error(JSON.stringify(changePassRes.data, null, 2));
    }
  } catch (e) {
    log.error(`Password change error: ${e.message}`);
  }
  
  // ============================================
  // 5. Create Employee with tenantId
  // ============================================
  log.section('5. Create Employee with tenantId');
  
  const employeeData = {
    employeeId: `EMP-${timestamp}`,
    firstName: 'John',
    lastName: 'Doe',
    email: `john.doe.${timestamp}@example.com`,
    department: 'Sales',
    designation: 'Sales Manager',
    annual_ctc: 720000,
    gender: 'Male',
    password: 'Employee123!'
  };
  
  let employeeId = null;
  try {
    const empRes = await makeRequest('POST', '/api/hr/employees', {
      'Host': API_HOST,
      'Authorization': `Bearer ${adminToken}`,
      'X-Tenant-Id': tenantId
    }, employeeData);
    
    recordTest(
      'Create Employee',
      'POST',
      '/api/hr/employees',
      { 'Host': API_HOST, 'Authorization': 'Bearer ***', 'X-Tenant-Id': tenantId },
      employeeData,
      empRes,
      (empRes.status === 201 || empRes.status === 200) && empRes.data.success
    );
    
    if ((empRes.status === 201 || empRes.status === 200) && empRes.data.success) {
      const employee = empRes.data.data || empRes.data;
      employeeId = employee._id || employee.id;
      
      // Check tenantId in response
      const tenantIdInResponse = employee.tenantId;
      log.success(`Employee created: ${employee.employeeId}`);
      log.info(`tenantId in response: ${tenantIdInResponse}`);
      
      if (tenantIdInResponse === tenantId || tenantIdInResponse === tenantId.toLowerCase()) {
        log.success('✅ Employee has correct tenantId');
      } else {
        log.error(`❌ Employee has wrong tenantId: ${tenantIdInResponse}`);
      }
    } else {
      log.error(`Employee creation failed: ${empRes.status}`);
      log.error(JSON.stringify(empRes.data, null, 2));
    }
  } catch (e) {
    log.error(`Employee creation error: ${e.message}`);
  }
  
  // ============================================
  // 6. Get Employee by ID
  // ============================================
  log.section('6. Get Employee by ID');
  
  if (employeeId) {
    try {
      const getEmpRes = await makeRequest('GET', `/api/hr/employees/${employeeId}`, {
        'Host': API_HOST,
        'Authorization': `Bearer ${adminToken}`,
        'X-Tenant-Id': tenantId
      });
      
      recordTest(
        'Get Employee by ID',
        'GET',
        `/api/hr/employees/${employeeId}`,
        { 'Host': API_HOST, 'Authorization': 'Bearer ***', 'X-Tenant-Id': tenantId },
        null,
        getEmpRes,
        getEmpRes.status === 200 && getEmpRes.data.success
      );
      
      if (getEmpRes.status === 200 && getEmpRes.data.success) {
        const employee = getEmpRes.data.data || getEmpRes.data;
        log.success(`Employee retrieved: ${employee.employeeId}`);
        log.info(`tenantId: ${employee.tenantId}`);
        log.info(`Gender: ${employee.gender}`);
        log.info(`Annual CTC: ${employee.annual_ctc}`);
      } else {
        log.error(`Get employee failed: ${getEmpRes.status}`);
      }
    } catch (e) {
      log.error(`Get employee error: ${e.message}`);
    }
  }
  
  // ============================================
  // 7. Get Employees List
  // ============================================
  log.section('7. Get Employees List');
  
  try {
    const listRes = await makeRequest('GET', '/api/hr/employees', {
      'Host': API_HOST,
      'Authorization': `Bearer ${adminToken}`,
      'X-Tenant-Id': tenantId
    });
    
    recordTest(
      'Get Employees List',
      'GET',
      '/api/hr/employees',
      { 'Host': API_HOST, 'Authorization': 'Bearer ***', 'X-Tenant-Id': tenantId },
      null,
      listRes,
      listRes.status === 200 && listRes.data.success
    );
    
    if (listRes.status === 200 && listRes.data.success) {
      const employees = listRes.data.data || listRes.data.employees || [];
      log.success(`Employees list retrieved: ${employees.length} employees`);
      
      // Check tenantId for all employees
      const allHaveTenantId = employees.every(emp => emp.tenantId);
      if (allHaveTenantId) {
        log.success('✅ All employees have tenantId');
      } else {
        log.warn('⚠️  Some employees missing tenantId');
      }
    } else {
      log.error(`Get employees list failed: ${listRes.status}`);
    }
  } catch (e) {
    log.error(`Get employees list error: ${e.message}`);
  }
  
  // ============================================
  // 8. Create Store
  // ============================================
  log.section('8. Create Store');
  
  const storeData = {
    name: `Test Store ${timestamp}`,
    code: `STORE-${timestamp}`,
    address: {
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001'
    }
  };
  
  let storeId = null;
  try {
    const storeRes = await makeRequest('POST', '/api/hr/stores', {
      'Host': API_HOST,
      'Authorization': `Bearer ${adminToken}`,
      'X-Tenant-Id': tenantId
    }, storeData);
    
    recordTest(
      'Create Store',
      'POST',
      '/api/hr/stores',
      { 'Host': API_HOST, 'Authorization': 'Bearer ***', 'X-Tenant-Id': tenantId },
      storeData,
      storeRes,
      (storeRes.status === 201 || storeRes.status === 200) && storeRes.data.success
    );
    
    if ((storeRes.status === 201 || storeRes.status === 200) && storeRes.data.success) {
      const store = storeRes.data.data || storeRes.data;
      storeId = store._id || store.id;
      log.success(`Store created: ${store.code}`);
      log.info(`tenantId: ${store.tenantId}`);
    } else {
      log.error(`Store creation failed: ${storeRes.status}`);
    }
  } catch (e) {
    log.error(`Store creation error: ${e.message}`);
  }
  
  // ============================================
  // 9. Create Department
  // ============================================
  log.section('9. Create Department');
  
  const deptData = {
    name: `Test Department ${timestamp}`,
    code: `DEPT-${timestamp}`
  };
  
  let deptId = null;
  try {
    const deptRes = await makeRequest('POST', '/api/hr/departments', {
      'Host': API_HOST,
      'Authorization': `Bearer ${adminToken}`,
      'X-Tenant-Id': tenantId
    }, deptData);
    
    recordTest(
      'Create Department',
      'POST',
      '/api/hr/departments',
      { 'Host': API_HOST, 'Authorization': 'Bearer ***', 'X-Tenant-Id': tenantId },
      deptData,
      deptRes,
      (deptRes.status === 201 || deptRes.status === 200) && deptRes.data.success
    );
    
    if ((deptRes.status === 201 || deptRes.status === 200) && deptRes.data.success) {
      const dept = deptRes.data.data || deptRes.data;
      deptId = dept._id || dept.id;
      log.success(`Department created: ${dept.code}`);
      log.info(`tenantId: ${dept.tenantId}`);
    } else {
      log.error(`Department creation failed: ${deptRes.status}`);
    }
  } catch (e) {
    log.error(`Department creation error: ${e.message}`);
  }
  
  // ============================================
  // 10. Tenant Isolation Test
  // ============================================
  log.section('10. Tenant Isolation Test');
  
  if (employeeId) {
    // Try to access with different tenantId
    try {
      const wrongTenantRes = await makeRequest('GET', `/api/hr/employees/${employeeId}`, {
        'Host': API_HOST,
        'Authorization': `Bearer ${adminToken}`,
        'X-Tenant-Id': 'different-tenant'
      });
      
      recordTest(
        'Tenant Isolation - Cross Tenant Access',
        'GET',
        `/api/hr/employees/${employeeId}`,
        { 'Host': API_HOST, 'Authorization': 'Bearer ***', 'X-Tenant-Id': 'different-tenant' },
        null,
        wrongTenantRes,
        wrongTenantRes.status === 404 || wrongTenantRes.status === 403
      );
      
      if (wrongTenantRes.status === 404 || wrongTenantRes.status === 403) {
        log.success('✅ Tenant isolation working - cross-tenant access blocked');
      } else {
        log.error(`❌ Tenant isolation breach - Status: ${wrongTenantRes.status}`);
      }
    } catch (e) {
      log.error(`Tenant isolation test error: ${e.message}`);
    }
  }
  
  // ============================================
  // Test Summary
  // ============================================
  log.section('Test Summary');
  const passed = testResults.tests.filter(t => t.passed).length;
  const failed = testResults.tests.filter(t => !t.passed).length;
  log.info(`Total Tests: ${testResults.tests.length}`);
  log.success(`Passed: ${passed}`);
  if (failed > 0) {
    log.error(`Failed: ${failed}`);
  }
  
  return testResults;
}

if (require.main === module) {
  runCompleteFlowTest()
    .then(results => {
      // Save results to file
      const fs = require('fs');
      const filename = `api-test-results-${Date.now()}.json`;
      fs.writeFileSync(filename, JSON.stringify(results, null, 2));
      log.info(`\nTest results saved to: ${filename}`);
      
      // Generate documentation
      generateDocumentation(results);
    })
    .catch(error => {
      log.error(`Fatal error: ${error.message}`);
      console.error(error);
      process.exit(1);
    });
}

function generateDocumentation(results) {
  const fs = require('fs');
  let doc = `# Complete API Flow Documentation - Tested & Verified\n\n`;
  doc += `**Generated:** ${new Date().toISOString()}\n`;
  doc += `**Base URL:** ${results.baseUrl}\n`;
  doc += `**API Host:** api.etelios.com\n\n`;
  doc += `---\n\n`;
  
  doc += `## Test Results Summary\n\n`;
  const passed = results.tests.filter(t => t.passed).length;
  const failed = results.tests.filter(t => !t.passed).length;
  doc += `- **Total Tests:** ${results.tests.length}\n`;
  doc += `- **Passed:** ${passed}\n`;
  doc += `- **Failed:** ${failed}\n\n`;
  
  doc += `---\n\n`;
  doc += `## Complete API Flow\n\n`;
  
  results.tests.forEach((test, index) => {
    doc += `### ${index + 1}. ${test.name}\n\n`;
    doc += `**Status:** ${test.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;
    doc += `**Method:** \`${test.method}\`\n\n`;
    doc += `**Endpoint:** \`${test.endpoint}\`\n\n`;
    doc += `**Headers:**\n\`\`\`json\n${JSON.stringify(test.headers, null, 2)}\n\`\`\`\n\n`;
    
    if (test.body) {
      doc += `**Request Body:**\n\`\`\`json\n${JSON.stringify(test.body, null, 2)}\n\`\`\`\n\n`;
    }
    
    doc += `**Response Status:** \`${test.response.status}\`\n\n`;
    doc += `**Response Body:**\n\`\`\`json\n${JSON.stringify(test.response.data, null, 2)}\n\`\`\`\n\n`;
    doc += `---\n\n`;
  });
  
  const filename = `API_FLOW_DOCUMENTATION.md`;
  fs.writeFileSync(filename, doc);
  log.success(`Documentation generated: ${filename}`);
}

module.exports = { runCompleteFlowTest };
