/**
 * Check Employee Tenant IDs in Database
 * This script checks what tenantId values are actually stored in the database
 */

const mongoose = require('mongoose');
const https = require('https');
const http = require('http');

const API_BASE = process.env.API_BASE || 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com';

// MongoDB connection (using production DocumentDB)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://lenstrack-docdb-cluster.cluster-cl002m0xqjq0x.ap-south-1.docdb.amazonaws.com:27017/etelios?tls=true&tlsCAFile=/etc/ssl/certs/rds-ca-2019-root.pem&retryWrites=false&authSource=admin&authMechanism=SCRAM-SHA-1';

// Upcapto credentials
const UPCAPTO_EMAIL = 'admin@upcapto.com';
const UPCAPTO_PASSWORD = 'Upcapto@2026';

// Helper function to make HTTP requests
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
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Login and get tenantId from JWT
async function loginAndGetTenantId() {
  console.log('\n📝 Login to get tenantId from JWT');
  try {
    const response = await makeRequest(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      body: { email: UPCAPTO_EMAIL, password: UPCAPTO_PASSWORD }
    });
    
    if (response.status === 200 && response.data.success) {
      const token = response.data.data?.accessToken || response.data.accessToken;
      const user = response.data.data?.user || response.data.user;
      const tenantIdFromUser = user?.tenantId;
      
      // Decode JWT to get tenantId
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(token);
      const tenantIdFromToken = decoded?.tenantId;
      
      console.log('✅ Login successful');
      console.log(`   TenantId from user object: ${tenantIdFromUser}`);
      console.log(`   TenantId from JWT token: ${tenantIdFromToken}`);
      console.log(`   User email: ${user?.email}`);
      console.log(`   User role: ${user?.role}`);
      
      return {
        token,
        tenantId: tenantIdFromToken || tenantIdFromUser,
        userId: user?._id || user?.id
      };
    } else {
      console.log('❌ Login failed:', response.data);
      return null;
    }
  } catch (error) {
    console.log('❌ Login error:', error.message);
    return null;
  }
}

// Connect to MongoDB and check employees
async function checkDatabaseEmployees(tenantId) {
  console.log('\n📊 Checking Database for Employees');
  console.log(`   Looking for tenantId: ${tenantId}`);
  
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      tls: true,
      tlsInsecure: false,
      retryWrites: false,
      authSource: 'admin',
      authMechanism: 'SCRAM-SHA-1'
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Get User model
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    
    // Check all unique tenantIds in database
    const allTenantIds = await User.distinct('tenantId');
    console.log(`\n📋 All unique tenantIds in database:`, allTenantIds);
    
    // Count employees by tenantId (exact match)
    const exactMatch = await User.countDocuments({ 
      isDeleted: { $ne: true },
      tenantId: tenantId 
    });
    console.log(`\n📊 Employees with exact tenantId match ('${tenantId}'): ${exactMatch}`);
    
    // Count employees by tenantId (case-insensitive - lowercase)
    const lowerMatch = await User.countDocuments({ 
      isDeleted: { $ne: true },
      tenantId: tenantId.toLowerCase() 
    });
    console.log(`📊 Employees with lowercase tenantId match ('${tenantId.toLowerCase()}'): ${lowerMatch}`);
    
    // Count employees by tenantId (case-insensitive - uppercase)
    const upperMatch = await User.countDocuments({ 
      isDeleted: { $ne: true },
      tenantId: tenantId.toUpperCase() 
    });
    console.log(`📊 Employees with uppercase tenantId match ('${tenantId.toUpperCase()}'): ${upperMatch}`);
    
    // Get sample employees with different tenantIds
    const sampleEmployees = await User.find({ isDeleted: { $ne: true } })
      .select('employeeId email tenantId status')
      .limit(10)
      .lean();
    
    console.log(`\n📋 Sample employees (first 10):`);
    sampleEmployees.forEach((emp, index) => {
      console.log(`   ${index + 1}. ${emp.employeeId || 'N/A'} - ${emp.email || 'N/A'} - tenantId: '${emp.tenantId}' - status: ${emp.status || 'N/A'}`);
    });
    
    // Count all employees (no tenant filter)
    const totalEmployees = await User.countDocuments({ isDeleted: { $ne: true } });
    console.log(`\n📊 Total employees (all tenants): ${totalEmployees}`);
    
    // Count employees with null/undefined tenantId
    const nullTenantId = await User.countDocuments({ 
      isDeleted: { $ne: true },
      $or: [
        { tenantId: { $exists: false } },
        { tenantId: null },
        { tenantId: '' }
      ]
    });
    console.log(`📊 Employees with null/undefined/empty tenantId: ${nullTenantId}`);
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    
    return {
      exactMatch,
      lowerMatch,
      upperMatch,
      totalEmployees,
      nullTenantId,
      allTenantIds
    };
  } catch (error) {
    console.log('❌ Database error:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    return null;
  }
}

// Main
async function main() {
  console.log('🔍 Checking Employee Tenant IDs in Database');
  console.log('='.repeat(60));
  
  // Step 1: Login and get tenantId
  const loginResult = await loginAndGetTenantId();
  if (!loginResult) {
    console.log('\n❌ Cannot proceed without login');
    return;
  }
  
  const { tenantId } = loginResult;
  console.log(`\n🎯 Using tenantId: '${tenantId}'`);
  
  // Step 2: Check database
  const dbResult = await checkDatabaseEmployees(tenantId);
  
  // Step 3: Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary');
  console.log('='.repeat(60));
  console.log(`TenantId from login: '${tenantId}'`);
  if (dbResult) {
    console.log(`Exact match count: ${dbResult.exactMatch}`);
    console.log(`Lowercase match count: ${dbResult.lowerMatch}`);
    console.log(`Uppercase match count: ${dbResult.upperMatch}`);
    console.log(`Total employees: ${dbResult.totalEmployees}`);
    console.log(`Employees with null tenantId: ${dbResult.nullTenantId}`);
    console.log(`\nAll tenantIds in DB: ${dbResult.allTenantIds.join(', ')}`);
    
    if (dbResult.exactMatch === 0 && dbResult.lowerMatch === 0 && dbResult.upperMatch === 0) {
      console.log('\n⚠️  ISSUE: No employees found with this tenantId!');
      console.log('   Possible causes:');
      console.log('   1. TenantId format mismatch (case sensitivity)');
      console.log('   2. Employees stored with different tenantId');
      console.log('   3. Employees have null/undefined tenantId');
      console.log(`\n   Try using one of these tenantIds: ${dbResult.allTenantIds.slice(0, 5).join(', ')}`);
    }
  }
}

main().catch(console.error);
