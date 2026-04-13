/**
 * Full Flow Test: Tenant Registry → Auth → HR → Attendance
 * Tests the complete workflow from tenant creation to attendance marking
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Configuration - Use production URLs by default
const USE_PRODUCTION = process.env.USE_PRODUCTION !== 'false';
const PROD_BASE = 'https://98.70.245.87';
const PROD_HOST = 'api.etelios.com';
const LOCAL_BASE = 'http://localhost';

const CONFIG = USE_PRODUCTION ? {
  tenantRegistry: {
    baseUrl: PROD_BASE,
    host: PROD_HOST,
    pathPrefix: '/api/tenants'
  },
  auth: {
    baseUrl: PROD_BASE,
    host: PROD_HOST,
    pathPrefix: '/api/auth'
  },
  hr: {
    baseUrl: PROD_BASE,
    host: PROD_HOST,
    pathPrefix: '/api/hr'
  },
  attendance: {
    baseUrl: PROD_BASE,
    host: PROD_HOST,
    pathPrefix: '/api/attendance'
  }
} : {
  tenantRegistry: {
    baseUrl: `${LOCAL_BASE}:3020`,
    host: 'localhost',
    pathPrefix: '/api/tenants'
  },
  auth: {
    baseUrl: `${LOCAL_BASE}:3001`,
    host: 'localhost',
    pathPrefix: '/api/auth'
  },
  hr: {
    baseUrl: `${LOCAL_BASE}:3002`,
    host: 'localhost',
    pathPrefix: '/api/hr'
  },
  attendance: {
    baseUrl: `${LOCAL_BASE}:3003`,
    host: 'localhost',
    pathPrefix: '/api/attendance'
  }
};

// Test data
const testData = {
  tenant: {
    tenantName: 'Test Company',
    domain: `test-${Date.now()}.example.com`,
    subdomain: `test${Date.now()}`,
    plan: 'professional'
  },
  superAdmin: {
    employee_id: `SUPER-ADMIN-${Date.now()}`,
    name: 'Super Admin User',
    email: `superadmin-${Date.now()}@test.com`,
    phone: '+1234567890',
    password: 'SuperAdmin123!',
    role: 'superadmin',
    department: 'IT',
    designation: 'Super Administrator',
    joining_date: new Date().toISOString()
  },
  admin: {
    employee_id: `ADMIN-${Date.now()}`,
    name: 'Admin User',
    email: `admin-${Date.now()}@test.com`,
    phone: '+1234567891',
    password: 'Admin123!',
    role: 'admin',
    department: 'Management',
    designation: 'Administrator',
    joining_date: new Date().toISOString()
  },
  employee: {
    firstName: 'Test',
    lastName: 'Employee',
    email: `employee-${Date.now()}@test.com`,
    phone: '+1234567892',
    employeeId: `EMP-${Date.now()}`,
    department: 'Engineering',
    designation: 'Software Engineer',
    role: 'employee',
    joiningDate: new Date().toISOString(),
    dateOfBirth: '1990-01-01',
    address: {
      street: '123 Test St',
      city: 'Test City',
      state: 'Test State',
      country: 'Test Country',
      pincode: '12345'
    }
  }
};

// Results tracking
const results = {
  passed: [],
  failed: [],
  skipped: [],
  data: {
    tenant: null,
    superAdminToken: null,
    adminToken: null,
    employeeId: null,
    attendanceId: null
  }
};

// Helper function to make requests
async function makeRequest(method, path, service = 'auth', options = {}) {
  const config = CONFIG[service] || CONFIG.auth;
  // Add path prefix if it exists
  const fullPath = config.pathPrefix ? `${config.pathPrefix}${path}` : path;
  const url = `${config.baseUrl}${fullPath}`;
  const headers = {
    'Content-Type': 'application/json',
    'Host': config.host,
    ...options.headers
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  if (options.tenantId) {
    headers['X-Tenant-ID'] = options.tenantId;
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

// Test function
async function test(name, method, path, service, options = {}) {
  process.stdout.write(`\n🧪 Testing: ${name}... `);
  
  const result = await makeRequest(method, path, service, options);
  
  if (result.status === 0) {
    results.failed.push({ name, error: 'Connection failed', result });
    process.stdout.write(`❌ FAIL (Connection Error)\n`);
    if (result.error) console.log(`   Error: ${result.error}`);
    return false;
  }

  if (options.expectStatus) {
    if (result.status === options.expectStatus) {
      results.passed.push({ name, status: result.status });
      process.stdout.write(`✅ PASS (${result.status})\n`);
      return true;
    } else {
      results.failed.push({ name, expected: options.expectStatus, got: result.status, result });
      process.stdout.write(`❌ FAIL (Expected ${options.expectStatus}, got ${result.status})\n`);
      if (result.data && typeof result.data === 'object') {
        console.log(`   Response: ${JSON.stringify(result.data).substring(0, 200)}`);
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
      console.log(`   Error: ${JSON.stringify(result.data).substring(0, 200)}`);
    }
    return false;
  }
}

// Main test flow
async function runFullFlow() {
  console.log('\n================================================================================');
  console.log('🚀 Full Flow Test: Tenant Registry → Auth → HR → Attendance');
  console.log('================================================================================');
  console.log('Environment:', USE_PRODUCTION ? 'PRODUCTION' : 'LOCAL');
  console.log('Tenant Registry:', CONFIG.tenantRegistry.baseUrl);
  console.log('Auth Service:', CONFIG.auth.baseUrl);
  console.log('HR Service:', CONFIG.hr.baseUrl);
  console.log('Attendance Service:', CONFIG.attendance.baseUrl);
  console.log('================================================================================\n');

  // ============================================================================
  // STEP 1: TENANT REGISTRY - Create Tenant
  // ============================================================================
  console.log('\n📋 STEP 1: Create Tenant');
  console.log('─────────────────────────────────────────────────────────────────────────────');

  // Health check
  await test('Tenant Registry Health', 'GET', '/health', 'tenantRegistry');

  // Create tenant
  const createTenantResult = await makeRequest('POST', '', 'tenantRegistry', {
    body: testData.tenant
  });

  if (createTenantResult.ok && createTenantResult.data?.data) {
    results.data.tenant = createTenantResult.data.data;
    console.log(`✅ Tenant created: ${results.data.tenant.tenantId}`);
    results.passed.push({ name: 'Create Tenant', status: createTenantResult.status });
  } else if (createTenantResult.status === 409) {
    // Tenant already exists, get it
    console.log(`⚠️  Tenant already exists, retrieving...`);
    const getTenantResult = await makeRequest('GET', `/${testData.tenant.subdomain}`, 'tenantRegistry');
    if (getTenantResult.ok && getTenantResult.data?.data) {
      results.data.tenant = getTenantResult.data.data;
      console.log(`✅ Tenant retrieved: ${results.data.tenant.tenantId}`);
      results.passed.push({ name: 'Get Existing Tenant', status: getTenantResult.status });
    } else {
      console.log(`⚠️  Using mock tenant data for continuation...`);
      results.data.tenant = { tenantId: testData.tenant.subdomain.toLowerCase(), subdomain: testData.tenant.subdomain };
    }
  } else {
    console.log(`❌ Failed to create tenant`);
    console.log(`   Response: ${JSON.stringify(createTenantResult.data).substring(0, 300)}`);
    results.failed.push({ name: 'Create Tenant', result: createTenantResult });
    
    // Use mock tenant data for continuation
    console.log(`⚠️  Using mock tenant data for continuation...`);
    results.data.tenant = { tenantId: testData.tenant.subdomain.toLowerCase(), subdomain: testData.tenant.subdomain };
  }

  // ============================================================================
  // STEP 2: AUTH SERVICE - Register Super Admin
  // ============================================================================
  console.log('\n📋 STEP 2: Register Super Admin');
  console.log('─────────────────────────────────────────────────────────────────────────────');

  // Health check
  await test('Auth Service Health', 'GET', '/health', 'auth');

  // Get initial token using mock login
  const mockLoginResult = await makeRequest('POST', '/mock-login-fast', 'auth', {
    body: { role: 'superadmin' }
  });

  if (mockLoginResult.ok && mockLoginResult.data?.data?.accessToken) {
    results.data.superAdminToken = mockLoginResult.data.data.accessToken;
    console.log(`✅ Super Admin token obtained via mock login`);
  } else {
    console.log(`❌ Failed to get super admin token`);
    console.log(`   Response: ${JSON.stringify(mockLoginResult.data).substring(0, 300)}`);
    results.failed.push({ name: 'Get Super Admin Token', result: mockLoginResult });
    console.log(`⚠️  Cannot continue without super admin token`);
    return false;
  }

  // Register super admin
  const registerSuperAdminResult = await makeRequest('POST', '/register', 'auth', {
    token: results.data.superAdminToken,
    body: testData.superAdmin
  });

  if (registerSuperAdminResult.ok || registerSuperAdminResult.status === 409) {
    console.log(`✅ Super Admin registered (or already exists)`);
    results.passed.push({ name: 'Register Super Admin', status: registerSuperAdminResult.status });
  } else {
    console.log(`❌ Failed to register super admin`);
    console.log(`   Response: ${JSON.stringify(registerSuperAdminResult.data).substring(0, 300)}`);
    results.failed.push({ name: 'Register Super Admin', result: registerSuperAdminResult });
  }

  // Login as super admin
  const superAdminLoginResult = await makeRequest('POST', '/login', 'auth', {
    body: {
      emailOrEmployeeId: testData.superAdmin.email,
      password: testData.superAdmin.password
    }
  });

  if (superAdminLoginResult.ok && superAdminLoginResult.data?.data?.accessToken) {
    results.data.superAdminToken = superAdminLoginResult.data.data.accessToken;
    console.log(`✅ Super Admin logged in successfully`);
    results.passed.push({ name: 'Super Admin Login', status: superAdminLoginResult.status });
  } else {
    console.log(`⚠️  Super Admin login failed, using mock token`);
    console.log(`   Response: ${JSON.stringify(superAdminLoginResult.data).substring(0, 200)}`);
  }

  // ============================================================================
  // STEP 3: AUTH SERVICE - Register Admin
  // ============================================================================
  console.log('\n📋 STEP 3: Register Admin');
  console.log('─────────────────────────────────────────────────────────────────────────────');

  // Register admin
  const registerAdminResult = await makeRequest('POST', '/register', 'auth', {
    token: results.data.superAdminToken,
    body: testData.admin
  });

  if (registerAdminResult.ok || registerAdminResult.status === 409) {
    console.log(`✅ Admin registered (or already exists)`);
    results.passed.push({ name: 'Register Admin', status: registerAdminResult.status });
  } else {
    console.log(`❌ Failed to register admin`);
    console.log(`   Response: ${JSON.stringify(registerAdminResult.data).substring(0, 300)}`);
    results.failed.push({ name: 'Register Admin', result: registerAdminResult });
  }

  // Login as admin
  const adminLoginResult = await makeRequest('POST', '/login', 'auth', {
    body: {
      emailOrEmployeeId: testData.admin.email,
      password: testData.admin.password
    }
  });

  if (adminLoginResult.ok && adminLoginResult.data?.data?.accessToken) {
    results.data.adminToken = adminLoginResult.data.data.accessToken;
    console.log(`✅ Admin logged in successfully`);
    results.passed.push({ name: 'Admin Login', status: adminLoginResult.status });
  } else {
    console.log(`⚠️  Admin login failed, using super admin token`);
    console.log(`   Response: ${JSON.stringify(adminLoginResult.data).substring(0, 200)}`);
    results.data.adminToken = results.data.superAdminToken;
  }

  // ============================================================================
  // STEP 4: HR SERVICE - Create Employee
  // ============================================================================
  console.log('\n📋 STEP 4: Create Employee');
  console.log('─────────────────────────────────────────────────────────────────────────────');

  // Health check
  await test('HR Service Health', 'GET', '/health', 'hr');

  // Create employee
  const createEmployeeResult = await makeRequest('POST', '/employees', 'hr', {
    token: results.data.adminToken,
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
    results.data.employeeId = createEmployeeResult.data.data.employeeId || 
                              createEmployeeResult.data.data._id || 
                              testData.employee.employeeId;
    console.log(`✅ Employee created: ${results.data.employeeId}`);
    results.passed.push({ name: 'Create Employee', status: createEmployeeResult.status });
  } else {
    console.log(`❌ Failed to create employee`);
    console.log(`   Response: ${JSON.stringify(createEmployeeResult.data).substring(0, 300)}`);
    results.failed.push({ name: 'Create Employee', result: createEmployeeResult });
    results.data.employeeId = testData.employee.employeeId; // Use test data for continuation
  }

  // Get employee details
  if (results.data.employeeId) {
    const getEmployeeResult = await makeRequest('GET', `/employees/${results.data.employeeId}`, 'hr', {
      token: results.data.adminToken
    });

    if (getEmployeeResult.ok) {
      console.log(`✅ Employee retrieved successfully`);
      results.passed.push({ name: 'Get Employee', status: getEmployeeResult.status });
    } else {
      console.log(`⚠️  Failed to retrieve employee`);
      results.failed.push({ name: 'Get Employee', result: getEmployeeResult });
    }
  }

  // ============================================================================
  // STEP 5: ATTENDANCE SERVICE - Mark Attendance
  // ============================================================================
  console.log('\n📋 STEP 5: Mark Attendance');
  console.log('─────────────────────────────────────────────────────────────────────────────');

  // Health check
  await test('Attendance Service Health', 'GET', '/health', 'attendance');

  if (!results.data.employeeId) {
    console.log(`❌ Cannot mark attendance without employee ID`);
    results.failed.push({ name: 'Mark Attendance', error: 'No employee ID' });
    return false;
  }

  // Clock in
  const clockInResult = await makeRequest('POST', '/clock-in', 'attendance', {
    token: results.data.adminToken,
    body: {
      employeeId: results.data.employeeId
    }
  });

  if (clockInResult.ok && clockInResult.data?.data) {
    results.data.attendanceId = clockInResult.data.data._id || clockInResult.data.data.id;
    console.log(`✅ Clocked in successfully`);
    results.passed.push({ name: 'Clock In', status: clockInResult.status });
  } else {
    console.log(`❌ Failed to clock in`);
    console.log(`   Response: ${JSON.stringify(clockInResult.data).substring(0, 300)}`);
    results.failed.push({ name: 'Clock In', result: clockInResult });
  }

  // Wait a bit before clocking out
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Clock out
  const clockOutResult = await makeRequest('POST', '/clock-out', 'attendance', {
    token: results.data.adminToken,
    body: {
      employeeId: results.data.employeeId
    }
  });

  if (clockOutResult.ok) {
    console.log(`✅ Clocked out successfully`);
    results.passed.push({ name: 'Clock Out', status: clockOutResult.status });
  } else {
    console.log(`❌ Failed to clock out`);
    console.log(`   Response: ${JSON.stringify(clockOutResult.data).substring(0, 300)}`);
    results.failed.push({ name: 'Clock Out', result: clockOutResult });
  }

  // Get attendance records
  const getAttendanceResult = await makeRequest('GET', `/records?employeeId=${results.data.employeeId}`, 'attendance', {
    token: results.data.adminToken
  });

  if (getAttendanceResult.ok) {
    console.log(`✅ Attendance records retrieved`);
    results.passed.push({ name: 'Get Attendance Records', status: getAttendanceResult.status });
  } else {
    console.log(`⚠️  Failed to retrieve attendance records`);
    results.failed.push({ name: 'Get Attendance Records', result: getAttendanceResult });
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n================================================================================');
  console.log('📊 TEST SUMMARY');
  console.log('================================================================================');
  console.log(`Total Tests: ${results.passed.length + results.failed.length + results.skipped.length}`);
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⏭️  Skipped: ${results.skipped.length}`);

  if (results.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.failed.forEach(f => {
      console.log(`  - ${f.name}: ${f.error || `Status ${f.got || f.status || 'Unknown'}`}`);
    });
  }

  console.log('\n📋 Flow Data:');
  console.log(`  Tenant ID: ${results.data.tenant?.tenantId || 'N/A'}`);
  console.log(`  Super Admin Token: ${results.data.superAdminToken ? '✅' : '❌'}`);
  console.log(`  Admin Token: ${results.data.adminToken ? '✅' : '❌'}`);
  console.log(`  Employee ID: ${results.data.employeeId || 'N/A'}`);
  console.log(`  Attendance ID: ${results.data.attendanceId || 'N/A'}`);

  return results.failed.length === 0;
}

// Run the full flow test
runFullFlow()
  .then(success => {
    console.log(`\n${success ? '✅' : '❌'} Full flow test ${success ? 'PASSED' : 'FAILED'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
  });

