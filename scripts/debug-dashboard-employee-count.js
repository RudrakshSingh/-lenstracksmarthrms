/**
 * Debug Dashboard Employee Count Issue
 * Check what employees are returned by HR service vs dashboard
 */

const https = require('https');
const http = require('http');

const API_BASE = process.env.API_BASE || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com';

// Upcapto credentials
const UPCAPTO_EMAIL = 'admin@upcapto.com';
const UPCAPTO_PASSWORD = 'Upcapto@2026';

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

// Get employees from HR service
async function getEmployees() {
  console.log('\n📝 Getting Employees from HR Service');
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
        console.log('\n📋 Sample employees:');
        employees.slice(0, 5).forEach((emp, index) => {
          console.log(`   ${index + 1}. ${emp.employeeId || emp.employee_id || 'N/A'} - ${emp.email || 'N/A'}`);
          console.log(`      TenantId: ${emp.tenantId || 'N/A'}`);
          console.log(`      Status: ${emp.status || 'N/A'}`);
          console.log(`      isDeleted: ${emp.isDeleted || false}`);
        });
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

// Get dashboard stats
async function getDashboardStats() {
  console.log('\n📝 Getting Dashboard Stats');
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

// Check HR service logs (via pod exec)
async function checkServiceLogs() {
  console.log('\n📝 Checking HR Service Logs (last 50 lines)');
  try {
    const { exec } = require('child_process');
    return new Promise((resolve, reject) => {
      exec('kubectl logs -n etelios-prod deployment/hr-service --tail=50 | grep -i "tenantId\|getDashboardStats\|countDocuments"', (error, stdout, stderr) => {
        if (error) {
          console.log('⚠️  Could not fetch logs (might need kubectl access)');
          console.log(`   Error: ${error.message}`);
          resolve(null);
        } else {
          if (stdout) {
            console.log('📋 Recent logs:');
            console.log(stdout);
          } else {
            console.log('   No relevant logs found');
          }
          resolve(stdout);
        }
      });
    });
  } catch (error) {
    console.log('⚠️  Could not check logs:', error.message);
    return null;
  }
}

// Main
async function main() {
  console.log('🔍 Debugging Dashboard Employee Count Issue');
  console.log('='.repeat(60));
  
  if (!(await login())) {
    return;
  }
  
  const employeeCount = await getEmployees();
  const stats = await getDashboardStats();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Comparison');
  console.log('='.repeat(60));
  console.log(`HR Service Employees Endpoint: ${employeeCount} employees`);
  console.log(`Dashboard Stats Endpoint: ${stats?.totalEmployees || 0} employees`);
  console.log(`Active Employees (Dashboard): ${stats?.activeEmployees || 0} employees`);
  
  if (employeeCount > 0 && stats?.totalEmployees === 0) {
    console.log('\n⚠️  ISSUE DETECTED:');
    console.log('   Employees exist in HR service but dashboard shows 0');
    console.log('\n   Possible causes:');
    console.log('   1. TenantId mismatch in database queries');
    console.log('   2. isDeleted field filtering out employees');
    console.log('   3. Status field filtering (looking for "active" but stored differently)');
    console.log('   4. Database connection issue in dashboard query');
    console.log(`\n   TenantId being used: '${tenantId}'`);
    console.log('\n   Next steps:');
    console.log('   - Check HR service logs for getDashboardStats queries');
    console.log('   - Verify tenantId format in database matches query');
    console.log('   - Check if employees have isDeleted=true or status != "active"');
  } else if (employeeCount === stats?.totalEmployees) {
    console.log('\n✅ Employee counts match!');
  } else if (employeeCount === 0 && stats?.totalEmployees === 0) {
    console.log('\n⚠️  No employees found in either endpoint');
    console.log('   This might be expected if no employees exist for this tenant');
  }
  
  // Try to check logs
  await checkServiceLogs();
}

main().catch(console.error);
