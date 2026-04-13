/**
 * Test Roster Sync Attendance API
 * Tests the new /api/hr/roster/sync-attendance endpoint
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:3002';
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@upcapto.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'Admin@123';
const TENANT_ID = 'upcapto';

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

async function login() {
  try {
    log('\n🔐 Logging in...', 'cyan');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (response.data && response.data.success && response.data.data && response.data.data.token) {
      log('✅ Login successful!', 'green');
      return response.data.data.token;
    } else {
      throw new Error('Login failed: No token received');
    }
  } catch (error) {
    log(`❌ Login failed: ${error.response?.data?.message || error.message}`, 'red');
    throw error;
  }
}

async function testRosterSyncAttendance(token) {
  try {
    log('\n📋 Testing Roster Sync Attendance API...', 'cyan');
    
    // Test date (today)
    const testDate = new Date().toISOString().split('T')[0];
    log(`   Date: ${testDate}`, 'blue');
    
    const response = await axios.post(
      `${BASE_URL}/api/hr/roster/sync-attendance`,
      {
        date: testDate
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-tenant-id': TENANT_ID
        },
        timeout: 30000
      }
    );

    if (response.data && response.data.success) {
      const data = response.data.data;
      log('\n✅ Roster Sync Attendance API Test: PASSED', 'green');
      log(`\n📊 Results:`, 'cyan');
      log(`   Date: ${data.date}`, 'blue');
      log(`   Total: ${data.total}`, 'blue');
      log(`   Successful: ${data.successful}`, 'green');
      log(`   Failed: ${data.failed}`, data.failed > 0 ? 'red' : 'green');
      log(`   Skipped: ${data.skipped}`, 'yellow');
      
      if (data.results && data.results.length > 0) {
        log(`\n📝 Detailed Results:`, 'cyan');
        data.results.slice(0, 5).forEach((result, idx) => {
          const statusColor = result.status === 'success' ? 'green' : result.status === 'failed' ? 'red' : 'yellow';
          log(`   ${idx + 1}. ${result.employeeId} (${result.employeeName || 'N/A'})`, 'blue');
          log(`      Status: ${result.status}`, statusColor);
          log(`      Message: ${result.message}`, 'blue');
          if (result.error) {
            log(`      Error: ${result.error}`, 'red');
          }
        });
        if (data.results.length > 5) {
          log(`   ... and ${data.results.length - 5} more`, 'blue');
        }
      }
      
      return true;
    } else {
      log('\n❌ Roster Sync Attendance API Test: FAILED', 'red');
      log(`   Response: ${JSON.stringify(response.data, null, 2)}`, 'red');
      return false;
    }
  } catch (error) {
    log('\n❌ Roster Sync Attendance API Test: FAILED', 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
      log(`   Error: ${error.response.data?.error || error.response.data?.message || 'Unknown error'}`, 'red');
      log(`   Full Response: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    } else {
      log(`   Error: ${error.message}`, 'red');
    }
    return false;
  }
}

async function testAttendanceDateFromTo(token) {
  try {
    log('\n📅 Testing Attendance API with dateFrom/dateTo...', 'cyan');
    
    // Get an employee ID first
    const employeesResponse = await axios.get(
      `${BASE_URL}/api/hr/employees`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': TENANT_ID
        },
        params: {
          limit: 1
        },
        timeout: 10000
      }
    );

    let employeeId = null;
    if (employeesResponse.data && employeesResponse.data.success && employeesResponse.data.data && employeesResponse.data.data.length > 0) {
      employeeId = employeesResponse.data.data[0].employeeId || employeesResponse.data.data[0].employee_id;
    }

    if (!employeeId) {
      log('   ⚠️  No employee found, skipping test', 'yellow');
      return true; // Not a failure, just skip
    }

    log(`   Employee ID: ${employeeId}`, 'blue');
    
    // Test with dateFrom and dateTo
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    const dateFrom = firstDay.toISOString().split('T')[0];
    const dateTo = lastDay.toISOString().split('T')[0];
    
    log(`   Date Range: ${dateFrom} to ${dateTo}`, 'blue');
    
    const response = await axios.get(
      `${BASE_URL}/api/attendance`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': TENANT_ID
        },
        params: {
          employeeId: employeeId,
          dateFrom: dateFrom,
          dateTo: dateTo
        },
        timeout: 10000
      }
    );

    if (response.data && response.data.success !== false) {
      log('\n✅ Attendance dateFrom/dateTo Test: PASSED', 'green');
      log(`   Records found: ${response.data.data?.length || response.data.pagination?.total || 0}`, 'blue');
      return true;
    } else {
      log('\n❌ Attendance dateFrom/dateTo Test: FAILED', 'red');
      log(`   Response: ${JSON.stringify(response.data, null, 2)}`, 'red');
      return false;
    }
  } catch (error) {
    log('\n❌ Attendance dateFrom/dateTo Test: FAILED', 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
      log(`   Error: ${error.response.data?.error || error.response.data?.message || 'Unknown error'}`, 'red');
    } else {
      log(`   Error: ${error.message}`, 'red');
    }
    return false;
  }
}

async function runTests() {
  try {
    log('\n🧪 Starting Roster Sync Attendance & Attendance API Tests...', 'cyan');
    log('=' .repeat(60), 'cyan');
    
    // Login
    const token = await login();
    
    // Test 1: Roster Sync Attendance
    const test1Result = await testRosterSyncAttendance(token);
    
    // Test 2: Attendance dateFrom/dateTo
    const test2Result = await testAttendanceDateFromTo(token);
    
    // Summary
    log('\n' + '='.repeat(60), 'cyan');
    log('\n📊 Test Summary:', 'cyan');
    log(`   Roster Sync Attendance: ${test1Result ? '✅ PASSED' : '❌ FAILED'}`, test1Result ? 'green' : 'red');
    log(`   Attendance dateFrom/dateTo: ${test2Result ? '✅ PASSED' : '❌ FAILED'}`, test2Result ? 'green' : 'red');
    
    const allPassed = test1Result && test2Result;
    log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed!'}`, allPassed ? 'green' : 'red');
    
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    log(`\n❌ Test execution failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run tests
runTests();
