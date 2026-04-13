#!/usr/bin/env node

/**
 * Complete Production Flow Test for Eyekra Tenant
 * 
 * Tests the entire flow:
 * 1. Admin login with temporary password
 * 2. Change admin password
 * 3. Admin login with new password
 * 4. Create Store
 * 5. Create Department
 * 6. Create Employee
 * 7. Employee Login
 * 8. Employee Clock-In (Attendance)
 * 9. Sales Entry
 * 10. Dashboard Flow (Get stats, employees, etc.)
 * 
 * Usage:
 *   BASE_URL="http://..." node scripts/test-eyekra-complete-flow.js
 *   EYEKRA_ADMIN_PASSWORD="<password>" node scripts/test-eyekra-complete-flow.js
 * 
 * Note: Admin email is contact@eyekra.com (tenant email)
 *       Password is auto-generated temporary password from tenant creation
 */

const BASE_URL = process.env.BACKEND_URL || process.env.BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com';
const API_BASE = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

const TENANT_ID = 'eyekra';

// Admin credentials - can be provided via env vars or will try common patterns
const ADMIN_EMAIL = process.env.EYEKRA_ADMIN_EMAIL || 'admin@eyekra.com'; // ✅ Verified working email
// Try new password first (if changed), then old password
const ADMIN_TEMP_PASSWORD = process.env.EYEKRA_ADMIN_PASSWORD || process.env.EYEKRA_NEW_PASSWORD || 'Eyekra@Admin2026!'; // New password (if changed)
const OLD_PASSWORD = 'cnbxs2b9A1!'; // Old password (fallback)
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'admin@upcapto.com';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'Upcapto@2026';

// Test data
const NEW_ADMIN_PASSWORD = process.env.EYEKRA_NEW_PASSWORD || 'Eyekra@Admin2026!';
const STORE_DATA = {
  name: 'Eyekra Main Store',
  code: 'EYE001',
  storeCode: 'EYE001',
  address: {
    street: '123 Eyekra Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    zip: '400001',
    country: 'India'
  },
  coordinates: {
    latitude: 19.0760,
    longitude: 72.8777
  },
  radius: 100,
  geofenceRadius: 100,
  phone: '+91-9876543210',
  email: 'store@eyekra.com',
  status: 'active'
};

const DEPARTMENT_DATA = {
  name: 'Sales',
  code: 'SALES',
  description: 'Sales Department',
  status: 'active'
};

// Employee data - will be populated with dynamic values
function getEmployeeData(storeId, departmentId) {
  const timestamp = Date.now();
  return {
    firstName: 'Test',
    lastName: 'Employee',
    fullName: 'Test Employee',
    email: `employee.${timestamp}@eyekra.com`,
    phone: '+91-9876543210',
    password: 'Employee@123!',
    employeeId: `EMP-${timestamp}`,
    employee_id: `EMP-${timestamp}`,
    department: 'SALES', // Must be uppercase enum
    designation: 'Sales Executive',
    roleName: 'employee', // Use roleName for employee creation
    status: 'active',
    joining_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    doj: new Date().toISOString().split('T')[0], // Also send doj (backend expects this)
    store: storeId,
    department: departmentId, // Department ID reference
    band_level: 'F',
    hierarchy_level: 'STORE'
  };
}

const SALES_DATA = {
  customer_name: 'Walk-in Customer',
  customer_phone: '+91-9876543210',
  items: [{
    product_name: 'Test Product',
    quantity: 2,
    unit_price: 500,
    discount_percentage: 10,
    tax_rate: 18
  }],
  payment_method: 'CASH',
  payment_status: 'PAID',
  notes: 'Test sales entry from complete flow'
};

// Statistics
const results = {
  steps: [],
  startTime: null,
  endTime: null
};

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(stepNum, stepName, status, details = '') {
  const statusIcon = status === 'success' ? '✅' : status === 'warning' ? '⚠️' : '❌';
  const statusColor = status === 'success' ? 'green' : status === 'warning' ? 'yellow' : 'red';
  log(`\n${stepNum}. ${stepName} ${statusIcon}`, statusColor);
  if (details) {
    log(`   ${details}`, 'cyan');
  }
  results.steps.push({ step: stepNum, name: stepName, status, details });
}

