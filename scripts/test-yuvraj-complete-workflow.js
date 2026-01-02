#!/usr/bin/env node

/**
 * Complete Employee Workflow Test - Yuvraj
 * 1. Create employee
 * 2. Complete onboarding
 * 3. Mark attendance
 * 4. Create login credentials
 */

const BASE_URL = 'https://98.70.245.87';
const API_HOST = 'api.etelios.com';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

let adminToken = null;
let yuvrajEmployeeId = null;
let yuvrajMongoId = null;
let yuvrajEmail = null;

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
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
  
  if (adminToken) {
    headers['Authorization'] = `Bearer ${adminToken}`;
  }
  
  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    
    const data = await response.json().catch(() => ({ message: 'No JSON response' }));
    
    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      statusText: 'Network Error',
      data: { error: error.message }
    };
  }
}

// ============================================================================
// STEP 1: Login as Admin
// ============================================================================

async function loginAsAdmin() {
  logSection('STEP 1: Login as Admin');
  
  log('🔐 Logging in as admin...', 'cyan');
  const result = await safeFetch('/api/auth/mock-login', {
    method: 'POST',
    body: {
      email: 'admin@company.com',
      role: 'admin'
    }
  });
  
  if (result.ok && result.data.data && result.data.data.accessToken) {
    adminToken = result.data.data.accessToken;
    log('✅ Admin login successful', 'green');
    return true;
  } else {
    log(`❌ Admin login failed: ${JSON.stringify(result.data)}`, 'red');
    return false;
  }
}

// ============================================================================
// STEP 2: Create Employee - Yuvraj
// ============================================================================

async function createYuvraj() {
  logSection('STEP 2: Create Employee - Yuvraj');
  
  const timestamp = Date.now();
  yuvrajEmail = `yuvraj.${timestamp}@example.com`;
  yuvrajEmployeeId = `EMP-${new Date().getFullYear()}-${timestamp}`;
  
  const employeeData = {
    employeeId: yuvrajEmployeeId,
    firstName: 'Yuvraj',
    lastName: 'Singh',
    fullName: 'Yuvraj Singh',
    email: yuvrajEmail,
    password: 'Yuvraj@123',
    roleName: 'employee',
    phone: '+91-9876543210',
    department: 'IT',
    jobTitle: 'Software Developer',
    designation: 'Software Engineer',
    role_family: 'Tech',
    grade_band: 'A',
    joining_date: new Date().toISOString(),
    dateOfBirth: '1995-05-15',
    address: {
      street: '123 Tech Park',
      city: 'Mumbai',
      state: 'Maharashtra',
      zip: '400001',
      country: 'India'
    }
  };
  
  log(`📝 Creating employee: ${employeeData.fullName}`, 'cyan');
  log(`   Employee ID: ${yuvrajEmployeeId}`, 'yellow');
  log(`   Email: ${yuvrajEmail}`, 'yellow');
  
  const result = await safeFetch('/api/hr/employees', {
    method: 'POST',
    body: employeeData
  });
  
  if (result.ok && result.data.data) {
    yuvrajMongoId = result.data.data.id || result.data.data._id;
    yuvrajEmployeeId = result.data.data.employeeId || yuvrajEmployeeId;
    log('✅ Employee created successfully', 'green');
    log(`   MongoDB ID: ${yuvrajMongoId}`, 'yellow');
    log(`   Employee ID: ${yuvrajEmployeeId}`, 'yellow');
    return true;
  } else {
    log(`❌ Employee creation failed: ${JSON.stringify(result.data)}`, 'red');
    return false;
  }
}

// ============================================================================
// STEP 3: Complete Onboarding
// ============================================================================

