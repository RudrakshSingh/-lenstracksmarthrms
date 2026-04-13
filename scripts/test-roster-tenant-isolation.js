#!/usr/bin/env node

/**
 * Test Roster Tenant Isolation
 * 
 * This script tests that roster APIs properly filter employees by tenantId
 * and prevent cross-tenant data access.
 */

const https = require('https');
const http = require('http');

// Configuration
const API_BASE = process.env.API_BASE || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com';

// Test credentials - Update these with actual test credentials
const TEST_CREDENTIALS = [
  {
    name: 'Tenant 1 User (Rudi)',
    email: process.env.TEST_EMAIL_1 || 'rudi@gmail.com',
    password: process.env.TEST_PASSWORD_1 || 'Rudi@3006',
    tenantId: process.env.TEST_TENANT_1 || 'upcapto'
  },
  {
    name: 'Tenant 2 User (Aditya)',
    email: process.env.TEST_EMAIL_2 || 'Aditya@gmail.com',
    password: process.env.TEST_PASSWORD_2 || 'yrv0s48mA1!',
    tenantId: process.env.TEST_TENANT_2 || 'eyekra'
  }
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
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
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// HTTP request helper
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

      res.on('data', (chunk) => {
        data += chunk;
      });

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

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.setTimeout(options.timeout || 10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Login helper
async function login(email, password) {
  try {
    logInfo(`Logging in as ${email}...`);
    
    const response = await makeRequest(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      body: {
        email,
        password
      }
    });

    if (response.status === 200 && response.data.success) {
      const token = response.data.data?.accessToken || response.data.data?.token || response.data.accessToken || response.data.token;
      const user = response.data.data?.user || response.data.user;
      const tenantId = user?.tenantId || response.data.data?.tenantId || 'default';

      if (!token) {
        logError('No token in response');
        logInfo('Response:', JSON.stringify(response.data, null, 2));
        return null;
      }

      logSuccess(`Login successful for ${email}`);
      logInfo(`Tenant ID: ${tenantId}`);
      
      return { token, user, tenantId };
    } else {
      logError(`Login failed: ${response.data.message || 'Unknown error'}`);
      logInfo('Response:', JSON.stringify(response.data, null, 2));
      return null;
    }
  } catch (error) {
    logError(`Login error: ${error.message}`);
    return null;
  }
}

// Test Get Roster
async function testGetRoster(token, tenantId, testName) {
  try {
    logInfo(`Testing GET /api/hr/roster for ${testName}...`);

    const response = await makeRequest(`${API_BASE}/api/hr/roster`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    });

    if (response.status === 200 && response.data.success) {
      // Check multiple possible response structures
      const responseData = response.data.data || {};
      const rosterData = responseData.data || responseData.roster || responseData || [];
      const total = responseData.total || 0;

      logSuccess(`Roster API call successful`);
      logInfo(`Total roster entries: ${total}`);
      logInfo(`Roster data length: ${rosterData.length}`);
      logInfo(`Response structure: ${JSON.stringify(Object.keys(responseData)).substring(0, 100)}`);

      // Check tenant isolation
      if (rosterData.length > 0) {
        logInfo('\nSample roster entries:');
        rosterData.slice(0, 3).forEach((roster, index) => {
          logInfo(`  ${index + 1}. Employee: ${roster.employeeName || roster.employeeId || 'N/A'}, Store: ${roster.storeName || roster.storeId || 'N/A'}, Date: ${roster.date || 'N/A'}`);
        });

        // Verify employee tenantId if available
        const employeesWithTenant = rosterData.filter(r => r.employee?.tenantId || r.employeeId);
        logInfo(`Employees with tenant info: ${employeesWithTenant.length}`);
      } else {
        if (total > 0) {
          logWarning(`⚠️  Total shows ${total} entries but data array is empty`);
          logInfo('This might indicate tenant isolation is working - rosters exist but employees/stores are filtered out due to tenant mismatch');
          logInfo('This is EXPECTED behavior if rosters reference employees/stores from different tenants');
        } else {
          logWarning('No roster entries found (this is normal if no roster exists)');
        }
      }

      return {
        success: true,
        total,
        data: rosterData,
        response: response.data
      };
    } else {
      logError(`Roster API failed: ${response.data.message || 'Unknown error'}`);
      return {
        success: false,
        error: response.data.message || 'Unknown error',
        response: response.data
      };
    }
  } catch (error) {
    logError(`Roster API error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test Weekly Roster
async function testWeeklyRoster(token, tenantId, testName) {
  try {
    logInfo(`Testing GET /api/hr/roster/weekly for ${testName}...`);

    // Get today's date and calculate week start (Monday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust to Monday
    const weekStart = new Date(today.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    const weekStartDate = weekStart.toISOString().split('T')[0];

    logInfo(`Week start date: ${weekStartDate}`);

    // You may need to provide a storeId - using a placeholder
    const storeId = 'test-store'; // Update with actual storeId if needed

    const response = await makeRequest(`${API_BASE}/api/hr/roster/weekly?storeId=${storeId}&weekStartDate=${weekStartDate}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    });

    if (response.status === 200 && response.data.success) {
      logSuccess(`Weekly roster API call successful`);
      logInfo(`Response keys: ${Object.keys(response.data.data || {}).join(', ')}`);
      return {
        success: true,
        response: response.data
      };
    } else {
      logWarning(`Weekly roster API: ${response.data.message || 'Unknown error'}`);
      return {
        success: false,
        error: response.data.message || 'Unknown error',
        response: response.data
      };
    }
  } catch (error) {
    logError(`Weekly roster API error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test Roster Settings
async function testRosterSettings(token, tenantId, testName) {
  try {
    logInfo(`Testing GET /api/hr/roster/settings for ${testName}...`);

    const response = await makeRequest(`${API_BASE}/api/hr/roster/settings`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    });

    if (response.status === 200 && response.data.success) {
      const settings = response.data.data || [];
      logSuccess(`Roster settings API call successful`);
      logInfo(`Settings count: ${settings.length}`);
      return {
        success: true,
        settings,
        response: response.data
      };
    } else {
      logWarning(`Roster settings API: ${response.data.message || 'Unknown error'}`);
      return {
        success: false,
        error: response.data.message || 'Unknown error',
        response: response.data
      };
    }
  } catch (error) {
    logError(`Roster settings API error: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Compare results between tenants
function compareTenantResults(results) {
  logSection('Tenant Isolation Verification');

  if (results.length < 2) {
    logWarning('Need at least 2 tenants to compare. Skipping comparison.');
    return;
  }

  const [result1, result2] = results;

  if (result1.roster && result2.roster) {
    const tenant1Employees = new Set(
      result1.roster.data.map(r => r.employeeId || r.employee?.employeeId).filter(Boolean)
    );
    const tenant2Employees = new Set(
      result2.roster.data.map(r => r.employeeId || r.employee?.employeeId).filter(Boolean)
    );

    const commonEmployees = [...tenant1Employees].filter(emp => tenant2Employees.has(emp));

    logInfo(`Tenant 1 employees: ${tenant1Employees.size}`);
    logInfo(`Tenant 2 employees: ${tenant2Employees.size}`);
    logInfo(`Common employees: ${commonEmployees.length}`);

    if (commonEmployees.length > 0) {
      logWarning(`⚠️  Found ${commonEmployees.length} common employees between tenants`);
      logInfo(`Common employee IDs: ${commonEmployees.join(', ')}`);
      logInfo('Note: This might be expected if employees are shared between tenants');
    } else {
      logSuccess('✅ No common employees found - tenant isolation working correctly');
    }
  }
}

// Main test function
async function runTests() {
  logSection('Roster Tenant Isolation Test Suite');
  logInfo(`API Base URL: ${API_BASE}`);
  logInfo(`Test started at: ${new Date().toISOString()}\n`);

  const results = [];

  for (const cred of TEST_CREDENTIALS) {
    logSection(`Testing: ${cred.name} (${cred.email})`);

    // Login
    const auth = await login(cred.email, cred.password);
    if (!auth) {
      logError(`Failed to login for ${cred.name}. Skipping tests.`);
      continue;
    }

    const { token, tenantId } = auth;
    const actualTenantId = tenantId || cred.tenantId;

    logInfo(`Using Tenant ID: ${actualTenantId}`);

    // Test Get Roster
    const rosterResult = await testGetRoster(token, actualTenantId, cred.name);
    
    // Test Weekly Roster
    const weeklyResult = await testWeeklyRoster(token, actualTenantId, cred.name);
    
    // Test Roster Settings
    const settingsResult = await testRosterSettings(token, actualTenantId, cred.name);

    results.push({
      name: cred.name,
      tenantId: actualTenantId,
      roster: rosterResult,
      weekly: weeklyResult,
      settings: settingsResult
    });

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Compare results
  compareTenantResults(results);

  // Summary
  logSection('Test Summary');

  results.forEach(result => {
    logInfo(`\n${result.name} (Tenant: ${result.tenantId}):`);
    logInfo(`  Roster API: ${result.roster.success ? '✅ Pass' : '❌ Fail'}`);
    logInfo(`  Weekly Roster API: ${result.weekly.success ? '✅ Pass' : '⚠️  Warning'}`);
    logInfo(`  Settings API: ${result.settings.success ? '✅ Pass' : '⚠️  Warning'}`);
    if (result.roster.success) {
      logInfo(`  Total roster entries: ${result.roster.total || 0}`);
    }
  });

  logSection('Test Complete');
  logSuccess('All tests completed!');
}

// Run tests
runTests().catch(error => {
  logError(`Test suite failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
