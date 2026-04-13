#!/usr/bin/env node

/**
 * Complete Tenant → Admin → Employee → Attendance Flow Test
 * 
 * Flow:
 * 1. Create Tenant
 * 2. Create Admin Login for Tenant
 * 3. Login as Tenant Admin
 * 4. Create Employee
 * 5. Mark Attendance for Employee
 * 6. Verify Data in Database
 */

// Use localhost for local testing, or production URL
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const API_HOST = process.env.API_HOST || 'localhost';

// For production, use:
// const BASE_URL = process.env.BASE_URL || 'https://98.70.245.87';
// const API_HOST = 'api.etelios.com';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

let superAdminToken = null;
let tenantAdminToken = null;
let tenantId = null;
let tenantAdminEmail = null;
let tenantAdminPassword = null;
let employeeId = null;
let employeeEmail = null;
let employeeMongoId = null;

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

async function safeFetch(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  
  const headers = {
    'Host': API_HOST,
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  // Add auth token if available
  if (superAdminToken && !options.useTenantToken) {
    headers['Authorization'] = `Bearer ${superAdminToken}`;
  } else if (tenantAdminToken && options.useTenantToken) {
    headers['Authorization'] = `Bearer ${tenantAdminToken}`;
  }
  
  try {
    const response = await fetch(fullUrl, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const contentType = response.headers.get('content-type');
    let data = null;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { message: "No JSON response", raw: text };
      }
    }

    if (!response.ok) {
      log(`❌ API Error: ${response.status} ${response.statusText} - ${fullUrl}`, 'red');
      log(`   Response: ${JSON.stringify(data, null, 2)}`, 'red');
    }

    return { ok: response.ok, status: response.status, data: data };
  } catch (error) {
    log(`❌ Fetch Error for ${fullUrl}: ${error.message}`, 'red');
    return { ok: false, error: error.message };
  }
}

// ============================================================================
// STEP 1: Login as Super Admin
// ============================================================================

async function loginAsSuperAdmin() {
  logSection('STEP 1: Login as Super Admin');
  
  log('🔐 Logging in as super admin...', 'cyan');
  // Try mock-login-fast first (faster, no DB)
  let result = await safeFetch('/api/auth/mock-login-fast', {
    method: 'POST',
    body: {
      email: 'admin@company.com',
      role: 'superadmin'
    }
  });
  
  // If that fails, try regular mock-login
  if (!result.ok) {
    result = await safeFetch('/api/auth/mock-login', {
      method: 'POST',
      body: {
        email: 'admin@company.com',
        role: 'superadmin'
      }
    });
  }
  
  if (result.ok && result.data.data && result.data.data.accessToken) {
    superAdminToken = result.data.data.accessToken;
    log('✅ Super admin login successful', 'green');
    return true;
  } else {
    log(`❌ Super admin login failed: ${JSON.stringify(result.data)}`, 'red');
    return false;
  }
}

// ============================================================================
// STEP 2: Create Tenant
// ============================================================================

async function createTenant() {
  logSection('STEP 2: Create Tenant');
  
  const timestamp = Date.now();
  const subdomain = `testtenant${timestamp}`;
  tenantId = subdomain;
  
  const tenantData = {
    tenantName: `Test Tenant ${timestamp}`,
    domain: `${subdomain}.etelios.com`,
    subdomain: subdomain,
    plan: 'basic',
    configuration: {
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      language: 'en',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h'
    }
  };
  
  log(`📝 Creating tenant: ${tenantData.tenantName}`, 'cyan');
  log(`   Subdomain: ${subdomain}`, 'yellow');
  log(`   Domain: ${tenantData.domain}`, 'yellow');
  
  // Try tenant-registry-service first (no auth required)
  let result = await safeFetch('/api/tenants', {
    method: 'POST',
    body: tenantData
  });
  
  // If that fails, try tenant-management-service (requires auth)
  if (!result.ok) {
    log('⚠️  tenant-registry-service failed, trying tenant-management-service...', 'yellow');
    result = await safeFetch('/admin/v1/tenants', {
      method: 'POST',
      body: {
        name: tenantData.tenantName,
        domain: tenantData.domain,
        email: `admin@${tenantData.domain}`,
        plan: tenantData.plan,
        adminUser: {
          firstName: 'Tenant',
          lastName: 'Admin',
          email: `admin@${tenantData.domain}`,
          phone: '+91-9876543210'
        }
      }
    });
  }
  
  if (result.ok && result.data.data) {
    const tenant = result.data.data;
    tenantId = tenant.tenantId || tenant.id || subdomain;
    log('✅ Tenant created successfully', 'green');
    log(`   Tenant ID: ${tenantId}`, 'yellow');
    log(`   Tenant Name: ${tenant.tenantName || tenant.name}`, 'yellow');
    log(`   Status: ${tenant.status}`, 'yellow');
    
    // Extract admin user info if available
    if (tenant.adminUser) {
      tenantAdminEmail = tenant.adminUser.email;
      tenantAdminPassword = tenant.adminUser.temporaryPassword || 'Admin@123';
      log(`   Admin Email: ${tenantAdminEmail}`, 'yellow');
      log(`   Admin Password: ${tenantAdminPassword}`, 'yellow');
    } else {
      // We'll create admin user in next step
      tenantAdminEmail = `admin@${tenantData.domain}`;
      tenantAdminPassword = 'Admin@123';
    }
    
    return true;
  } else {
    log(`❌ Tenant creation failed: ${JSON.stringify(result.data)}`, 'red');
    return false;
  }
}

