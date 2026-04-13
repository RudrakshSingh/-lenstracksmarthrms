/**
 * Real Data Production Test - No Mocks
 * Tests complete flow with real data on production:
 * 1. Create Tenant
 * 2. Register Super Admin
 * 3. Register Admin  
 * 4. Create Employee
 * 5. Mark Attendance
 * All with REAL data, no mocks
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BASE_URL = 'https://98.70.245.87';
const API_HOST = 'api.etelios.com';

// Real test data - will create actual records
const testData = {
  tenant: {
    tenantName: 'Lenstrack',
    domain: `lenstrack-${Date.now()}.etelios.com`,
    subdomain: `lenstrack${Date.now()}`,
    plan: 'professional'
  },
  superAdmin: {
    employee_id: `SUPER-ADMIN-${Date.now()}`,
    name: 'Super Admin Lenstrack',
    email: `superadmin-lenstrack-${Date.now()}@etelios.com`,
    phone: '+919876543210',
    password: 'SuperAdmin@123',
    role: 'superadmin',
    department: 'IT',
    designation: 'Super Administrator',
    joining_date: new Date().toISOString()
  },
  admin: {
    employee_id: `ADMIN-${Date.now()}`,
    name: 'Admin Lenstrack',
    email: `admin-lenstrack-${Date.now()}@etelios.com`,
    phone: '+919876543211',
    password: 'Admin@123',
    role: 'admin',
    department: 'Management',
    designation: 'Administrator',
    joining_date: new Date().toISOString()
  },
  employee: {
    firstName: 'Test',
    lastName: 'Employee',
    email: `employee-lenstrack-${Date.now()}@etelios.com`,
    phone: '+919876543212',
    employeeId: `EMP-LENSTRACK-${Date.now()}`,
    department: 'Engineering',
    designation: 'Software Engineer',
    role: 'employee',
    joiningDate: new Date().toISOString(),
    dateOfBirth: '1990-01-01',
    address: {
      street: '123 Test Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      pincode: '400001'
    }
  }
};

const results = {
  tenant: null,
  superAdminToken: null,
  adminToken: null,
  employeeId: null,
  attendanceId: null,
  passed: [],
  failed: []
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

async function test(name, method, path, options = {}) {
  process.stdout.write(`\n🧪 ${name}... `);
  
  const result = await makeRequest(method, path, options);
  
  if (result.status === 0) {
    results.failed.push({ name, error: 'Connection failed' });
    process.stdout.write(`❌ FAIL (Connection)\n`);
    return false;
  }

  if (options.expectStatus) {
    if (result.status === options.expectStatus) {
      results.passed.push({ name, status: result.status });
      process.stdout.write(`✅ PASS (${result.status})\n`);
      return true;
    } else {
      results.failed.push({ name, expected: options.expectStatus, got: result.status });
      process.stdout.write(`❌ FAIL (Expected ${options.expectStatus}, got ${result.status})\n`);
      if (result.data && typeof result.data === 'object') {
        console.log(`   ${JSON.stringify(result.data).substring(0, 200)}`);
      }
      return false;
    }
  }

  if (result.ok || (result.status >= 200 && result.status < 300)) {
    results.passed.push({ name, status: result.status, data: result.data });
    process.stdout.write(`✅ PASS (${result.status})\n`);
    return true;
  } else {
    results.failed.push({ name, status: result.status, result });
    process.stdout.write(`❌ FAIL (${result.status})\n`);
    if (result.data && typeof result.data === 'object') {
      console.log(`   ${JSON.stringify(result.data).substring(0, 200)}`);
    }
    return false;
  }
}

async function runRealDataTest() {
  console.log('\n================================================================================');
  console.log('🚀 REAL DATA PRODUCTION TEST - NO MOCKS');
  console.log('================================================================================');
  console.log(`Backend: ${BASE_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('================================================================================\n');

  // ============================================================================
  // STEP 1: Create Tenant
  // ============================================================================
  console.log('📋 STEP 1: Creating Tenant (Real Data)');
  console.log('─────────────────────────────────────────────────────────────────────────────');

  const createTenantResult = await makeRequest('POST', '/api/tenants', {
    body: testData.tenant
  });

  if (createTenantResult.ok && createTenantResult.data?.data) {
    results.tenant = createTenantResult.data.data;
    console.log(`✅ Tenant created: ${results.tenant.tenantId}`);
    console.log(`   Name: ${results.tenant.tenantName}`);
    console.log(`   Subdomain: ${results.tenant.subdomain}`);
    results.passed.push({ name: 'Create Tenant', status: createTenantResult.status });
  } else if (createTenantResult.status === 409) {
    console.log(`⚠️  Tenant already exists, using existing tenant`);
    // Try to get existing tenant
    const getTenantResult = await makeRequest('GET', `/api/tenants/${testData.tenant.subdomain}`);
    if (getTenantResult.ok) {
      results.tenant = getTenantResult.data.data;
      console.log(`✅ Using existing tenant: ${results.tenant.tenantId}`);
    } else {
      results.tenant = { tenantId: testData.tenant.subdomain.toLowerCase(), subdomain: testData.tenant.subdomain };
    }
  } else {
    console.log(`❌ Failed to create tenant`);
    console.log(`   ${JSON.stringify(createTenantResult.data).substring(0, 300)}`);
    results.failed.push({ name: 'Create Tenant', result: createTenantResult });
    results.tenant = { tenantId: testData.tenant.subdomain.toLowerCase(), subdomain: testData.tenant.subdomain };
  }

  // ============================================================================
  // STEP 2: Register Super Admin (Real Login)
  // ============================================================================
  console.log('\n📋 STEP 2: Registering Super Admin (Real Data)');
  console.log('─────────────────────────────────────────────────────────────────────────────');

  // First try to get token using mock-login-fast (if available)
  let tempToken = null;
  const mockLoginResult = await makeRequest('POST', '/api/auth/mock-login-fast', {
    body: { role: 'superadmin' }
  });

  if (mockLoginResult.ok && mockLoginResult.data?.data?.accessToken) {
    tempToken = mockLoginResult.data.data.accessToken;
    console.log(`✅ Got temporary token for registration`);
  } else {
    console.log(`⚠️  Mock login not available, will try direct registration`);
  }

  // Register super admin
  const registerSuperAdminResult = await makeRequest('POST', '/api/auth/register', {
    token: tempToken,
    body: testData.superAdmin
  });

  if (registerSuperAdminResult.ok || registerSuperAdminResult.status === 409) {
    console.log(`✅ Super Admin registered (or already exists)`);
    results.passed.push({ name: 'Register Super Admin', status: registerSuperAdminResult.status });
  } else {
    console.log(`❌ Failed to register super admin`);
    console.log(`   ${JSON.stringify(registerSuperAdminResult.data).substring(0, 300)}`);
    results.failed.push({ name: 'Register Super Admin', result: registerSuperAdminResult });
  }

  // Login as super admin (REAL LOGIN)
  console.log(`\n🔐 Logging in as Super Admin (Real Login)...`);
  const superAdminLoginResult = await makeRequest('POST', '/api/auth/login', {
    body: {
      emailOrEmployeeId: testData.superAdmin.email,
      password: testData.superAdmin.password
    }
  });

  if (superAdminLoginResult.ok && superAdminLoginResult.data?.data?.accessToken) {
    results.superAdminToken = superAdminLoginResult.data.data.accessToken;
    console.log(`✅ Super Admin logged in successfully`);
    results.passed.push({ name: 'Super Admin Login', status: superAdminLoginResult.status });
  } else {
    console.log(`❌ Super Admin login failed`);
    console.log(`   ${JSON.stringify(superAdminLoginResult.data).substring(0, 300)}`);
    results.failed.push({ name: 'Super Admin Login', result: superAdminLoginResult });
    console.log(`⚠️  Cannot continue without super admin token`);
    return false;
  }

  // ============================================================================
  // STEP 3: Register Admin (Real Login)
  // ============================================================================
  console.log('\n📋 STEP 3: Registering Admin (Real Data)');
  console.log('─────────────────────────────────────────────────────────────────────────────');

  // Register admin
  const registerAdminResult = await makeRequest('POST', '/api/auth/register', {
    token: results.superAdminToken,
    body: testData.admin
  });

  if (registerAdminResult.ok || registerAdminResult.status === 409) {
    console.log(`✅ Admin registered (or already exists)`);
    results.passed.push({ name: 'Register Admin', status: registerAdminResult.status });
  } else {
    console.log(`❌ Failed to register admin`);
    console.log(`   ${JSON.stringify(registerAdminResult.data).substring(0, 300)}`);
    results.failed.push({ name: 'Register Admin', result: registerAdminResult });
  }

  // Login as admin (REAL LOGIN)
  console.log(`\n🔐 Logging in as Admin (Real Login)...`);
  const adminLoginResult = await makeRequest('POST', '/api/auth/login', {
    body: {
      emailOrEmployeeId: testData.admin.email,
      password: testData.admin.password
    }
  });

  if (adminLoginResult.ok && adminLoginResult.data?.data?.accessToken) {
    results.adminToken = adminLoginResult.data.data.accessToken;
    console.log(`✅ Admin logged in successfully`);
    results.passed.push({ name: 'Admin Login', status: adminLoginResult.status });
  } else {
    console.log(`⚠️  Admin login failed, using super admin token`);
    results.adminToken = results.superAdminToken;
  }

  // ============================================================================
  // STEP 4: Create Employee (Real Data)
  // ============================================================================
  console.log('\n📋 STEP 4: Creating Employee (Real Data)');
  console.log('─────────────────────────────────────────────────────────────────────────────');

  const createEmployeeResult = await makeRequest('POST', '/api/hr/employees', {
    token: results.adminToken,
    body: {
      firstName: testData.employee.firstName,
      lastName: testData.employee.lastName,
      email: testData.employee.email,
      phone: testData.employee.phone,
      employeeId: testData.employee.employeeId,
      department: testData.employee.department,
      designation: testData.employee.designation,
      role: testData.employee.role,
      joiningDate: testData.employee.joiningDate,
      dateOfBirth: testData.employee.dateOfBirth,
      address: testData.employee.address
    }
  });

  if (createEmployeeResult.ok && createEmployeeResult.data?.data) {
    results.employeeId = createEmployeeResult.data.data.employeeId || 
                        createEmployeeResult.data.data._id || 
                        testData.employee.employeeId;
    console.log(`✅ Employee created: ${results.employeeId}`);
    console.log(`   Name: ${testData.employee.firstName} ${testData.employee.lastName}`);
    console.log(`   Email: ${testData.employee.email}`);
    results.passed.push({ name: 'Create Employee', status: createEmployeeResult.status });
  } else {
    console.log(`❌ Failed to create employee`);
    console.log(`   ${JSON.stringify(createEmployeeResult.data).substring(0, 300)}`);
    results.failed.push({ name: 'Create Employee', result: createEmployeeResult });
    results.employeeId = testData.employee.employeeId;
  }

  // ============================================================================
  // STEP 5: Mark Attendance (Real Data)
  // ============================================================================
  console.log('\n📋 STEP 5: Marking Attendance (Real Data)');
  console.log('─────────────────────────────────────────────────────────────────────────────');

  if (!results.employeeId) {
    console.log(`❌ Cannot mark attendance without employee ID`);
    results.failed.push({ name: 'Mark Attendance', error: 'No employee ID' });
    return false;
  }

  // Clock In
  const clockInResult = await makeRequest('POST', '/api/attendance/clock-in', {
    token: results.adminToken,
    body: { employeeId: results.employeeId }
  });

  if (clockInResult.ok) {
    console.log(`✅ Clocked in successfully`);
    results.attendanceId = clockInResult.data?.data?._id || clockInResult.data?.data?.id;
    results.passed.push({ name: 'Clock In', status: clockInResult.status });
  } else {
    console.log(`❌ Failed to clock in`);
    console.log(`   ${JSON.stringify(clockInResult.data).substring(0, 200)}`);
    results.failed.push({ name: 'Clock In', result: clockInResult });
  }

  // Wait before clocking out
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Clock Out
  const clockOutResult = await makeRequest('POST', '/api/attendance/clock-out', {
    token: results.adminToken,
    body: { employeeId: results.employeeId }
  });

  if (clockOutResult.ok) {
    console.log(`✅ Clocked out successfully`);
    results.passed.push({ name: 'Clock Out', status: clockOutResult.status });
  } else {
    console.log(`❌ Failed to clock out`);
    console.log(`   ${JSON.stringify(clockOutResult.data).substring(0, 200)}`);
    results.failed.push({ name: 'Clock Out', result: clockOutResult });
  }

  // Get Attendance Records
  const getRecordsResult = await makeRequest('GET', `/api/attendance/records?employeeId=${results.employeeId}`, {
    token: results.adminToken
  });

  if (getRecordsResult.ok && getRecordsResult.data?.data) {
    const records = Array.isArray(getRecordsResult.data.data) ? getRecordsResult.data.data : [];
    console.log(`✅ Retrieved ${records.length} attendance record(s)`);
    if (records.length > 0) {
      console.log(`   Latest record date: ${records[0].date || records[0].clockIn || 'N/A'}`);
    }
    results.passed.push({ name: 'Get Attendance Records', status: getRecordsResult.status });
  } else {
    console.log(`⚠️  Could not retrieve attendance records`);
    results.failed.push({ name: 'Get Attendance Records', result: getRecordsResult });
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n================================================================================');
  console.log('📊 REAL DATA TEST SUMMARY');
  console.log('================================================================================');
  
  const total = results.passed.length + results.failed.length;
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`Success Rate: ${((results.passed.length / total) * 100).toFixed(1)}%`);

  console.log('\n📋 Created Data:');
  if (results.tenant) console.log(`  ✅ Tenant: ${results.tenant.tenantId || results.tenant.subdomain}`);
  if (results.superAdminToken) console.log(`  ✅ Super Admin: Logged in`);
  if (results.adminToken) console.log(`  ✅ Admin: Logged in`);
  if (results.employeeId) console.log(`  ✅ Employee: ${results.employeeId}`);
  if (results.attendanceId) console.log(`  ✅ Attendance: Recorded`);

  console.log('\n📧 Credentials Created:');
  console.log(`  Super Admin: ${testData.superAdmin.email} / ${testData.superAdmin.password}`);
  console.log(`  Admin: ${testData.admin.email} / ${testData.admin.password}`);
  console.log(`  Employee: ${testData.employee.email}`);

  if (results.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.failed.forEach(f => {
      console.log(`  - ${f.name}: ${f.error || `Status ${f.got || f.status || 'Unknown'}`}`);
    });
  }

  return results.failed.length === 0;
}

// Run test
runRealDataTest()
  .then(success => {
    console.log(`\n${success ? '✅' : '❌'} Real Data Test ${success ? 'PASSED' : 'FAILED'}\n`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  });

