#!/usr/bin/env node

/**
 * Complete Flow Test Script
 * 
 * Tests all APIs according to COMPLETE_SYSTEM_FLOW.md documentation:
 * 1. Superadmin Login
 * 2. Create Tenant
 * 3. Tenant Admin Login & Password Change
 * 4. Create Store
 * 5. Create Department
 * 6. Create Employee
 * 7. Assign Store and Department
 * 8. Employee Login
 * 9. Employee Clock-In
 * 10. Employee Clock-Out
 * 11. Time Tracking
 * 12. Dashboard APIs
 * 
 * Usage:
 *   node scripts/test-complete-flow.js
 * 
 * Environment Variables:
 *   BASE_URL - API base URL (default: production ALB)
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';

// Load credentials from seed file
let credentials = null;
try {
  const credsPath = path.join(__dirname, '..', 'seed-credentials.json');
  if (fs.existsSync(credsPath)) {
    credentials = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
  }
} catch (err) {
  console.warn('⚠️  Could not load seed-credentials.json, using defaults');
}

// Default credentials (fallback)
const DEFAULT_CREDENTIALS = {
  superadmin: {
    email: 'admin@upcapto.com',
    password: 'Upcapto@2026',
    tenantId: 'upcapto'
  },
  tenant: {
    email: 'admin@lenstrack.com',
    password: 'AdminPass123!',
    tenantId: 'lenstrack'
  },
  employee: {
    email: 'john.doe@lenstrack.com',
    password: 'EmployeePass123!',
    employeeId: 'EMP-2026-969954'
  }
};

// Test results
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
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

function test(name, fn) {
  return async () => {
    try {
      log(`\n🧪 Testing: ${name}`, 'cyan');
      const result = await fn();
      if (result.success) {
        log(`✅ PASS: ${name}`, 'green');
        results.passed++;
        results.tests.push({ name, status: 'PASS', result });
        return result;
      } else {
        log(`❌ FAIL: ${name}`, 'red');
        log(`   Error: ${JSON.stringify(result.error)}`, 'red');
        results.failed++;
        results.tests.push({ name, status: 'FAIL', error: result.error });
        return result;
      }
    } catch (error) {
      log(`❌ FAIL: ${name}`, 'red');
      log(`   Exception: ${error.message}`, 'red');
      results.failed++;
      results.tests.push({ name, status: 'FAIL', error: error.message });
      return { success: false, error: error.message };
    }
  };
}

// Helper function for API calls
async function apiCall(method, endpoint, data = null, token = null, tenantId = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000,
      validateStatus: () => true // Don't throw on any status
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (tenantId) {
      config.headers['x-tenant-id'] = tenantId;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return {
      success: response.status >= 200 && response.status < 300,
      data: response.data,
      status: response.status
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: 0
    };
  }
}

// Test 1: Superadmin Login
const testSuperadminLogin = test('1. Superadmin Login', async () => {
  const creds = credentials?.superadmin || DEFAULT_CREDENTIALS.superadmin;
  
  const result = await apiCall('POST', '/api/auth/login', {
    email: creds.email,
    password: creds.password
  });

  if (result.success && result.data.success) {
    return {
      success: true,
      token: result.data.data.accessToken,
      user: result.data.data.user
    };
  }
  return result;
});

// Test 2: Create Tenant
const testCreateTenant = test('2. Create Tenant', async (superadminToken) => {
  const tenantData = {
    name: 'Test Company',
    email: 'test@testcompany.com',
    domain: 'testcompany.com',
    phone: '+91-9876543210',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    plan: 'Professional'
  };

  const result = await apiCall(
    'POST',
    '/api/tenants',
    tenantData,
    superadminToken,
    'upcapto'
  );

  if (result.success && result.data.success) {
    return {
      success: true,
      tenant: result.data.data,
      adminUsers: result.data.data.adminUsers
    };
  }
  return result;
});

// Test 3: Tenant Admin Login & Password Change
const testTenantAdminLogin = test('3. Tenant Admin Login', async (tenantEmail, tempPassword, tenantId) => {
  // Login with temporary password
  const loginResult = await apiCall('POST', '/api/auth/login', {
    email: tenantEmail,
    password: tempPassword
  });

  if (!loginResult.success || !loginResult.data.success) {
    return loginResult;
  }

  const token = loginResult.data.data.accessToken;
  const mustChangePassword = loginResult.data.data.mustChangePassword;

  // If password change required, change it
  if (mustChangePassword) {
    const newPassword = 'AdminPass123!';
    const changeResult = await apiCall(
      'PUT',
      '/api/auth/change-password',
      {
        currentPassword: tempPassword,
        newPassword: newPassword,
        confirmPassword: newPassword
      },
      token,
      tenantId
    );

    if (!changeResult.success) {
      return changeResult;
    }

    // Login again with new password
    const newLoginResult = await apiCall('POST', '/api/auth/login', {
      email: tenantEmail,
      password: newPassword
    });

    if (newLoginResult.success && newLoginResult.data.success) {
      return {
        success: true,
        token: newLoginResult.data.data.accessToken,
        user: newLoginResult.data.data.user
      };
    }
    return newLoginResult;
  }

  return {
    success: true,
    token,
    user: loginResult.data.data.user
  };
});

// Test 4: Create Store
const testCreateStore = test('4. Create Store', async (adminToken, tenantId) => {
  const storeData = {
    name: 'Test Store',
    code: 'TEST001',
    storeCode: 'TEST001',
    address: {
      street: '123 Test Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      zip: '400001',
      country: 'India'
    },
    coordinates: {
      latitude: 19.0760,
      longitude: 72.8777
    },
    radius: 100,
    phone: '+91-9876543210',
    email: 'test@teststore.com',
    status: 'active'
  };

  const result = await apiCall(
    'POST',
    '/api/hr/stores',
    storeData,
    adminToken,
    tenantId
  );

  if (result.success && result.data.success) {
    return {
      success: true,
      store: result.data.data
    };
  }
  return result;
});

// Test 5: Create Department
const testCreateDepartment = test('5. Create Department', async (adminToken, tenantId) => {
  const deptData = {
    name: 'Test Department',
    code: 'TEST',
    description: 'Test Department Description',
    status: 'active'
  };

  const result = await apiCall(
    'POST',
    '/api/hr/departments',
    deptData,
    adminToken,
    tenantId
  );

  if (result.success && result.data.success) {
    return {
      success: true,
      department: result.data.data
    };
  }
  return result;
});

// Test 6: Create Employee
const testCreateEmployee = test('6. Create Employee', async (adminToken, tenantId, storeId, departmentCode) => {
  const employeeData = {
    employeeId: `EMP-${Date.now()}`,
    firstName: 'Test',
    lastName: 'Employee',
    email: `test.employee.${Date.now()}@testcompany.com`,
    phone: '+91-9876543210',
    password: 'EmployeePass123!',
    roleName: 'employee',
    department: departmentCode,
    storeId: storeId,
    designation: 'Test Employee',
    joining_date: new Date().toISOString().split('T')[0],
    status: 'active'
  };

  const result = await apiCall(
    'POST',
    '/api/hr/employees',
    employeeData,
    adminToken,
    tenantId
  );

  if (result.success && result.data.success) {
    return {
      success: true,
      employee: result.data.data,
      credentials: {
        email: employeeData.email,
        password: employeeData.password
      }
    };
  }
  return result;
});

// Test 7: Employee Login
const testEmployeeLogin = test('7. Employee Login', async (email, password) => {
  const result = await apiCall('POST', '/api/auth/login', {
    email,
    password
  });

  if (result.success && result.data.success) {
    return {
      success: true,
      token: result.data.data.accessToken,
      user: result.data.data.user
    };
  }
  return result;
});

// Test 8: Employee Clock-In
const testClockIn = test('8. Employee Clock-In', async (employeeToken, tenantId) => {
  const clockInData = {
    latitude: 19.0760,
    longitude: 72.8777,
    timestamp: Date.now(),
    notes: 'Test clock-in from automated test',
    selfie: null // Optional
  };

  const result = await apiCall(
    'POST',
    '/api/attendance/clock-in',
    clockInData,
    employeeToken,
    tenantId
  );

  if (result.success && result.data.success) {
    return {
      success: true,
      attendance: result.data.data
    };
  }
  return result;
});

// Test 9: Get Today's Attendance
const testGetTodayAttendance = test('9. Get Today\'s Attendance', async (employeeToken, employeeId, tenantId) => {
  const today = new Date().toISOString().split('T')[0];
  const result = await apiCall(
    'GET',
    `/api/attendance/today?employeeId=${employeeId}&date=${today}`,
    null,
    employeeToken,
    tenantId
  );

  if (result.success) {
    return {
      success: true,
      attendance: result.data.data
    };
  }
  return result;
});

// Test 10: Employee Clock-Out
const testClockOut = test('10. Employee Clock-Out', async (employeeToken, tenantId) => {
  const clockOutData = {
    timestamp: Date.now(),
    latitude: 19.0760,
    longitude: 72.8777,
    notes: 'Test clock-out from automated test',
    selfie: null // Optional
  };

  const result = await apiCall(
    'POST',
    '/api/attendance/check-out',
    clockOutData,
    employeeToken,
    tenantId
  );

  if (result.success && result.data.success) {
    return {
      success: true,
      attendance: result.data.data
    };
  }
  return result;
});

// Test 11: Time Tracking
const testTimeTracking = test('11. Time Tracking', async (adminToken, employeeId, tenantId) => {
  const today = new Date().toISOString().split('T')[0];
  const result = await apiCall(
    'GET',
    `/api/hr/time-tracking?employeeId=${employeeId}&date=${today}`,
    null,
    adminToken,
    tenantId
  );

  if (result.success) {
    return {
      success: true,
      timeTracking: result.data.data || []
    };
  }
  return result;
});

// Test 12: Dashboard APIs
const testDashboard = test('12. Dashboard APIs', async (adminToken, tenantId) => {
  const result = await apiCall(
    'GET',
    '/api/hr/dashboard',
    null,
    adminToken,
    tenantId
  );

  if (result.success && result.data.success) {
    return {
      success: true,
      dashboard: result.data.data
    };
  }
  return result;
});

// Main test function
async function runCompleteFlowTests() {
  try {
    log('\n🚀 Starting Complete Flow Tests', 'blue');
    log('=====================================\n', 'blue');
    log(`Base URL: ${BASE_URL}\n`, 'cyan');

    // Use credentials from seed file or defaults
    const superadminCreds = credentials?.superadmin || DEFAULT_CREDENTIALS.superadmin;
    const tenantCreds = credentials?.tenants?.[0] || DEFAULT_CREDENTIALS.tenant;
    const employeeCreds = credentials?.tenants?.[0]?.employees?.[0] || DEFAULT_CREDENTIALS.employee;

    // Test 1: Superadmin Login
    const superadminResult = await testSuperadminLogin();
    if (!superadminResult.success) {
      log('\n❌ Cannot proceed without superadmin login', 'red');
      return;
    }
    const superadminToken = superadminResult.token;

    // Test 2: Create Tenant (optional - might already exist)
    log('\n📝 Creating test tenant (may already exist)...', 'yellow');
    const tenantResult = await testCreateTenant(superadminToken);
    let testTenant = null;
    let testTenantAdminEmail = null;
    let testTenantAdminPassword = null;
    
    if (tenantResult.success) {
      testTenant = tenantResult.tenant;
      testTenantAdminEmail = tenantResult.adminUsers?.admin?.email;
      testTenantAdminPassword = tenantResult.adminUsers?.admin?.temporaryPassword;
    } else {
      // Use existing tenant
      testTenant = { tenantId: tenantCreds.tenantId };
      testTenantAdminEmail = tenantCreds.email || tenantCreds.adminEmail;
      testTenantAdminPassword = tenantCreds.password || tenantCreds.adminPassword || 'AdminPass123!';
    }

    // Test 3: Tenant Admin Login
    const tenantAdminResult = await testTenantAdminLogin(
      testTenantAdminEmail,
      testTenantAdminPassword,
      testTenant.tenantId
    );
    if (!tenantAdminResult.success) {
      log('\n❌ Cannot proceed without tenant admin login', 'red');
      return;
    }
    const tenantAdminToken = tenantAdminResult.token;

    // Test 4: Create Store
    const storeResult = await testCreateStore(tenantAdminToken, testTenant.tenantId);
    if (!storeResult.success) {
      log('\n⚠️  Store creation failed, trying to get existing store...', 'yellow');
      // Try to get existing stores
      const getStoresResult = await apiCall(
        'GET',
        '/api/hr/stores',
        null,
        tenantAdminToken,
        testTenant.tenantId
      );
      if (getStoresResult.success && getStoresResult.data.data && getStoresResult.data.data.length > 0) {
        storeResult.store = getStoresResult.data.data[0];
        storeResult.success = true;
      }
    }
    const storeId = storeResult.store?._id || storeResult.store?.id;

    // Test 5: Create Department
    const deptResult = await testCreateDepartment(tenantAdminToken, testTenant.tenantId);
    if (!deptResult.success) {
      log('\n⚠️  Department creation failed, trying to get existing department...', 'yellow');
      // Try to get existing departments
      const getDeptsResult = await apiCall(
        'GET',
        '/api/hr/departments',
        null,
        tenantAdminToken,
        testTenant.tenantId
      );
      if (getDeptsResult.success && getDeptsResult.data.data && getDeptsResult.data.data.length > 0) {
        deptResult.department = getDeptsResult.data.data[0];
        deptResult.success = true;
      }
    }
    const departmentCode = deptResult.department?.code || deptResult.department?.name || 'SALES';

    // Test 6: Create Employee
    const employeeResult = await testCreateEmployee(
      tenantAdminToken,
      testTenant.tenantId,
      storeId,
      departmentCode
    );
    if (!employeeResult.success) {
      log('\n⚠️  Employee creation failed, using existing employee...', 'yellow');
      // Use existing employee credentials
      employeeResult.employee = {
        employeeId: employeeCreds.employeeId,
        email: employeeCreds.email
      };
      employeeResult.credentials = {
        email: employeeCreds.email,
        password: employeeCreds.password
      };
    }
    const employeeEmail = employeeResult.credentials?.email || employeeCreds.email;
    const employeePassword = employeeResult.credentials?.password || employeeCreds.password;
    const employeeId = employeeResult.employee?.employeeId || employeeCreds.employeeId;

    // Test 7: Employee Login
    const employeeLoginResult = await testEmployeeLogin(employeeEmail, employeePassword);
    if (!employeeLoginResult.success) {
      log('\n❌ Cannot proceed without employee login', 'red');
      return;
    }
    const employeeToken = employeeLoginResult.token;

    // Test 8: Employee Clock-In
    await testClockIn(employeeToken, testTenant.tenantId);

    // Test 9: Get Today's Attendance
    await testGetTodayAttendance(employeeToken, employeeId, testTenant.tenantId);

    // Test 10: Employee Clock-Out
    await testClockOut(employeeToken, testTenant.tenantId);

    // Test 11: Time Tracking
    await testTimeTracking(tenantAdminToken, employeeId, testTenant.tenantId);

    // Test 12: Dashboard
    await testDashboard(tenantAdminToken, testTenant.tenantId);

    // Summary
    log('\n📊 Test Summary', 'blue');
    log('=====================================\n', 'blue');
    log(`✅ Passed: ${results.passed}`, 'green');
    log(`❌ Failed: ${results.failed}`, 'red');
    log(`⏭️  Skipped: ${results.skipped}`, 'yellow');
    log(`📈 Total: ${results.passed + results.failed + results.skipped}\n`, 'cyan');

    // Save results
    const resultsPath = path.join(__dirname, '..', 'test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    log(`📄 Results saved to test-results.json\n`, 'cyan');

    if (results.failed === 0) {
      log('🎉 All tests passed!', 'green');
    } else {
      log('⚠️  Some tests failed. Check test-results.json for details.', 'yellow');
      process.exit(1);
    }

  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runCompleteFlowTests();
}

module.exports = { runCompleteFlowTests };
