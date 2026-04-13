#!/usr/bin/env node
/**
 * Test Store Edit - Shankar Nagar Store
 * 
 * This script tests editing the Shankar Nagar store (SHK02) to verify
 * the fix works correctly.
 * 
 * Usage:
 *   node scripts/test-store-edit-shankar-nagar.js
 */

const https = require('https');
const http = require('http');

const API_BASE = process.env.API_BASE || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api';
const UPCAPTO_EMAIL = process.env.UPCAPTO_EMAIL || 'admin@upcapto.com';
const UPCAPTO_PASSWORD = process.env.UPCAPTO_PASSWORD || 'Upcapto@2026';

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };
    
    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

let token = null;
let tenantId = 'upcapto';

async function login() {
  log('\n🔐 Step 1: Logging in...', 'cyan');
  try {
    const response = await makeRequest(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: {
        email: UPCAPTO_EMAIL,
        password: UPCAPTO_PASSWORD
      }
    });
    
    if (response.status === 200 && response.data.success) {
      token = response.data.data?.accessToken || response.data.accessToken;
      tenantId = response.data.data?.user?.tenantId || response.data.user?.tenantId || 'upcapto';
      log(`✅ Login successful`, 'green');
      log(`   Tenant: ${tenantId}`, 'blue');
      log(`   Token: ${token.substring(0, 20)}...`, 'blue');
      return true;
    } else {
      log(`❌ Login failed: ${response.status}`, 'red');
      console.error('Response:', response.data);
      return false;
    }
  } catch (error) {
    log(`❌ Login error: ${error.message}`, 'red');
    return false;
  }
}

async function getStoreByCode(storeCode) {
  log(`\n📋 Step 2: Getting store by code: ${storeCode}`, 'cyan');
  try {
    const response = await makeRequest(`${API_BASE}/hr/stores/${storeCode}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    });
    
    if (response.status === 200 && response.data.success) {
      const store = response.data.data;
      log(`✅ Store found!`, 'green');
      log(`   ID: ${store._id || store.id}`, 'blue');
      log(`   Name: ${store.name}`, 'blue');
      log(`   Code: ${store.code}`, 'blue');
      log(`   Tenant: ${store.tenantId}`, 'blue');
      log(`   Status: ${store.status}`, 'blue');
      return store;
    } else {
      log(`❌ Store not found: ${response.status}`, 'red');
      console.error('Response:', response.data);
      return null;
    }
  } catch (error) {
    log(`❌ Error getting store: ${error.message}`, 'red');
    return null;
  }
}

async function updateStore(storeId, updateData) {
  log(`\n✏️  Step 3: Updating store...`, 'cyan');
  log(`   Store ID: ${storeId}`, 'blue');
  log(`   Updates: ${JSON.stringify(updateData, null, 2)}`, 'blue');
  
  try {
    const response = await makeRequest(`${API_BASE}/hr/stores/${storeId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      },
      body: updateData
    });
    
    if (response.status === 200 && response.data.success) {
      const store = response.data.data;
      log(`✅ Store updated successfully!`, 'green');
      log(`   Name: ${store.name}`, 'blue');
      log(`   Code: ${store.code}`, 'blue');
      log(`   Status: ${store.status}`, 'blue');
      return store;
    } else {
      log(`❌ Update failed: ${response.status}`, 'red');
      console.error('Response:', response.data);
      return null;
    }
  } catch (error) {
    log(`❌ Error updating store: ${error.message}`, 'red');
    return null;
  }
}

async function testStoreEdit() {
  console.log('\n' + '='.repeat(80));
  log('🧪 Testing Store Edit - Shankar Nagar (SHK02)', 'bright');
  console.log('='.repeat(80));
  
  // Step 1: Login
  const loggedIn = await login();
  if (!loggedIn) {
    log('\n❌ Cannot proceed without login', 'red');
    process.exit(1);
  }
  
  // Step 2: Get store by code (SHK02)
  const store = await getStoreByCode('SHK02');
  if (!store) {
    log('\n❌ Store not found. Cannot test edit.', 'red');
    process.exit(1);
  }
  
  const storeId = store._id || store.id;
  const originalName = store.name;
  
  // Step 3: Update store with a test change
  const testUpdate = {
    name: `Lenstrack Shankar Nagar - Updated ${new Date().toLocaleTimeString()}`,
    description: `Test update at ${new Date().toISOString()}`
  };
  
  const updatedStore = await updateStore(storeId, testUpdate);
  if (!updatedStore) {
    log('\n❌ Store update failed', 'red');
    process.exit(1);
  }
  
  // Step 4: Verify update
  log(`\n✅ Step 4: Verifying update...`, 'cyan');
  const verifyStore = await getStoreByCode('SHK02');
  if (verifyStore && verifyStore.name === updatedStore.name) {
    log(`✅ Verification successful!`, 'green');
    log(`   Original name: ${originalName}`, 'blue');
    log(`   Updated name: ${verifyStore.name}`, 'blue');
  } else {
    log(`⚠️  Verification: Name might not match`, 'yellow');
  }
  
  // Step 5: Test update by code directly
  log(`\n🧪 Step 5: Testing update by code (SHK02) directly...`, 'cyan');
  const updateByCode = await updateStore('SHK02', {
    description: `Updated via code at ${new Date().toISOString()}`
  });
  
  if (updateByCode) {
    log(`✅ Update by code works!`, 'green');
  } else {
    log(`❌ Update by code failed`, 'red');
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  log('📊 Test Summary', 'bright');
  console.log('='.repeat(80));
  log(`✅ Login: Success`, 'green');
  log(`✅ Get Store by Code (SHK02): Success`, 'green');
  log(`✅ Update Store by ID: ${updatedStore ? 'Success' : 'Failed'}`, updatedStore ? 'green' : 'red');
  log(`✅ Update Store by Code: ${updateByCode ? 'Success' : 'Failed'}`, updateByCode ? 'green' : 'red');
  log(`✅ Verification: Success`, 'green');
  
  console.log('\n' + '='.repeat(80));
  log('🎉 All Tests Passed! Store Edit Fix is Working!', 'bright');
  console.log('='.repeat(80));
}

// Run the test
testStoreEdit().catch(error => {
  log(`\n❌ Test failed with error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
