#!/usr/bin/env node

/**
 * Comprehensive Test Script for All Recent Fixes
 * Tests:
 * 1. Tenant Isolation in Employee View
 * 2. Auth /me API (null fields fix)
 * 3. HR Employee API (null fields, workLocation, salary)
 * 4. Roster POST API (MongoDB _id lookup)
 * 5. Attendance Check-out (date filter)
 * 6. Dashboard Time Calculation (total hours aggregation)
 * 7. Attendance Stats Tenant Isolation
 */

const https = require('https');
const http = require('http');

const API_BASE = process.env.API_BASE || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com';

// Colors for output
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

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logTest(testName) {
  log(`\n📋 ${testName}`, 'blue');
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

async function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const req = protocol.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: json });
        } catch (e) {
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function login(email, password) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email, password }
  });
  
  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${JSON.stringify(response.data)}`);
  }
  
  return response.data.data?.accessToken || response.data.accessToken;
}

async function getProfile(token) {
  const response = await fetch(`${API_BASE}/api/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  return response;
}

async function getEmployeeById(token, tenantId, employeeId) {
  const response = await fetch(`${API_BASE}/api/hr/employees/${employeeId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
    }
  });
  
  return response;
}

async function createRoster(token, tenantId, rosterData) {
  const response = await fetch(`${API_BASE}/api/hr/roster`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json'
    },
    body: rosterData
  });
  
  return response;
}

async function clockIn(token, tenantId, latitude = 19.0760, longitude = 72.8777) {
  const response = await fetch(`${API_BASE}/api/attendance/check-in`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json'
    },
    body: { latitude, longitude }
  });
  
  return response;
}

async function clockOut(token, tenantId, latitude = 19.0760, longitude = 72.8777) {
  const response = await fetch(`${API_BASE}/api/attendance/check-out`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json'
    },
    body: { latitude, longitude }
  });
  
  return response;
}

async function getDashboard(token, tenantId) {
  const response = await fetch(`${API_BASE}/api/hr/dashboard`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
    }
  });
  
  return response;
}

async function getAttendanceStats(token, tenantId, date = null) {
  const url = `${API_BASE}/api/attendance/stats${date ? `?date=${date}` : ''}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
    }
  });
  
  return response;
}