async function fetchResp(url, options = {}) {
  try {
    const res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...options.headers },
      timeout: 30000,
    });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { _raw: text.slice(0, 500) };
    }
    return { ok: res.ok, status: res.status, data, text: text.substring(0, 300) };
  } catch (error) {
    return { ok: false, status: 0, data: { error: error.message }, text: '' };
  }
}

function authHeaders(token, tenantId) {
  // CRITICAL: Normalize tenantId to lowercase (backend expects lowercase)
  // Also extract from JWT token to ensure exact match
  let normalizedTenantId = String(tenantId).toLowerCase().trim();
  
  // Double-check by extracting from JWT token
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token);
    if (decoded?.tenantId) {
      const jwtTenantId = String(decoded.tenantId).toLowerCase().trim();
      if (jwtTenantId !== normalizedTenantId) {
        // Use JWT tenantId (it's the source of truth)
        normalizedTenantId = jwtTenantId;
      }
    }
  } catch (e) {
    // Ignore JWT decode errors
  }
  
  // FIXED: Use ONLY lowercase header (backend is case-sensitive)
  return {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': normalizedTenantId, // Only lowercase - this fixed the 403 error!
    'Content-Type': 'application/json',
  };
}

// Step 1: Admin login with temporary password (direct)
async function adminLoginWithTempPassword() {
  logStep(1, 'Admin Login (Temporary Password)', 'in_progress');
  
  // Try known working credentials first (verified: admin@eyekra.com works!)
  const emailPatterns = [
    ADMIN_EMAIL, // ✅ Verified: admin@eyekra.com works
    'admin@eyekra.com', // Explicit fallback
  ];
  
  // Try new password first (if changed), then old password
  const passwordPatterns = [
    ADMIN_TEMP_PASSWORD, // New password (Eyekra@Admin2026!) or env var
    OLD_PASSWORD, // Old password (cnbxs2b9A1!) as fallback
    'Eyekra@Admin2026!', // Explicit new password
    'cnbxs2b9A1!', // Explicit old password
  ];
  
  let lastError = null;
  for (const email of emailPatterns) {
    for (const password of passwordPatterns) {
      const loginRes = await fetchResp(`${API_BASE}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      
      // Check for success - response can have accessToken at different levels
      const accessToken = loginRes.data?.accessToken || loginRes.data?.data?.accessToken || loginRes.data?.token;
      const user = loginRes.data?.user || loginRes.data?.data?.user;
      
      if (loginRes.ok && accessToken) {
        const mustChangePassword = loginRes.data?.mustChangePassword || loginRes.data?.data?.mustChangePassword || user?.mustChangePassword;
        
        // Extract tenantId from JWT token (most reliable)
        let tenantId = user?.tenantId || user?.tenant_id || TENANT_ID;
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.decode(accessToken);
          if (decoded?.tenantId) {
            tenantId = decoded.tenantId;
          }
        } catch (e) {
          // Ignore JWT decode errors
        }
        
        // Normalize tenantId to lowercase
        tenantId = String(tenantId).toLowerCase().trim();
        
        logStep(1, 'Admin Login (Temporary Password)', 'success', `Email: ${email}, Tenant: ${tenantId}, Must change: ${mustChangePassword}`);
        return { token: accessToken, userId: user?._id || user?.id, mustChangePassword, email, password, tenantId };
      } else {
        // Store error for debugging
        const errorMsg = loginRes.data?.message || loginRes.data?.error || loginRes.data?.data?.message || 'Unknown error';
        lastError = { email, status: loginRes.status, error: errorMsg, fullResponse: loginRes.data };
      }
    }
  }
  
  const errorMsg = lastError?.error?.message || lastError?.error || 'Invalid credentials';
  logStep(1, 'Admin Login (Temporary Password)', 'failed', `Last attempt: ${lastError?.email} - Status: ${lastError?.status} - ${errorMsg}`);
  log('\n💡 To provide password:', 'yellow');
  log('   EYEKRA_ADMIN_PASSWORD="<password>" node scripts/test-eyekra-complete-flow.js', 'cyan');
  log('   Admin Email: contact@eyekra.com', 'cyan');
  return null;
}


// Step 2: Change admin password
async function changeAdminPassword(token, userId, tenantId, currentPassword, newPassword) {
  logStep(2, 'Change Admin Password', 'in_progress');
  
  const changeRes = await fetchResp(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: authHeaders(token, tenantId),
    body: JSON.stringify({
      currentPassword: currentPassword,
      newPassword: newPassword
    }),
  });
  
  if (!changeRes.ok) {
    logStep(2, 'Change Admin Password', 'warning', `Status: ${changeRes.status} - ${changeRes.data.message || changeRes.data.error}`);
    return false;
  }
  
  logStep(2, 'Change Admin Password', 'success', 'Password changed successfully');
  return true;
}

// Step 3: Admin login with new password
async function adminLoginWithNewPassword(email, newPassword, tenantId) {
  logStep(3, 'Admin Login (New Password)', 'in_progress');
  
  const loginRes = await fetchResp(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password: newPassword }),
  });
  
  if (!loginRes.ok) {
    logStep(3, 'Admin Login (New Password)', 'failed', `Status: ${loginRes.status}`);
    return null;
  }
  
  const token = loginRes.data.accessToken || loginRes.data.data?.accessToken;
  const user = loginRes.data.user || loginRes.data.data?.user;
  
  // Extract tenantId from JWT token (most reliable)
  let extractedTenantId = user?.tenantId || user?.tenant_id || TENANT_ID;
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token);
    if (decoded?.tenantId) {
      extractedTenantId = decoded.tenantId;
    }
  } catch (e) {
    // Ignore JWT decode errors
  }
  
  // Normalize tenantId to lowercase
  extractedTenantId = String(extractedTenantId).toLowerCase().trim();
  
  logStep(3, 'Admin Login (New Password)', 'success', `Logged in as: ${user?.name || user?.email}, Tenant: ${extractedTenantId}`);
  return { token, userId: user?._id || user?.id, tenantId: extractedTenantId };
}

// Step 5: Create Store
async function createStore(token, tenantId) {
  logStep(4, 'Create Store', 'in_progress');
  
  // CRITICAL: Extract tenantId from JWT token (must match exactly what backend expects)
  let jwtTenantId = tenantId;
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token);
    if (decoded?.tenantId) {
      jwtTenantId = String(decoded.tenantId).toLowerCase().trim();
      // Always use JWT tenantId (it's the source of truth)
      if (jwtTenantId !== tenantId.toLowerCase().trim()) {
        log(`   ⚠️  TenantId mismatch: JWT has '${jwtTenantId}', param was '${tenantId}'`, 'yellow');
      }
      tenantId = jwtTenantId; // Use JWT tenantId (normalized)
      log(`   🔍 Using tenantId from JWT: '${tenantId}'`, 'cyan');
      log(`   🔍 Token payload: ${JSON.stringify({ userId: decoded.userId, email: decoded.email, role: decoded.role, tenantId: decoded.tenantId })}`, 'cyan');
    } else {
      log(`   ⚠️  JWT token missing tenantId claim!`, 'yellow');
      log(`   🔍 Token payload keys: ${Object.keys(decoded || {}).join(', ')}`, 'yellow');
    }
  } catch (e) {
    log(`   ⚠️  Failed to decode JWT: ${e.message}`, 'yellow');
  }
  
  // Build headers - try with ONLY lowercase header (backend might be case-sensitive)
  const headers1 = {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': tenantId, // Only lowercase
    'Content-Type': 'application/json',
  };
  
  // Also try with both cases
  const headers2 = {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': tenantId,
    'X-Tenant-Id': tenantId,
    'Content-Type': 'application/json',
  };
  
  log(`   🔍 Trying with lowercase header only: x-tenant-id='${tenantId}'`, 'cyan');
  
  let storeRes = await fetchResp(`${BASE_URL}/api/hr/stores`, {
    method: 'POST',
    headers: headers1,
    body: JSON.stringify(STORE_DATA),
  });
  
  // If that fails with 403, try with both header cases
  if (!storeRes.ok && storeRes.status === 403) {
    log(`   🔍 Retrying with both header cases...`, 'cyan');
    storeRes = await fetchResp(`${BASE_URL}/api/hr/stores`, {
      method: 'POST',
      headers: headers2,
      body: JSON.stringify(STORE_DATA),
    });
  }
  
  if (!storeRes.ok) {
    if (storeRes.status === 409) {
      logStep(4, 'Create Store', 'warning', 'Store already exists, fetching existing store');
      // Try to get existing store
      const getRes = await fetchResp(`${BASE_URL}/api/hr/stores?code=${STORE_DATA.code}`, {
        method: 'GET',
        headers: authHeaders(token, tenantId),
      });
      if (getRes.ok) {
        const stores = getRes.data.data || getRes.data.stores || getRes.data;
        const storeList = Array.isArray(stores) ? stores : (stores.data || []);
        const store = storeList.find(s => s.code === STORE_DATA.code) || storeList[0];
        if (store) {
          return { id: store._id || store.id, code: store.code };
        }
      }
    }
    const errorMsg = storeRes.data?.message || storeRes.data?.error || JSON.stringify(storeRes.data).substring(0, 200);
    logStep(4, 'Create Store', 'failed', `Status: ${storeRes.status} - ${errorMsg}`);
    return null;
  }
  
  const store = storeRes.data.data || storeRes.data;
  logStep(4, 'Create Store', 'success', `Store: ${store.name} (${store.code})`);
  return { id: store._id || store.id, code: store.code };
}

// Step 5: Create Department
async function createDepartment(token, tenantId) {
  logStep(5, 'Create Department', 'in_progress');
  
  const deptRes = await fetchResp(`${BASE_URL}/api/hr/departments`, {
    method: 'POST',
    headers: authHeaders(token, tenantId),
    body: JSON.stringify(DEPARTMENT_DATA),
  });
  
  if (!deptRes.ok) {
    if (deptRes.status === 409) {
      logStep(5, 'Create Department', 'warning', 'Department already exists, fetching existing');
      const getRes = await fetchResp(`${BASE_URL}/api/hr/departments?code=${DEPARTMENT_DATA.code}`, {
        method: 'GET',
        headers: authHeaders(token, tenantId),
      });
      if (getRes.ok) {
        const depts = getRes.data.data || getRes.data.departments || getRes.data;
        const deptList = Array.isArray(depts) ? depts : (depts.data || []);
        const dept = deptList.find(d => d.code === DEPARTMENT_DATA.code) || deptList[0];
        if (dept) {
          return { id: dept._id || dept.id, code: dept.code };
        }
      }
    }
    logStep(5, 'Create Department', 'failed', `Status: ${deptRes.status}`);
    return null;
  }
  
  const dept = deptRes.data.data || deptRes.data;
  logStep(5, 'Create Department', 'success', `Department: ${dept.name} (${dept.code})`);
  return { id: dept._id || dept.id, code: dept.code };
}

// Step 6: Create Employee
async function createEmployee(token, tenantId, storeId, departmentId) {
  logStep(6, 'Create Employee', 'in_progress');
  
  const employeeData = getEmployeeData(storeId, departmentId);
  
  const empRes = await fetchResp(`${BASE_URL}/api/hr/employees`, {
    method: 'POST',
    headers: authHeaders(token, tenantId),
    body: JSON.stringify(employeeData),
  });
  
  if (!empRes.ok) {
    const errorDetails = empRes.data?.errors || empRes.data?.message || empRes.data?.error || JSON.stringify(empRes.data).substring(0, 300);
    logStep(6, 'Create Employee', 'failed', `Status: ${empRes.status} - ${errorDetails}`);
    return null;
  }
  
  const employee = empRes.data.data || empRes.data;
  const employeeId = employee._id || employee.id;
  logStep(6, 'Create Employee', 'success', `Employee: ${employee.fullName || employee.name} (${employee.employeeId || employee.employee_id})`);
  return { id: employeeId, employeeId: employee.employeeId || employee.employee_id, email: employee.email };
}

// Step 7: Employee Login
async function employeeLogin(employeeEmail, employeePassword, tenantId) {
  logStep(7, 'Employee Login', 'in_progress');
  
  const loginRes = await fetchResp(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: employeeEmail, password: employeePassword }),
  });
  
  if (!loginRes.ok) {
    const errorMsg = loginRes.data?.message || loginRes.data?.error || JSON.stringify(loginRes.data).substring(0, 200);
    logStep(7, 'Employee Login', 'failed', `Status: ${loginRes.status} - ${errorMsg}`);
    return null;
  }
  
  const token = loginRes.data.accessToken || loginRes.data.data?.accessToken;
  const user = loginRes.data.user || loginRes.data.data?.user;
  
  // CRITICAL: Extract tenantId from token (same as admin login)
  let finalTenantId = tenantId;
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token);
    if (decoded?.tenantId) {
      finalTenantId = String(decoded.tenantId).toLowerCase().trim();
      log(`   ✅ Verified tenantId in employee token: '${finalTenantId}'`, 'green');
    } else {
      log(`   ⚠️  Employee token missing tenantId, using provided: '${tenantId}'`, 'yellow');
    }
  } catch (e) {
    log(`   ⚠️  Failed to verify employee token: ${e.message}`, 'yellow');
  }
  
  logStep(7, 'Employee Login', 'success', `Logged in as: ${user?.name || user?.email}`);
  return { token, userId: user?._id || user?.id, tenantId: finalTenantId };
}

// Step 8: Employee Clock-In (Attendance)
async function employeeClockIn(token, tenantId, storeId) {
  logStep(8, 'Employee Clock-In', 'in_progress');
  
  // CRITICAL: Verify token before using
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token);
    log(`   🔍 Token info: userId=${decoded?.userId}, role=${decoded?.role}, tenantId=${decoded?.tenantId}`, 'cyan');
  } catch (e) {
    log(`   ⚠️  Failed to decode token: ${e.message}`, 'yellow');
  }
  
  const clockInData = {
    latitude: 19.0760,
    longitude: 72.8777,
    timestamp: Date.now(),
    notes: 'Clock-in from complete flow test',
    store_id: storeId
  };
  
  // Build headers - ensure token is properly formatted
  const headers = {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': tenantId,
    'Content-Type': 'application/json',
  };
  
  log(`   🔍 Clock-in request: ${BASE_URL}/api/attendance/clock-in`, 'cyan');
  log(`   🔍 Headers: Authorization=Bearer ${token.substring(0, 20)}..., x-tenant-id=${tenantId}`, 'cyan');
  
  const clockInRes = await fetchResp(`${BASE_URL}/api/attendance/clock-in`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(clockInData),
  });
  
  if (!clockInRes.ok) {
    const errorMsg = clockInRes.data?.message || clockInRes.data?.error || JSON.stringify(clockInRes.data).substring(0, 200);
    if (errorMsg.includes('already clocked') || errorMsg.includes('Already clocked')) {
      logStep(8, 'Employee Clock-In', 'warning', 'Already clocked in (continuing)');
      return true;
    }
    logStep(8, 'Employee Clock-In', 'failed', `Status: ${clockInRes.status} - ${errorMsg}`);
    return false;
  }
  
  const attendance = clockInRes.data.data || clockInRes.data;
  logStep(8, 'Employee Clock-In', 'success', `Clock-in time: ${attendance.checkIn?.time || attendance.check_in_time}`);
  return true;
}

// Step 9: Sales Entry
async function createSalesEntry(token, tenantId, storeId) {
  logStep(9, 'Create Sales Entry', 'in_progress');
  
  const salesData = {
    ...SALES_DATA,
    store_id: storeId,
  };
  
  // Try multiple sales endpoints
  const salesEndpoints = [
    `${BASE_URL}/api/sales/daily-entry`,
    `${BASE_URL}/api/sales/manual-entry`,
    `${BASE_URL}/api/sales/orders`,
  ];
  
  let salesRes = null;
  let lastError = null;
  
  for (const endpoint of salesEndpoints) {
    log(`   🔍 Trying sales endpoint: ${endpoint}`, 'cyan');
    salesRes = await fetchResp(endpoint, {
      method: 'POST',
      headers: authHeaders(token, tenantId),
      body: JSON.stringify(salesData),
    });
    
    if (salesRes.ok) {
      log(`   ✅ Success with endpoint: ${endpoint}`, 'green');
      break;
    } else if (salesRes.status !== 404) {
      lastError = { endpoint, status: salesRes.status, error: salesRes.data };
      // If it's not 404, it might be the right endpoint but with an error
      if (salesRes.status === 401 || salesRes.status === 403) {
        // Auth error - might be the right endpoint
        break;
      }
    }
  }
  
  if (!salesRes && lastError) {
    salesRes = { ok: false, status: lastError.status, data: lastError.error };
  } else if (!salesRes) {
    salesRes = { ok: false, status: 404, data: { error: 'No sales endpoint found' } };
  }
  
  if (!salesRes.ok) {
    logStep(9, 'Create Sales Entry', 'failed', `Status: ${salesRes.status} - ${salesRes.data.message || salesRes.data.error}`);
    return false;
  }
  
  const sale = salesRes.data.data || salesRes.data;
  const totalAmount = sale.total_amount || sale.totalAmount || sale.amount;
  logStep(9, 'Create Sales Entry', 'success', `Sales Amount: ₹${totalAmount || 'N/A'}`);
  return true;
}

// Step 10: Dashboard Flow
async function testDashboardFlow(adminToken, tenantId) {
  logStep(10, 'Dashboard Flow', 'in_progress');
  
  const dashboardEndpoints = [
    { name: 'Dashboard Stats', path: '/api/hr/dashboard/stats' },
    { name: 'Employees List', path: '/api/hr/employees?limit=10' },
    { name: 'Stores List', path: '/api/hr/stores' },
    { name: 'Departments List', path: '/api/hr/departments' },
    { name: 'Attendance Today', path: '/api/attendance/today' },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const endpoint of dashboardEndpoints) {
    const res = await fetchResp(`${BASE_URL}${endpoint.path}`, {
      method: 'GET',
      headers: authHeaders(adminToken, tenantId),
    });
    
    if (res.ok) {
      passed++;
    } else {
      failed++;
    }
  }
  
  if (passed === dashboardEndpoints.length) {
    logStep(10, 'Dashboard Flow', 'success', `All ${passed} endpoints working`);
  } else {
    logStep(10, 'Dashboard Flow', 'warning', `${passed}/${dashboardEndpoints.length} endpoints working`);
  }
  
  return { passed, total: dashboardEndpoints.length };
}

// Main flow
async function main() {
  results.startTime = Date.now();
  
  log('\n🚀 Complete Production Flow Test - Eyekra Tenant', 'bright');
  log('=====================================', 'bright');
  log(`Base URL: ${BASE_URL}`, 'cyan');
  log(`Tenant: ${TENANT_ID}`, 'cyan');
  log(`Admin Email: ${ADMIN_EMAIL}`, 'cyan');
  if (!process.env.EYEKRA_ADMIN_PASSWORD) {
    log('⚠️  Password: Not provided (will try common patterns)', 'yellow');
    log('💡 Set EYEKRA_ADMIN_PASSWORD env var for better results', 'yellow');
  } else {
    log('✅ Password: Provided via env var', 'green');
  }
  log('=====================================\n', 'bright');
  
  try {
    // Step 1: Admin login with temp password
    const tempLogin = await adminLoginWithTempPassword();
    if (!tempLogin) {
      log('\n❌ Cannot proceed without admin login', 'red');
      log('💡 Try setting EYEKRA_ADMIN_EMAIL and EYEKRA_ADMIN_PASSWORD env vars', 'yellow');
      process.exit(1);
    }
    
    // Step 2: Change password (force change as per flow requirement)
    const passwordChanged = await changeAdminPassword(tempLogin.token, tempLogin.userId, tempLogin.tenantId, tempLogin.password, NEW_ADMIN_PASSWORD);
    
    if (passwordChanged) {
      // Wait a bit for password change to propagate
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Step 3: Admin login with new password
      const adminLogin = await adminLoginWithNewPassword(tempLogin.email, NEW_ADMIN_PASSWORD, tempLogin.tenantId);
      if (!adminLogin) {
        log('\n❌ Cannot proceed without admin login with new password', 'red');
        process.exit(1);
      }
      
      // CRITICAL: Verify token has tenantId and extract it
      let finalTenantId = adminLogin.tenantId;
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(adminLogin.token);
        if (decoded?.tenantId) {
          finalTenantId = String(decoded.tenantId).toLowerCase().trim();
          log(`   ✅ Verified tenantId in new token: '${finalTenantId}'`, 'green');
        } else {
          log(`   ⚠️  WARNING: New token missing tenantId!`, 'yellow');
        }
      } catch (e) {
        log(`   ⚠️  Failed to verify token: ${e.message}`, 'yellow');
      }
      
      var adminLoginResult = { 
        token: adminLogin.token, 
        userId: adminLogin.userId, 
        tenantId: finalTenantId 
      };
    } else {
      // If password change failed, try to continue with old password
      log('\n⚠️  Password change failed, trying to continue with existing token...', 'yellow');
      var adminLoginResult = { token: tempLogin.token, userId: tempLogin.userId, tenantId: tempLogin.tenantId };
    }
    
    // Step 4: Create Store
    const store = await createStore(adminLoginResult.token, adminLoginResult.tenantId);
    if (!store) {
      log('\n❌ Cannot proceed without store', 'red');
      process.exit(1);
    }
    
    // Step 5: Create Department
    const department = await createDepartment(adminLoginResult.token, adminLoginResult.tenantId);
    if (!department) {
      log('\n❌ Cannot proceed without department', 'red');
      process.exit(1);
    }
    
    // Step 6: Create Employee
    const employee = await createEmployee(adminLoginResult.token, adminLoginResult.tenantId, store.id, department.id);
    if (!employee) {
      log('\n❌ Cannot proceed without employee', 'red');
      process.exit(1);
    }
    
    // CRITICAL: Wait for employee to be synced across services
    log('\n⏳ Waiting for employee sync across services...', 'cyan');
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay for HR service sync
    
    // Verify employee exists in HR service
    log('   🔍 Verifying employee in HR service...', 'cyan');
    try {
      const verifyRes = await fetchResp(`${API_BASE}/hr/employees/${employee.id}`, {
        method: 'GET',
        headers: authHeaders(adminLoginResult.token, adminLoginResult.tenantId),
      });
      if (verifyRes.ok) {
        log(`   ✅ Employee verified in HR service: ${employee.employeeId}`, 'green');
      } else {
        log(`   ⚠️  Employee verification returned: ${verifyRes.status}`, 'yellow');
      }
    } catch (e) {
      log(`   ⚠️  Employee verification failed: ${e.message}`, 'yellow');
    }
    
    // Step 7: Employee Login
    const empLogin = await employeeLogin(employee.email, 'Employee@123!', adminLoginResult.tenantId);
    if (!empLogin) {
      log('\n⚠️  Employee login failed - this might be a backend issue with user record creation', 'yellow');
      log('   Continuing with admin token for remaining steps...', 'yellow');
      // Use admin token for remaining steps if employee login fails
      var empLoginResult = { token: adminLoginResult.token, tenantId: adminLoginResult.tenantId };
    } else {
      var empLoginResult = empLogin;
    }
    
    // Step 8: Employee Clock-In
    await employeeClockIn(empLoginResult.token, empLoginResult.tenantId, store.id);
    
    // Step 9: Sales Entry
    await createSalesEntry(empLoginResult.token, empLoginResult.tenantId, store.id);
    
    // Step 10: Dashboard Flow
    await testDashboardFlow(adminLoginResult.token, adminLoginResult.tenantId);
    
    results.endTime = Date.now();
    const duration = (results.endTime - results.startTime) / 1000;
    
    // Summary
    log('\n\n📊 TEST SUMMARY', 'bright');
    log('=====================================', 'bright');
    log(`Total Duration: ${duration.toFixed(2)}s`, 'cyan');
    
    const successCount = results.steps.filter(s => s.status === 'success').length;
    const warningCount = results.steps.filter(s => s.status === 'warning').length;
    const failedCount = results.steps.filter(s => s.status === 'failed').length;
    
    log(`✅ Successful: ${successCount}`, 'green');
    log(`⚠️  Warnings: ${warningCount}`, warningCount > 0 ? 'yellow' : 'green');
    log(`❌ Failed: ${failedCount}`, failedCount > 0 ? 'red' : 'green');
    
    log('\n📋 Step Details:', 'bright');
    results.steps.forEach(step => {
      const icon = step.status === 'success' ? '✅' : step.status === 'warning' ? '⚠️' : '❌';
      const color = step.status === 'success' ? 'green' : step.status === 'warning' ? 'yellow' : 'red';
      log(`${icon} ${step.step}. ${step.name}`, color);
      if (step.details) {
        log(`   ${step.details}`, 'cyan');
      }
    });
    
    if (failedCount === 0) {
      log('\n✅ Complete flow test PASSED!', 'green');
      log('=====================================\n', 'bright');
      process.exit(0);
    } else {
      log('\n❌ Complete flow test had failures', 'red');
      log('=====================================\n', 'bright');
      process.exit(1);
    }
    
  } catch (error) {
    log(`\n❌ Fatal Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
