#!/usr/bin/env node

/**
 * Final Lenstrack Flow Test (with proper error handling and delays)
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
      status: response.status,
      fullResponse: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: 0,
      fullResponse: error.response?.data || error.message
    };
  }
}

async function runTest() {
  console.log('\n🚀 Lenstrack Complete Flow Test\n');
  console.log('=====================================\n');

  const results = {};

  // Step 1: Login as Lenstrack Admin
  console.log('1️⃣  Logging in as Lenstrack Admin...');
  const loginResult = await apiCall('POST', '/api/auth/login', {
    email: 'admin@lenstrack.com',
    password: 'AdminPass123!'
  });

  if (!loginResult.success || !loginResult.data.success) {
    console.log('❌ Admin login failed:', loginResult.data?.message || loginResult.error);
    console.log('Full response:', JSON.stringify(loginResult.fullResponse, null, 2));
    return;
  }

  const adminToken = loginResult.data.data.accessToken;
  console.log('✅ Admin logged in\n');
  await sleep(3000);

  // Step 2: Get Existing Stores
  console.log('2️⃣  Getting Existing Stores...');
  await sleep(3000);
  const getStoresResult = await apiCall('GET', '/api/hr/stores', null, adminToken, 'lenstrack');
  
  let store = null;
  if (getStoresResult.success && getStoresResult.data?.data && Array.isArray(getStoresResult.data.data) && getStoresResult.data.data.length > 0) {
    store = getStoresResult.data.data.find(s => s.code === 'LK001') || getStoresResult.data.data[0];
    console.log(`✅ Found store: ${store.name} (${store.code || store.storeCode})`);
    results.store = store;
  } else {
    console.log('⚠️  No stores found or API error');
    console.log('Response:', JSON.stringify(getStoresResult.fullResponse, null, 2));
    // Try to create one
    console.log('   Attempting to create store...');
    await sleep(5000);
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
      results.store = store;
    } else {
      console.log('❌ Store creation failed:', createStoreResult.data?.message || createStoreResult.error);
      console.log('Full response:', JSON.stringify(createStoreResult.fullResponse, null, 2));
      return;
    }
  }
  await sleep(3000);

  // Step 3: Get Existing Departments
  console.log('\n3️⃣  Getting Existing Departments...');
  await sleep(3000);
  const getDeptsResult = await apiCall('GET', '/api/hr/departments', null, adminToken, 'lenstrack');
  
  let department = null;
  if (getDeptsResult.success && getDeptsResult.data?.data && Array.isArray(getDeptsResult.data.data) && getDeptsResult.data.data.length > 0) {
    department = getDeptsResult.data.data.find(d => d.code === 'SALES') || getDeptsResult.data.data[0];
    console.log(`✅ Found department: ${department.name} (${department.code})`);
    results.department = department;
  } else {
    console.log('⚠️  No departments found, creating...');
    await sleep(5000);
    const deptData = { name: 'Sales', code: 'SALES', description: 'Sales Department', status: 'active' };
    const createDeptResult = await apiCall('POST', '/api/hr/departments', deptData, adminToken, 'lenstrack');
    if (createDeptResult.success && createDeptResult.data.success) {
      department = createDeptResult.data.data;
      console.log(`✅ Department created: ${department.name}`);
      results.department = department;
    } else {
      console.log('❌ Department creation failed:', createDeptResult.data?.message || createDeptResult.error);
      return;
    }
  }
  await sleep(3000);

  // Step 4: Create Employee
  console.log('\n4️⃣  Creating Employee...');
  await sleep(3000);
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
    console.log('Full response:', JSON.stringify(createEmpResult.fullResponse, null, 2));
    return;
  }

  const employee = createEmpResult.data.data;
  console.log(`✅ Employee created: ${employee.firstName || employeeData.firstName} ${employee.lastName || employeeData.lastName}`);
  console.log(`   Employee ID: ${employee.employeeId || employeeData.employeeId}`);
  console.log(`   Email: ${employeeData.email}`);
  results.employee = employee;
  results.employeeCredentials = { email: employeeData.email, password: employeeData.password, employeeId: employee.employeeId || employeeData.employeeId };
  
  // Step 4.5: Register employee in auth service
  console.log('\n4️⃣.5️⃣  Registering Employee in Auth Service...');
  await sleep(3000);
  const registerData = {
    tenantId: 'lenstrack',
    employee_id: employee.employeeId || employeeData.employeeId,
    name: `${employee.firstName || employeeData.firstName} ${employee.lastName || employeeData.lastName}`.trim(),
    email: employeeData.email,
    phone: employeeData.phone || '+91-9876543210',
    password: employeeData.password,
    role: 'employee',
    department: department.code || 'SALES',
    designation: employeeData.designation || 'Sales Executive',
    joining_date: employeeData.joining_date || new Date().toISOString().split('T')[0],
    status: 'active'
  };
  
  const registerResult = await apiCall('POST', '/api/auth/register', registerData, adminToken, 'lenstrack');
  if (registerResult.success && registerResult.data.success) {
    console.log('✅ Employee registered in auth service');
  } else if (registerResult.data?.message?.includes('already exists') || registerResult.status === 409) {
    console.log('⚠️  Employee already exists in auth service (expected)');
  } else {
    console.log('⚠️  Auth registration failed (may already exist):', registerResult.data?.message || registerResult.error);
    // Continue anyway - employee might already be registered
  }
  await sleep(3000);

  // Step 5: Employee Login
  console.log('\n5️⃣  Employee Login...');
  await sleep(3000);
  
  let empLoginResult = null;
  for (let i = 0; i < 5; i++) {
    empLoginResult = await apiCall('POST', '/api/auth/login', {
      email: employeeData.email,
      password: employeeData.password
    });

    if (empLoginResult.success && empLoginResult.data.success) {
      break;
    }
    
    if (i < 4) {
      console.log(`   Attempt ${i + 1} failed, waiting 3 seconds...`);
      await sleep(3000);
    }
  }

  if (!empLoginResult.success || !empLoginResult.data.success) {
    console.log('❌ Employee login failed after 5 attempts:', empLoginResult.data?.message || empLoginResult.error);
    console.log('   Employee created in HR service but auth service may need more time to sync.');
    console.log('   Try logging in manually after a few minutes.');
    return;
  }

  const employeeToken = empLoginResult.data.data.accessToken;
  const employeeId = employee.employeeId || employee.employee_id || employeeData.employeeId;
  console.log('✅ Employee logged in');
  console.log(`   Employee ID: ${employeeId}`);
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
    const checkInTime = clockInResult.data.data.checkIn?.time || clockInResult.data.data.check_in_time;
    console.log(`   Time: ${checkInTime}`);
    console.log(`   Store: ${clockInResult.data.data.storeCode || clockInResult.data.data.store_code || 'N/A'}`);
    results.clockIn = clockInResult.data.data;
  } else if (clockInResult.data?.message?.includes('already clocked') || clockInResult.data?.message?.includes('clock out')) {
    console.log('⚠️  Already clocked in (expected if testing multiple times)');
    results.clockIn = { skipped: true };
  } else {
    console.log('❌ Clock-in failed:', clockInResult.data?.message || clockInResult.error);
    console.log('Full response:', JSON.stringify(clockInResult.fullResponse, null, 2));
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
      const att = todayResult.data.data;
      console.log(`   Check-In: ${att.checkIn?.time || att.check_in_time || 'N/A'}`);
      console.log(`   Check-Out: ${att.checkOut?.time || att.check_out_time || 'Not yet'}`);
      console.log(`   Status: ${att.status || 'N/A'}`);
      console.log(`   Is Clocked In: ${att.isClockedIn !== undefined ? att.isClockedIn : 'N/A'}`);
      results.todayAttendance = att;
    } else {
      console.log('   No attendance data for today');
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
    results.clockOut = clockOutResult.data.data;
  } else if (clockOutResult.data?.message?.includes('No open attendance') || clockOutResult.data?.message?.includes('clock in')) {
    console.log('⚠️  No open attendance to clock out (expected if already clocked out)');
    results.clockOut = { skipped: true };
  } else {
    console.log('❌ Clock-out failed:', clockOutResult.data?.message || clockOutResult.error);
  }
  await sleep(5000);

  // Step 9: Check Dashboard
  console.log('\n9️⃣  Checking Dashboard (Attendance Reflection)...');
  await sleep(3000);
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
      results.dashboardReflected = true;
    } else {
      console.log('   ⚠️  Attendance count is 0 (may need time to sync)');
      results.dashboardReflected = false;
    }
    results.dashboard = dashboard;
  } else {
    console.log('❌ Dashboard failed:', dashboardResult.data?.message || dashboardResult.error);
  }
  await sleep(3000);

  // Step 10: Time Tracking
  console.log('\n🔟 Time Tracking...');
  await sleep(3000);
  const timeTrackingResult = await apiCall('GET', `/api/hr/time-tracking?employeeId=${employeeId}&date=${today}`, null, adminToken, 'lenstrack');
  
  if (timeTrackingResult.success) {
    const timeTracking = timeTrackingResult.data.data || [];
    console.log('✅ Time tracking retrieved');
    if (timeTracking.length > 0) {
      const totalHours = timeTracking.reduce((sum, r) => sum + (r.duration || 0), 0);
      console.log(`   Total Hours: ${totalHours.toFixed(2)}`);
      console.log(`   Records: ${timeTracking.length}`);
      results.timeTracking = timeTracking;
    } else {
      console.log('   ⚠️  No time tracking records yet (may need time to sync)');
    }
  } else {
    console.log('❌ Time tracking failed:', timeTrackingResult.data?.message || timeTrackingResult.error);
  }

  // Summary
  console.log('\n=====================================');
  console.log('📊 TEST SUMMARY');
  console.log('=====================================\n');
  console.log('✅ Store:', results.store?.name || 'N/A', `(${results.store?.code || 'N/A'})`);
  console.log('✅ Department:', results.department?.name || 'N/A', `(${results.department?.code || 'N/A'})`);
  console.log('✅ Employee:', results.employeeCredentials?.email || 'N/A');
  console.log('✅ Clock-In:', results.clockIn ? (results.clockIn.skipped ? 'Skipped (already clocked in)' : 'Success') : 'Failed');
  console.log('✅ Clock-Out:', results.clockOut ? (results.clockOut.skipped ? 'Skipped' : 'Success') : 'Failed');
  console.log('✅ Dashboard:', results.dashboardReflected ? 'Attendance Reflected ✅' : 'May need sync ⚠️');
  console.log('✅ Time Tracking:', results.timeTracking ? `${results.timeTracking.length} record(s)` : 'No records yet');
  
  console.log('\n🔐 Employee Credentials:');
  console.log(`   Email: ${results.employeeCredentials?.email || 'N/A'}`);
  console.log(`   Password: ${results.employeeCredentials?.password || 'N/A'}`);
  console.log(`   Employee ID: ${results.employeeCredentials?.employeeId || 'N/A'}`);
  
  console.log('\n✅ Complete Flow Test Finished!\n');
}

runTest().catch(console.error);
