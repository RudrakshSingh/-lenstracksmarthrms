#!/usr/bin/env node
/**
 * Test all Stats APIs with real database data
 * 
 * This script tests all statistics endpoints to verify they're working correctly
 * with actual data from the database.
 * 
 * Usage:
 *   node scripts/test-all-stats-apis.js
 * 
 * Environment Variables:
 *   - API_BASE: Base API URL (default: production ALB)
 *   - EMAIL: Login email (default: admin@lenstrack.com)
 *   - PASSWORD: Login password (default: AdminPass123!)
 *   - TENANT_ID: Tenant ID (default: lenstrack)
 */

const API_BASE = process.env.API_BASE || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api';
const EMAIL = process.env.EMAIL || 'admin@lenstrack.com';
const PASSWORD = process.env.PASSWORD || 'AdminPass123!';
const TENANT_ID = process.env.TENANT_ID || 'lenstrack';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
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
  console.log('\n' + '='.repeat(80));
  log(title, 'bright');
  console.log('='.repeat(80));
}

function logTest(name) {
  log(`\n📊 Testing: ${name}`, 'cyan');
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

// Test results storage
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

async function login() {
  logSection('🔐 Step 1: Authentication');
  logTest('Logging in...');
  
  try {
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD
      }),
    });

    const loginBody = await loginRes.json().catch(() => ({}));
    
    if (!loginRes.ok) {
      logError(`Login failed: ${loginRes.status}`);
      console.error('Response:', loginBody);
      throw new Error('Login failed');
    }

    const token = loginBody.accessToken || loginBody.data?.accessToken;
    const user = loginBody.user || loginBody.data?.user || loginBody.data;
    const tenantFromUser = user?.tenantId || user?.tenant_id || TENANT_ID;
    const userRole = user?.role || user?.userRole || 'employee';

    if (!token) {
      logError('No access token in response');
      throw new Error('No token received');
    }

    logSuccess(`Login successful! User: ${user?.name || EMAIL}, Role: ${userRole}, Tenant: ${tenantFromUser}`);
    
    return { token, tenantId: tenantFromUser, userRole, user };
  } catch (error) {
    logError(`Login error: ${error.message}`);
    throw error;
  }
}

async function testAPI(name, method, endpoint, options = {}) {
  testResults.total++;
  const { token, tenantId, userRole } = options;
  
  try {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId || TENANT_ID,
      ...options.headers
    };

    logTest(`${name} - ${method} ${endpoint}`);
    logInfo(`URL: ${url}`);

    const response = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const responseText = await response.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      logError(`Invalid JSON response`);
      console.log('Response:', responseText.slice(0, 500));
      testResults.failed++;
      testResults.details.push({
        name,
        endpoint,
        status: 'FAILED',
        error: 'Invalid JSON response',
        statusCode: response.status
      });
      return null;
    }

    if (!response.ok) {
      logError(`API failed: ${response.status} ${response.statusText}`);
      console.log('Response:', JSON.stringify(data, null, 2));
      testResults.failed++;
      testResults.details.push({
        name,
        endpoint,
        status: 'FAILED',
        statusCode: response.status,
        error: data.message || data.error || 'Unknown error',
        response: data
      });
      return null;
    }

    // Validate response structure
    if (!data.success && !data.data) {
      logWarning('Response missing success/data fields');
    }

    logSuccess(`API call successful (${response.status})`);
    
    // Display key statistics
    if (data.data) {
      const stats = data.data;
      logInfo('Statistics:');
      Object.keys(stats).forEach(key => {
        const value = stats[key];
        if (typeof value === 'number' || typeof value === 'string') {
          console.log(`   ${key}: ${value}`);
        } else if (Array.isArray(value)) {
          console.log(`   ${key}: [${value.length} items]`);
        } else if (typeof value === 'object') {
          console.log(`   ${key}: {${Object.keys(value).length} fields}`);
        }
      });
    }

    testResults.passed++;
    testResults.details.push({
      name,
      endpoint,
      status: 'PASSED',
      statusCode: response.status,
      data: data.data
    });

    return data;
  } catch (error) {
    logError(`Error: ${error.message}`);
    testResults.failed++;
    testResults.details.push({
      name,
      endpoint,
      status: 'FAILED',
      error: error.message
    });
    return null;
  }
}

