/**
 * Test script for Tenant Admin Dashboard endpoints
 * Tests all 4 endpoints: stats, top-performers, top-sales, recent-activities
 */

const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002';
const TEST_TOKEN = process.env.TEST_TOKEN || ''; // Set via environment variable
const TENANT_ID = process.env.TENANT_ID || 'lenstrack'; // Default tenant

const headers = {
  'Authorization': `Bearer ${TEST_TOKEN}`,
  'X-Tenant-Id': TENANT_ID,
  'Content-Type': 'application/json'
};

const endpoints = [
  '/api/dashboard/stats',
  '/api/dashboard/top-performers',
  '/api/dashboard/top-sales',
  '/api/dashboard/recent-activities'
];

async function testEndpoint(endpoint) {
  try {
    console.log(`\n🧪 Testing: ${endpoint}`);
    const response = await axios.get(`${BASE_URL}${endpoint}`, { headers, timeout: 10000 });
    
    console.log(`✅ Status: ${response.status}`);
    console.log(`📊 Response shape:`, {
      hasData: !!response.data.data,
      isArray: Array.isArray(response.data.data),
      keys: Object.keys(response.data.data || response.data)
    });
    
    // Show sample data
    const data = response.data.data || response.data;
    if (Array.isArray(data)) {
      console.log(`📋 Array length: ${data.length}`);
      if (data.length > 0) {
        console.log(`📝 Sample item:`, JSON.stringify(data[0], null, 2).substring(0, 200));
      }
    } else {
      console.log(`📝 Sample data:`, JSON.stringify(data, null, 2).substring(0, 300));
    }
    
    return { success: true, endpoint, status: response.status, data };
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response:`, JSON.stringify(error.response.data, null, 2).substring(0, 200));
    }
    return { success: false, endpoint, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting Tenant Admin Dashboard API Tests');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🏢 Tenant ID: ${TENANT_ID}`);
  console.log(`🔑 Token: ${TEST_TOKEN ? 'Set' : 'NOT SET - Tests may fail'}`);
  
  if (!TEST_TOKEN) {
    console.warn('\n⚠️  WARNING: TEST_TOKEN not set. Set it via:');
    console.warn('   export TEST_TOKEN="your-jwt-token"');
    console.warn('   Or pass as: TEST_TOKEN=xxx node test-tenant-admin-dashboard.js\n');
  }
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between requests
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.endpoint}`);
  });
  
  console.log(`\n✅ Passed: ${passed}/${endpoints.length}`);
  console.log(`❌ Failed: ${failed}/${endpoints.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
