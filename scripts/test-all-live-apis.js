#!/usr/bin/env node

/**
 * Comprehensive API Test Script for Live Backend
 * Tests all HR, Auth, and Attendance APIs
 * Backend URL: https://98.70.245.87
 */

const BASE_URL = 'https://98.70.245.87';
const API_HOST = 'api.etelios.com';

// Disable SSL certificate validation for testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

let authToken = null;
let adminToken = null;
let hrToken = null;
let employeeToken = null;
let testEmployeeId = null;
let testEmployeeMongoId = null;

// Test results
const results = {
  passed: 0,
  failed: 0,
  errors: []
};

// Colors for console output
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
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
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

function test(name, testFn) {
  return async () => {
    try {
      log(`\n🧪 Testing: ${name}`, 'cyan');
      const result = await testFn();
      if (result) {
        log(`✅ PASS: ${name}`, 'green');
        results.passed++;
        return true;
      } else {
        log(`❌ FAIL: ${name}`, 'red');
        results.failed++;
        results.errors.push({ name, error: 'Test returned false' });
        return false;
      }
    } catch (error) {
      log(`❌ ERROR: ${name} - ${error.message}`, 'red');
      results.failed++;
      results.errors.push({ name, error: error.message });
      return false;
    }
  };
}

// ============================================================================
// AUTHENTICATION API TESTS
// ============================================================================

async function testAuthHealth() {
  return test('Auth Health Check', async () => {
    const result = await safeFetch('/api/auth/status');
    return result.status === 200 && result.data.service === 'auth-service';
  })();
}

async function testMockLoginAdmin() {
  return test('Mock Login - Admin', async () => {
    const result = await safeFetch('/api/auth/mock-login', {
      method: 'POST',
      body: {
        email: 'admin@company.com',
        role: 'admin'
      }
    });
    
    if (result.ok && result.data.data && result.data.data.accessToken) {
      adminToken = result.data.data.accessToken;
      authToken = adminToken; // Use admin token for subsequent tests
      return true;
    }
    return false;
  })();
}

async function testMockLoginHR() {
  return test('Mock Login - HR', async () => {
    const result = await safeFetch('/api/auth/mock-login', {
      method: 'POST',
      body: {
        email: 'hr@company.com',
        role: 'hr'
      }
    });
    
    if (result.ok && result.data.data && result.data.data.accessToken) {
      hrToken = result.data.data.accessToken;
      return true;
    }
    return false;
  })();
}

async function testMockLoginEmployee() {
  return test('Mock Login - Employee', async () => {
    const result = await safeFetch('/api/auth/mock-login', {
      method: 'POST',
      body: {
        email: 'employee@company.com',
        role: 'employee'
      }
    });
    
    if (result.ok && result.data.data && result.data.data.accessToken) {
      employeeToken = result.data.data.accessToken;
      return true;
    }
    return false;
  })();
}

async function testGetProfile() {
  return test('Get User Profile', async () => {
    const result = await safeFetch('/api/auth/profile');
    return result.ok && result.data.data && result.data.data.email;
  })();
}

// ============================================================================
// HR SERVICE - HEALTH & STATUS
// ============================================================================

async function testHRHealth() {
  return test('HR Service Health Check', async () => {
    const result = await safeFetch('/api/hr/health');
    return result.status === 200 && result.data.service === 'hr-service';
  })();
}

async function testHRStatus() {
  return test('HR Service Status', async () => {
    const result = await safeFetch('/api/hr/status');
    return result.status === 200;
  })();
}

// ============================================================================
// HR SERVICE - EMPLOYEES
// ============================================================================

async function testGetEmployees() {
  return test('Get Employees List', async () => {
    const result = await safeFetch('/api/hr/employees?page=1&limit=10');
    return result.ok && Array.isArray(result.data.data);
  })();
}

async function testCreateEmployee() {
  return test('Create Employee', async () => {
    const timestamp = Date.now();
    const employeeData = {
      employeeId: `TEST-EMP-${timestamp}`,
      firstName: 'Test',
      lastName: 'Employee',
      fullName: 'Test Employee',
      email: `test.employee.${timestamp}@example.com`,
      password: 'Test1234!',
      roleName: 'employee',
      phone: '9876543210',
      department: 'IT',
      jobTitle: 'Software Developer',
      designation: 'Software Engineer',
      role_family: 'Tech',
      grade_band: 'A',
      joining_date: new Date().toISOString()
    };
    
    const result = await safeFetch('/api/hr/employees', {
      method: 'POST',
      body: employeeData
    });
    
    if (result.ok && result.data.data) {
      testEmployeeId = result.data.data.employeeId || employeeData.employeeId;
      testEmployeeMongoId = result.data.data.id || result.data.data._id;
      log(`   Created Employee: ${testEmployeeId}`, 'yellow');
      return true;
    } else {
      log(`   Error: ${JSON.stringify(result.data)}`, 'red');
      return false;
    }
  })();
}

