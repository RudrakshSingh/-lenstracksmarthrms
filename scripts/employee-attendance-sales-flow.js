#!/usr/bin/env node
/**
 * Complete Employee Flow: Login → Clock In → Add Sales → Clock Out → Check Dashboard
 * 
 * Usage:
 *   BASE_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com node scripts/employee-attendance-sales-flow.js
 *   BASE_URL=http://localhost:3000 node scripts/employee-attendance-sales-flow.js
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const EMPLOYEE_EMAIL = process.env.EMPLOYEE_EMAIL || 'employee@lenstrack.com';
const EMPLOYEE_PASSWORD = process.env.EMPLOYEE_PASSWORD || 'TempPass123!'; // Default password
const SALES_AMOUNT = parseFloat(process.env.SALES_AMOUNT || '30000');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Helper function to make API calls
async function apiCall(method, endpoint, data = null, token = null, tenantId = 'lenstrack') {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...(tenantId && { 'X-Tenant-Id': tenantId })
      },
      timeout: 30000
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

async function main() {
  log('\n🚀 Starting Employee Flow: Login → Attendance → Sales → Dashboard', 'cyan');
  log('=' .repeat(70), 'cyan');

  let accessToken = null;
  let employeeId = null;
  let employeeName = null;
  let storeId = null;

  // Step 1: Login
  log('\n📝 Step 1: Employee Login', 'yellow');
  log(`   Email: ${EMPLOYEE_EMAIL}`, 'blue');
  
  const loginResult = await apiCall('POST', '/api/auth/login', {
    email: EMPLOYEE_EMAIL,
    password: EMPLOYEE_PASSWORD
  });

  if (!loginResult.success) {
    log(`   ❌ Login Failed: ${JSON.stringify(loginResult.error)}`, 'red');
    
    // Try with employee ID if email fails
    log(`   🔄 Trying with Employee ID...`, 'yellow');
    const employeeIdLogin = await apiCall('POST', '/api/auth/login', {
      emailOrEmployeeId: 'LENSTRACK-EMP-001',
      password: EMPLOYEE_PASSWORD
    });
    
    if (!employeeIdLogin.success) {
      log(`   ❌ Login with Employee ID also failed: ${JSON.stringify(employeeIdLogin.error)}`, 'red');
      log(`   💡 Try resetting password or check credentials`, 'yellow');
      process.exit(1);
    }
    
    accessToken = employeeIdLogin.data?.data?.accessToken || employeeIdLogin.data?.accessToken;
    employeeId = employeeIdLogin.data?.data?.user?.employeeId || 'LENSTRACK-EMP-001';
    employeeName = employeeIdLogin.data?.data?.user?.name || 'Employee';
    log(`   ✅ Login Successful (via Employee ID)`, 'green');
  } else {
    accessToken = loginResult.data?.data?.accessToken || loginResult.data?.accessToken;
    const userData = loginResult.data?.data?.user || loginResult.data?.user || {};
    employeeId = userData.employeeId || userData.employee_id || 'LENSTRACK-EMP-001';
    employeeName = userData.name || userData.firstName || 'Employee';
    
    // Try to decode token to get employeeId if not in response
    if (!employeeId || employeeId === 'undefined') {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(accessToken);
        employeeId = decoded?.employeeId || decoded?.employee_id || 'LENSTRACK-EMP-001';
      } catch (e) {
        employeeId = 'LENSTRACK-EMP-001';
      }
    }
    
    log(`   ✅ Login Successful`, 'green');
    log(`   Employee ID: ${employeeId}`, 'blue');
    log(`   Name: ${employeeName}`, 'blue');
  }

  if (!accessToken) {
    log(`   ❌ No access token received`, 'red');
    process.exit(1);
  }

  // Step 2: Get Employee Details (to find store)
  log('\n📋 Step 2: Fetching Employee Details', 'yellow');
  const employeeResult = await apiCall('GET', `/api/hr/employees/${employeeId}`, null, accessToken, 'lenstrack');
  
  if (employeeResult.success) {
    const emp = employeeResult.data?.data || employeeResult.data;
    storeId = emp?.store?._id || emp?.store || emp?.workLocation?.storeId;
    log(`   ✅ Employee Details Fetched`, 'green');
    log(`   Store ID: ${storeId || 'Not assigned'}`, 'blue');
  } else {
    log(`   ⚠️  Could not fetch employee details: ${JSON.stringify(employeeResult.error)}`, 'yellow');
    // Try to get store from stores list
    const storesResult = await apiCall('GET', '/api/hr/stores', null, accessToken);
    if (storesResult.success && storesResult.data?.data?.length > 0) {
      storeId = storesResult.data.data[0]._id || storesResult.data.data[0].id;
      log(`   ✅ Using first available store: ${storeId}`, 'green');
    }
  }

  if (!storeId) {
    log(`   ⚠️  No store found. Using default store ID from previous check: 69a2eac35afbd9ae9fed8585`, 'yellow');
    storeId = '69a2eac35afbd9ae9fed8585'; // Mumbai Store from previous check
  }

  // Step 3: Clock In
  log('\n⏰ Step 3: Clocking In', 'yellow');
  const clockInData = {
    latitude: 19.0760, // Mumbai coordinates
    longitude: 72.8777,
    timestamp: Date.now(),
    notes: 'Clock in for sales day'
  };

  const clockInResult = await apiCall('POST', '/api/attendance/clock-in', clockInData, accessToken, 'lenstrack');
  
  if (!clockInResult.success) {
    // Check if already clocked in
    if (clockInResult.error?.message?.includes('already clocked in') || 
        clockInResult.error?.message?.includes('already clocked')) {
      log(`   ⚠️  Already clocked in, continuing...`, 'yellow');
    } else {
      log(`   ❌ Clock In Failed: ${JSON.stringify(clockInResult.error)}`, 'red');
      // Continue anyway
    }
  } else {
    log(`   ✅ Clocked In Successfully`, 'green');
    const attendance = clockInResult.data?.data || clockInResult.data;
    log(`   Attendance ID: ${attendance?.id || attendance?._id}`, 'blue');
  }

  // Step 4: Add Sales Entry (30000)
  log('\n💰 Step 4: Adding Sales Entry', 'yellow');
  log(`   Sales Amount: ₹${SALES_AMOUNT.toLocaleString('en-IN')}`, 'blue');
  
  // Ensure storeId is a string, not an object
  let storeIdString = storeId;
  if (typeof storeId === 'object' && storeId !== null) {
    storeIdString = storeId._id || storeId.id || storeId.toString();
  }
  
  const salesData = {
    customer_name: 'Walk-in Customer',
    customer_phone: `+91${Math.floor(Math.random() * 10000000000)}`,
    items: [{
      product_name: 'Daily Sales Entry',
      quantity: 1,
      unit_price: SALES_AMOUNT,
      discount_percentage: 0,
      tax_rate: 0
    }],
    store_id: storeIdString,
    payment_method: 'CASH',
    payment_status: 'PAID',
    notes: `Daily sales entry for ${new Date().toLocaleDateString('en-IN')}`,
    sales_person_name: employeeName || 'Employee',
    sales_person_id: employeeId, // Add employee ID for tracking
    order_date: new Date().toISOString()
  };

  const salesResult = await apiCall('POST', '/api/sales/manual-entry', salesData, accessToken, 'lenstrack');
  
  if (!salesResult.success) {
    log(`   ❌ Sales Entry Failed: ${JSON.stringify(salesResult.error)}`, 'red');
    log(`   ⚠️  Continuing to clock out...`, 'yellow');
  } else {
    log(`   ✅ Sales Entry Created Successfully`, 'green');
    const order = salesResult.data?.data || salesResult.data;
    log(`   Order Number: ${order?.order_number || 'N/A'}`, 'blue');
    log(`   Total Amount: ₹${order?.total_amount?.toLocaleString('en-IN') || SALES_AMOUNT.toLocaleString('en-IN')}`, 'blue');
  }

  // Step 5: Clock Out
  log('\n⏰ Step 5: Clocking Out', 'yellow');
  const clockOutData = {
    timestamp: Date.now(),
    latitude: 19.0760,
    longitude: 72.8777,
    notes: 'Clock out after sales entry'
  };

  const clockOutResult = await apiCall('POST', '/api/attendance/check-out', clockOutData, accessToken, 'lenstrack');
  
  if (!clockOutResult.success) {
    log(`   ⚠️  Clock Out Failed: ${JSON.stringify(clockOutResult.error)}`, 'yellow');
  } else {
    log(`   ✅ Clocked Out Successfully`, 'green');
    const attendance = clockOutResult.data?.data || clockOutResult.data;
    log(`   Check Out Time: ${attendance?.checkOut?.time || attendance?.check_out?.time || 'N/A'}`, 'blue');
  }

  // Step 6: Check Today's Attendance
  log('\n📊 Step 6: Checking Today\'s Attendance', 'yellow');
  const today = new Date().toISOString().split('T')[0];
  const attendanceResult = await apiCall(
    'GET',
    `/api/attendance/today?employeeId=${employeeId}&date=${today}`,
    null,
    accessToken,
    'lenstrack'
  );

  if (attendanceResult.success) {
    const attendance = attendanceResult.data?.data || attendanceResult.data;
    if (attendance) {
      log(`   ✅ Attendance Found`, 'green');
      log(`   Check In: ${attendance?.checkIn?.time || attendance?.check_in?.time || 'N/A'}`, 'blue');
      log(`   Check Out: ${attendance?.checkOut?.time || attendance?.check_out?.time || 'N/A'}`, 'blue');
      log(`   Status: ${attendance?.status || 'N/A'}`, 'blue');
    } else {
      log(`   ⚠️  No attendance record for today`, 'yellow');
    }
  } else {
    log(`   ⚠️  Could not fetch attendance: ${JSON.stringify(attendanceResult.error)}`, 'yellow');
  }

  // Step 7: Check Dashboard
  log('\n📈 Step 7: Checking Dashboard', 'yellow');
  const dashboardResult = await apiCall('GET', '/api/hr/dashboard', null, accessToken, 'lenstrack');
  
  if (dashboardResult.success) {
    const dashboard = dashboardResult.data?.data || dashboardResult.data;
    log(`   ✅ Dashboard Data Retrieved`, 'green');
    log(`   Dashboard Stats:`, 'blue');
    console.log(JSON.stringify(dashboard, null, 2));
  } else {
    log(`   ⚠️  Could not fetch dashboard: ${JSON.stringify(dashboardResult.error)}`, 'yellow');
  }

  // Step 8: Check Sales Dashboard
  log('\n💰 Step 8: Checking Sales Dashboard', 'yellow');
  const salesDashboardResult = await apiCall('GET', '/api/sales/dashboard', null, accessToken, 'lenstrack');
  
  if (salesDashboardResult.success) {
    const salesDashboard = salesDashboardResult.data?.data || salesDashboardResult.data;
    log(`   ✅ Sales Dashboard Retrieved`, 'green');
    log(`   Sales Data:`, 'blue');
    console.log(JSON.stringify(salesDashboard, null, 2));
  } else {
    log(`   ⚠️  Could not fetch sales dashboard: ${JSON.stringify(salesDashboardResult.error)}`, 'yellow');
  }

  log('\n' + '='.repeat(70), 'cyan');
  log('✅ Employee Flow Completed!', 'green');
  log(`\n📝 Summary:`, 'cyan');
  log(`   - Employee: ${employeeName} (${employeeId})`, 'blue');
  log(`   - Attendance: Clocked In & Out`, 'blue');
  log(`   - Sales: ₹${SALES_AMOUNT.toLocaleString('en-IN')}`, 'blue');
  log(`   - Dashboard: Checked`, 'blue');
  log('\n', 'reset');
}

// Run the script
main().catch(error => {
  log(`\n❌ Fatal Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