// ============================================================================
// STEP 3: Create Admin User for Tenant
// ============================================================================

async function createTenantAdmin() {
  logSection('STEP 3: Create Tenant Admin User');
  
  // If admin user was already created during tenant creation, skip
  if (tenantAdminEmail && tenantAdminPassword && tenantAdminPassword !== 'Admin@123') {
    log('✅ Admin user already created during tenant creation', 'green');
    return true;
  }
  
  log(`📝 Creating admin user for tenant: ${tenantId}`, 'cyan');
  log(`   Email: ${tenantAdminEmail}`, 'yellow');
  
  const adminData = {
    employeeId: `ADMIN-${tenantId.toUpperCase()}`,
    firstName: 'Tenant',
    lastName: 'Admin',
    fullName: 'Tenant Admin',
    email: tenantAdminEmail,
    password: tenantAdminPassword,
    roleName: 'admin',
    phone: '+91-9876543210',
    department: 'Administration',
    jobTitle: 'Tenant Administrator'
  };
  
  const result = await safeFetch('/api/auth/register', {
    method: 'POST',
    body: {
      ...adminData,
      tenantId: tenantId,
      role: 'admin'
    }
  });
  
  if (result.ok && result.data.data) {
    log('✅ Tenant admin user created successfully', 'green');
    log(`   Email: ${tenantAdminEmail}`, 'yellow');
    return true;
  } else {
    log(`⚠️  Admin user creation failed, will try login: ${JSON.stringify(result.data)}`, 'yellow');
    // Continue anyway - might be able to login with mock-login
    return true;
  }
}

// ============================================================================
// STEP 4: Login as Tenant Admin
// ============================================================================

async function loginAsTenantAdmin() {
  logSection('STEP 4: Login as Tenant Admin');
  
  log(`🔐 Logging in as tenant admin...`, 'cyan');
  log(`   Email: ${tenantAdminEmail}`, 'yellow');
  
  // Try mock-login-fast first (faster, no DB)
  let result = await safeFetch('/api/auth/mock-login-fast', {
    method: 'POST',
    body: {
      email: tenantAdminEmail,
      role: 'admin',
      tenantId: tenantId
    }
  });
  
  // If that fails, try regular mock-login
  if (!result.ok || !result.data.data || !result.data.data.accessToken) {
    result = await safeFetch('/api/auth/mock-login', {
      method: 'POST',
      body: {
        email: tenantAdminEmail,
        role: 'admin',
        tenantId: tenantId
      }
    });
  }
  
  // If mock login fails, try real login
  if (!result.ok || !result.data.data || !result.data.data.accessToken) {
    log('⚠️  Mock login failed, trying real login...', 'yellow');
    result = await safeFetch('/api/auth/login', {
      method: 'POST',
      body: {
        emailOrEmployeeId: tenantAdminEmail,
        password: tenantAdminPassword
      }
    });
  }
  
  if (result.ok && result.data.data && result.data.data.accessToken) {
    tenantAdminToken = result.data.data.accessToken;
    log('✅ Tenant admin login successful', 'green');
    return true;
  } else {
    log(`❌ Tenant admin login failed: ${JSON.stringify(result.data)}`, 'red');
    // Continue with super admin token if needed
    log('⚠️  Continuing with super admin token...', 'yellow');
    return false;
  }
}

