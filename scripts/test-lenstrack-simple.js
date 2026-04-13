#!/usr/bin/env node

/**
 * Simple Lenstrack Flow Test (with rate limit handling)
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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

async function runTest() {
  console.log('\n🚀 Lenstrack Complete Flow Test\n');

  // Step 1: Login as Lenstrack Admin
  console.log('1️⃣  Logging in as Lenstrack Admin...');
  const loginResult = await apiCall('POST', '/api/auth/login', {
    email: 'admin@lenstrack.com',
    password: 'AdminPass123!'
  });

  if (!loginResult.success || !loginResult.data.success) {
    console.log('❌ Admin login failed:', loginResult.data?.message);
    return;
  }

  const adminToken = loginResult.data.data.accessToken;
  console.log('✅ Admin logged in\n');
  await sleep(2000);

  // Step 2: Get or Create Store
  console.log('2️⃣  Getting/Creating Store...');
  await sleep(2000);
  const getStoresResult = await apiCall('GET', '/api/hr/stores', null, adminToken, 'lenstrack');
  
  let store = null;
  if (getStoresResult.success && getStoresResult.data.data && Array.isArray(getStoresResult.data.data) && getStoresResult.data.data.length > 0) {
    store = getStoresResult.data.data.find(s => s.code === 'LK001') || getStoresResult.data.data[0];
    console.log(`✅ Found existing store: ${store.name} (${store.code})`);
  } else {
    await sleep(3000);
    const storeData = {
      name: 'Mumbai Store',
      code: 'LK001',
      storeCode: 'LK001',
      address: { street: '123 Main St', city: 'Mumbai', state: 'Maharashtra', zip: '400001', country: 'India' },
      coordinates: { latitude: 19.0760, longitude: 72.8777 },
      radius: 100,
      status: 'active'
    };
    const createStoreResult = await apiCall('POST', '/api/hr/stores', storeData, adminToken, 'lenstrack');
    if (createStoreResult.success && createStoreResult.data.success) {
      store = createStoreResult.data.data;
      console.log(`✅ Store created: ${store.name}`);
    } else {
      console.log('❌ Store creation failed:', createStoreResult.data?.message || createStoreResult.error);
      return;
    }
  }
  await sleep(2000);

  // Step 3: Get or Create Department
  console.log('\n3️⃣  Getting/Creating Department...');
  await sleep(2000);
  const getDeptsResult = await apiCall('GET', '/api/hr/departments', null, adminToken, 'lenstrack');
  
  let department = null;
  if (getDeptsResult.success && getDeptsResult.data.data && Array.isArray(getDeptsResult.data.data) && getDeptsResult.data.data.length > 0) {
    department = getDeptsResult.data.data.find(d => d.code === 'SALES') || getDeptsResult.data.data[0];
    console.log(`✅ Found existing department: ${department.name} (${department.code})`);
  } else {
    await sleep(3000);
    const deptData = { name: 'Sales', code: 'SALES', description: 'Sales Department', status: 'active' };
    const createDeptResult = await apiCall('POST', '/api/hr/departments', deptData, adminToken, 'lenstrack');
    if (createDeptResult.success && createDeptResult.data.success) {
      department = createDeptResult.data.data;
      console.log(`✅ Department created: ${department.name}`);
    } else {
      console.log('❌ Department creation failed:', createDeptResult.data?.message || createDeptResult.error);
      return;
    }
  }
  await sleep(2000);

  // Step 4: Create Employee
  console.log('\n4️⃣  Creating Employee...');
  await sleep(2000);
  const timestamp = Date.now();
  const employeeData = {
    employeeId: `EMP-2026-${timestamp.toString().slice(-6)}`,
    firstName: 'Test',
    lastName: 'Employee',
    email: `test.employee.${timestamp}@lenstrack.com`,
    phone: '+91-9876543210',
    password: 'EmployeePass123!',
    roleName: 'employee',
    department: department.code || 'SALES',
    storeId: store._id || store.id,
    designation: 'Sales Executive',
    joining_date: new Date().toISOString().split('T')[0],
    status: 'active'
  };

  const createEmpResult = await apiCall('POST', '/api/hr/employees', employeeData, adminToken, 'lenstrack');
  if (!createEmpResult.success || !createEmpResult.data.success) {
    console.log('❌ Employee creation failed:', createEmpResult.data?.message || createEmpResult.error);
    return;
  }

  const employee = createEmpResult.data.data;
  console.log(`✅ Employee created: ${employee.firstName} ${employee.lastName} (${employee.employeeId})`);
  await sleep(2000);

  // Step 5: Employee Login (may need to wait for auth service sync)
  console.log('\n5️⃣  Employee Login...');
  console.log('   Waiting 3 seconds for auth service to sync...');
  await sleep(3000);
  
  // Try login multiple times (auth service may need time to sync)
  let empLoginResult = null;
  for (let i = 0; i < 3; i++) {
    empLoginResult = await apiCall('POST', '/api/auth/login', {
      email: employeeData.email,
      password: employeeData.password
    });

    if (empLoginResult.success && empLoginResult.data.success) {
      break;
    }
    
    if (i < 2) {
      console.log(`   Login attempt ${i + 1} failed, retrying in 2 seconds...`);
      await sleep(2000);
    }
  }

  if (!empLoginResult.success || !empLoginResult.data.success) {
    console.log('❌ Employee login failed:', empLoginResult.data?.message || empLoginResult.error);
    console.log('   Employee was created in HR service but may not be synced to auth service yet.');
    console.log('   This is expected - auth service syncs asynchronously.');
    console.log('   You can try logging in manually after a few seconds.');
    return;
  }

  const employeeToken = empLoginResult.data.data.accessToken;
  const employeeId = employee.employeeId || employee.employee_id;
  console.log('✅ Employee logged in');
  await sleep(2000);

  // Step 6: Clock-In
  console.log('\n6️⃣  Employee Clock-In...');
  await sleep(2000);
  const clockInResult = await apiCall('POST', '/api/attendance/clock-in', {
    latitude: 19.0760,
    longitude: 72.8777,
    timestamp: Date.now(),
    notes: 'Test clock-in from automated script'
  }, employeeToken, 'lenstrack');

  if (clockInResult.success && clockInResult.data.success) {
    console.log('✅ Clock-in successful');
    console.log(`   Time: ${clockInResult.data.data.checkIn?.time || clockInResult.data.data.check_in_time}`);
  } else if (clockInResult.data?.message?.includes('already clocked')) {
    console.log('⚠️  Already clocked in (expected if testing multiple times)');
  } else {
    console.log('❌ Clock-in failed:', clockInResult.data?.message || clockInResult.error);
  }
  await sleep(2000);

  // Step 7: Get Today's Attendance
  console.log('\n7️⃣  Getting Today\'s Attendance...');
  await sleep(2000);
  const today = new Date().toISOString().split('T')[0];
  const todayResult = await apiCall('GET', `/api/attendance/today?employeeId=${employeeId}&date=${today}`, null, employeeToken, 'lenstrack');
  
  if (todayResult.success) {
    console.log('✅ Attendance retrieved');
    if (todayResult.data.data) {
      console.log(`   Check-In: ${todayResult.data.data.checkIn?.time || todayResult.data.data.check_in_time || 'N/A'}`);
      console.log(`   Check-Out: ${todayResult.data.data.checkOut?.time || todayResult.data.data.check_out_time || 'Not yet'}`);
      console.log(`   Status: ${todayResult.data.data.status || 'N/A'}`);
    }
  } else {
    console.log('❌ Failed to get attendance:', todayResult.data?.message || todayResult.error);
  }
  await sleep(2000);

  // Step 8: Clock-Out
  console.log('\n8️⃣  Employee Clock-Out...');
  await sleep(2000);
  const clockOutResult = await apiCall('POST', '/api/attendance/check-out', {
    timestamp: Date.now(),
    latitude: 19.0760,
    longitude: 72.8777,
    notes: 'Test clock-out from automated script'
  }, employeeToken, 'lenstrack');

  if (clockOutResult.success && clockOutResult.data.success) {
    console.log('✅ Clock-out successful');
    console.log(`   Total Hours: ${clockOutResult.data.data.total_hours || 'N/A'}`);
  } else if (clockOutResult.data?.message?.includes('No open attendance')) {
    console.log('⚠️  No open attendance to clock out (expected if already clocked out)');
  } else {
    console.log('❌ Clock-out failed:', clockOutResult.data?.message || clockOutResult.error);
  }
  await sleep(3000);

  // Step 9: Check Dashboard
  console.log('\n9️⃣  Checking Dashboard...');
  await sleep(2000);
  const dashboardResult = await apiCall('GET', '/api/hr/dashboard', null, adminToken, 'lenstrack');
  
  if (dashboardResult.success && dashboardResult.data.success) {
    const dashboard = dashboardResult.data.data;
    console.log('✅ Dashboard retrieved');
    console.log(`   Total Employees: ${dashboard.stats?.totalEmployees || dashboard.employees?.total || 'N/A'}`);
    console.log(`   Present Today: ${dashboard.stats?.presentToday || dashboard.attendance?.presentToday || 'N/A'}`);
    console.log(`   Absent Today: ${dashboard.stats?.absentToday || dashboard.attendance?.absentToday || 'N/A'}`);
    
    const presentCount = dashboard.stats?.presentToday || dashboard.attendance?.presentToday || 0;
    if (presentCount > 0) {
      console.log('   ✅ Attendance is reflected on dashboard!');
    } else {
      console.log('   ⚠️  Attendance count is 0 (may need time to sync)');
    }
  } else {
    console.log('❌ Dashboard failed:', dashboardResult.data?.message || dashboardResult.error);
  }
  await sleep(2000);

  // Step 10: Time Tracking
  console.log('\n🔟 Time Tracking...');
  await sleep(2000);
  const timeTrackingResult = await apiCall('GET', `/api/hr/time-tracking?employeeId=${employeeId}&date=${today}`, null, adminToken, 'lenstrack');
  
  if (timeTrackingResult.success) {
    const timeTracking = timeTrackingResult.data.data || [];
    console.log('✅ Time tracking retrieved');
    if (timeTracking.length > 0) {
      const totalHours = timeTracking.reduce((sum, r) => sum + (r.duration || 0), 0);
      console.log(`   Total Hours: ${totalHours.toFixed(2)}`);
      console.log(`   Records: ${timeTracking.length}`);
    } else {
      console.log('   ⚠️  No time tracking records yet (may need time to sync)');
    }
  } else {
    console.log('❌ Time tracking failed:', timeTrackingResult.data?.message || timeTrackingResult.error);
  }

  console.log('\n✅ Complete Flow Test Finished!');
  console.log('\n📊 Summary:');
  console.log(`   Store: ${store?.name || 'N/A'} (${store?.code || 'N/A'})`);
  console.log(`   Department: ${department?.name || 'N/A'} (${department?.code || 'N/A'})`);
  console.log(`   Employee: ${employee?.firstName || 'N/A'} ${employee?.lastName || 'N/A'} (${employee?.employeeId || 'N/A'})`);
  console.log(`   Employee Email: ${employeeData.email}`);
  console.log(`   Employee Password: ${employeeData.password}`);
}

runTest().catch(console.error);
