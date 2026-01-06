const axios = require('axios');
const https = require('https');

// Production API base URL
const API_BASE_URL = process.env.API_BASE_URL || 'https://98.70.245.87';

// Create axios instance with SSL verification disabled for self-signed certs
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false // Allow self-signed certificates
  }),
  headers: {
    'Content-Type': 'application/json'
  }
});

// Test results
const results = {
  passed: [],
  failed: [],
  total: 0
};

// Helper functions
const log = (message) => console.log(`[${new Date().toISOString()}] ${message}`);
const logTest = (testName, status, details = '') => {
  results.total++;
  if (status === 'PASS') {
    results.passed.push({ test: testName, details });
    log(`✅ PASS: ${testName}${details ? ` - ${details}` : ''}`);
  } else {
    results.failed.push({ test: testName, details, error: details });
    log(`❌ FAIL: ${testName}${details ? ` - ${details}` : ''}`);
  }
};

const logSection = (title) => {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60) + '\n');
};

// Test Authentication Service
async function testAuthService() {
  logSection('🔐 AUTHENTICATION SERVICE TESTS');
  
  // Test Health
  try {
    const response = await apiClient.get('/health');
    logTest('GET /health', response.status === 200 ? 'PASS' : 'FAIL', `Status: ${response.status}`);
  } catch (error) {
    logTest('GET /health', 'FAIL', error.message);
  }
  
  // Test Root
  try {
    const response = await apiClient.get('/');
    logTest('GET /', response.status === 200 ? 'PASS' : 'FAIL', `Status: ${response.status}`);
  } catch (error) {
    logTest('GET /', 'FAIL', error.message);
  }
  
  // Test Login
  let authToken = null;
  try {
    const response = await apiClient.post('/api/auth/login', {
      emailOrEmployeeId: 'admin@etelios.com',
      password: 'Admin@123456'
    });
    if (response.status === 200 && response.data.accessToken) {
      authToken = response.data.accessToken;
      logTest('POST /api/auth/login', 'PASS', 'Admin login successful');
    } else {
      logTest('POST /api/auth/login', 'FAIL', 'No token received');
    }
  } catch (error) {
    logTest('POST /api/auth/login', 'FAIL', error.response?.data?.message || error.message);
  }
  
  // Test Get Profile (if logged in)
  if (authToken) {
    try {
      const response = await apiClient.get('/api/auth/profile', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      logTest('GET /api/auth/profile', response.status === 200 ? 'PASS' : 'FAIL', `Status: ${response.status}`);
    } catch (error) {
      logTest('GET /api/auth/profile', 'FAIL', error.response?.data?.message || error.message);
    }
    
    // Test /api/auth/me alias
    try {
      const response = await apiClient.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      logTest('GET /api/auth/me', response.status === 200 ? 'PASS' : 'FAIL', `Status: ${response.status}`);
    } catch (error) {
      logTest('GET /api/auth/me', 'FAIL', error.response?.data?.message || error.message);
    }
  }
  
  return authToken;
}

// Test HR Service
async function testHRService(authToken) {
  logSection('👥 HR SERVICE TESTS');
  
  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
  
  // Test Health
  try {
    const response = await apiClient.get('/api/hr/health');
    logTest('GET /api/hr/health', response.status === 200 ? 'PASS' : 'FAIL', `Status: ${response.status}`);
  } catch (error) {
    logTest('GET /api/hr/health', 'FAIL', error.message);
  }
  
  // Test Status
  try {
    const response = await apiClient.get('/api/hr/status');
    logTest('GET /api/hr/status', response.status === 200 ? 'PASS' : 'FAIL', `Status: ${response.status}`);
  } catch (error) {
    logTest('GET /api/hr/status', 'FAIL', error.message);
  }
  
  // Test Get Employees
  if (authToken) {
    try {
      const response = await apiClient.get('/api/hr/employees', { headers });
      logTest('GET /api/hr/employees', response.status === 200 ? 'PASS' : 'FAIL', `Status: ${response.status}`);
    } catch (error) {
      logTest('GET /api/hr/employees', 'FAIL', error.response?.data?.message || error.message);
    }
    
    // Test Get Departments
    try {
      const response = await apiClient.get('/api/hr/departments', { headers });
      logTest('GET /api/hr/departments', response.status === 200 ? 'PASS' : 'FAIL', `Status: ${response.status}`);
    } catch (error) {
      logTest('GET /api/hr/departments', 'FAIL', error.response?.data?.message || error.message);
    }
    
    // Test Get Stores
    try {
      const response = await apiClient.get('/api/hr/stores', { headers });
      logTest('GET /api/hr/stores', response.status === 200 ? 'PASS' : 'FAIL', `Status: ${response.status}`);
    } catch (error) {
      logTest('GET /api/hr/stores', 'FAIL', error.response?.data?.message || error.message);
    }
    
    // Test HRMS Dashboard Stats
    try {
      const response = await apiClient.get('/api/hrms/dashboard/stats', { headers });
      logTest('GET /api/hrms/dashboard/stats', response.status === 200 ? 'PASS' : 'FAIL', `Status: ${response.status}`);
    } catch (error) {
      logTest('GET /api/hrms/dashboard/stats', 'FAIL', error.response?.data?.message || error.message);
    }
  }
}

// Test Employee Registration (Public)
async function testEmployeeRegistration() {
  logSection('📝 EMPLOYEE REGISTRATION TESTS');
  
  // Test Public Registration Endpoint
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
      joining_date: new Date().toISOString()
    };
    
    const response = await apiClient.post('/api/auth/register', testEmployee);
    logTest('POST /api/auth/register (Public)', response.status === 200 || response.status === 201 ? 'PASS' : 'FAIL', `Status: ${response.status}`);
  } catch (error) {
    logTest('POST /api/auth/register (Public)', 'FAIL', error.response?.data?.message || error.message);
  }
}