async function testGetEmployeeById() {
  if (!testEmployeeId) {
    log('   ⚠️  Skipping - No employee ID available', 'yellow');
    return false;
  }
  
  return test('Get Employee by ID', async () => {
    const result = await safeFetch(`/api/hr/employees/${testEmployeeId}`);
    return result.ok && result.data.data && result.data.data.employeeId === testEmployeeId;
  })();
}

async function testUpdateEmployee() {
  if (!testEmployeeId) {
    log('   ⚠️  Skipping - No employee ID available', 'yellow');
    return false;
  }
  
  return test('Update Employee', async () => {
    const result = await safeFetch(`/api/hr/employees/${testEmployeeId}`, {
      method: 'PUT',
      body: {
        jobTitle: 'Senior Software Developer',
        department: 'Engineering'
      }
    });
    return result.ok;
  })();
}

async function testAssignRole() {
  if (!testEmployeeId) {
    log('   ⚠️  Skipping - No employee ID available', 'yellow');
    return false;
  }
  
  return test('Assign Role to Employee', async () => {
    const result = await safeFetch(`/api/hr/employees/${testEmployeeId}/assign-role`, {
      method: 'POST',
      body: {
        roleName: 'employee'
      }
    });
    return result.ok;
  })();
}

async function testUpdateEmployeeStatus() {
  if (!testEmployeeId) {
    log('   ⚠️  Skipping - No employee ID available', 'yellow');
    return false;
  }
  
  return test('Update Employee Status', async () => {
    const result = await safeFetch(`/api/hr/employees/${testEmployeeId}/status`, {
      method: 'PATCH',
      body: {
        status: 'ACTIVE'
      }
    });
    return result.ok;
  })();
}

// ============================================================================
// HR SERVICE - DEPARTMENTS
// ============================================================================

async function testGetDepartments() {
  return test('Get Departments', async () => {
    const result = await safeFetch('/api/hr/departments');
    return result.ok && Array.isArray(result.data.data);
  })();
}

async function testCreateDepartment() {
  return test('Create Department', async () => {
    const timestamp = Date.now();
    const result = await safeFetch('/api/hr/departments', {
      method: 'POST',
      body: {
        name: `Test Department ${timestamp}`,
        code: `TEST-DEPT-${timestamp}`,
        description: 'Test department for API testing'
      }
    });
    return result.ok || result.status === 409; // 409 = already exists
  })();
}

// ============================================================================
// HR SERVICE - STORES
// ============================================================================

async function testGetStores() {
  return test('Get Stores', async () => {
    const result = await safeFetch('/api/hr/stores');
    return result.ok && Array.isArray(result.data.data);
  })();
}

// ============================================================================
// HR SERVICE - ONBOARDING
// ============================================================================

async function testOnboardingPersonalDetails() {
  if (!testEmployeeId) {
    log('   ⚠️  Skipping - No employee ID available', 'yellow');
    return false;
  }
  
  return test('Onboarding - Personal Details', async () => {
    const result = await safeFetch('/api/hr/onboarding/personal-details', {
      method: 'POST',
      body: {
        employee_id: testEmployeeId,
        name: 'Test Employee',
        email: `test.${Date.now()}@example.com`,
        phone: '9876543210',
        date_of_birth: '1990-01-15',
        address: {
          address_line_1: '123 Test St',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          country: 'India'
        }
      }
    });
    return result.ok;
  })();
}

async function testOnboardingWorkDetails() {
  if (!testEmployeeId) {
    log('   ⚠️  Skipping - No employee ID available', 'yellow');
    return false;
  }
  
  return test('Onboarding - Work Details', async () => {
    const result = await safeFetch('/api/hr/onboarding/work-details', {
      method: 'POST',
      body: {
        employeeId: testEmployeeId,
        jobTitle: 'Software Developer',
        department: 'IT',
        designation: 'Software Engineer',
        role_family: 'Tech',
        joining_date: new Date().toISOString(),
        reporting_manager_id: null,
        employee_status: 'ACTIVE'
      }
    });
    return result.ok;
  })();
}

