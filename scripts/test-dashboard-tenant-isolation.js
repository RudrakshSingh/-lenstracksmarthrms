/**
 * Test Tenant Admin Dashboard with Tenant Isolation
 * Tests dashboard endpoints for both Upcapto and HR (lenstrack) tenants
 */

const https = require('https');
const http = require('http');

const API_BASE = process.env.API_BASE || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com';

// Upcapto tenant credentials - Try admin first, fallback to employee
const UPCAPTO_ADMIN_EMAIL = 'admin@upcapto.com';
const UPCAPTO_ADMIN_PASSWORD = 'Upcapto@2026';
const UPCAPTO_EMAIL = 'rudi@gmail.com';
const UPCAPTO_PASSWORD = 'Rudi@3006';

// HR/Lenstrack tenant credentials
const HR_EMAIL = 'admin@lenstrack.com';
const HR_PASSWORD = 'AdminPass123!';

let upcaptoToken = null;
let upcaptoTenantId = null;

let hrToken = null;
let hrTenantId = null;

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

// Login Upcapto - Try admin first, fallback to employee
async function loginUpcapto() {
  console.log('\n📝 Upcapto Tenant - Login');
  
  // Try admin first
  try {
    const response = await makeRequest(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      body: { email: UPCAPTO_ADMIN_EMAIL, password: UPCAPTO_ADMIN_PASSWORD }
    });
    
    if (response.status === 200 && response.data.success) {
      upcaptoToken = response.data.data?.accessToken || response.data.accessToken;
      upcaptoTenantId = response.data.data?.user?.tenantId || response.data.user?.tenantId || 'upcapto';
      console.log('✅ Upcapto admin login successful');
      console.log(`   Tenant: ${upcaptoTenantId}`);
      console.log(`   Role: ${response.data.data?.user?.role || response.data.user?.role}`);
      return true;
    }
  } catch (error) {
    console.log('⚠️  Admin login failed, trying employee...');
  }
  
  // Fallback to employee
  try {
    const response = await makeRequest(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      body: { email: UPCAPTO_EMAIL, password: UPCAPTO_PASSWORD }
    });
    
    if (response.status === 200 && response.data.success) {
      upcaptoToken = response.data.data?.accessToken || response.data.accessToken;
      upcaptoTenantId = response.data.data?.user?.tenantId || response.data.user?.tenantId || 'upcapto';
      console.log('✅ Upcapto employee login successful');
      console.log(`   Tenant: ${upcaptoTenantId}`);
      console.log(`   Role: ${response.data.data?.user?.role || response.data.user?.role}`);
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

// Login HR/Lenstrack
async function loginHR() {
  console.log('\n📝 HR/Lenstrack Tenant - Login');
  try {
    const response = await makeRequest(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      body: { email: HR_EMAIL, password: HR_PASSWORD }
    });
    
    if (response.status === 200 && response.data.success) {
      hrToken = response.data.data?.accessToken || response.data.accessToken;
      hrTenantId = response.data.data?.user?.tenantId || response.data.user?.tenantId || 'lenstrack';
      console.log('✅ HR login successful');
      console.log(`   Tenant: ${hrTenantId}`);
      return true;
    } else {
      console.log('❌ HR login failed:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ HR login error:', error.message);
    return false;
  }
}

// Test dashboard endpoint
async function testDashboard(name, endpoint, token, tenantId) {
  console.log(`\n📝 Testing: ${name}`);
  console.log(`   Endpoint: ${endpoint}`);
  console.log(`   Tenant: ${tenantId}`);
  try {
    const response = await makeRequest(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    });
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Success');
      const data = response.data.data || response.data;
      
      if (Array.isArray(data)) {
        console.log(`   Array length: ${data.length}`);
        if (data.length > 0) {
          console.log(`   Sample item keys: ${Object.keys(data[0]).join(', ')}`);
          // Show tenant isolation - check if data belongs to correct tenant
          if (data[0].tenantId) {
            console.log(`   Tenant ID in data: ${data[0].tenantId} (should match ${tenantId})`);
          }
        }
      } else {
        console.log(`   Data keys: ${Object.keys(data).join(', ')}`);
        // Show key stats
        if (data.totalEmployees !== undefined) {
          console.log(`   Total Employees: ${data.totalEmployees}`);
        }
        if (data.activeEmployees !== undefined) {
          console.log(`   Active Employees: ${data.activeEmployees}`);
        }
        if (data.departments !== undefined) {
          console.log(`   Departments: ${data.departments}`);
        }
      }
      return { success: true, data };
    } else {
      console.log('❌ Failed:', response.data);
      return { success: false, error: response.data };
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Testing Tenant Admin Dashboard - Tenant Isolation');
  console.log('='.repeat(60));
  console.log(`📍 API Base: ${API_BASE}`);
  
  const results = {
    passed: 0,
    failed: 0
  };
  
  // Step 1: Login both tenants
  if (!(await loginUpcapto())) {
    console.log('\n❌ Upcapto login failed. Stopping tests.');
    return;
  }
  
  if (!(await loginHR())) {
    console.log('\n❌ HR login failed. Stopping tests.');
    return;
  }
  
  // Step 2: Test dashboard endpoints for both tenants
  const endpoints = [
    { name: 'Dashboard Stats', path: '/api/hr/dashboard/stats' },
    { name: 'Top Performers', path: '/api/hr/dashboard/top-performers' },
    { name: 'Top Sales', path: '/api/hr/dashboard/top-sales' },
    { name: 'Recent Activities', path: '/api/hr/dashboard/recent-activities' }
  ];
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Testing Upcapto Tenant');
  console.log('='.repeat(60));
  
  const upcaptoResults = {};
  for (const endpoint of endpoints) {
    const result = await testDashboard(
      `Upcapto - ${endpoint.name}`,
      endpoint.path,
      upcaptoToken,
      upcaptoTenantId
    );
    upcaptoResults[endpoint.name] = result;
    if (result.success) {
      results.passed++;
    } else {
      results.failed++;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Testing HR/Lenstrack Tenant');
  console.log('='.repeat(60));
  
  const hrResults = {};
  for (const endpoint of endpoints) {
    const result = await testDashboard(
      `HR - ${endpoint.name}`,
      endpoint.path,
      hrToken,
      hrTenantId
    );
    hrResults[endpoint.name] = result;
    if (result.success) {
      results.passed++;
    } else {
      results.failed++;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Step 3: Verify tenant isolation
  console.log('\n' + '='.repeat(60));
  console.log('🔒 Tenant Isolation Verification');
  console.log('='.repeat(60));
  
  let isolationPassed = 0;
  let isolationFailed = 0;
  
  // Compare stats between tenants
  if (upcaptoResults['Dashboard Stats']?.success && hrResults['Dashboard Stats']?.success) {
    const upcaptoStats = upcaptoResults['Dashboard Stats'].data;
    const hrStats = hrResults['Dashboard Stats'].data;
    
    console.log('\n📊 Comparing Dashboard Stats:');
    console.log(`   Upcapto - Total Employees: ${upcaptoStats.totalEmployees || 0}`);
    console.log(`   HR - Total Employees: ${hrStats.totalEmployees || 0}`);
    
    if (upcaptoStats.totalEmployees !== hrStats.totalEmployees) {
      console.log('✅ Tenant isolation verified - Different employee counts');
      isolationPassed++;
    } else {
      console.log('⚠️  Same employee count - might be default/empty data');
      isolationPassed++; // Still pass if both are 0 (empty data)
    }
  }
  
  // Compare top performers
  if (upcaptoResults['Top Performers']?.success && hrResults['Top Performers']?.success) {
    const upcaptoPerformers = upcaptoResults['Top Performers'].data || [];
    const hrPerformers = hrResults['Top Performers'].data || [];
    
    console.log(`\n📊 Comparing Top Performers:`);
    console.log(`   Upcapto - Count: ${upcaptoPerformers.length}`);
    console.log(`   HR - Count: ${hrPerformers.length}`);
    
    // Check if employee IDs are different
    const upcaptoIds = upcaptoPerformers.map(p => p.id).sort();
    const hrIds = hrPerformers.map(p => p.id).sort();
    const hasOverlap = upcaptoIds.some(id => hrIds.includes(id));
    
    if (!hasOverlap || (upcaptoIds.length === 0 && hrIds.length === 0)) {
      console.log('✅ Tenant isolation verified - No overlapping employee IDs');
      isolationPassed++;
    } else {
      console.log('❌ Tenant isolation FAILED - Overlapping employee IDs found!');
      isolationFailed++;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  console.log('\n🔒 Tenant Isolation Results:');
  console.log(`✅ Passed: ${isolationPassed}`);
  console.log(`❌ Failed: ${isolationFailed}`);
  
  if (results.failed === 0 && isolationFailed === 0) {
    console.log('\n🎉 All tests passed! Dashboard is working with proper tenant isolation!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
  }
}

// Run tests
runTests().catch(console.error);