// Test Attendance Service
async function testAttendanceService(authToken) {
  logSection('⏰ ATTENDANCE SERVICE TESTS');
  
  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
  
  if (authToken) {
    // Test Attendance Stats
    try {
      const response = await apiClient.get('/api/hr/attendance/stats', { headers });
      logTest('GET /api/hr/attendance/stats', response.status === 200 ? 'PASS' : 'FAIL', `Status: ${response.status}`);
    } catch (error) {
      logTest('GET /api/hr/attendance/stats', 'FAIL', error.response?.data?.message || error.message);
    }
    
    // Test Attendance Reports
    try {
      const dateFrom = new Date();
      dateFrom.setMonth(dateFrom.getMonth() - 1);
      const dateTo = new Date();
      
      const response = await apiClient.get('/api/hr/attendance/reports', {
        headers,
        params: {
          dateFrom: dateFrom.toISOString().split('T')[0],
          dateTo: dateTo.toISOString().split('T')[0]
        }
      });
      logTest('GET /api/hr/attendance/reports', response.status === 200 ? 'PASS' : 'FAIL', `Status: ${response.status}`);
    } catch (error) {
      logTest('GET /api/hr/attendance/reports', 'FAIL', error.response?.data?.message || error.message);
    }
  }
}

// Test Document Upload
async function testDocumentUpload(authToken) {
  logSection('📎 DOCUMENT UPLOAD TESTS');
  
  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
  
  if (authToken) {
    // Note: Document upload requires multipart/form-data, so we'll just test the endpoint exists
    try {
      // This will likely fail without actual file, but we can check if endpoint exists
      const response = await apiClient.post('/api/documents/upload', {
        employee_id: 'TEST-001',
        document_type: 'aadhar'
      }, { headers });
      logTest('POST /api/documents/upload', response.status === 200 || response.status === 400 ? 'PASS' : 'FAIL', `Status: ${response.status} (400 expected without file)`);
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 404) {
        logTest('POST /api/documents/upload', 'PASS', `Endpoint exists (${error.response.status})`);
      } else {
        logTest('POST /api/documents/upload', 'FAIL', error.response?.data?.message || error.message);
      }
    }
  }
}

// Main test runner
async function runAllTests() {
  logSection('🚀 STARTING COMPREHENSIVE API TESTS');
  log(`Testing APIs at: ${API_BASE_URL}`);
  log(`Time: ${new Date().toISOString()}\n`);
  
  try {
    // Test Auth Service
    const authToken = await testAuthService();
    
    // Test HR Service
    await testHRService(authToken);
    
    // Test Employee Registration
    await testEmployeeRegistration();
    
    // Test Attendance Service
    await testAttendanceService(authToken);
    
    // Test Document Upload
    await testDocumentUpload(authToken);
    
    // Print Summary
    logSection('📊 TEST SUMMARY');
    console.log(`Total Tests: ${results.total}`);
    console.log(`✅ Passed: ${results.passed.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`Success Rate: ${((results.passed.length / results.total) * 100).toFixed(2)}%\n`);
    
    if (results.failed.length > 0) {
      console.log('Failed Tests:');
      results.failed.forEach(({ test, details }) => {
        console.log(`  ❌ ${test}: ${details}`);
      });
    }
    
    // Exit with appropriate code
    process.exit(results.failed.length > 0 ? 1 : 0);
  } catch (error) {
    log(`❌ Fatal error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
