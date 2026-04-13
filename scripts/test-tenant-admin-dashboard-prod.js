/**
 * Test Tenant Admin Dashboard endpoints in Production
 * Tests all 4 endpoints: stats, top-performers, top-sales, recent-activities
 */

const https = require('https');
const http = require('http');

const API_BASE = process.env.API_BASE || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com';

// Test credentials
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

// Test endpoint
async function testEndpoint(name, endpoint) {
  console.log(`\n📝 Testing: ${name}`);
  console.log(`   Endpoint: ${endpoint}`);
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
        }
      } else {
        console.log(`   Data keys: ${Object.keys(data).join(', ')}`);
        // Show some sample values
        const sampleKeys = Object.keys(data).slice(0, 5);
        sampleKeys.forEach(key => {
          console.log(`   ${key}: ${data[key]}`);
        });
      }
      return true;
    } else {
      console.log('❌ Failed:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Testing Tenant Admin Dashboard Endpoints');
  console.log('='.repeat(60));
  console.log(`📍 API Base: ${API_BASE}`);
  
  const results = {
    passed: 0,
    failed: 0
  };
  
  // Step 1: Login
  if (!(await login())) {
    console.log('\n❌ Login failed. Stopping tests.');
    return;
  }
  
  // Step 2: Test all endpoints
  // Try /api/hr/dashboard paths first (these are definitely mounted)
  const endpoints = [
    { name: 'Dashboard Stats', path: '/api/hr/dashboard/stats' },
    { name: 'Top Performers', path: '/api/hr/dashboard/top-performers' },
    { name: 'Top Sales', path: '/api/hr/dashboard/top-sales' },
    { name: 'Recent Activities', path: '/api/hr/dashboard/recent-activities' }
  ];
  
  for (const endpoint of endpoints) {
    if (await testEndpoint(endpoint.name, endpoint.path)) {
      results.passed++;
    } else {
      results.failed++;
    }
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! Tenant Admin Dashboard is working!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
  }
}

// Run tests
runTests().catch(console.error);
