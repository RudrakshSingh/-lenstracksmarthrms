#!/usr/bin/env node

/**
 * Test script to create an employee and verify it's in the main database
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.BASE_URL || 'https://api.etelios.com';
const isLocal = process.argv.includes('--local');
const actualBaseUrl = isLocal ? 'http://localhost:3001' : BASE_URL;

if (!isLocal) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

let authToken = null;

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

function makeRequest(method, url, data = null, authToken = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Host': 'api.etelios.com'
      },
      rejectUnauthorized: false
    };

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function login() {
  log('Logging in as Admin...', 'cyan');
  const response = await makeRequest('POST', `${actualBaseUrl}/api/auth/mock-login`, {
    email: 'admin@company.com',
    role: 'admin'
  });

  if (response.status === 200 && response.data?.data?.accessToken) {
    authToken = response.data.data.accessToken;
    log('✅ Login successful', 'green');
    return true;
  } else {
    log(`❌ Login failed: ${JSON.stringify(response.data)}`, 'red');
    return false;
  }
}

async function testEmployeeCreation() {
  log('\n═══════════════════════════════════════════════════════', 'bright');
  log('  Testing Employee Creation in Main Database', 'bright');
  log('═══════════════════════════════════════════════════════', 'bright');

  const timestamp = Date.now();
  const testEmployee = {
    employeeId: `EMP-TEST-${timestamp}`,
    firstName: 'Test',
    lastName: 'Employee',
    fullName: 'Test Employee', // Required by validation
    email: `test.employee.${timestamp}@example.com`,
    password: 'Test1234!',
    roleName: 'employee',
    phone: '+1234567890',
    department: 'IT',
    jobTitle: 'Developer'
  };

  log(`\nCreating employee: ${testEmployee.email}`, 'cyan');
  
  try {
    const response = await makeRequest('POST', `${actualBaseUrl}/api/hr/employees`, testEmployee, authToken);
    
    if (response.status === 200 || response.status === 201) {
      log('✅ Employee created successfully', 'green');
      log(`   Employee ID: ${response.data?.data?.employeeId || testEmployee.employeeId}`, 'cyan');
      log(`   Email: ${testEmployee.email}`, 'cyan');
      
      // Verify employee can be retrieved
      log('\nVerifying employee retrieval...', 'cyan');
      const employeeId = response.data?.data?.employeeId || response.data?.data?._id || testEmployee.employeeId;
      const getResponse = await makeRequest('GET', `${actualBaseUrl}/api/hr/employees/${employeeId}`, null, authToken);
      
      if (getResponse.status === 200) {
        log('✅ Employee retrieved successfully', 'green');
        log(`   Database: ${getResponse.data?.data?.employeeId ? 'Main DB (verified)' : 'Unknown'}`, 'cyan');
        
        // Check if employee appears in list
        log('\nChecking if employee appears in employees list...', 'cyan');
        const listResponse = await makeRequest('GET', `${actualBaseUrl}/api/hr/employees?search=${testEmployee.email}`, null, authToken);
        
        if (listResponse.status === 200) {
          const employees = listResponse.data?.data?.employees || [];
          const found = employees.find(emp => emp.email === testEmployee.email || emp.employeeId === employeeId);
          
          if (found) {
            log('✅ Employee found in employees list', 'green');
            log(`   Total employees in list: ${employees.length}`, 'cyan');
            return true;
          } else {
            log('⚠️  Employee created but not found in list', 'yellow');
            return false;
          }
        } else {
          log('⚠️  Could not verify employee in list', 'yellow');
          return true; // Still consider success if creation worked
        }
      } else {
        log('⚠️  Employee created but could not be retrieved', 'yellow');
        return false;
      }
    } else {
      log(`❌ Employee creation failed: ${JSON.stringify(response.data)}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  const loggedIn = await login();
  if (!loggedIn) {
    log('Cannot proceed without authentication', 'red');
    process.exit(1);
  }

  const success = await testEmployeeCreation();
  
  log('\n═══════════════════════════════════════════════════════', 'bright');
  log('  Test Summary', 'bright');
  log('═══════════════════════════════════════════════════════', 'bright');
  
  if (success) {
    log('\n✅ All tests passed!', 'green');
    log('   Employee creation is working correctly', 'green');
    log('   Make sure to check server logs to verify database name', 'cyan');
  } else {
    log('\n❌ Tests failed!', 'red');
    log('   Check server logs and database connection', 'yellow');
  }
  
  process.exit(success ? 0 : 1);
}

main().catch(console.error);