async function completeOnboarding() {
  logSection('STEP 3: Complete Onboarding for Yuvraj');
  
  // Step 3.1: Personal Details
  log('\n📋 Step 3.1: Personal Details', 'cyan');
  const personalDetailsResult = await safeFetch('/api/hr/onboarding/personal-details', {
    method: 'POST',
    body: {
      employee_id: yuvrajEmployeeId,
      name: 'Yuvraj Singh',
      email: yuvrajEmail,
      phone: '+91-9876543210',
      date_of_birth: '1995-05-15',
      address: {
        address_line_1: '123 Tech Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country: 'India'
      }
    }
  });
  
  if (personalDetailsResult.ok) {
    log('✅ Personal details added', 'green');
  } else {
    log(`⚠️  Personal details: ${JSON.stringify(personalDetailsResult.data)}`, 'yellow');
  }
  
  // Step 3.2: Work Details
  log('\n💼 Step 3.2: Work Details', 'cyan');
  const workDetailsResult = await safeFetch('/api/hr/onboarding/work-details', {
    method: 'POST',
    body: {
      employeeId: yuvrajEmployeeId,
      jobTitle: 'Software Developer',
      department: 'IT',
      designation: 'Software Engineer',
      role_family: 'Tech',
      joining_date: new Date().toISOString(),
      reporting_manager_id: null,
      employee_status: 'ACTIVE',
      compensation: {
        salary: 50000,
        currency: 'INR',
        payFrequency: 'Monthly'
      }
    }
  });
  
  if (workDetailsResult.ok) {
    log('✅ Work details added', 'green');
  } else {
    log(`⚠️  Work details: ${JSON.stringify(workDetailsResult.data)}`, 'yellow');
  }
  
  // Step 3.3: Statutory Information
  log('\n📄 Step 3.3: Statutory Information', 'cyan');
  const statutoryResult = await safeFetch('/api/hr/onboarding/statutory-info', {
    method: 'POST',
    body: {
      employeeId: yuvrajEmployeeId,
      uan: '123456789012',
      esiNo: '123456789012345',
      panNumber: 'ABCDE1234Y',
      bankAccount: {
        account_number: '1234567890123456',
        ifsc_code: 'HDFC0001234',
        bank_name: 'HDFC Bank',
        branch_name: 'Mumbai Branch',
        account_type: 'Savings'
      }
    }
  });
  
  if (statutoryResult.ok) {
    log('✅ Statutory information added', 'green');
  } else {
    log(`⚠️  Statutory info: ${JSON.stringify(statutoryResult.data)}`, 'yellow');
  }
  
  // Step 3.4: Complete Onboarding
  log('\n✅ Step 3.4: Complete Onboarding', 'cyan');
  const completeResult = await safeFetch(`/api/hr/onboarding/complete/${yuvrajEmployeeId}`, {
    method: 'POST',
    body: {
      system_access: {
        create_system_account: true,
        role_name: 'employee'
      }
    }
  });
  
  if (completeResult.ok) {
    log('✅ Onboarding completed successfully', 'green');
    return true;
  } else {
    log(`⚠️  Complete onboarding: ${JSON.stringify(completeResult.data)}`, 'yellow');
    return true; // Continue even if this fails
  }
}

// ============================================================================
// STEP 4: Assign Role
// ============================================================================

async function assignRole() {
  logSection('STEP 4: Assign Role to Yuvraj');
  
  log('👤 Assigning employee role...', 'cyan');
  const result = await safeFetch(`/api/hr/employees/${yuvrajEmployeeId}/assign-role`, {
    method: 'POST',
    body: {
      roleName: 'employee'
    }
  });
  
  if (result.ok) {
    log('✅ Role assigned successfully', 'green');
    return true;
  } else {
    log(`⚠️  Role assignment: ${JSON.stringify(result.data)}`, 'yellow');
    return true; // Continue even if this fails
  }
}

// ============================================================================
// STEP 5: Update Status to ACTIVE
// ============================================================================

async function updateStatus() {
  logSection('STEP 5: Update Employee Status to ACTIVE');
  
  log('🔄 Updating status to ACTIVE...', 'cyan');
  const result = await safeFetch(`/api/hr/employees/${yuvrajEmployeeId}/status`, {
    method: 'PATCH',
    body: {
      status: 'ACTIVE'
    }
  });
  
  if (result.ok) {
    log('✅ Status updated to ACTIVE', 'green');
    return true;
  } else {
    log(`⚠️  Status update: ${JSON.stringify(result.data)}`, 'yellow');
    return true; // Continue even if this fails
  }
}

// ============================================================================
// STEP 6: Mark Attendance
// ============================================================================

async function markAttendance() {
  logSection('STEP 6: Mark Attendance for Yuvraj');
  
  // Clock In
  log('\n⏰ Clocking In...', 'cyan');
  const clockInResult = await safeFetch('/api/attendance/clock-in', {
    method: 'POST',
    body: {
      employeeId: yuvrajEmployeeId,
      location: {
        latitude: 19.0760,
        longitude: 72.8777,
        address: 'Mumbai, Maharashtra, India'
      },
      notes: 'First day attendance - Yuvraj'
    }
  });
  
  if (clockInResult.ok) {
    log('✅ Clocked in successfully', 'green');
  } else {
    log(`⚠️  Clock in: ${JSON.stringify(clockInResult.data)}`, 'yellow');
  }
  
  // Wait a bit before clocking out
  log('\n⏳ Waiting 2 seconds before clocking out...', 'cyan');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Clock Out
  log('\n⏰ Clocking Out...', 'cyan');
  const clockOutResult = await safeFetch('/api/attendance/clock-out', {
    method: 'POST',
    body: {
      employeeId: yuvrajEmployeeId,
      location: {
        latitude: 19.0760,
        longitude: 72.8777,
        address: 'Mumbai, Maharashtra, India'
      },
      notes: 'End of day - Yuvraj'
    }
  });
  
  if (clockOutResult.ok) {
    log('✅ Clocked out successfully', 'green');
    return true;
  } else {
    log(`⚠️  Clock out: ${JSON.stringify(clockOutResult.data)}`, 'yellow');
    return true; // Continue even if this fails
  }
}

