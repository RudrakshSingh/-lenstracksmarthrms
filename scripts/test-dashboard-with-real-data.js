/**
 * Test Dashboard with Real Data - Check actual employee counts
 */

const https = require('https');
const http = require('http');

const API_BASE = process.env.API_BASE || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com';

// Upcapto tenant credentials
const UPCAPTO_EMAIL = 'rudi@gmail.com';
const UPCAPTO_PASSWORD = 'Rudi@3006';

let token = null;
let tenantId = null;

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

// Login
async function login() {
  console.log('\n📝 Login');
  try {
    const response = await makeRequest(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      body: { email: UPCAPTO_EMAIL, password: UPCAPTO_PASSWORD }
    });
    
    if (response.status === 200 && response.data.success) {
      token = response.data.data?.accessToken || response.data.accessToken;
      tenantId = response.data.data?.user?.tenantId || response.data.user?.tenantId || 'upcapto';
      console.log('✅ Login successful');
      console.log(`   Tenant: ${tenantId}`);
      console.log(`   User ID: ${response.data.data?.user?._id || response.data.user?._id}`);
      console.log(`   Employee ID: ${response.data.data?.user?.employeeId || response.data.user?.employeeId}`);
      return true;
    } else {
      console.log('❌ Login failed:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Login error:', error.message);
    return false;
  }
}

// Get employees directly
async function getEmployees() {
  console.log('\n📝 Getting Employees List');
  try {
    const response = await makeRequest(`${API_BASE}/api/hr/employees`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    });
    
    if (response.status === 200 && response.data.success) {
      const employees = response.data.data?.employees || response.data.data || [];
      console.log(`✅ Found ${employees.length} employees`);
      if (employees.length > 0) {
        console.log(`   First employee: ${employees[0].employeeId || employees[0].employee_id} - ${employees[0].name || employees[0].firstName}`);
      }
      return employees.length;
    } else {
      console.log('❌ Failed:', response.data);
      return 0;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return 0;
  }
}

// Test dashboard stats
async function testStats() {
  console.log('\n📝 Testing Dashboard Stats');
  try {
    const response = await makeRequest(`${API_BASE}/api/hr/dashboard/stats`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    });
    
    if (response.status === 200 && response.data.success) {
      const stats = response.data.data || response.data;
      console.log('✅ Stats retrieved');
      console.log(`   Total Employees: ${stats.totalEmployees}`);
      console.log(`   Active Employees: ${stats.activeEmployees}`);
      console.log(`   Departments: ${stats.departments}`);
      console.log(`   Locations: ${stats.locations}`);
      return stats;
    } else {
      console.log('❌ Failed:', response.data);
      return null;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return null;
  }
}

// Main
async function main() {
  console.log('🚀 Testing Dashboard with Real Data');
  console.log('='.repeat(60));
  
  if (!(await login())) {
    return;
  }
  
  const employeeCount = await getEmployees();
  const stats = await testStats();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Comparison');
  console.log('='.repeat(60));
  console.log(`Direct Employee Query: ${employeeCount} employees`);
  console.log(`Dashboard Stats: ${stats?.totalEmployees || 0} employees`);
  
  if (employeeCount > 0 && stats?.totalEmployees === 0) {
    console.log('\n⚠️  ISSUE: Employees exist but dashboard shows 0');
    console.log('   Possible causes:');
    console.log('   1. Tenant ID mismatch in queries');
    console.log('   2. isDeleted field filtering');
    console.log('   3. Status field filtering');
  } else if (employeeCount === stats?.totalEmployees) {
    console.log('\n✅ Employee counts match!');
  }
}

main().catch(console.error);
