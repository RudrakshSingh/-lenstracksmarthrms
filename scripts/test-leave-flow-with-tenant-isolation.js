#!/usr/bin/env node

/**
 * Test Complete Leave Flow with Tenant Isolation
 * 
 * Tests:
 * 1. Employee applies for leave
 * 2. Manager/HR sees pending leave (only their tenant)
 * 3. Manager/HR approves leave
 * 4. Verify tenant isolation - one tenant cannot see another tenant's leaves
 */

const https = require('https');
const http = require('http');

// Configuration
const API_BASE = process.env.API_BASE || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com';

// Test credentials
const TENANT1 = {
  name: 'Tenant 1 (upcapto)',
  employee: {
    email: 'rudi@gmail.com',
    password: 'Rudi@3006',
    tenantId: 'upcapto'
  },
  manager: {
    email: 'rudi@gmail.com', // Same user as manager
    password: 'Rudi@3006',
    tenantId: 'upcapto'
  }
};

const TENANT2 = {
  name: 'Tenant 2 (eyekra)',
  employee: {
    email: 'Aditya@gmail.com',
    password: 'yrv0s48mA1!',
    tenantId: 'eyekra'
  },
  manager: {
    email: 'Aditya@gmail.com', // Same user as manager
    password: 'yrv0s48mA1!',
    tenantId: 'eyekra'
  }
};

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'cyan');
  console.log('='.repeat(70));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logTest(message) {
  log(`🧪 ${message}`, 'magenta');
}

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.setTimeout(options.timeout || 15000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Login helper
async function login(email, password) {
  try {
    const response = await makeRequest(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      body: { email, password }
    });

    if (response.status === 200 && response.data.success) {
      const token = response.data.data?.accessToken || response.data.data?.token || response.data.accessToken || response.data.token;
      const user = response.data.data?.user || response.data.user;
      const tenantId = user?.tenantId || response.data.data?.tenantId || 'default';

      if (!token) {
        return null;
      }

      return { token, user, tenantId };
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Test tenant isolation
async function testTenantIsolation(tenant1Auth, tenant2Auth) {
  logSection('Testing Tenant Isolation');
  
  try {
    // Tenant 1 manager gets pending leaves
    logTest('Tenant 1 Manager getting pending leaves...');
    const tenant1Response = await makeRequest(`${API_BASE}/api/hr/leave-requests?pending_for_me=true`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tenant1Auth.token}`,
        'X-Tenant-Id': tenant1Auth.tenantId
      }
    });
    
    const tenant1Leaves = tenant1Response.status === 200 && tenant1Response.data.success
      ? (tenant1Response.data.data?.requests || tenant1Response.data.data || [])
      : [];
    
    logInfo(`Tenant 1 (${tenant1Auth.tenantId}) pending leaves: ${tenant1Leaves.length}`);
    tenant1Leaves.forEach((leave, i) => {
      logInfo(`  ${i + 1}. ${leave.employee_name || leave.employee_id} - ${leave.leave_type} (${leave.days} days)`);
    });
    
    // Tenant 2 manager gets pending leaves
    logTest('Tenant 2 Manager getting pending leaves...');
    const tenant2Response = await makeRequest(`${API_BASE}/api/hr/leave-requests?pending_for_me=true`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tenant2Auth.token}`,
        'X-Tenant-Id': tenant2Auth.tenantId
      }
    });
    
    const tenant2Leaves = tenant2Response.status === 200 && tenant2Response.data.success
      ? (tenant2Response.data.data?.requests || tenant2Response.data.data || [])
      : [];
    
    logInfo(`Tenant 2 (${tenant2Auth.tenantId}) pending leaves: ${tenant2Leaves.length}`);
    tenant2Leaves.forEach((leave, i) => {
      logInfo(`  ${i + 1}. ${leave.employee_name || leave.employee_id} - ${leave.leave_type} (${leave.days} days)`);
    });
    
    // Check for cross-tenant data
    const tenant1EmployeeIds = new Set(
      tenant1Leaves.map(l => l.employee_id?.toString()).filter(Boolean)
    );
    const tenant2EmployeeIds = new Set(
      tenant2Leaves.map(l => l.employee_id?.toString()).filter(Boolean)
    );
    
    const commonIds = [...tenant1EmployeeIds].filter(id => tenant2EmployeeIds.has(id));
    
    if (commonIds.length > 0) {
      logError(`❌ Tenant isolation FAILED - Found ${commonIds.length} common leave requests between tenants`);
      return false;
    } else {
      logSuccess(`✅ Tenant isolation working - No common leave requests between tenants`);
      return true;
    }
  } catch (error) {
    logError(`Tenant isolation test error: ${error.message}`);
    return false;
  }
}