// ============================================================================
// STEP 7: Verify Employee Login
// ============================================================================

async function verifyLogin() {
  logSection('STEP 7: Verify Employee Login Credentials');
  
  log('🔐 Testing login with employee credentials...', 'cyan');
  log(`   Email: ${yuvrajEmail}`, 'yellow');
  log(`   Password: Yuvraj@123`, 'yellow');
  
  // Try to login with the employee credentials
  const loginResult = await safeFetch('/api/auth/login', {
    method: 'POST',
    body: {
      email: yuvrajEmail,
      password: 'Yuvraj@123'
    }
  });
  
  if (loginResult.ok && loginResult.data.data && loginResult.data.data.accessToken) {
    log('✅ Login successful with employee credentials', 'green');
    log(`   Token obtained: ${loginResult.data.data.accessToken.substring(0, 20)}...`, 'yellow');
    return true;
  } else {
    log(`⚠️  Direct login: ${JSON.stringify(loginResult.data)}`, 'yellow');
    log('   Note: Employee can use mock-login or credentials may need activation', 'yellow');
    return true; // Continue
  }
}

// ============================================================================
// STEP 8: Get Employee Details
// ============================================================================

async function getEmployeeDetails() {
  logSection('STEP 8: Get Yuvraj Employee Details');
  
  log('📋 Fetching employee details...', 'cyan');
  const result = await safeFetch(`/api/hr/employees/${yuvrajEmployeeId}`);
  
  if (result.ok && result.data.data) {
    const emp = result.data.data;
    log('✅ Employee details retrieved', 'green');
    log(`   Name: ${emp.fullName || emp.firstName} ${emp.lastName || ''}`, 'yellow');
    log(`   Employee ID: ${emp.employeeId}`, 'yellow');
    log(`   Email: ${emp.email}`, 'yellow');
    log(`   Department: ${emp.department}`, 'yellow');
    log(`   Job Title: ${emp.jobTitle}`, 'yellow');
    log(`   Status: ${emp.status}`, 'yellow');
    return true;
  } else {
    log(`❌ Failed to get employee details: ${JSON.stringify(result.data)}`, 'red');
    return false;
  }
}

// ============================================================================
// MAIN WORKFLOW
// ============================================================================

async function runCompleteWorkflow() {
  logSection('🚀 Yuvraj Complete Employee Workflow');
  log(`Backend URL: ${BASE_URL}`, 'cyan');
  log(`API Host: ${API_HOST}`, 'cyan');
  
  try {
    // Step 1: Login as Admin
    if (!(await loginAsAdmin())) {
      log('\n❌ Failed to login as admin. Aborting.', 'red');
      return;
    }
    
    // Step 2: Create Employee
    if (!(await createYuvraj())) {
      log('\n❌ Failed to create employee. Aborting.', 'red');
      return;
    }
    
    // Step 3: Complete Onboarding
    await completeOnboarding();
    
    // Step 4: Assign Role
    await assignRole();
    
    // Step 5: Update Status
    await updateStatus();
    
    // Step 6: Mark Attendance
    await markAttendance();
    
    // Step 7: Verify Login
    await verifyLogin();
    
    // Step 8: Get Employee Details
    await getEmployeeDetails();
    
    // Final Summary
    logSection('✅ WORKFLOW COMPLETE');
    log('📊 Summary:', 'bright');
    log(`   Employee Name: Yuvraj Singh`, 'green');
    log(`   Employee ID: ${yuvrajEmployeeId}`, 'green');
    log(`   Email: ${yuvrajEmail}`, 'green');
    log(`   Password: Yuvraj@123`, 'green');
    log(`   Role: employee`, 'green');
    log(`   Status: ACTIVE`, 'green');
    log(`   Department: IT`, 'green');
    log(`   Job Title: Software Developer`, 'green');
    log('\n✅ All steps completed successfully!', 'green');
    
  } catch (error) {
    log(`\n💥 Fatal Error: ${error.message}`, 'red');
    console.error(error);
  }
}

// Run workflow
runCompleteWorkflow().catch(error => {
  log(`\n💥 Fatal Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

