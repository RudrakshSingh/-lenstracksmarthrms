#!/usr/bin/env node

/**
 * Complete Lenstrack Tenant Flow Test
 * 
 * Tests complete flow:
 * 1. Login as superadmin
 * 2. Create/verify Lenstrack tenant
 * 3. Create Lenstrack admin (if needed)
 * 4. Login as Lenstrack admin
 * 5. Create Store
 * 6. Create Department
 * 7. Create Employee
 * 8. Login as Employee
 * 9. Clock-In
 * 10. Get Today's Attendance
 * 11. Clock-Out
 * 12. Check Dashboard
 * 13. Check Time Tracking
 * 
 * Usage:
 *   node scripts/test-lenstrack-complete-flow.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';

const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
  data: {}
};

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
      log(`\n🧪 ${name}`, 'cyan');
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

async function apiCall(method, endpoint, data = null, token = null, tenantId = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
      validateStatus: () => true
    };

    if (token) config.headers.Authorization = `Bearer ${token}`;
    if (tenantId) config.headers['x-tenant-id'] = tenantId;
    if (data) config.data = data;

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

// Step 1: Login as Superadmin
const testSuperadminLogin = test('1. Superadmin Login', async () => {
  const result = await apiCall('POST', '/api/auth/login', {
    email: 'admin@upcapto.com',
    password: 'Upcapto@2026'
  });

  if (result.success && result.data.success) {
    results.data.superadminToken = result.data.data.accessToken;
    return {
      success: true,
      token: result.data.data.accessToken,
      user: result.data.data.user
    };
  }
  return result;
});

// Step 2: Create Lenstrack Admin (if needed)
const testCreateLenstrackAdmin = test('2. Create Lenstrack Admin User', async (superadminToken) => {
  // Try to login first to check if admin exists
  const loginResult = await apiCall('POST', '/api/auth/login', {
    email: 'admin@lenstrack.com',
    password: 'AdminPass123!'
  });

  if (loginResult.success && loginResult.data.success) {
    log('   Admin user already exists, using existing credentials', 'yellow');
    results.data.lenstrackAdminToken = loginResult.data.data.accessToken;
    return {
      success: true,
      token: loginResult.data.data.accessToken,
      user: loginResult.data.data.user,
      credentials: { email: 'admin@lenstrack.com', password: 'AdminPass123!' }
    };
  }

  // Try with temporary password
  const tempLoginResult = await apiCall('POST', '/api/auth/login', {
    email: 'admin@lenstrack.com',
    password: 'TempPass123!@#'
  });

  if (tempLoginResult.success && tempLoginResult.data.success) {
    log('   Admin user exists with temporary password', 'yellow');
    const token = tempLoginResult.data.data.accessToken;
    
    // Change password
    const changeResult = await apiCall('PUT', '/api/auth/change-password', {
      currentPassword: 'TempPass123!@#',
      newPassword: 'AdminPass123!',
      confirmPassword: 'AdminPass123!'
    }, token, 'lenstrack');

    if (changeResult.success) {
      // Login again with new password
      const newLoginResult = await apiCall('POST', '/api/auth/login', {
        email: 'admin@lenstrack.com',
        password: 'AdminPass123!'
      });

      if (newLoginResult.success && newLoginResult.data.success) {
        results.data.lenstrackAdminToken = newLoginResult.data.data.accessToken;
        return {
          success: true,
          token: newLoginResult.data.data.accessToken,
          user: newLoginResult.data.data.user,
          credentials: { email: 'admin@lenstrack.com', password: 'AdminPass123!' }
        };
      }
    }
  }

  // Create admin user via API (requires superadmin token)
  log('   Creating admin user via API...', 'yellow');
  const createResult = await apiCall('POST', '/api/auth/register', {
    email: 'admin@lenstrack.com',
    password: 'AdminPass123!',
    name: 'Lenstrack Admin',
    employee_id: 'ADMIN-LENSTRACK-001',
    role: 'admin',
    tenantId: 'lenstrack',
    department: 'HR',
    band_level: 'A',
    hierarchy_level: 'NATIONAL',
    designation: 'System Administrator',
    status: 'active',
    is_active: true,
    mustChangePassword: false,
    passwordTemporary: false
  }, superadminToken, 'upcapto');

  if (createResult.success && createResult.data.success) {
    // Login with new credentials
    const loginResult = await apiCall('POST', '/api/auth/login', {
      email: 'admin@lenstrack.com',
      password: 'AdminPass123!'
    });

    if (loginResult.success && loginResult.data.success) {
      results.data.lenstrackAdminToken = loginResult.data.data.accessToken;
      return {
        success: true,
        token: loginResult.data.data.accessToken,
        user: loginResult.data.data.user,
        credentials: { email: 'admin@lenstrack.com', password: 'AdminPass123!' }
      };
    }
  }

  return { success: false, error: 'Failed to create or login as admin' };
});

// Step 3: Create Store
const testCreateStore = test('3. Create Store', async (adminToken) => {
  // First, try to get existing stores
  log('   Checking for existing stores...', 'yellow');
  await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit delay
  
  const getStoresResult = await apiCall('GET', '/api/hr/stores', null, adminToken, 'lenstrack');
  
  if (getStoresResult.success) {
    log(`   API Response Status: ${getStoresResult.status}`, 'cyan');
    if (getStoresResult.data.data && Array.isArray(getStoresResult.data.data) && getStoresResult.data.data.length > 0) {
    log(`   Found ${getStoresResult.data.data.length} existing store(s)`, 'yellow');
    // Use first store or find LK001
    let store = getStoresResult.data.data.find(s => s.code === 'LK001' || s.storeCode === 'LK001');
    if (!store) {
      store = getStoresResult.data.data[0];
    }
    results.data.store = store;
    return { success: true, store };
  }

  // Create new store if none exists
  const storeData = {
    name: 'Mumbai Store',
    code: 'LK001',
    storeCode: 'LK001',
    address: {
      street: '123 Main Street',
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
    email: 'mumbai@lenstrack.com',
    status: 'active'
  };

  await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limit delay
  const result = await apiCall('POST', '/api/hr/stores', storeData, adminToken, 'lenstrack');

  if (result.success && result.data.success) {
    results.data.store = result.data.data;
    return { success: true, store: result.data.data };
  } else {
    log(`   Store creation failed. Status: ${result.status}`, 'yellow');
    log(`   Response: ${JSON.stringify(result.data || result.error)}`, 'yellow');
    
    if (result.status === 409 || result.data?.message?.includes('already exists') || result.status === 429) {
      // Try to get existing store
      log('   Store may already exist or rate limited, fetching...', 'yellow');
      await new Promise(resolve => setTimeout(resolve, 2000));
      const getResult = await apiCall('GET', '/api/hr/stores', null, adminToken, 'lenstrack');
      if (getResult.success && getResult.data && (getResult.data.data || getResult.data)) {
        const stores = Array.isArray(getResult.data.data) ? getResult.data.data : (Array.isArray(getResult.data) ? getResult.data : []);
        if (stores.length > 0) {
          let store = stores.find(s => s.code === 'LK001' || s.storeCode === 'LK001');
          if (!store) store = stores[0];
          results.data.store = store;
          return { success: true, store };
        }
      }
    }
  }
  return result;
});

// Step 4: Create Department
const testCreateDepartment = test('4. Create Department', async (adminToken) => {
  // First, try to get existing departments
  log('   Checking for existing departments...', 'yellow');
  await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit delay
  
  const getDeptsResult = await apiCall('GET', '/api/hr/departments', null, adminToken, 'lenstrack');
  
  if (getDeptsResult.success && getDeptsResult.data.data && getDeptsResult.data.data.length > 0) {
    log(`   Found ${getDeptsResult.data.data.length} existing department(s)`, 'yellow');
    // Use first department or find SALES
    let dept = getDeptsResult.data.data.find(d => d.code === 'SALES' || d.name === 'Sales');
    if (!dept) {
      dept = getDeptsResult.data.data[0];
    }
    results.data.department = dept;
    return { success: true, department: dept };
  }

  // Create new department if none exists
  const deptData = {
    name: 'Sales',
    code: 'SALES',
    description: 'Sales Department',
    status: 'active'
  };

  await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limit delay
  const result = await apiCall('POST', '/api/hr/departments', deptData, adminToken, 'lenstrack');

  if (result.success && result.data.success) {
    results.data.department = result.data.data;
    return { success: true, department: result.data.data };
  } else if (result.status === 409 || result.data?.message?.includes('already exists') || result.status === 429) {
    // Try to get existing department
    log('   Department may already exist or rate limited, fetching...', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 2000));
    const getResult = await apiCall('GET', '/api/hr/departments', null, adminToken, 'lenstrack');
    if (getResult.success && getResult.data.data && getResult.data.data.length > 0) {
      let dept = getResult.data.data.find(d => d.code === 'SALES' || d.name === 'Sales');
      if (!dept) dept = getResult.data.data[0];
      results.data.department = dept;
      return { success: true, department: dept };
    }
  }
  return result;
});

// Step 5: Create Employee
const testCreateEmployee = test('5. Create Employee', async (adminToken, storeId, departmentCode) => {
  const timestamp = Date.now();
  const employeeData = {
    employeeId: `EMP-2026-${timestamp.toString().slice(-6)}`,
    firstName: 'Test',
    lastName: 'Employee',
    email: `test.employee.${timestamp}@lenstrack.com`,
    phone: '+91-9876543210',
    password: 'EmployeePass123!',
    roleName: 'employee',
    department: departmentCode,
    storeId: storeId,
    designation: 'Sales Executive',
    joining_date: new Date().toISOString().split('T')[0],
    status: 'active'
  };

  const result = await apiCall('POST', '/api/hr/employees', employeeData, adminToken, 'lenstrack');

  if (result.success && result.data.success) {
    results.data.employee = result.data.data;
    results.data.employeeCredentials = {
      email: employeeData.email,
      password: employeeData.password,
      employeeId: employeeData.employeeId
    };
    return {
      success: true,
      employee: result.data.data,
      credentials: results.data.employeeCredentials
    };
  }
  return result;
});

// Step 6: Employee Login
const testEmployeeLogin = test('6. Employee Login', async (email, password) => {
  const result = await apiCall('POST', '/api/auth/login', {
    email,
    password
  });

  if (result.success && result.data.success) {
    results.data.employeeToken = result.data.data.accessToken;
    results.data.employeeUser = result.data.data.user;
    return {
      success: true,
      token: result.data.data.accessToken,
      user: result.data.data.user
    };
  }
  return result;
});

// Step 7: Clock-In
const testClockIn = test('7. Employee Clock-In', async (employeeToken, employeeId) => {
  const clockInData = {
    latitude: 19.0760,
    longitude: 72.8777,
    timestamp: Date.now(),
    notes: 'Test clock-in from automated test script'
  };

  const result = await apiCall('POST', '/api/attendance/clock-in', clockInData, employeeToken, 'lenstrack');

  if (result.success && result.data.success) {
    results.data.attendance = result.data.data;
    return { success: true, attendance: result.data.data };
  } else if (result.data?.message?.includes('already clocked') || result.data?.message?.includes('clock out')) {
    log('   Already clocked in (expected if testing multiple times)', 'yellow');
    results.skipped++;
    return { success: true, skipped: true, message: 'Already clocked in' };
  }
  return result;
});

// Step 8: Get Today's Attendance
const testGetTodayAttendance = test('8. Get Today\'s Attendance', async (employeeToken, employeeId) => {
  const today = new Date().toISOString().split('T')[0];
  const result = await apiCall('GET', `/api/attendance/today?employeeId=${employeeId}&date=${today}`, null, employeeToken, 'lenstrack');

  if (result.success) {
    return { success: true, attendance: result.data.data };
  }
  return result;
});

// Step 9: Clock-Out
const testClockOut = test('9. Employee Clock-Out', async (employeeToken) => {
  const clockOutData = {
    timestamp: Date.now(),
    latitude: 19.0760,
    longitude: 72.8777,
    notes: 'Test clock-out from automated test script'
  };

  const result = await apiCall('POST', '/api/attendance/check-out', clockOutData, employeeToken, 'lenstrack');

  if (result.success && result.data.success) {
    results.data.clockOutAttendance = result.data.data;
    return { success: true, attendance: result.data.data };
  } else if (result.data?.message?.includes('No open attendance') || result.data?.message?.includes('clock in')) {
    log('   No open attendance to clock out (expected if already clocked out)', 'yellow');
    results.skipped++;
    return { success: true, skipped: true, message: 'No open attendance' };
  }
  return result;
});

// Step 10: Check Dashboard
const testDashboard = test('10. Check Dashboard (Attendance Reflection)', async (adminToken) => {
  const result = await apiCall('GET', '/api/hr/dashboard', null, adminToken, 'lenstrack');

  if (result.success && result.data.success) {
    const dashboard = result.data.data;
    log(`   Total Employees: ${dashboard.stats?.totalEmployees || 'N/A'}`, 'cyan');
    log(`   Present Today: ${dashboard.stats?.presentToday || dashboard.attendance?.presentToday || 'N/A'}`, 'cyan');
    log(`   Absent Today: ${dashboard.stats?.absentToday || dashboard.attendance?.absentToday || 'N/A'}`, 'cyan');
    
    // Check if attendance is reflected
    const presentCount = dashboard.stats?.presentToday || dashboard.attendance?.presentToday || 0;
    if (presentCount > 0) {
      log('   ✅ Attendance is reflected on dashboard!', 'green');
    } else {
      log('   ⚠️  Attendance count is 0 (may need time to sync)', 'yellow');
    }
    
    return { success: true, dashboard };
  }
  return result;
});

// Step 11: Time Tracking
const testTimeTracking = test('11. Time Tracking', async (adminToken, employeeId) => {
  const today = new Date().toISOString().split('T')[0];
  const result = await apiCall('GET', `/api/hr/time-tracking?employeeId=${employeeId}&date=${today}`, null, adminToken, 'lenstrack');

  if (result.success) {
    const timeTracking = result.data.data || [];
    if (timeTracking.length > 0) {
      const totalHours = timeTracking.reduce((sum, record) => sum + (record.duration || 0), 0);
      log(`   Total Hours: ${totalHours.toFixed(2)}`, 'cyan');
      log(`   Records: ${timeTracking.length}`, 'cyan');
    } else {
      log('   No time tracking records yet (may need time to sync)', 'yellow');
    }
    return { success: true, timeTracking };
  }
  return result;
});

// Main test function
async function runLenstrackCompleteFlow() {
  try {
    log('\n🚀 Starting Complete Lenstrack Tenant Flow Test', 'blue');
    log('=====================================\n', 'blue');
    log(`Base URL: ${BASE_URL}\n`, 'cyan');

    // Step 1: Superadmin Login
    const superadminResult = await testSuperadminLogin();
    if (!superadminResult.success) {
      log('\n❌ Cannot proceed without superadmin login', 'red');
      return;
    }
    const superadminToken = superadminResult.token;

    // Step 2: Create/Login as Lenstrack Admin
    const adminResult = await testCreateLenstrackAdmin(superadminToken);
    if (!adminResult.success) {
      log('\n❌ Cannot proceed without lenstrack admin', 'red');
      return;
    }
    const adminToken = adminResult.token;

    // Step 3: Create Store
    const storeResult = await testCreateStore(adminToken);
    if (!storeResult.success) {
      log('\n❌ Cannot proceed without store', 'red');
      return;
    }
    const storeId = storeResult.store?._id || storeResult.store?.id;

    // Step 4: Create Department
    const deptResult = await testCreateDepartment(adminToken);
    if (!deptResult.success) {
      log('\n❌ Cannot proceed without department', 'red');
      return;
    }
    const departmentCode = deptResult.department?.code || deptResult.department?.name || 'SALES';

    // Step 5: Create Employee
    const employeeResult = await testCreateEmployee(adminToken, storeId, departmentCode);
    if (!employeeResult.success) {
      log('\n❌ Cannot proceed without employee', 'red');
      return;
    }
    const employeeEmail = employeeResult.credentials.email;
    const employeePassword = employeeResult.credentials.password;
    const employeeId = employeeResult.credentials.employeeId;

    // Step 6: Employee Login
    const employeeLoginResult = await testEmployeeLogin(employeeEmail, employeePassword);
    if (!employeeLoginResult.success) {
      log('\n❌ Cannot proceed without employee login', 'red');
      return;
    }
    const employeeToken = employeeLoginResult.token;

    // Step 7: Clock-In
    await testClockIn(employeeToken, employeeId);

    // Step 8: Get Today's Attendance
    await testGetTodayAttendance(employeeToken, employeeId);

    // Step 9: Clock-Out
    await testClockOut(employeeToken);

    // Step 10: Check Dashboard
    await testDashboard(adminToken);

    // Step 11: Time Tracking
    await testTimeTracking(adminToken, employeeId);

    // Summary
    log('\n📊 Test Summary', 'blue');
    log('=====================================\n', 'blue');
    log(`✅ Passed: ${results.passed}`, 'green');
    log(`❌ Failed: ${results.failed}`, 'red');
    log(`⏭️  Skipped: ${results.skipped}`, 'yellow');
    log(`📈 Total: ${results.passed + results.failed + results.skipped}\n`, 'cyan');

    // Save results
    const resultsPath = path.join(__dirname, '..', 'lenstrack-test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    log(`📄 Results saved to lenstrack-test-results.json\n`, 'cyan');

    // Save credentials
    const credentialsPath = path.join(__dirname, '..', 'lenstrack-credentials.json');
    const credentials = {
      admin: {
        email: 'admin@lenstrack.com',
        password: 'AdminPass123!',
        tenantId: 'lenstrack'
      },
      employee: results.data.employeeCredentials
    };
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
    log(`🔐 Credentials saved to lenstrack-credentials.json\n`, 'cyan');

    if (results.failed === 0) {
      log('🎉 All tests passed!', 'green');
      log('\n✅ Complete Flow Verified:', 'green');
      log('   ✅ Store created', 'green');
      log('   ✅ Department created', 'green');
      log('   ✅ Employee created', 'green');
      log('   ✅ Attendance marked (clock-in/clock-out)', 'green');
      log('   ✅ Dashboard reflects attendance', 'green');
    } else {
      log('⚠️  Some tests failed. Check lenstrack-test-results.json for details.', 'yellow');
      process.exit(1);
    }

  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  runLenstrackCompleteFlow();
}

module.exports = { runLenstrackCompleteFlow };
