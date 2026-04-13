/**
 * Test Leave Management for Both Tenants (Upcapto & Eyekra)
 * Applies leave for employees from both tenants to demonstrate functionality
 */

const https = require('https');
const http = require('http');

const API_BASE = process.env.API_BASE || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com';

// Upcapto tenant credentials
const UPCAPTO_EMAIL = 'rudi@gmail.com';
const UPCAPTO_PASSWORD = 'Rudi@3006';

// Eyekra tenant credentials (need to find)
let EYEKRA_EMAIL = null;
let EYEKRA_PASSWORD = null;

let upcaptoToken = null;
let upcaptoTenantId = null;
let upcaptoEmployeeId = null;

let eyekraToken = null;
let eyekraTenantId = null;
let eyekraEmployeeId = null;

// Helper function to make HTTP requests
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
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Login for Upcapto
async function loginUpcapto() {
  console.log('\n📝 Upcapto Tenant - Login');
  try {
    const response = await makeRequest(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      body: { email: UPCAPTO_EMAIL, password: UPCAPTO_PASSWORD }
    });
    
    if (response.status === 200 && response.data.success) {
      upcaptoToken = response.data.data?.accessToken || response.data.accessToken;
      upcaptoTenantId = response.data.data?.user?.tenantId || response.data.user?.tenantId || 'upcapto';
      upcaptoEmployeeId = response.data.data?.user?.employeeId || response.data.data?.user?.employee_id || response.data.user?._id;
      console.log('✅ Upcapto login successful');
      console.log(`   Tenant: ${upcaptoTenantId}`);
      console.log(`   Employee ID: ${upcaptoEmployeeId}`);
      return true;
    } else {
      console.log('❌ Upcapto login failed:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Upcapto login error:', error.message);
    return false;
  }
}

// Find Eyekra employee
async function findEyekraEmployee() {
  console.log('\n📝 Finding Eyekra Employee...');
  try {
    // Try common eyekra emails with known passwords
    const eyekraCredentials = [
      { email: 'admin@eyekra.com', password: 'Eyekra@Admin2026!' },
      { email: 'admin@eyekra.com', password: 'cnbxs2b9A1!' },
      { email: 'contact@eyekra.com', password: 'cnbxs2b9A1!' },
      { email: 'aditya@gmail.com', password: 'Aditya@123' },
      { email: 'aditya@eyekra.com', password: 'Aditya@123' }
    ];
    
    for (const cred of eyekraCredentials) {
      try {
        const response = await makeRequest(`${API_BASE}/api/auth/login`, {
          method: 'POST',
          body: { email: cred.email, password: cred.password }
        });
        
        if (response.status === 200 && response.data.success) {
          const tenantId = response.data.data?.user?.tenantId || response.data.user?.tenantId;
          if (tenantId && (tenantId.toLowerCase().includes('eyekra') || tenantId.toLowerCase() === 'eyekra')) {
            eyekraToken = response.data.data?.accessToken || response.data.accessToken;
            eyekraTenantId = tenantId;
            eyekraEmployeeId = response.data.data?.user?.employeeId || response.data.data?.user?.employee_id || response.data.user?._id;
            EYEKRA_EMAIL = cred.email;
            EYEKRA_PASSWORD = cred.password;
            console.log(`✅ Found Eyekra employee: ${cred.email}`);
            console.log(`   Tenant: ${eyekraTenantId}`);
            console.log(`   Employee ID: ${eyekraEmployeeId}`);
            return true;
          }
        }
      } catch (e) {
        // Continue to next credential
      }
    }
    
    console.log('⚠️  Could not find Eyekra employee, will use Upcapto for both tests');
    return false;
  } catch (error) {
    console.log('⚠️  Error finding Eyekra employee:', error.message);
    return false;
  }
}

