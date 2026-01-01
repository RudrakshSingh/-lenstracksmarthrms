#!/usr/bin/env node

/**
 * Test API endpoints on Live AKS IP
 * IP: 98.70.245.87
 */

const http = require('http');

const AKS_IP = '98.70.245.87';
const BASE_URL = `http://${AKS_IP}`;

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(method, path, data = null, authToken = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: AKS_IP,
      port: 80,
      path: path,
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

async function testHealth() {
  log('\n━━━ Test 1: Health Check ━━━', 'bright');
  try {
    const response = await makeRequest('GET', '/api/hr/health');
    if (response.status === 200) {
      log('✅ Health check passed', 'green');
      log(`   Response: ${JSON.stringify(response.data)}`, 'cyan');
      return true;
    } else {
      log(`❌ Health check failed: ${response.status}`, 'red');
      log(`   Response: ${JSON.stringify(response.data)}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Health check error: ${error.message}`, 'red');
    return false;
  }
}

async function testLogin() {
  log('\n━━━ Test 2: Mock Login ━━━', 'bright');
  try {
    const response = await makeRequest('POST', '/api/auth/mock-login', {
      email: 'admin@company.com',
      role: 'admin'
    });

    if (response.status === 200 && (response.data?.data?.accessToken || response.data?.accessToken)) {
      const token = response.data?.data?.accessToken || response.data?.accessToken;
      log('✅ Login successful', 'green');
      log(`   Token: ${token.substring(0, 50)}...`, 'cyan');
      return token;
    } else {
      log(`❌ Login failed: ${response.status}`, 'red');
      log(`   Response: ${JSON.stringify(response.data)}`, 'red');
      return null;
    }
  } catch (error) {
    log(`❌ Login error: ${error.message}`, 'red');
    return null;
  }
}

async function testCreateEmployee(token) {
  log('\n━━━ Test 3: Create Employee ━━━', 'bright');
  const timestamp = Date.now();
  const employeeData = {
    employeeId: `AKS-${timestamp}`,
    firstName: 'AKS',
    lastName: 'Test',
    fullName: 'AKS Test User',
    email: `aks.test.${timestamp}@example.com`,
    password: 'Test1234!',
    roleName: 'employee',
    phone: '9876543210',
    department: 'IT',
    jobTitle: 'Developer'
  };

  try {
    const response = await makeRequest('POST', '/api/hr/employees', employeeData, token);
    
    if (response.status === 200 || response.status === 201) {
      log('✅ Employee created successfully', 'green');
      log(`   Employee ID: ${response.data?.data?.employeeId || employeeData.employeeId}`, 'cyan');
      log(`   Email: ${employeeData.email}`, 'cyan');
      return response.data?.data?.employeeId || employeeData.employeeId;
    } else {
      log(`❌ Employee creation failed: ${response.status}`, 'red');
      log(`   Response: ${JSON.stringify(response.data)}`, 'red');
      return null;
    }
  } catch (error) {
    log(`❌ Employee creation error: ${error.message}`, 'red');
    return null;
  }
}

async function testGetEmployees(token) {
  log('\n━━━ Test 4: Get Employees ━━━', 'bright');
  try {
    const response = await makeRequest('GET', '/api/hr/employees', null, token);
    
    if (response.status === 200) {
      log('✅ Get employees successful', 'green');
      const count = response.data?.data?.length || response.data?.length || 0;
      log(`   Total employees: ${count}`, 'cyan');
      return true;
    } else {
      log(`❌ Get employees failed: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Get employees error: ${error.message}`, 'red');
    return false;
  }
}

async function testGetEmployeeById(token, employeeId) {
  log('\n━━━ Test 5: Get Employee by ID ━━━', 'bright');
  try {
    const response = await makeRequest('GET', `/api/hr/employees/${employeeId}`, null, token);
    
    if (response.status === 200) {
      log('✅ Get employee by ID successful', 'green');
      log(`   Employee: ${response.data?.data?.fullName || response.data?.data?.firstName}`, 'cyan');
      return true;
    } else {
      log(`❌ Get employee by ID failed: ${response.status}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Get employee by ID error: ${error.message}`, 'red');
    return false;
  }
}

async function runTests() {
  log('═══════════════════════════════════════════════════════', 'bright');
  log('  Testing API Endpoints on Live AKS IP', 'bright');
  log('═══════════════════════════════════════════════════════', 'bright');
  log(`Target: ${AKS_IP}`, 'cyan');
  
  const results = {
    health: false,
    login: false,
    createEmployee: false,
    getEmployees: false,
    getEmployeeById: false
  };

  // Test 1: Health Check
  results.health = await testHealth();

  // Test 2: Login
  const token = await testLogin();
  results.login = !!token;

  if (!token) {
    log('\n❌ Cannot proceed without authentication', 'red');
    return;
  }

  // Test 3: Create Employee
  const employeeId = await testCreateEmployee(token);
  results.createEmployee = !!employeeId;

  // Test 4: Get Employees
  results.getEmployees = await testGetEmployees(token);

  // Test 5: Get Employee by ID
  if (employeeId) {
    results.getEmployeeById = await testGetEmployeeById(token, employeeId);
  }

  // Summary
  log('\n═══════════════════════════════════════════════════════', 'bright');
  log('  Test Summary', 'bright');
  log('═══════════════════════════════════════════════════════', 'bright');
  
  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(r => r).length;
  
  log(`\nTotal Tests: ${total}`, 'cyan');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${total - passed}`, 'red');
  log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`, 'cyan');
  
  log('\n✅ Passed:', 'green');
  Object.entries(results).forEach(([test, result]) => {
    if (result) {
      log(`   ${test}`, 'green');
    }
  });
  
  log('\n❌ Failed:', 'red');
  Object.entries(results).forEach(([test, result]) => {
    if (!result) {
      log(`   ${test}`, 'red');
    }
  });
}

runTests().catch(error => {
  log(`\n❌ Test suite error: ${error.message}`, 'red');
  process.exit(1);
});

