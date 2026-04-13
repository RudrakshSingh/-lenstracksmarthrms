#!/usr/bin/env node
/**
 * Test All APIs for Lenstrack Tenant
 * Tests: Login, Attendance, Sales, Dashboard
 * 
 * Usage:
 *   BASE_URL=http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com node scripts/test-all-tenant-apis.js
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TENANT_ID = 'lenstrack';
const EMPLOYEE_EMAIL = process.env.EMPLOYEE_EMAIL || 'employee@lenstrack.com';
const EMPLOYEE_PASSWORD = process.env.EMPLOYEE_PASSWORD || 'Employee123!';

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

async function apiCall(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': TENANT_ID,
        ...(token && { 'Authorization': `Bearer ${token}` })
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
  log('\n🧪 Testing All APIs for Lenstrack Tenant', 'cyan');
  log('='.repeat(70), 'cyan');

  let accessToken = null;
  let employeeId = null;
  let storeId = null;
  const results = { passed: 0, failed: 0, tests: [] };

  // Test 1: Login
  log('\n📝 Test 1: Employee Login', 'yellow');
  const loginResult = await apiCall('POST', '/api/auth/login', {
    email: EMPLOYEE_EMAIL,
    password: EMPLOYEE_PASSWORD
  });

  if (loginResult.success) {
    accessToken = loginResult.data?.data?.accessToken || loginResult.data?.accessToken;
    const user = loginResult.data?.data?.user || loginResult.data?.user || {};
    employeeId = user.employeeId || user.employee_id || 'LENSTRACK-EMP-001';
    log(`   ✅ PASS: Login successful`, 'green');
    log(`   Employee ID: ${employeeId}`, 'blue');
    results.passed++;
    results.tests.push({ name: 'Login', status: 'PASS' });
  } else {
    log(`   ❌ FAIL: Login failed - ${JSON.stringify(loginResult.error)}`, 'red');
    results.failed++;
    results.tests.push({ name: 'Login', status: 'FAIL', error: loginResult.error });
    log(`   ⚠️  Cannot continue without login`, 'yellow');
    return;
  }

  // Test 2: Get Employee Details
  log('\n📋 Test 2: Get Employee Details', 'yellow');
  const empResult = await apiCall('GET', `/api/hr/employees/${employeeId}`, null, accessToken);
  if (empResult.success) {
    const emp = empResult.data?.data || empResult.data;
    storeId = emp?.store?._id || emp?.store || emp?.workLocation?.storeId;
    if (typeof storeId === 'object') storeId = storeId._id || storeId.id;
    log(`   ✅ PASS: Employee details fetched`, 'green');
    log(`   Store ID: ${storeId || 'N/A'}`, 'blue');
    results.passed++;
    results.tests.push({ name: 'Get Employee', status: 'PASS' });
  } else {
    log(`   ⚠️  WARN: Could not fetch employee - ${JSON.stringify(empResult.error)}`, 'yellow');
    storeId = '69a2eac35afbd9ae9fed8585'; // Fallback
    results.tests.push({ name: 'Get Employee', status: 'WARN' });
  }

  // Test 3: Clock In
  log('\n⏰ Test 3: Clock In', 'yellow');
  const clockInResult = await apiCall('POST', '/api/attendance/clock-in', {
    latitude: 19.0760,
    longitude: 72.8777,
    timestamp: Date.now(),
    notes: 'Test clock in'
  }, accessToken);

  if (clockInResult.success || clockInResult.error?.message?.includes('already clocked')) {
    log(`   ✅ PASS: Clock in successful`, 'green');
    results.passed++;
    results.tests.push({ name: 'Clock In', status: 'PASS' });
  } else {
    log(`   ❌ FAIL: Clock in failed - ${JSON.stringify(clockInResult.error)}`, 'red');
    results.failed++;
    results.tests.push({ name: 'Clock In', status: 'FAIL', error: clockInResult.error });
  }

  // Test 4: Sales Entry - Test with 0
  log('\n💰 Test 4: Sales Entry (₹0)', 'yellow');
  const sales0Result = await apiCall('POST', '/api/sales/manual-entry', {
    customer_name: 'Test Customer Zero',
    customer_phone: `+91${Math.floor(Math.random() * 10000000000)}`,
    items: [{
      product_name: 'Test Product Zero',
      quantity: 1,
      unit_price: 0,
      discount_percentage: 0,
      tax_rate: 0
    }],
    store_id: storeId,
    payment_method: 'CASH',
    payment_status: 'PAID',
    notes: 'Test sales entry with 0 amount'
  }, accessToken);

  if (sales0Result.success) {
    log(`   ✅ PASS: Sales entry with ₹0 accepted`, 'green');
    results.passed++;
    results.tests.push({ name: 'Sales Entry (₹0)', status: 'PASS' });
  } else {
    log(`   ❌ FAIL: Sales entry with ₹0 failed - ${JSON.stringify(sales0Result.error)}`, 'red');
    results.failed++;
    results.tests.push({ name: 'Sales Entry (₹0)', status: 'FAIL', error: sales0Result.error });
  }

  // Test 5: Sales Entry - Test with 30000
  log('\n💰 Test 5: Sales Entry (₹30,000)', 'yellow');
  const sales30kResult = await apiCall('POST', '/api/sales/manual-entry', {
    customer_name: 'Test Customer 30K',
    customer_phone: `+91${Math.floor(Math.random() * 10000000000)}`,
    items: [{
      product_name: 'Test Product 30K',
      quantity: 1,
      unit_price: 30000,
      discount_percentage: 0,
      tax_rate: 0
    }],
    store_id: storeId,
    payment_method: 'CASH',
    payment_status: 'PAID',
    notes: 'Test sales entry with ₹30,000',
    sales_person_id: employeeId
  }, accessToken);

  // Test 5b: Sales Entry - Test with large amount (1 crore)
  log('\n💰 Test 5b: Sales Entry (₹1,00,00,000 - Large Amount)', 'yellow');
  const salesLargeResult = await apiCall('POST', '/api/sales/manual-entry', {
    customer_name: 'Test Customer Large',
    customer_phone: `+91${Math.floor(Math.random() * 10000000000)}`,
    items: [{
      product_name: 'Test Product Large',
      quantity: 1,
      unit_price: 10000000, // 1 crore
      discount_percentage: 0,
      tax_rate: 0
    }],
    store_id: storeId,
    payment_method: 'CASH',
    payment_status: 'PAID',
    notes: 'Test sales entry with ₹1 crore (no upper limit)',
    sales_person_id: employeeId
  }, accessToken);

  if (sales30kResult.success) {
    log(`   ✅ PASS: Sales entry with ₹30,000 created`, 'green');
    const order = sales30kResult.data?.data || sales30kResult.data;
    log(`   Order Number: ${order?.order_number || 'N/A'}`, 'blue');
    results.passed++;
    results.tests.push({ name: 'Sales Entry (₹30K)', status: 'PASS' });
  } else {
    log(`   ❌ FAIL: Sales entry with ₹30,000 failed - ${JSON.stringify(sales30kResult.error)}`, 'red');
    results.failed++;
    results.tests.push({ name: 'Sales Entry (₹30K)', status: 'FAIL', error: sales30kResult.error });
  }

  if (salesLargeResult.success) {
    log(`   ✅ PASS: Sales entry with ₹1 crore created (no upper limit)`, 'green');
    const order = salesLargeResult.data?.data || salesLargeResult.data;
    log(`   Order Number: ${order?.order_number || 'N/A'}`, 'blue');
    log(`   Total Amount: ₹${(order?.total_amount || 0).toLocaleString('en-IN')}`, 'blue');
    results.passed++;
    results.tests.push({ name: 'Sales Entry (Large Amount)', status: 'PASS' });
  } else {
    log(`   ⚠️  WARN: Large sales entry - ${JSON.stringify(salesLargeResult.error)}`, 'yellow');
    results.tests.push({ name: 'Sales Entry (Large Amount)', status: 'WARN' });
  }

  // Test 6: Sales Entry - Test with negative (should fail)
  log('\n💰 Test 6: Sales Entry (Negative - Should Fail)', 'yellow');
  const salesNegResult = await apiCall('POST', '/api/sales/manual-entry', {
    customer_name: 'Test Customer Negative',
    customer_phone: `+91${Math.floor(Math.random() * 10000000000)}`,
    items: [{
      product_name: 'Test Product Negative',
      quantity: 1,
      unit_price: -100,
      discount_percentage: 0,
      tax_rate: 0
    }],
    store_id: storeId,
    payment_method: 'CASH',
    payment_status: 'PAID',
    notes: 'Test sales entry with negative amount (should fail)'
  }, accessToken);

  if (!salesNegResult.success) {
    log(`   ✅ PASS: Negative sales entry correctly rejected`, 'green');
    results.passed++;
    results.tests.push({ name: 'Sales Entry (Negative Rejection)', status: 'PASS' });
  } else {
    log(`   ❌ FAIL: Negative sales entry was accepted (should be rejected)`, 'red');
    results.failed++;
    results.tests.push({ name: 'Sales Entry (Negative Rejection)', status: 'FAIL' });
  }

  // Test 7: Clock Out
  log('\n⏰ Test 7: Clock Out', 'yellow');
  const clockOutResult = await apiCall('POST', '/api/attendance/check-out', {
    timestamp: Date.now(),
    latitude: 19.0760,
    longitude: 72.8777,
    notes: 'Test clock out'
  }, accessToken);

  if (clockOutResult.success) {
    log(`   ✅ PASS: Clock out successful`, 'green');
    results.passed++;
    results.tests.push({ name: 'Clock Out', status: 'PASS' });
  } else {
    log(`   ⚠️  WARN: Clock out - ${JSON.stringify(clockOutResult.error)}`, 'yellow');
    results.tests.push({ name: 'Clock Out', status: 'WARN' });
  }

  // Test 8: Get Today's Attendance
  log('\n📊 Test 8: Get Today\'s Attendance', 'yellow');
  const today = new Date().toISOString().split('T')[0];
  const attendanceResult = await apiCall('GET', `/api/attendance/today?employeeId=${employeeId}&date=${today}`, null, accessToken);

  if (attendanceResult.success) {
    log(`   ✅ PASS: Attendance data retrieved`, 'green');
    results.passed++;
    results.tests.push({ name: 'Get Attendance', status: 'PASS' });
  } else {
    log(`   ⚠️  WARN: Attendance - ${JSON.stringify(attendanceResult.error)}`, 'yellow');
    results.tests.push({ name: 'Get Attendance', status: 'WARN' });
  }

  // Test 9: Get Dashboard
  log('\n📈 Test 9: Get Dashboard', 'yellow');
  const dashboardResult = await apiCall('GET', '/api/hr/dashboard', null, accessToken);

  if (dashboardResult.success) {
    log(`   ✅ PASS: Dashboard data retrieved`, 'green');
    const dashboard = dashboardResult.data?.data || dashboardResult.data;
    if (dashboard?.widgets?.sales) {
      log(`   Sales Data: Available`, 'blue');
    }
    if (dashboard?.widgets?.employeeSales) {
      log(`   Employee Sales: Available`, 'blue');
    }
    results.passed++;
    results.tests.push({ name: 'Get Dashboard', status: 'PASS' });
  } else {
    log(`   ⚠️  WARN: Dashboard - ${JSON.stringify(dashboardResult.error)}`, 'yellow');
    results.tests.push({ name: 'Get Dashboard', status: 'WARN' });
  }

  // Test 10: Get Sales Dashboard
  log('\n💰 Test 10: Get Sales Dashboard', 'yellow');
  const salesDashboardResult = await apiCall('GET', '/api/sales/dashboard', null, accessToken);

  if (salesDashboardResult.success) {
    log(`   ✅ PASS: Sales dashboard retrieved`, 'green');
    const salesDashboard = salesDashboardResult.data?.data || salesDashboardResult.data;
    log(`   Total Revenue: ₹${(salesDashboard?.sales?.total_revenue || 0).toLocaleString('en-IN')}`, 'blue');
    results.passed++;
    results.tests.push({ name: 'Get Sales Dashboard', status: 'PASS' });
  } else {
    log(`   ⚠️  WARN: Sales Dashboard - ${JSON.stringify(salesDashboardResult.error)}`, 'yellow');
    results.tests.push({ name: 'Get Sales Dashboard', status: 'WARN' });
  }

  // Summary
  log('\n' + '='.repeat(70), 'cyan');
  log('📊 Test Summary', 'cyan');
  log(`   ✅ Passed: ${results.passed}`, 'green');
  log(`   ❌ Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`   ⚠️  Warnings: ${results.tests.filter(t => t.status === 'WARN').length}`, 'yellow');
  log(`   Total Tests: ${results.tests.length}`, 'blue');
  
  log('\n📋 Test Details:', 'cyan');
  results.tests.forEach(test => {
    const icon = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️';
    log(`   ${icon} ${test.name}: ${test.status}`, test.status === 'PASS' ? 'green' : test.status === 'FAIL' ? 'red' : 'yellow');
  });

  log('\n', 'reset');
}

main().catch(error => {
  log(`\n❌ Fatal Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