// Main test
async function runTest() {
  logSection('Complete Leave Flow Test with Tenant Isolation');
  logInfo(`API Base URL: ${API_BASE}\n`);

  // Step 1: Login as Tenant 1 Employee
  logSection('Step 1: Tenant 1 Employee Applies for Leave');
  const tenant1EmployeeAuth = await login(TENANT1.employee.email, TENANT1.employee.password);
  if (!tenant1EmployeeAuth) {
    logError('Failed to login as Tenant 1 employee');
    return;
  }
  logSuccess(`Tenant 1 Employee logged in (${tenant1EmployeeAuth.tenantId})`);
  
  // Apply for leave
  const leaveResponse1 = await makeRequest(`${API_BASE}/api/hr/leave/mark-today`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tenant1EmployeeAuth.token}`,
      'X-Tenant-Id': tenant1EmployeeAuth.tenantId
    },
    body: {
      leaveType: 'CL',
      reason: 'Tenant 1 employee leave request'
    }
  });
  
  let tenant1LeaveId = null;
  if (leaveResponse1.status === 200 && leaveResponse1.data.success) {
    tenant1LeaveId = leaveResponse1.data.data?.leaveRequest?._id || leaveResponse1.data.data?._id;
    logSuccess(`Tenant 1 leave request created: ${tenant1LeaveId}`);
  } else if (leaveResponse1.status === 400 && leaveResponse1.data.error === 'ALREADY_EXISTS') {
    logWarning('Tenant 1 employee already on leave - will use existing request');
  } else {
    logError(`Failed to create leave: ${leaveResponse1.data.message || 'Unknown'}`);
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Step 2: Login as Tenant 2 Employee
  logSection('Step 2: Tenant 2 Employee Applies for Leave');
  const tenant2EmployeeAuth = await login(TENANT2.employee.email, TENANT2.employee.password);
  if (!tenant2EmployeeAuth) {
    logError('Failed to login as Tenant 2 employee');
    return;
  }
  logSuccess(`Tenant 2 Employee logged in (${tenant2EmployeeAuth.tenantId})`);
  
  // Apply for leave
  const leaveResponse2 = await makeRequest(`${API_BASE}/api/hr/leave/mark-today`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tenant2EmployeeAuth.token}`,
      'X-Tenant-Id': tenant2EmployeeAuth.tenantId
    },
    body: {
      leaveType: 'CL',
      reason: 'Tenant 2 employee leave request'
    }
  });
  
  let tenant2LeaveId = null;
  if (leaveResponse2.status === 200 && leaveResponse2.data.success) {
    tenant2LeaveId = leaveResponse2.data.data?.leaveRequest?._id || leaveResponse2.data.data?._id;
    logSuccess(`Tenant 2 leave request created: ${tenant2LeaveId}`);
  } else if (leaveResponse2.status === 400 && leaveResponse2.data.error === 'ALREADY_EXISTS') {
    logWarning('Tenant 2 employee already on leave - will use existing request');
  } else {
    logError(`Failed to create leave: ${leaveResponse2.data.message || 'Unknown'}`);
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Step 3: Login as Tenant 1 Manager
  logSection('Step 3: Tenant 1 Manager Views Pending Leaves');
  const tenant1ManagerAuth = await login(TENANT1.manager.email, TENANT1.manager.password);
  if (!tenant1ManagerAuth) {
    logError('Failed to login as Tenant 1 manager');
    return;
  }
  logSuccess(`Tenant 1 Manager logged in (${tenant1ManagerAuth.tenantId})`);
  logInfo(`Role: ${tenant1ManagerAuth.user?.role || 'N/A'}`);
  
  // Get pending leaves
  const pending1Response = await makeRequest(`${API_BASE}/api/hr/leave-requests?pending_for_me=true`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tenant1ManagerAuth.token}`,
      'X-Tenant-Id': tenant1ManagerAuth.tenantId
    }
  });
  
  let tenant1PendingLeaves = [];
  if (pending1Response.status === 200 && pending1Response.data.success) {
    tenant1PendingLeaves = pending1Response.data.data?.requests || pending1Response.data.data || [];
    logSuccess(`Tenant 1 Manager sees ${tenant1PendingLeaves.length} pending leave(s)`);
    tenant1PendingLeaves.forEach((leave, i) => {
      logInfo(`  ${i + 1}. ${leave.employee_name || leave.employee_id} - ${leave.leave_type} - ID: ${leave._id || leave.request_id}`);
    });
  } else {
    logError(`Failed to get pending leaves: ${pending1Response.data.message || 'Unknown'}`);
  }
  
  // Step 4: Login as Tenant 2 Manager
  logSection('Step 4: Tenant 2 Manager Views Pending Leaves');
  const tenant2ManagerAuth = await login(TENANT2.manager.email, TENANT2.manager.password);
  if (!tenant2ManagerAuth) {
    logError('Failed to login as Tenant 2 manager');
    return;
  }
  logSuccess(`Tenant 2 Manager logged in (${tenant2ManagerAuth.tenantId})`);
  logInfo(`Role: ${tenant2ManagerAuth.user?.role || 'N/A'}`);
  
  // Get pending leaves
  const pending2Response = await makeRequest(`${API_BASE}/api/hr/leave-requests?pending_for_me=true`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${tenant2ManagerAuth.token}`,
      'X-Tenant-Id': tenant2ManagerAuth.tenantId
    }
  });
  
  let tenant2PendingLeaves = [];
  if (pending2Response.status === 200 && pending2Response.data.success) {
    tenant2PendingLeaves = pending2Response.data.data?.requests || pending2Response.data.data || [];
    logSuccess(`Tenant 2 Manager sees ${tenant2PendingLeaves.length} pending leave(s)`);
    tenant2PendingLeaves.forEach((leave, i) => {
      logInfo(`  ${i + 1}. ${leave.employee_name || leave.employee_id} - ${leave.leave_type} - ID: ${leave._id || leave.request_id}`);
    });
  } else {
    logError(`Failed to get pending leaves: ${pending2Response.data.message || 'Unknown'}`);
  }
  
  // Step 5: Test Tenant Isolation
  const isolationPassed = await testTenantIsolation(tenant1ManagerAuth, tenant2ManagerAuth);
  
  // Step 6: Try cross-tenant approval (should fail)
  logSection('Step 6: Testing Cross-Tenant Approval (Should Fail)');
  
  if (tenant1PendingLeaves.length > 0 && tenant2ManagerAuth) {
    const crossTenantLeaveId = tenant1PendingLeaves[0]._id || tenant1PendingLeaves[0].request_id;
    logTest(`Tenant 2 Manager trying to approve Tenant 1 leave (should fail)...`);
    
    const crossApproveResponse = await makeRequest(`${API_BASE}/api/hr/leave-requests/${crossTenantLeaveId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tenant2ManagerAuth.token}`,
        'X-Tenant-Id': tenant2ManagerAuth.tenantId
      },
      body: {
        comments: 'Test cross-tenant approval'
      }
    });
    
    if (crossApproveResponse.status === 403) {
      logSuccess(`✅ Cross-tenant approval correctly blocked`);
      logInfo(`Error: ${crossApproveResponse.data.message || 'Forbidden'}`);
    } else {
      logError(`❌ Cross-tenant approval should have failed but got status ${crossApproveResponse.status}`);
    }
  }
  
  // Step 7: Approve own tenant's leave
  logSection('Step 7: Approve Own Tenant Leave');
  
  if (tenant1PendingLeaves.length > 0) {
    const ownLeaveId = tenant1PendingLeaves[0]._id || tenant1PendingLeaves[0].request_id;
    logTest(`Tenant 1 Manager approving Tenant 1 leave...`);
    
    const approveResponse = await makeRequest(`${API_BASE}/api/hr/leave-requests/${ownLeaveId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tenant1ManagerAuth.token}`,
        'X-Tenant-Id': tenant1ManagerAuth.tenantId
      },
      body: {
        comments: 'Approved by Tenant 1 Manager'
      }
    });
    
    if (approveResponse.status === 200 && approveResponse.data.success) {
      logSuccess(`✅ Leave approved successfully`);
      logInfo(`Status: ${approveResponse.data.data?.status || 'N/A'}`);
    } else {
      logError(`Leave approval failed: ${approveResponse.data.message || 'Unknown'}`);
    }
  }
  
  if (tenant2PendingLeaves.length > 0) {
    const ownLeaveId = tenant2PendingLeaves[0]._id || tenant2PendingLeaves[0].request_id;
    logTest(`Tenant 2 Manager approving Tenant 2 leave...`);
    
    const approveResponse = await makeRequest(`${API_BASE}/api/hr/leave-requests/${ownLeaveId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tenant2ManagerAuth.token}`,
        'X-Tenant-Id': tenant2ManagerAuth.tenantId
      },
      body: {
        comments: 'Approved by Tenant 2 Manager'
      }
    });
    
    if (approveResponse.status === 200 && approveResponse.data.success) {
      logSuccess(`✅ Leave approved successfully`);
      logInfo(`Status: ${approveResponse.data.data?.status || 'N/A'}`);
    } else {
      logError(`Leave approval failed: ${approveResponse.data.message || 'Unknown'}`);
    }
  }
  
  // Summary
  logSection('Test Summary');
  logInfo(`Tenant 1 (${TENANT1.employee.tenantId}):`);
  logInfo(`  Employee Login: ${tenant1EmployeeAuth ? '✅' : '❌'}`);
  logInfo(`  Leave Application: ${leaveResponse1.status === 200 || leaveResponse1.status === 400 ? '✅' : '❌'}`);
  logInfo(`  Manager Login: ${tenant1ManagerAuth ? '✅' : '❌'}`);
  logInfo(`  Pending Leaves: ${tenant1PendingLeaves.length}`);
  
  logInfo(`\nTenant 2 (${TENANT2.employee.tenantId}):`);
  logInfo(`  Employee Login: ${tenant2EmployeeAuth ? '✅' : '❌'}`);
  logInfo(`  Leave Application: ${leaveResponse2.status === 200 || leaveResponse2.status === 400 ? '✅' : '❌'}`);
  logInfo(`  Manager Login: ${tenant2ManagerAuth ? '✅' : '❌'}`);
  logInfo(`  Pending Leaves: ${tenant2PendingLeaves.length}`);
  
  logInfo(`\nTenant Isolation: ${isolationPassed ? '✅ PASS' : '❌ FAIL'}`);
  
  logSection('Test Complete');
}

runTest().catch(error => {
  logError(`Test failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
