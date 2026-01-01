#!/usr/bin/env node

/**
 * Simple local test - just create employee and verify
 */

const http = require('http');

const BASE_URL = 'http://localhost:3002'; // HR service default port
let authToken = null;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, url, data = null, authToken = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 3002,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(options, (res) => {
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

async function test() {
  log('Testing locally with MAIN database...', 'cyan');
  
  // Login
  log('\n1. Logging in...', 'cyan');
  try {
    const loginRes = await makeRequest('POST', `${BASE_URL}/api/auth/mock-login`, {
      email: 'admin@company.com',
      role: 'admin'
    });
    
    if (loginRes.status === 200 && (loginRes.data?.data?.accessToken || loginRes.data?.accessToken)) {
      authToken = loginRes.data?.data?.accessToken || loginRes.data?.accessToken;
      log('✅ Login successful', 'green');
    } else {
      log(`❌ Login failed: ${JSON.stringify(loginRes.data)}`, 'red');
      return;
    }
  } catch (error) {
    log(`❌ Connection error: ${error.message}`, 'red');
    log('   Make sure HR service is running: cd microservices/hr-service && npm start', 'cyan');
    return;
  }

  // Create employee
  log('\n2. Creating employee...', 'cyan');
  const timestamp = Date.now();
  const employeeData = {
    employeeId: `EMP-${timestamp}`,
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    email: `john.doe.${timestamp}@example.com`,
    password: 'Test1234!',
    roleName: 'employee',
    phone: '+1234567890',
    department: 'IT',
    jobTitle: 'Developer'
  };

  try {
    const createRes = await makeRequest('POST', `${BASE_URL}/api/hr/employees`, employeeData, authToken);
    
    if (createRes.status === 200 || createRes.status === 201) {
      log('✅ Employee created successfully', 'green');
      log(`   Employee ID: ${createRes.data?.data?.employeeId || employeeData.employeeId}`, 'cyan');
      
      // Verify in main DB by checking employee list
      log('\n3. Verifying employee in database...', 'cyan');
      const listRes = await makeRequest('GET', `${BASE_URL}/api/hr/employees?search=${employeeData.email}`, null, authToken);
      
      if (listRes.status === 200) {
        const employees = listRes.data?.data?.employees || [];
        const found = employees.find(e => e.email === employeeData.email);
        if (found) {
          log('✅ Employee found in MAIN database!', 'green');
          log(`   Database: Check server logs to confirm 'etelios_hr_service'`, 'cyan');
        } else {
          log('⚠️  Employee created but not found in list', 'red');
        }
      }
    } else {
      log(`❌ Failed: ${JSON.stringify(createRes.data)}`, 'red');
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
  }
}

test();