async function main() {
  console.clear();
  logSection('📊 Stats APIs Test Suite - Real Database Data');
  logInfo(`API Base: ${API_BASE}`);
  logInfo(`Tenant: ${TENANT_ID}`);
  logInfo(`Email: ${EMAIL}`);
  console.log('');

  try {
    // Step 1: Login
    const { token, tenantId, userRole, user } = await login();

    // Step 2: Test all Stats APIs
    logSection('📈 Step 2: Testing All Stats APIs');

    // 1. Attendance Stats
    await testAPI(
      'Attendance Statistics',
      'GET',
      '/attendance/stats',
      { token, tenantId, userRole }
    );

    // Test with date parameter
    const today = new Date().toISOString().split('T')[0];
    await testAPI(
      'Attendance Statistics (with date)',
      'GET',
      `/attendance/stats?date=${today}`,
      { token, tenantId, userRole }
    );

    // 2. Time Tracking Stats
    await testAPI(
      'Time Tracking Statistics',
      'GET',
      '/hr/time-tracking/stats',
      { token, tenantId, userRole }
    );

    // Test with date range
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    await testAPI(
      'Time Tracking Statistics (with date range)',
      'GET',
      `/hr/time-tracking/stats?startDate=${startDate}&endDate=${endDate}`,
      { token, tenantId, userRole }
    );

    // 3. Dashboard Stats (HR Service)
    await testAPI(
      'Dashboard Statistics (HR Service)',
      'GET',
      '/hr/dashboard/stats',
      { token, tenantId, userRole }
    );

    // 4. Dashboard Stats (Analytics Service) - Company Stats
    await testAPI(
      'Company Statistics (Analytics Service)',
      'GET',
      '/dashboard/stats',
      { token, tenantId, userRole }
    );

    // 5. Tenant Stats (only for superadmin/admin)
    if (userRole === 'superadmin' || userRole === 'super-admin' || userRole === 'admin') {
      await testAPI(
        'Tenant Statistics',
        'GET',
        '/tenants/stats',
        { token, tenantId, userRole }
      );
    } else {
      logWarning('Skipping Tenant Stats (requires superadmin/admin role)');
      testResults.warnings++;
    }

    // 6. Realtime Service Statistics
    const realtimeBase = API_BASE.replace('/api', '');
    await testAPI(
      'Realtime Service Statistics',
      'GET',
      `${realtimeBase}/api/statistics`,
      { token, tenantId, userRole }
    );

    // 7. Notification Stats (if available)
    await testAPI(
      'Notification Statistics',
      'GET',
      '/notifications/stats/overview',
      { token, tenantId, userRole }
    );

    // 8. CRM Opportunity Stats (if available)
    await testAPI(
      'CRM Opportunity Statistics',
      'GET',
      '/crm/opportunities/stats',
      { token, tenantId, userRole }
    );

    // Step 3: Summary
    logSection('📋 Test Summary');
    
    const passRate = ((testResults.passed / testResults.total) * 100).toFixed(2);
    
    logInfo(`Total Tests: ${testResults.total}`);
    logSuccess(`Passed: ${testResults.passed} (${passRate}%)`);
    
    if (testResults.failed > 0) {
      logError(`Failed: ${testResults.failed}`);
    }
    
    if (testResults.warnings > 0) {
      logWarning(`Warnings: ${testResults.warnings}`);
    }

    // Detailed results
    console.log('\n' + '-'.repeat(80));
    log('Detailed Results:', 'bright');
    console.log('-'.repeat(80));
    
    testResults.details.forEach((result, index) => {
      const statusColor = result.status === 'PASSED' ? 'green' : 'red';
      log(`\n${index + 1}. ${result.name}`, 'cyan');
      log(`   Endpoint: ${result.endpoint}`, 'blue');
      log(`   Status: ${result.status}`, statusColor);
      
      if (result.statusCode) {
        log(`   HTTP Status: ${result.statusCode}`, 'blue');
      }
      
      if (result.error) {
        log(`   Error: ${result.error}`, 'red');
      }
      
      if (result.data) {
        log(`   Data Keys: ${Object.keys(result.data).join(', ')}`, 'green');
      }
    });

    // Data validation summary
    logSection('🔍 Data Validation Summary');
    
    const attendanceStats = testResults.details.find(r => r.name.includes('Attendance Statistics') && !r.name.includes('with date'));
    if (attendanceStats && attendanceStats.data) {
      logInfo('Attendance Stats Validation:');
      const data = attendanceStats.data;
      console.log(`   Total Employees: ${data.totalEmployees || 'N/A'}`);
      console.log(`   Present Today: ${data.presentToday || 'N/A'}`);
      console.log(`   Absent Today: ${data.absentToday || 'N/A'}`);
      console.log(`   Attendance Rate: ${data.attendanceRate || 'N/A'}%`);
      
      // Validation checks
      if (data.totalEmployees > 0) {
        logSuccess('✓ Total employees count is valid');
      } else {
        logWarning('⚠ Total employees is 0 - check database');
      }
      
      if (data.presentToday + data.absentToday === data.totalEmployees) {
        logSuccess('✓ Present + Absent = Total (data consistency check passed)');
      } else {
        logWarning('⚠ Present + Absent ≠ Total (data inconsistency detected)');
      }
    }

    const dashboardStats = testResults.details.find(r => r.name.includes('Dashboard Statistics (HR Service)'));
    if (dashboardStats && dashboardStats.data) {
      logInfo('Dashboard Stats Validation:');
      const data = dashboardStats.data;
      console.log(`   Total Employees: ${data.totalEmployees || 'N/A'}`);
      console.log(`   Active Employees: ${data.activeEmployees || 'N/A'}`);
      console.log(`   Total Stores: ${data.totalStores || 'N/A'}`);
      console.log(`   Attendance Rate: ${data.attendanceRate || 'N/A'}%`);
      
      if (data.totalEmployees >= data.activeEmployees) {
        logSuccess('✓ Total employees >= Active employees (logical check passed)');
      } else {
        logWarning('⚠ Total employees < Active employees (logical inconsistency)');
      }
    }

    const timeTrackingStats = testResults.details.find(r => r.name.includes('Time Tracking Statistics') && !r.name.includes('with date'));
    if (timeTrackingStats && timeTrackingStats.data) {
      logInfo('Time Tracking Stats Validation:');
      const data = timeTrackingStats.data;
      console.log(`   Total Hours: ${data.totalHours || 'N/A'}`);
      console.log(`   Total Entries: ${data.totalEntries || 'N/A'}`);
      console.log(`   Avg Session Duration: ${data.avgSessionDuration || 'N/A'} hours`);
      
      if (data.totalEntries > 0 && data.totalHours > 0) {
        logSuccess('✓ Time tracking data exists');
      } else {
        logWarning('⚠ No time tracking entries found');
      }
    }

    // Final status
    console.log('\n' + '='.repeat(80));
    if (testResults.failed === 0) {
      log('🎉 All Stats APIs are working correctly!', 'green');
    } else {
      log(`⚠️  ${testResults.failed} API(s) failed. Please check the details above.`, 'yellow');
    }
    console.log('='.repeat(80));

  } catch (error) {
    logError(`Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

main().catch((err) => {
  logError(`Unhandled error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
