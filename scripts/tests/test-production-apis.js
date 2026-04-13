#!/usr/bin/env node

const axios = require('axios');
const https = require('https');

// Allow self-signed certificates for testing
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

const BASE_URL = process.env.BASE_URL || 'https://api.etelios.com';
const API_BASE_URL = `${BASE_URL}`;

console.log(`🧪 Testing Production APIs at ${API_BASE_URL}\n`);

let authToken = null;

async function testHealth() {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, { httpsAgent });
    console.log('✅ Health check: PASS');
    console.log('   Status:', response.status);
    return true;
  } catch (error) {
    console.log('❌ Health check: FAIL');
    console.log('   Error:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function testLogin() {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      emailOrEmployeeId: 'admin@etelios.com',
      password: 'Admin@123456'
    }, { httpsAgent });
    
    if (response.data && response.data.data && response.data.data.accessToken) {
      authToken = response.data.data.accessToken;
      console.log('✅ Login: PASS');
      console.log('   User:', response.data.data.user?.email || 'N/A');
      return true;
    } else if (response.data && response.data.accessToken) {
      authToken = response.data.accessToken;
      console.log('✅ Login: PASS (direct format)');
      return true;
    } else {
      console.log('❌ Login: FAIL - No token in response');
      console.log('   Response:', JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    console.log('❌ Login: FAIL');
    console.log('   Error:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function testGetProfile(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent
    });
    console.log('✅ Get Profile: PASS');
    console.log('   User:', response.data.user?.email || response.data.data?.user?.email || 'N/A');
    return true;
  } catch (error) {
    console.log('❌ Get Profile: FAIL');
    console.log('   Error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testGetEmployees(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/hr/employees`, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent
    });
    console.log('✅ Get Employees: PASS');
    const data = response.data.data || response.data;
    console.log('   Count:', Array.isArray(data) ? data.length : 'N/A');
    return true;
  } catch (error) {
    console.log('❌ Get Employees: FAIL');
    console.log('   Error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testGetDepartments(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/hr/departments`, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent
    });
    console.log('✅ Get Departments: PASS');
    const data = response.data.data || response.data;
    console.log('   Count:', Array.isArray(data) ? data.length : 'N/A');
    return true;
  } catch (error) {
    console.log('❌ Get Departments: FAIL');
    console.log('   Error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testGetStores(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/hr/stores`, {
      headers: { Authorization: `Bearer ${token}` },
      httpsAgent
    });
    console.log('✅ Get Stores: PASS');
    const data = response.data.data || response.data;
    console.log('   Count:', Array.isArray(data) ? data.length : 'N/A');
    return true;
  } catch (error) {
    console.log('❌ Get Stores: FAIL');
    console.log('   Error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testRegisterEmployee(token) {
  try {
    const testEmployee = {
      employee_id: `TEST-${Date.now()}`,
      name: 'Test Employee',
      email: `test${Date.now()}@example.com`,
      phone: '+1234567890',
      password: 'Test@123456',
      role: 'employee',
      department: 'Engineering',
      designation: 'Software Engineer',
      joining_date: new Date().toISOString().split('T')[0]
    };
    
    const response = await axios.post(`${API_BASE_URL}/api/auth/register`, testEmployee, {
      httpsAgent
    });
    
    console.log('✅ Register Employee: PASS');
    console.log('   Employee ID:', response.data.data?.employee_id || response.data.employee_id || 'N/A');
    return true;
  } catch (error) {
    console.log('❌ Register Employee: FAIL');
    console.log('   Error:', error.response?.data?.message || error.message);
    if (error.response?.data) {
      console.log('   Details:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('PRODUCTION API TESTS');
  console.log('='.repeat(60));
  console.log('');
  
  const results = {
    health: false,
    login: false,
    profile: false,
    employees: false,
    departments: false,
    stores: false,
    register: false
  };
  
  // Test 1: Health Check
  console.log('1️⃣  Testing Health Check...');
  results.health = await testHealth();
  console.log('');
  
  // Test 2: Login
  console.log('2️⃣  Testing Login...');
  results.login = await testLogin();
  console.log('');
  
  if (!authToken) {
    console.log('⚠️  Cannot continue without auth token');
    return;
  }
  
  // Test 3: Get Profile
  console.log('3️⃣  Testing Get Profile...');
  results.profile = await testGetProfile(authToken);
  console.log('');
  
  // Test 4: Get Employees
  console.log('4️⃣  Testing Get Employees...');
  results.employees = await testGetEmployees(authToken);
  console.log('');
  
  // Test 5: Get Departments
  console.log('5️⃣  Testing Get Departments...');
  results.departments = await testGetDepartments(authToken);
  console.log('');
  
  // Test 6: Get Stores
  console.log('6️⃣  Testing Get Stores...');
  results.stores = await testGetStores(authToken);
  console.log('');
  
  // Test 7: Register Employee
  console.log('7️⃣  Testing Register Employee (Public Endpoint)...');
  results.register = await testRegisterEmployee(authToken);
  console.log('');
  
  // Summary
  console.log('='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  console.log(`Passed: ${passed}/${total}`);
  console.log('');
  
  Object.entries(results).forEach(([test, result]) => {
    console.log(`${result ? '✅' : '❌'} ${test}`);
  });
  
  console.log('');
  console.log('='.repeat(60));
}

runTests().catch(console.error);
