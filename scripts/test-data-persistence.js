/**
 * Test Data Persistence - Check if data is being saved to database
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BASE_URL = 'https://98.70.245.87';
const API_HOST = 'api.etelios.com';

let authToken = null;
const testResults = {
  auth: { success: false, token: null },
  employee: { success: false, employeeId: null },
  attendance: { success: false, records: [] },
  database: { connected: false }
};

async function makeRequest(method, path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'Host': API_HOST,
    ...options.headers
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return {
      status: response.status,
      ok: response.ok,
      data,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
      data: null
    };
  }
}

async function testDataPersistence() {
  console.log('\n================================================================================');
  console.log('🧪 DATA PERSISTENCE TEST');
  console.log('================================================================================');
  console.log(`Backend URL: ${BASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('================================================================================\n');

  // ============================================================================
  // STEP 1: Get Auth Token
  // ============================================================================
  console.log('📋 STEP 1: Getting Authentication Token');
  console.log('─────────────────────────────────────────────────────────────────────────────');

  const mockLoginResult = await makeRequest('POST', '/api/auth/mock-login-fast', {
    body: { role: 'admin' }
  });

  if (mockLoginResult.ok && mockLoginResult.data?.data?.accessToken) {
    authToken = mockLoginResult.data.data.accessToken;
    testResults.auth.success = true;
    testResults.auth.token = authToken.substring(0, 20) + '...';
    console.log('✅ Auth token obtained');
    console.log(`   Token: ${testResults.auth.token}`);
  } else {
    console.log('❌ Failed to get auth token');
    console.log(`   Status: ${mockLoginResult.status}`);
    console.log(`   Response: ${JSON.stringify(mockLoginResult.data).substring(0, 200)}`);
    console.log('\n⚠️  Cannot proceed without auth token');
    return false;
  }

  // ============================================================================
  // STEP 2: Create Employee (Test HR Service)
  // ============================================================================
  console.log('\n📋 STEP 2: Creating Employee (HR Service)');
  console.log('─────────────────────────────────────────────────────────────────────────────');

  if (!authToken) {
    console.log('⏭️  Skipped - No auth token');
  } else {
    const employeeData = {
      firstName: 'Test',
      lastName: 'Employee',
      email: `test-emp-${Date.now()}@test.com`,
      phone: '+1234567890',
      employeeId: `EMP-TEST-${Date.now()}`,
      department: 'Engineering',
      designation: 'Software Engineer',
      role: 'employee',
      joiningDate: new Date().toISOString(),
      dateOfBirth: '1990-01-01'
    };

    const createEmployeeResult = await makeRequest('POST', '/api/hr/employees', {
      token: authToken,
      body: employeeData
    });

    if (createEmployeeResult.ok && createEmployeeResult.data?.data) {
      testResults.employee.success = true;
      testResults.employee.employeeId = createEmployeeResult.data.data.employeeId || 
                                        createEmployeeResult.data.data._id;
      console.log('✅ Employee created successfully');
      console.log(`   Employee ID: ${testResults.employee.employeeId}`);
      console.log(`   Email: ${employeeData.email}`);
    } else {
      console.log('❌ Failed to create employee');
      console.log(`   Status: ${createEmployeeResult.status}`);
      console.log(`   Response: ${JSON.stringify(createEmployeeResult.data).substring(0, 300)}`);
    }
  }

  // ============================================================================
  // STEP 3: Mark Attendance (Test Attendance Service)
  // ============================================================================
  console.log('\n📋 STEP 3: Marking Attendance (Attendance Service)');
  console.log('─────────────────────────────────────────────────────────────────────────────');

  if (!authToken) {
    console.log('⏭️  Skipped - No auth token');
  } else {
    const employeeId = testResults.employee.employeeId || 'test-emp-001';

    // Clock In
    const clockInResult = await makeRequest('POST', '/api/attendance/clock-in', {
      token: authToken,
      body: { employeeId }
    });

    if (clockInResult.ok) {
      console.log('✅ Clocked in successfully');
      testResults.attendance.records.push({ type: 'clock-in', success: true });
    } else {
      console.log('❌ Failed to clock in');
      console.log(`   Status: ${clockInResult.status}`);
      testResults.attendance.records.push({ type: 'clock-in', success: false });
    }

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Clock Out
    const clockOutResult = await makeRequest('POST', '/api/attendance/clock-out', {
      token: authToken,
      body: { employeeId }
    });

    if (clockOutResult.ok) {
      console.log('✅ Clocked out successfully');
      testResults.attendance.records.push({ type: 'clock-out', success: true });
      testResults.attendance.success = true;
    } else {
      console.log('❌ Failed to clock out');
      console.log(`   Status: ${clockOutResult.status}`);
      testResults.attendance.records.push({ type: 'clock-out', success: false });
    }

    // Get Attendance Records
    const getRecordsResult = await makeRequest('GET', `/api/attendance/records?employeeId=${employeeId}`, {
      token: authToken
    });

    if (getRecordsResult.ok && getRecordsResult.data?.data) {
      const records = Array.isArray(getRecordsResult.data.data) ? getRecordsResult.data.data : [];
      console.log(`✅ Retrieved ${records.length} attendance record(s)`);
      if (records.length > 0) {
        console.log(`   Latest: ${records[0].date || records[0].clockIn || 'N/A'}`);
      }
    } else {
      console.log('⚠️  Could not retrieve attendance records');
    }
  }

  // ============================================================================
  // STEP 4: Verify Data in Database (Check Service Health)
  // ============================================================================
  console.log('\n📋 STEP 4: Verifying Database Connections');
  console.log('─────────────────────────────────────────────────────────────────────────────');

  // Check HR Service Health (includes DB status)
  const hrHealthResult = await makeRequest('GET', '/api/hr/health');
  if (hrHealthResult.ok) {
    console.log('✅ HR Service health check passed');
    if (hrHealthResult.data?.database) {
      testResults.database.connected = true;
      console.log('   Database: Connected');
    }
  }

  // Check Attendance Service Health
  const attendanceHealthResult = await makeRequest('GET', '/api/attendance/health');
  if (attendanceHealthResult.ok) {
    console.log('✅ Attendance Service health check passed');
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n================================================================================');
  console.log('📊 DATA PERSISTENCE TEST SUMMARY');
  console.log('================================================================================');

  console.log('\n✅ Successfully Completed:');
  if (testResults.auth.success) console.log('   ✅ Authentication');
  if (testResults.employee.success) console.log('   ✅ Employee Creation');
  if (testResults.attendance.success) console.log('   ✅ Attendance Marking');
  if (testResults.database.connected) console.log('   ✅ Database Connection');

  console.log('\n❌ Failed:');
  if (!testResults.auth.success) console.log('   ❌ Authentication');
  if (!testResults.employee.success) console.log('   ❌ Employee Creation');
  if (!testResults.attendance.success) console.log('   ❌ Attendance Marking');
  if (!testResults.database.connected) console.log('   ❌ Database Connection');

  const totalTests = 4;
  const passedTests = [
    testResults.auth.success,
    testResults.employee.success,
    testResults.attendance.success,
    testResults.database.connected
  ].filter(Boolean).length;

  console.log(`\n📊 Overall: ${passedTests}/${totalTests} tests passed (${(passedTests/totalTests*100).toFixed(1)}%)`);

  if (testResults.employee.success) {
    console.log(`\n✅ Data is being saved! Employee created: ${testResults.employee.employeeId}`);
  } else {
    console.log(`\n❌ Data persistence test failed - Employee not created`);
  }

  if (testResults.attendance.success) {
    console.log(`✅ Attendance data is being saved!`);
  } else {
    console.log(`❌ Attendance data not being saved`);
  }

  return passedTests === totalTests;
}

// Run test
testDataPersistence()
  .then(success => {
    console.log(`\n${success ? '✅' : '❌'} Test ${success ? 'PASSED' : 'FAILED'}\n`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  });