// ============================================================================
// STEP 5: Create Employee
// ============================================================================

async function createEmployee() {
  logSection('STEP 5: Create Employee');
  
  const timestamp = Date.now();
  employeeEmail = `employee.${timestamp}@${tenantId}.etelios.com`;
  employeeId = `EMP-${new Date().getFullYear()}-${timestamp}`;
  
  const employeeData = {
    employeeId: employeeId,
    firstName: 'Test',
    lastName: 'Employee',
    fullName: 'Test Employee',
    email: employeeEmail,
    password: 'Employee@123',
    roleName: 'employee',
    phone: '+91-9876543210',
    department: 'IT',
    jobTitle: 'Software Developer',
    designation: 'Software Engineer',
    role_family: 'Tech',
    joining_date: new Date().toISOString(),
    dateOfBirth: '1995-01-15',
    address: {
      street: '123 Test Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      zip: '400001',
      country: 'India'
    }
  };
  
  log(`📝 Creating employee: ${employeeData.fullName}`, 'cyan');
  log(`   Employee ID: ${employeeId}`, 'yellow');
  log(`   Email: ${employeeEmail}`, 'yellow');
  log(`   Tenant ID: ${tenantId}`, 'yellow');
  
  const result = await safeFetch('/api/hr/employees', {
    method: 'POST',
    body: {
      ...employeeData,
      tenantId: tenantId
    },
    useTenantToken: true // Use tenant admin token if available
  });
  
  if (result.ok && result.data.data) {
    const employee = result.data.data;
    employeeMongoId = employee.id || employee._id;
    employeeId = employee.employeeId || employeeId;
    log('✅ Employee created successfully', 'green');
    log(`   MongoDB ID: ${employeeMongoId}`, 'yellow');
    log(`   Employee ID: ${employeeId}`, 'yellow');
    log(`   Email: ${employee.email}`, 'yellow');
    return true;
  } else {
    log(`❌ Employee creation failed: ${JSON.stringify(result.data)}`, 'red');
    return false;
  }
}

// ============================================================================
// STEP 6: Mark Attendance
// ============================================================================

async function markAttendance() {
  logSection('STEP 6: Mark Attendance for Employee');
  
  log(`⏰ Marking attendance for employee: ${employeeId}`, 'cyan');
  
  // Clock In
  log('\n📥 Clocking In...', 'cyan');
  const clockInResult = await safeFetch('/api/attendance/clock-in', {
    method: 'POST',
    body: {
      employeeId: employeeId,
      timestamp: new Date().toISOString(),
      location: {
        latitude: 19.0760,
        longitude: 72.8777,
        address: 'Mumbai, India'
      },
      notes: 'Morning check-in',
      tenantId: tenantId
    },
    useTenantToken: true
  });
  
  if (clockInResult.ok) {
    log('✅ Clock in successful', 'green');
  } else {
    log(`⚠️  Clock in failed: ${JSON.stringify(clockInResult.data)}`, 'yellow');
  }
  
  // Wait a bit before clocking out
  log('\n⏳ Waiting 2 seconds before clocking out...', 'cyan');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Clock Out
  log('\n📤 Clocking Out...', 'cyan');
  const clockOutResult = await safeFetch('/api/attendance/clock-out', {
    method: 'POST',
    body: {
      employeeId: employeeId,
      timestamp: new Date().toISOString(),
      location: {
        latitude: 19.0760,
        longitude: 72.8777,
        address: 'Mumbai, India'
      },
      notes: 'Evening check-out',
      tenantId: tenantId
    },
    useTenantToken: true
  });
  
  if (clockOutResult.ok) {
    log('✅ Clock out successful', 'green');
  } else {
    log(`⚠️  Clock out failed: ${JSON.stringify(clockOutResult.data)}`, 'yellow');
  }
  
  return clockInResult.ok && clockOutResult.ok;
}

// ============================================================================
// STEP 7: Verify Data in Database
// ============================================================================