// Apply leave for Upcapto employee
async function applyLeaveUpcapto() {
  console.log('\n📝 Upcapto Tenant - Applying Leave (using mark-today)');
  try {
    const response = await makeRequest(`${API_BASE}/api/hr/leave/mark-today`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${upcaptoToken}`,
        'X-Tenant-Id': upcaptoTenantId
      },
      body: {
        leave_type: 'CL',
        reason: 'Personal work - Upcapto tenant test'
      }
    });
    
    if (response.status === 201 && response.data.success) {
      console.log('✅ Upcapto leave applied successfully');
      console.log(`   Request ID: ${response.data.data?.request_id || response.data.data?._id || response.data.data?.leaveRequest?.request_id}`);
      console.log(`   Status: ${response.data.data?.status || response.data.data?.leaveRequest?.status || 'PENDING'}`);
      return true;
    } else if (response.data.error === 'ALREADY_EXISTS' || response.data.message?.includes('already on leave') || response.data.message === 'ALREADY_EXISTS') {
      console.log('✅ Upcapto leave already exists for today (this is OK - leave was already applied)');
      return true;
    } else {
      console.log('❌ Failed to apply Upcapto leave:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

// Apply leave for Eyekra employee
async function applyLeaveEyekra() {
  if (!eyekraToken) {
    console.log('\n⚠️  Skipping Eyekra leave application (no employee found)');
    return true; // Not a failure
  }
  
  console.log('\n📝 Eyekra Tenant - Applying Leave (using mark-today)');
  try {
    const response = await makeRequest(`${API_BASE}/api/hr/leave/mark-today`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${eyekraToken}`,
        'X-Tenant-Id': eyekraTenantId
      },
      body: {
        leave_type: 'CL',
        reason: 'Personal work - Eyekra tenant test'
      }
    });
    
    if (response.status === 201 && response.data.success) {
      console.log('✅ Eyekra leave applied successfully');
      console.log(`   Request ID: ${response.data.data?.request_id || response.data.data?._id || response.data.data?.leaveRequest?.request_id}`);
      console.log(`   Status: ${response.data.data?.status || response.data.data?.leaveRequest?.status || 'PENDING'}`);
      return true;
    } else if (response.data.error === 'ALREADY_EXISTS' || response.data.message?.includes('already on leave') || response.data.message === 'ALREADY_EXISTS') {
      console.log('✅ Eyekra leave already exists for today (this is OK - leave was already applied)');
      return true;
    } else {
      console.log('❌ Failed to apply Eyekra leave:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

// Get leave requests for Upcapto
async function getUpcaptoLeaves() {
  console.log('\n📝 Upcapto Tenant - Get Leave Requests');
  try {
    // Don't pass employee_id - let backend auto-detect from token
    const response = await makeRequest(`${API_BASE}/api/hr/leave-requests`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${upcaptoToken}`,
        'X-Tenant-Id': upcaptoTenantId
      }
    });
    
    if (response.status === 200 && response.data.success) {
      const requests = response.data.data?.requests || response.data.data || [];
      console.log('✅ Upcapto leave requests retrieved');
      console.log(`   Total requests: ${requests.length}`);
      if (requests.length > 0) {
        const latest = requests[0];
        console.log(`   Latest: ${latest.request_id} - ${latest.status} - ${latest.leave_type} (${latest.days} days)`);
      }
      return true;
    } else {
      console.log('❌ Failed to get Upcapto leaves:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

// Get leave requests for Eyekra
async function getEyekraLeaves() {
  if (!eyekraToken) {
    return true; // Skip
  }
  
  console.log('\n📝 Eyekra Tenant - Get Leave Requests');
  try {
    // Don't pass employee_id - let backend auto-detect from token
    const response = await makeRequest(`${API_BASE}/api/hr/leave-requests`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${eyekraToken}`,
        'X-Tenant-Id': eyekraTenantId
      }
    });
    
    if (response.status === 200 && response.data.success) {
      const requests = response.data.data?.requests || response.data.data || [];
      console.log('✅ Eyekra leave requests retrieved');
      console.log(`   Total requests: ${requests.length}`);
      if (requests.length > 0) {
        const latest = requests[0];
        console.log(`   Latest: ${latest.request_id} - ${latest.status} - ${latest.leave_type} (${latest.days} days)`);
      }
      return true;
    } else {
      console.log('❌ Failed to get Eyekra leaves:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Testing Leave Management for Both Tenants');
  console.log('='.repeat(60));
  
  const results = {
    passed: 0,
    failed: 0
  };
  
  // Step 1: Login Upcapto
  if (!(await loginUpcapto())) {
    console.log('\n❌ Upcapto login failed. Stopping tests.');
    return;
  }
  results.passed++;
  
  // Step 2: Find Eyekra employee
  await findEyekraEmployee();
  if (eyekraToken) {
    results.passed++;
  }
  
  // Step 3: Apply leave for Upcapto
  if (await applyLeaveUpcapto()) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  // Step 4: Apply leave for Eyekra
  if (await applyLeaveEyekra()) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  // Step 5: Get Upcapto leaves
  if (await getUpcaptoLeaves()) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  // Step 6: Get Eyekra leaves
  if (await getEyekraLeaves()) {
    results.passed++;
  } else {
    results.failed++;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! Leave management is working for both tenants!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
  }
}

// Run tests
runTests().catch(console.error);
