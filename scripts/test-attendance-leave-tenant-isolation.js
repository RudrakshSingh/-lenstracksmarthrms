#!/usr/bin/env node

/**
 * Test Attendance Dashboard Tenant Isolation & Leave Integration
 * 
 * Tests:
 * 1. Tenant isolation in attendance dashboard
 * 2. Leave integration in attendance records
 * 3. Leave marking API
 * 4. Dashboard widgets showing leave status
 */

const https = require('https');
const http = require('http');

// Configuration
const API_BASE = process.env.API_BASE || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com';

// Test credentials
const TEST_CREDENTIALS = [
  {
    name: 'Tenant 1 (Rudi)',
    email: process.env.TEST_EMAIL_1 || 'rudi@gmail.com',
    password: process.env.TEST_PASSWORD_1 || 'Rudi@3006',
    tenantId: process.env.TEST_TENANT_1 || 'upcapto'
  },
  {
    name: 'Tenant 2 (Aditya)',
    email: process.env.TEST_EMAIL_2 || 'Aditya@gmail.com',
    password: process.env.TEST_PASSWORD_2 || 'yrv0s48mA1!',
    tenantId: process.env.TEST_TENANT_2 || 'eyekra'
  }
];

// Colors for console
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
    logInfo(`Logging in as ${email}...`);
    
    const response = await makeRequest(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      body: {
        email,
        password
      }
    });

    if (response.status === 200 && response.data.success) {
      const token = response.data.data?.accessToken || response.data.data?.token || response.data.accessToken || response.data.token;
      const user = response.data.data?.user || response.data.user;
      const tenantId = user?.tenantId || response.data.data?.tenantId || 'default';

      if (!token) {
        logError('No token in response');
        return null;
      }

      logSuccess(`Login successful`);
      logInfo(`Tenant ID: ${tenantId}`);
      
      return { token, user, tenantId };
    } else {
      logError(`Login failed: ${response.data.message || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    logError(`Login error: ${error.message}`);
    return null;
  }
}

// Test 1: Tenant Isolation in Dashboard
async function testTenantIsolation(token, tenantId, testName) {
  try {
    logTest(`Testing tenant isolation for ${testName}...`);

    const response = await makeRequest(`${API_BASE}/api/hr/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    });

    if (response.status === 200 && response.data.success) {
      const widgets = response.data.data?.widgets || {};
      const attendance = widgets.attendance || {};
      const records = attendance.records || [];
      const overall = attendance.overall || {};

      logSuccess(`Dashboard API call successful`);
      logInfo(`Total attendance records: ${records.length}`);
      logInfo(`Overall stats - Total: ${overall.total || 0}, Present: ${overall.present || 0}, Absent: ${overall.absent || 0}, On Leave: ${overall.onLeave || 0}`);

      // Check for tenant isolation
      const uniqueEmployees = new Set(records.map(r => r.employeeId).filter(Boolean));
      logInfo(`Unique employees in records: ${uniqueEmployees.size}`);

      if (records.length > 0) {
        logInfo('\nSample records (first 3):');
        records.slice(0, 3).forEach((record, index) => {
          logInfo(`  ${index + 1}. ${record.employeeName || record.employeeId || 'Unknown'} - Status: ${record.status || 'N/A'} ${record.isOnLeave ? '(On Leave)' : ''}`);
        });
      }

      return {
        success: true,
        recordsCount: records.length,
        totalEmployees: overall.total || 0,
        present: overall.present || 0,
        absent: overall.absent || 0,
        onLeave: overall.onLeave || 0,
        records: records
      };
    } else {
      logError(`Dashboard API failed: ${response.data.message || 'Unknown error'}`);
      return {
        success: false,
        error: response.data.message || 'Unknown error'
      };
    }
  } catch (error) {
    logError(`Dashboard API error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test 2: Leave Marking API
async function testMarkLeave(token, tenantId, employeeId = null, testName) {
  try {
    logTest(`Testing leave marking for ${testName}...`);

    const body = {
      leaveType: 'CL',
      reason: 'Test leave marking'
    };

    if (employeeId) {
      body.employeeId = employeeId;
      logInfo(`Marking leave for employee: ${employeeId}`);
    } else {
      logInfo('Marking leave for self');
    }

    const response = await makeRequest(`${API_BASE}/api/hr/leave/mark-today`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId,
        'Content-Type': 'application/json'
      },
      body: body
    });

    if (response.status === 200 || response.status === 201) {
      if (response.data.success) {
        logSuccess(`Leave marked successfully`);
        logInfo(`Leave Request ID: ${response.data.data?.leaveRequest?.request_id || 'N/A'}`);
        logInfo(`Status: ${response.data.data?.leaveRequest?.status || 'N/A'}`);
        return {
          success: true,
          leaveRequest: response.data.data?.leaveRequest
        };
      } else {
        logWarning(`Leave marking response: ${response.data.message || 'Unknown'}`);
        return {
          success: false,
          error: response.data.message || 'Unknown error',
          response: response.data
        };
      }
    } else if (response.status === 400 && response.data.message?.includes('already on leave')) {
      logWarning('Employee already on leave (expected if already marked)');
      return {
        success: true,
        alreadyExists: true
      };
    } else {
      logError(`Leave marking failed: ${response.data.message || 'Unknown error'}`);
      return {
        success: false,
        error: response.data.message || 'Unknown error',
        status: response.status
      };
    }
  } catch (error) {
    logError(`Leave marking error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test 3: Check Leave Status in Dashboard
async function testLeaveStatusInDashboard(token, tenantId, testName) {
  try {
    logTest(`Testing leave status in dashboard for ${testName}...`);

    const response = await makeRequest(`${API_BASE}/api/hr/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    });

    if (response.status === 200 && response.data.success) {
      const widgets = response.data.data?.widgets || {};
      const attendance = widgets.attendance || {};
      const records = attendance.records || [];
      const today = attendance.today || {};

      // Check for leave status
      const onLeaveRecords = records.filter(r => r.isOnLeave === true);
      const onLeaveCount = onLeaveRecords.length;

      logSuccess(`Dashboard retrieved successfully`);
      logInfo(`Total records: ${records.length}`);
      logInfo(`Records on leave: ${onLeaveCount}`);

      if (today.isOnLeave) {
        logSuccess(`Employee dashboard shows: On Leave (${today.leaveType || 'N/A'})`);
      }

      if (onLeaveCount > 0) {
        logInfo('\nEmployees on leave:');
        onLeaveRecords.slice(0, 5).forEach((record, index) => {
          logInfo(`  ${index + 1}. ${record.employeeName || record.employeeId} - ${record.leaveType || 'N/A'} - ${record.leaveReason || 'No reason'}`);
        });
      }

      return {
        success: true,
        onLeaveCount,
        todayLeaveStatus: today.isOnLeave,
        todayLeaveType: today.leaveType
      };
    } else {
      logError(`Dashboard API failed: ${response.data.message || 'Unknown error'}`);
      return {
        success: false,
        error: response.data.message || 'Unknown error'
      };
    }
  } catch (error) {
    logError(`Dashboard API error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Compare tenant results
function compareTenantResults(results) {
  logSection('Tenant Isolation Verification');

  if (results.length < 2) {
    logWarning('Need at least 2 tenants to compare. Skipping comparison.');
    return;
  }

  const [result1, result2] = results;

  if (result1.dashboard && result2.dashboard) {
    const tenant1Employees = new Set(
      (result1.dashboard.records || []).map(r => r.employeeId).filter(Boolean)
    );
    const tenant2Employees = new Set(
      (result2.dashboard.records || []).map(r => r.employeeId).filter(Boolean)
    );

    const commonEmployees = [...tenant1Employees].filter(emp => tenant2Employees.has(emp));

    logInfo(`Tenant 1 employees: ${tenant1Employees.size}`);
    logInfo(`Tenant 2 employees: ${tenant2Employees.size}`);
    logInfo(`Common employees: ${commonEmployees.length}`);

    if (commonEmployees.length > 0) {
      logWarning(`⚠️  Found ${commonEmployees.length} common employees between tenants`);
      logInfo(`Common employee IDs: ${commonEmployees.slice(0, 5).join(', ')}${commonEmployees.length > 5 ? '...' : ''}`);
    } else {
      logSuccess('✅ No common employees found - tenant isolation working correctly');
    }
  }
}

// Main test function
async function runTests() {
  logSection('Attendance Dashboard Tenant Isolation & Leave Integration Test Suite');
  logInfo(`API Base URL: ${API_BASE}`);
  logInfo(`Test started at: ${new Date().toISOString()}\n`);

  const results = [];

  for (const cred of TEST_CREDENTIALS) {
    logSection(`Testing: ${cred.name} (${cred.email})`);

    // Login
    const auth = await login(cred.email, cred.password);
    if (!auth) {
      logError(`Failed to login for ${cred.name}. Skipping tests.`);
      continue;
    }

    const { token, tenantId } = auth;
    const actualTenantId = tenantId || cred.tenantId;

    logInfo(`Using Tenant ID: ${actualTenantId}`);

    // Test 1: Tenant Isolation
    const dashboardResult = await testTenantIsolation(token, actualTenantId, cred.name);
    
    // Test 2: Leave Marking (mark self)
    const leaveResult = await testMarkLeave(token, actualTenantId, null, `${cred.name} (self)`);
    
    // Wait a bit for leave to be processed
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: Check Leave Status
    const leaveStatusResult = await testLeaveStatusInDashboard(token, actualTenantId, cred.name);

    results.push({
      name: cred.name,
      tenantId: actualTenantId,
      dashboard: dashboardResult,
      leaveMarking: leaveResult,
      leaveStatus: leaveStatusResult
    });

    // Small delay between tenants
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Compare results
  compareTenantResults(results);

  // Summary
  logSection('Test Summary');

  results.forEach(result => {
    logInfo(`\n${result.name} (Tenant: ${result.tenantId}):`);
    logInfo(`  Dashboard API: ${result.dashboard.success ? '✅ Pass' : '❌ Fail'}`);
    logInfo(`  Leave Marking: ${result.leaveMarking.success ? '✅ Pass' : '❌ Fail'}`);
    logInfo(`  Leave Status: ${result.leaveStatus.success ? '✅ Pass' : '❌ Fail'}`);
    if (result.dashboard.success) {
      logInfo(`  Total Employees: ${result.dashboard.totalEmployees || 0}`);
      logInfo(`  Attendance Records: ${result.dashboard.recordsCount || 0}`);
      logInfo(`  On Leave: ${result.dashboard.onLeave || 0}`);
    }
    if (result.leaveStatus.success) {
      logInfo(`  Employees on Leave: ${result.leaveStatus.onLeaveCount || 0}`);
      if (result.leaveStatus.todayLeaveStatus) {
        logInfo(`  Today Leave Status: ✅ On Leave (${result.leaveStatus.todayLeaveType || 'N/A'})`);
      }
    }
  });

  // Overall status
  const allPassed = results.every(r => 
    r.dashboard.success && 
    (r.leaveMarking.success || r.leaveMarking.alreadyExists) && 
    r.leaveStatus.success
  );

  logSection('Final Results');
  if (allPassed) {
    logSuccess('✅ All tests passed!');
  } else {
    logWarning('⚠️  Some tests failed or had warnings. Check details above.');
  }

  logSection('Test Complete');
}

// Run tests
runTests().catch(error => {
  logError(`Test suite failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