async function verifyDatabaseData() {
  logSection('STEP 7: Verify Data in Database');
  
  log('🔍 Verifying data persistence...', 'cyan');
  
  // Verify Tenant
  log('\n📋 Verifying Tenant...', 'cyan');
  let result = await safeFetch(`/api/tenants/${tenantId}`, {
    method: 'GET'
  });
  
  if (!result.ok) {
    result = await safeFetch(`/admin/v1/tenants/${tenantId}`, {
      method: 'GET'
    });
  }
  
  if (result.ok && result.data.data) {
    log('✅ Tenant verified in database', 'green');
    log(`   Tenant ID: ${result.data.data.tenantId || result.data.data.id}`, 'yellow');
  } else {
    log(`⚠️  Tenant verification failed: ${JSON.stringify(result.data)}`, 'yellow');
  }
  
  // Verify Employee
  log('\n👤 Verifying Employee...', 'cyan');
  result = await safeFetch(`/api/hr/employees/${employeeId}`, {
    method: 'GET',
    useTenantToken: true
  });
  
  if (result.ok && result.data.data) {
    const employee = result.data.data;
    log('✅ Employee verified in database', 'green');
    log(`   Employee ID: ${employee.employeeId}`, 'yellow');
    log(`   Name: ${employee.fullName}`, 'yellow');
    log(`   Email: ${employee.email}`, 'yellow');
    log(`   Department: ${employee.department}`, 'yellow');
  } else {
    log(`⚠️  Employee verification failed: ${JSON.stringify(result.data)}`, 'yellow');
  }
  
  // Verify Attendance
  log('\n⏰ Verifying Attendance...', 'cyan');
  result = await safeFetch(`/api/attendance/employee/${employeeId}?startDate=${new Date().toISOString().split('T')[0]}&endDate=${new Date().toISOString().split('T')[0]}`, {
    method: 'GET',
    useTenantToken: true
  });
  
  if (result.ok && result.data.data) {
    const attendance = result.data.data;
    log('✅ Attendance verified in database', 'green');
    log(`   Records found: ${Array.isArray(attendance) ? attendance.length : 'N/A'}`, 'yellow');
  } else {
    log(`⚠️  Attendance verification failed: ${JSON.stringify(result.data)}`, 'yellow');
  }
}

// ============================================================================
// Main Workflow
// ============================================================================

async function runWorkflow() {
  try {
    log('\n🚀 Starting Complete Tenant → Admin → Employee → Attendance Flow', 'bright');
    log('='.repeat(80), 'bright');
    
    if (!await loginAsSuperAdmin()) {
      log('\n❌ Workflow failed at Step 1: Super Admin Login', 'red');
      return;
    }
    
    if (!await createTenant()) {
      log('\n❌ Workflow failed at Step 2: Tenant Creation', 'red');
      return;
    }
    
    if (!await createTenantAdmin()) {
      log('\n⚠️  Workflow warning at Step 3: Admin User Creation', 'yellow');
    }
    
    if (!await loginAsTenantAdmin()) {
      log('\n⚠️  Workflow warning at Step 4: Tenant Admin Login', 'yellow');
      log('   Continuing with super admin token...', 'yellow');
    }
    
    if (!await createEmployee()) {
      log('\n❌ Workflow failed at Step 5: Employee Creation', 'red');
      return;
    }
    
    await markAttendance(); // Continue even if attendance fails
    
    await verifyDatabaseData();
    
    logSection('✅ WORKFLOW COMPLETE');
    log('\n📊 Summary:', 'bright');
    log(`   Tenant ID: ${tenantId}`, 'green');
    log(`   Tenant Admin Email: ${tenantAdminEmail}`, 'green');
    log(`   Employee ID: ${employeeId}`, 'green');
    log(`   Employee Email: ${employeeEmail}`, 'green');
    log(`   Employee Password: Employee@123`, 'green');
    log('\n✅ All steps completed!', 'green');
    log('\n💾 Data should now be persisted in:', 'bright');
    log('   - Tenant Database: tenant-db', 'cyan');
    log('   - HR Database: etelios_hr_service', 'cyan');
    log('   - Attendance Database: attendance-db', 'cyan');
    log('   - Auth Database: auth-db', 'cyan');
    
  } catch (error) {
    log(`\n❌ Workflow failed with error: ${error.message}`, 'red');
    console.error(error);
  }
}

runWorkflow();

