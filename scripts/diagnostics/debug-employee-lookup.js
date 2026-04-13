#!/usr/bin/env node

/**
 * Debug script to check employee lookup
 */

const http = require('http');

const BASE_URL = 'http://localhost:3002';
let authToken = null;
const employeeId = process.argv[2] || 'EMP-1767193370925';

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

async function debug() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Debug Employee Lookup');
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
    return;
  }

  // Get all employees and find this one
  console.log('2. Getting all employees...');
  try {
    const listRes = await makeRequest('GET', `${BASE_URL}/api/hr/employees?limit=100`, null, authToken);
    
    if (listRes.status === 200) {
      const employees = listRes.data?.data?.employees || listRes.data?.employees || [];
      console.log(`✅ Found ${employees.length} employees`);
      
      // Find the employee
      const found = employees.find(e => {
        const empId = e.employeeId || e.employee_id;
        return empId === employeeId || empId === employeeId.toUpperCase();
      });
      
      if (found) {
        console.log(`\n✅ Employee found in list!`);
        console.log(`   Employee ID: ${found.employeeId || found.employee_id}`);
        console.log(`   Name: ${found.fullName || found.firstName + ' ' + found.lastName}`);
        console.log(`   Email: ${found.email}`);
        console.log(`   MongoDB ID: ${found._id || found.id}`);
        console.log(`\n   Full object keys: ${Object.keys(found).join(', ')}`);
      } else {
        console.log(`\n❌ Employee NOT found in list`);
        console.log(`   Searching for: ${employeeId}`);
        console.log(`   First 3 employees:`, employees.slice(0, 3).map(e => ({
          id: e.employeeId || e.employee_id,
          name: e.fullName || e.firstName + ' ' + e.lastName
        })));
      }
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  // Try direct lookup
  console.log(`\n3. Direct lookup by ID: ${employeeId}...`);
  try {
    const getRes = await makeRequest('GET', `${BASE_URL}/api/hr/employees/${employeeId}`, null, authToken);
    
    if (getRes.status === 200) {
      console.log('✅ Employee found via direct lookup!');
      const emp = getRes.data?.data || getRes.data;
      console.log(`   Employee ID: ${emp.employeeId || emp.employee_id}`);
    } else {
      console.log(`❌ Direct lookup failed: ${JSON.stringify(getRes.data)}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

debug();