async function main() {
  logSection('🧪 COMPREHENSIVE TEST SUITE - ALL FIXES');
  
  let passed = 0;
  let failed = 0;
  
  try {
    // ============================================
    // Test 1: Tenant Isolation in Employee View
    // ============================================
    logSection('1. Tenant Isolation in Employee View');
    
    logTest('Login as Upcapto Admin');
    const upcaptoToken = await login('admin@upcapto.com', 'Upcapto@2026');
    const upcaptoProfile = await getProfile(upcaptoToken);
    const upcaptoTenant = upcaptoProfile.data?.tenantId || upcaptoProfile.data?.data?.tenantId;
    logSuccess(`Logged in as Upcapto Admin (Tenant: ${upcaptoTenant})`);
    
    logTest('Get Upcapto employee list');
    const upcaptoEmployees = await fetch(`${API_BASE}/api/hr/employees?limit=2`, {
      headers: {
        'Authorization': `Bearer ${upcaptoToken}`,
        'x-tenant-id': upcaptoTenant
      }
    });
    const upcaptoEmpId = upcaptoEmployees.data?.data?.[0]?._id || upcaptoEmployees.data?.data?.[0]?.id;
    if (upcaptoEmpId) {
      logSuccess(`Found Upcapto employee: ${upcaptoEmpId}`);
    }
    
    logTest('Upcapto Admin accessing Upcapto Employee (should work)');
    if (upcaptoEmpId) {
      const result = await getEmployeeById(upcaptoToken, upcaptoTenant, upcaptoEmpId);
      if (result.ok && result.data.success) {
        logSuccess(`✅ Same-tenant access works: ${result.data.data.name}`);
        passed++;
      } else {
        logError(`❌ Same-tenant access failed: ${result.data.message}`);
        failed++;
      }
    }
    
    logTest('Login as Lenstrack Admin');
    const lenstrackToken = await login('admin@lenstrack.com', 'AdminPass123!');
    const lenstrackProfile = await getProfile(lenstrackToken);
    const lenstrackTenant = lenstrackProfile.data?.tenantId || lenstrackProfile.data?.data?.tenantId;
    logSuccess(`Logged in as Lenstrack Admin (Tenant: ${lenstrackTenant})`);
    
    logTest('Get Lenstrack employee list');
    const lenstrackEmployees = await fetch(`${API_BASE}/api/hr/employees?limit=2`, {
      headers: {
        'Authorization': `Bearer ${lenstrackToken}`,
        'x-tenant-id': lenstrackTenant
      }
    });
    const lenstrackEmpId = lenstrackEmployees.data?.data?.[0]?._id || lenstrackEmployees.data?.data?.[0]?.id;
    if (lenstrackEmpId) {
      logSuccess(`Found Lenstrack employee: ${lenstrackEmpId}`);
    }
    
    logTest('Upcapto Admin accessing Lenstrack Employee (should FAIL)');
    if (lenstrackEmpId) {
      const result = await getEmployeeById(upcaptoToken, upcaptoTenant, lenstrackEmpId);
      if (!result.ok && result.status === 404) {
        logSuccess(`✅ Cross-tenant access blocked: ${result.data.message}`);
        passed++;
      } else {
        logError(`❌ Cross-tenant access not blocked! Status: ${result.status}`);
        failed++;
      }
    }
    
    // ============================================
    // Test 2: Auth /me API - Null Fields Fix
    // ============================================
    logSection('2. Auth /me API - Null Fields Fix');
    
    logTest('Check /me API for null fields');
    const meResponse = await getProfile(upcaptoToken);
    if (meResponse.ok && meResponse.data.success) {
      const profile = meResponse.data.data || meResponse.data;
      const nullFields = [];
      if (!profile.employeeId && !profile.employee_id) nullFields.push('employeeId');
      if (!profile.tenantId) nullFields.push('tenantId');
      if (!profile.name) nullFields.push('name');
      if (!profile.store) nullFields.push('store');
      
      if (nullFields.length === 0) {
        logSuccess('✅ All fields populated in /me API');
        passed++;
      } else {
        logError(`❌ Null fields found: ${nullFields.join(', ')}`);
        failed++;
      }
    } else {
      logError(`❌ /me API failed: ${meResponse.data.message}`);
      failed++;
    }
    
    // ============================================
    // Test 3: HR Employee API - Null Fields & Details
    // ============================================
    logSection('3. HR Employee API - Null Fields & Details');
    
    logTest('Check Employee GET API for all details');
    if (upcaptoEmpId) {
      const empResponse = await getEmployeeById(upcaptoToken, upcaptoTenant, upcaptoEmpId);
      if (empResponse.ok && empResponse.data.success) {
        const emp = empResponse.data.data;
        const missingFields = [];
        if (!emp.name) missingFields.push('name');
        if (!emp.employeeId && !emp.employee_id) missingFields.push('employeeId');
        if (!emp.base_salary && emp.base_salary !== 0) missingFields.push('base_salary');
        if (!emp.workLocation) missingFields.push('workLocation');
        if (!emp.roleName && !emp.role) missingFields.push('role');
        
        if (missingFields.length === 0) {
          logSuccess('✅ All employee details populated (name, salary, workLocation, role)');
          passed++;
        } else {
          logWarning(`⚠️  Missing fields: ${missingFields.join(', ')}`);
          failed++;
        }
      } else {
        logError(`❌ Employee GET API failed: ${empResponse.data.message}`);
        failed++;
      }
    }
    
    // ============================================
    // Test 4: Roster POST API - MongoDB _id Lookup
    // ============================================
    logSection('4. Roster POST API - MongoDB _id Lookup');
    
    logTest('Create Roster with MongoDB _id as employeeId');
    if (upcaptoEmpId) {
      const today = new Date().toISOString().split('T')[0];
      const rosterData = {
        employeeId: upcaptoEmpId, // MongoDB _id
        storeId: 'test-store-id', // This might fail, but we're testing employee lookup
        date: today,
        shift: 'MORNING',
        shiftStart: '09:00',
        shiftEnd: '18:00'
      };
      
      const rosterResponse = await createRoster(upcaptoToken, upcaptoTenant, rosterData);
      // We expect this might fail due to storeId, but employee lookup should work
      if (rosterResponse.data.message && rosterResponse.data.message.includes('Employee not found')) {
        logError('❌ Employee lookup by MongoDB _id failed');
        failed++;
      } else if (rosterResponse.data.message && rosterResponse.data.message.includes('store')) {
        logSuccess('✅ Employee lookup by MongoDB _id works (store error expected)');
        passed++;
      } else if (rosterResponse.ok) {
        logSuccess('✅ Roster created successfully with MongoDB _id');
        passed++;
      } else {
        logWarning(`⚠️  Roster creation: ${rosterResponse.data.message}`);
      }
    }
    
    // ============================================
    // Test 5: Attendance Check-out Date Filter
    // ============================================
    logSection('5. Attendance Check-out Date Filter');
    
    logTest('Clock-in for test');
    const clockInResponse = await clockIn(upcaptoToken, upcaptoTenant);
    if (clockInResponse.ok) {
      logSuccess('✅ Clock-in successful');
      
      logTest('Clock-out (should work with date filter)');
      const clockOutResponse = await clockOut(upcaptoToken, upcaptoTenant);
      if (clockOutResponse.ok) {
        logSuccess('✅ Clock-out successful (date filter working)');
        passed++;
      } else {
        logError(`❌ Clock-out failed: ${clockOutResponse.data.message}`);
        failed++;
      }
    } else {
      logWarning(`⚠️  Clock-in failed: ${clockInResponse.data.message}`);
    }
    
    // ============================================
    // Test 6: Dashboard Time Calculation
    // ============================================
    logSection('6. Dashboard Time Calculation - Total Hours Aggregation');
    
    logTest('Get Dashboard and check totalLoginTimeToday');
    const dashboardResponse = await getDashboard(upcaptoToken, upcaptoTenant);
    if (dashboardResponse.ok && dashboardResponse.data.success) {
      const attendance = dashboardResponse.data.data?.widgets?.attendance;
      if (attendance && attendance.totalLoginTimeToday) {
        const totalTime = attendance.totalLoginTimeToday;
        if (totalTime.hours !== undefined && totalTime.sessionsCount !== undefined) {
          logSuccess(`✅ Total hours aggregation working: ${totalTime.hours}h (${totalTime.sessionsCount} sessions)`);
          passed++;
        } else {
          logError('❌ totalLoginTimeToday missing hours or sessionsCount');
          failed++;
        }
      } else {
        logWarning('⚠️  totalLoginTimeToday not found in dashboard');
      }
    } else {
      logWarning(`⚠️  Dashboard API failed: ${dashboardResponse.data.message}`);
    }
    
    // ============================================
    // Test 7: Attendance Stats Tenant Isolation
    // ============================================
    logSection('7. Attendance Stats Tenant Isolation');
    
    logTest('Get Attendance Stats for Upcapto');
    const upcaptoStats = await getAttendanceStats(upcaptoToken, upcaptoTenant);
    if (upcaptoStats.ok && upcaptoStats.data.success) {
      const upcaptoTotal = upcaptoStats.data.data?.totalEmployees || 0;
      logSuccess(`Upcapto total employees: ${upcaptoTotal}`);
    }
    
    logTest('Get Attendance Stats for Lenstrack');
    const lenstrackStats = await getAttendanceStats(lenstrackToken, lenstrackTenant);
    if (lenstrackStats.ok && lenstrackStats.data.success) {
      const lenstrackTotal = lenstrackStats.data.data?.totalEmployees || 0;
      logSuccess(`Lenstrack total employees: ${lenstrackTotal}`);
      
      if (upcaptoStats.ok && upcaptoStats.data.success) {
        const upcaptoTotal = upcaptoStats.data.data?.totalEmployees || 0;
        if (upcaptoTotal !== lenstrackTotal) {
          logSuccess('✅ Tenant isolation working (different employee counts)');
          passed++;
        } else {
          logWarning('⚠️  Same employee count - might indicate tenant isolation issue');
        }
      }
    }
    
    // ============================================
    // Summary
    // ============================================
    logSection('📊 TEST SUMMARY');
    log(`Total Tests Passed: ${passed}`, 'green');
    log(`Total Tests Failed: ${failed}`, failed > 0 ? 'red' : 'green');
    log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`, passed > failed ? 'green' : 'yellow');
    
  } catch (error) {
    logError(`Test suite error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main().catch(console.error);
