/**
 * Test Employee Registration with ALL Valid Roles
 * Fixed version based on backend requirements
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BACKEND_API_URL = 'https://98.70.245.87/api';
const API_HOST = 'api.etelios.com';

// Valid roles from backend (HR Service registerBasicInfo accepts these)
const VALID_ROLES = [
  'employee',  // Default
  'hr',
  'manager',
  'admin',
  'superadmin'
];

// Note: 'accountant', 'store_manager', 'sales', 'optometrist' are NOT in the Role model enum
// They might be accepted in auth-service but NOT in hr-service /api/auth/register endpoint

async function login() {
  console.log('🔐 Logging in...');
  try {
    const res = await fetch(`${BACKEND_API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': API_HOST
      },
      body: JSON.stringify({
        email: 'admin@etelios.com',
        password: 'Admin@123456'
      })
    });

    const data = await res.json();
    
    // Backend returns: { success: true, data: { accessToken, refreshToken, user } }
    const token = data.data?.accessToken || data.accessToken || data.token;
    
    if (token) {
      console.log('✅ Login successful\n');
      return token;
    }
    
    console.error('❌ Login failed:', data);
    throw new Error('Login failed - no token received');
  } catch (error) {
    console.error('❌ Login error:', error.message);
    throw error;
  }
}

async function registerEmployee(role) {
  // Generate unique employee ID
  const timestamp = Date.now().toString().slice(-6);
  const rolePrefix = role.substring(0, 3).toUpperCase();
  const employeeId = `${rolePrefix}-${timestamp}`;
  
  // Generate unique email
  const email = `test.${role}.${timestamp}@etelios.com`;
  
  // Required fields as per backend schema (server.js line 421-439)
  const employeeData = {
    employee_id: employeeId,
    name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)} User`,
    email: email,
    phone: '9876543210', // Must be 10 digits (Indian format)
    password: 'TempPassword123!', // Min 8 characters
    role: role, // Must be one of: 'employee', 'hr', 'manager', 'admin', 'superadmin'
    // address is REQUIRED (not optional)
    address: {
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001', // Must be exactly 6 digits
      country: 'India' // Default is 'India'
    }
    // Optional fields:
    // date_of_birth: optional (must be 18+ if provided)
    // address.address_line_1: optional
    // address.street: optional
    // address.zip: optional
  };
  
  try {
    console.log(`   📤 Sending registration request...`);
    console.log(`   Payload:`, JSON.stringify(employeeData, null, 2));
    
    const res = await fetch(`${BACKEND_API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': API_HOST
        // Note: /api/auth/register is PUBLIC - no Authorization header needed
      },
      body: JSON.stringify(employeeData)
    });
    
    const contentType = res.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return {
        status: res.status,
        success: res.ok && data.success !== false,
        data: data,
        role: role,
        employeeId: employeeData.employee_id,
        email: employeeData.email
      };
    } else {
      const text = await res.text();
      return {
        status: res.status,
        success: false,
        error: 'Non-JSON response',
        response: text.substring(0, 500),
        role: role
      };
    }
  } catch (error) {
    return {
      status: 0,
      success: false,
      error: error.message,
      role: role
    };
  }
}

async function testAllRoles() {
  console.log('='.repeat(80));
  console.log('🧪 TESTING ALL VALID ROLES FOR EMPLOYEE REGISTRATION');
  console.log('='.repeat(80));
  console.log(`\n📋 Testing ${VALID_ROLES.length} valid roles:`);
  console.log(`   ${VALID_ROLES.join(', ')}\n`);
  console.log('⚠️  Note: Only roles in Role model enum are tested');
  console.log('   Extended roles (accountant, store_manager, sales, optometrist)');
  console.log('   are NOT in HR service registerBasicInfo schema\n');
  
  // Note: Login is optional since /api/auth/register is public
  // But we'll try to login anyway for consistency
  let token = null;
  try {
    token = await login();
  } catch (error) {
    console.log('⚠️  Login failed, but continuing (register endpoint is public)...\n');
  }
  
  const results = [];
  
  for (const role of VALID_ROLES) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔄 Testing Role: "${role}"`);
    console.log('-'.repeat(80));
    
    const result = await registerEmployee(role);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ SUCCESS!`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Employee ID: ${result.employeeId}`);
      console.log(`   Email: ${result.email}`);
      if (result.data) {
        console.log(`   Response:`, JSON.stringify(result.data, null, 2));
      }
    } else {
      console.log(`❌ FAILED`);
      console.log(`   Status: ${result.status}`);
      if (result.data) {
        console.log(`   Error:`, JSON.stringify(result.data, null, 2));
      } else if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.response) {
        console.log(`   Response: ${result.response.substring(0, 200)}...`);
      }
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`\n✅ Successful Registrations: ${successful.length}/${VALID_ROLES.length}`);
  if (successful.length > 0) {
    successful.forEach(r => {
      console.log(`   ✅ ${r.role.padEnd(15)} → Employee ID: ${r.employeeId}, Email: ${r.email}`);
    });
  }
  
  console.log(`\n❌ Failed Registrations: ${failed.length}/${VALID_ROLES.length}`);
  if (failed.length > 0) {
    failed.forEach(r => {
      const errorMsg = r.data?.message || r.data?.error || r.error || 'Unknown error';
      console.log(`   ❌ ${r.role.padEnd(15)} → Status: ${r.status}, Error: ${errorMsg}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('\n📝 Notes:');
  console.log('   - /api/auth/register is PUBLIC (no auth required)');
  console.log('   - Only roles in Role model enum are valid');
  console.log('   - Address field is REQUIRED');
  console.log('   - Phone must be 10 digits (Indian format)');
  console.log('   - Pincode must be exactly 6 digits');
  console.log('   - Password must be min 8 characters');
  console.log('\n' + '='.repeat(80));
  
  return results;
}

// Run tests
testAllRoles().catch(console.error);