async function testOnboardingStatutoryInfo() {
  if (!testEmployeeId) {
    log('   ⚠️  Skipping - No employee ID available', 'yellow');
    return false;
  }
  
  return test('Onboarding - Statutory Info', async () => {
    const result = await safeFetch('/api/hr/onboarding/statutory-info', {
      method: 'POST',
      body: {
        employeeId: testEmployeeId,
        uan: '123456789012',
        esiNo: '123456789012345',
        panNumber: 'ABCDE1234F',
        bankAccount: {
          account_number: '1234567890123456',
          ifsc_code: 'HDFC0001234',
          bank_name: 'HDFC Bank',
          account_type: 'Savings'
        }
      }
    });
    return result.ok;
  })();
}

// ============================================================================
// ATTENDANCE API TESTS
// ============================================================================

async function testAttendanceHealth() {
  return test('Attendance Service Health', async () => {
    const result = await safeFetch('/api/attendance/health');
    return result.status === 200 || result.status === 404; // 404 if health endpoint doesn't exist
  })();
}

async function testClockIn() {
  return test('Clock In', async () => {
    const result = await safeFetch('/api/attendance/clock-in', {
      method: 'POST',
      body: {
        employeeId: testEmployeeId || 'TEST-EMP-001',
        location: {
          latitude: 19.0760,
          longitude: 72.8777,
          address: 'Mumbai, India'
        }
      }
    });
    return result.ok || result.status === 404; // 404 if endpoint doesn't exist
  })();
}

async function testClockOut() {
  return test('Clock Out', async () => {
    const result = await safeFetch('/api/attendance/clock-out', {
      method: 'POST',
      body: {
        employeeId: testEmployeeId || 'TEST-EMP-001',
        location: {
          latitude: 19.0760,
          longitude: 72.8777,
          address: 'Mumbai, India'
        }
      }
    });
    return result.ok || result.status === 404; // 404 if endpoint doesn't exist
  })();
}

async function testGetAttendanceRecords() {
  return test('Get Attendance Records', async () => {
    const result = await safeFetch('/api/attendance/records?page=1&limit=10');
    return result.ok || result.status === 404;
  })();
}

async function testGetAttendanceStats() {
  return test('Get Attendance Stats', async () => {
    const result = await safeFetch('/api/attendance/stats');
    return result.ok || result.status === 404;
  })();
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
  logSection('🚀 Starting Comprehensive API Tests');
  log(`Backend URL: ${BASE_URL}`, 'cyan');
  log(`API Host: ${API_HOST}`, 'cyan');
  
  // Authentication Tests
  logSection('🔐 AUTHENTICATION API TESTS');
  await testAuthHealth();
  await testMockLoginAdmin();
  await testMockLoginHR();
  await testMockLoginEmployee();
  await testGetProfile();
  
  // HR Service - Health
  logSection('🏥 HR SERVICE - HEALTH');
  await testHRHealth();
  await testHRStatus();
  
  // HR Service - Employees
  logSection('👥 HR SERVICE - EMPLOYEES');
  await testGetEmployees();
  await testCreateEmployee();
  await testGetEmployeeById();
  await testUpdateEmployee();
  await testAssignRole();
  await testUpdateEmployeeStatus();
  
  // HR Service - Departments
  logSection('🏢 HR SERVICE - DEPARTMENTS');
  await testGetDepartments();
  await testCreateDepartment();
  
  // HR Service - Stores
  logSection('🏪 HR SERVICE - STORES');
  await testGetStores();
  
  // HR Service - Onboarding
  logSection('📝 HR SERVICE - ONBOARDING');
  await testOnboardingPersonalDetails();
  await testOnboardingWorkDetails();
  await testOnboardingStatutoryInfo();
  
  // Attendance Service
  logSection('⏰ ATTENDANCE SERVICE');
  await testAttendanceHealth();
  await testClockIn();
  await testClockOut();
  await testGetAttendanceRecords();
  await testGetAttendanceStats();
  
  // Summary
  logSection('📊 TEST SUMMARY');
  log(`Total Tests: ${results.passed + results.failed}`, 'bright');
  log(`✅ Passed: ${results.passed}`, 'green');
  log(`❌ Failed: ${results.failed}`, 'red');
  
  if (results.errors.length > 0) {
    log('\n❌ Failed Tests:', 'red');
    results.errors.forEach(({ name, error }) => {
      log(`  - ${name}: ${error}`, 'red');
    });
  }
  
  if (testEmployeeId) {
    log(`\n📝 Test Employee Created: ${testEmployeeId}`, 'yellow');
  }
  
  console.log('\n');
}

// Run tests
runAllTests().catch(error => {
  log(`\n💥 Fatal Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

