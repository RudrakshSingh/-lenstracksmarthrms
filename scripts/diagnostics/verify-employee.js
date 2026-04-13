#!/usr/bin/env node

/**
 * Verify employee was created in main database
 */

const http = require('http');

const BASE_URL = 'http://localhost:3002';
let authToken = null;
const employeeId = process.argv[2] || 'EMP-1767193037115';

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

async function verify() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Verifying Employee in Main Database');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`Employee ID: ${employeeId}\n`);

  // Login
  console.log('1. Logging in...');
  try {
    const loginRes = await makeRequest('POST', `${BASE_URL}/api/auth/mock-login`, {
      email: 'admin@company.com',
      role: 'admin'
    });
    
    if (loginRes.status === 200 && (loginRes.data?.data?.accessToken || loginRes.data?.accessToken)) {
      authToken = loginRes.data?.data?.accessToken || loginRes.data?.accessToken;
      console.log('✅ Login successful\n');
    } else {
      console.log('❌ Login failed');
      return;
    }
  } catch (error) {
    console.log(`❌ Connection error: ${error.message}`);
    console.log('   Make sure HR service is running on port 3002');
    return;
  }

  // Get employee by ID
  console.log(`2. Getting employee by ID: ${employeeId}...`);
  try {
    const getRes = await makeRequest('GET', `${BASE_URL}/api/hr/employees/${employeeId}`, null, authToken);
    
    if (getRes.status === 200) {
      console.log('✅ Employee found!');
      const emp = getRes.data?.data || getRes.data;
      console.log('\nEmployee Details:');
      console.log(`   Employee ID: ${emp.employeeId || emp.employee_id}`);
      console.log(`   Name: ${emp.fullName || emp.firstName + ' ' + emp.lastName}`);
      console.log(`   Email: ${emp.email}`);
      console.log(`   Department: ${emp.department}`);
      console.log(`   Status: ${emp.status}`);
      console.log(`   MongoDB ID: ${emp._id || emp.id}`);
      console.log('\n✅ Employee is in MAIN database (etelios_hr_service)');
    } else {
      console.log(`❌ Employee not found: ${JSON.stringify(getRes.data)}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  // Get all employees
  console.log('\n3. Getting all employees...');
  try {
    const listRes = await makeRequest('GET', `${BASE_URL}/api/hr/employees?limit=5`, null, authToken);
    
    if (listRes.status === 200) {
      const employees = listRes.data?.data?.employees || listRes.data?.employees || [];
      console.log(`✅ Found ${employees.length} employees`);
      const found = employees.find(e => (e.employeeId || e.employee_id) === employeeId);
      if (found) {
        console.log(`✅ Employee ${employeeId} is in the list!`);
      } else {
        console.log(`⚠️  Employee ${employeeId} not in first 5 results (might be paginated)`);
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

verify();

