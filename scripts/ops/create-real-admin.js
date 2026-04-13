/**
 * Create Real Admin User in Database
 * This script creates a real admin user directly in the database
 * and generates a bearer token that can be used for all APIs
 */

require('dotenv').config({ path: require('path').join(__dirname, '../microservices/auth-service/.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../microservices/auth-service/src/models/User.model');
const Role = require('../microservices/auth-service/src/models/Role.model');

// JWT configuration (standalone, no logger dependency)
const JWT_SECRET = process.env.JWT_SECRET || 'etelios-dev-secret-key-2024';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '15m';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'etelios-refresh-secret-key-2024';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRY,
    issuer: 'hrms-backend',
    audience: 'hrms-frontend'
  });
};

const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { 
    expiresIn: JWT_REFRESH_EXPIRY,
    issuer: 'hrms-backend',
    audience: 'hrms-frontend'
  });
};

// Database connection - Use production DocumentDB
// IMPORTANT: This will create the user in PRODUCTION database
// Use global MONGODB_URI environment variable
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';
const DB_NAME = 'auth-db'; // Production auth database name

// Admin user details
const ADMIN_USER = {
  employee_id: 'ADMIN-001',
  name: 'System Administrator',
  email: 'admin@etelios.com',
  phone: '+919999999999',
  password: 'Admin@123456', // Will be hashed
  role: 'admin',
  department: 'TECH',
  designation: 'System Administrator',
  tenantId: 'default',
  band_level: 'A',
  hierarchy_level: 'NATIONAL',
  joining_date: new Date(),
  is_active: true,
  status: 'active'
};

async function connectDB() {
  try {
    // Use connection string as-is, just specify dbName in options
    // This avoids any parsing issues with special characters in password
    const mongoUri = MONGO_URI;
    
    if (!mongoUri || !mongoUri.startsWith('mongodb://')) {
      throw new Error('Invalid MONGODB_URI. Must start with mongodb://');
    }
    
    console.log('🔌 Connecting to PRODUCTION database...');
    console.log(`   Database: ${DB_NAME}`);
    const maskedUri = mongoUri.replace(/:[^:@]+@/, ':****@');
    const host = maskedUri.split('@')[1]?.split('/')[0] || maskedUri.split('@')[1]?.split('?')[0] || 'N/A';
    console.log(`   Host: ${host}`);
    
    // Connect with explicit database name in options
    // Don't modify the connection string - let Mongoose handle it
    await mongoose.connect(mongoUri, {
      dbName: DB_NAME, // This will override any database name in the URI
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      retryWrites: false,
      tls: true,
      tlsCAFile: process.env.DOCDB_TLS_CA_FILE || '/etc/ssl/certs/ca-cert.pem',
      tlsAllowInvalidCertificates: false
    });
    
    console.log('✅ Connected to database:', mongoose.connection.db.databaseName);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    if (error.message.includes('authentication') || error.message.includes('Invalid key')) {
      console.error('   💡 Issue: Password authentication failed');
      console.error('   💡 Possible causes:');
      console.error('      - Password contains special characters that need URL encoding');
      console.error('      - Connection string is incorrect');
      console.error('      - Network access not allowed from this IP');
      console.error('   💡 Solution: Check DocumentDB security groups/network ACLs and TLS CA file');
    }
    if (error.message.includes('timeout')) {
      console.error('   💡 Check: Network connectivity and firewall rules');
    }
    if (error.message.includes('Invalid scheme')) {
      console.error('   💡 Issue: Connection string format is invalid');
      console.error('   💡 Solution: Ensure MONGODB_URI starts with mongodb://');
    }
    throw error;
  }
}

async function ensureRoleExists() {
  try {
    // Check if admin role exists
    let adminRole = await Role.findOne({ name: 'admin', is_active: true });
    
    if (!adminRole) {
      console.log('📝 Creating admin role...');
      adminRole = new Role({
        name: 'admin',
        display_name: 'Administrator',
        description: 'System administrator with full access',
        permissions: [
          'read_users', 'write_users', 'delete_users', 'create_users', 'update_users',
          'read_attendance', 'write_attendance', 'approve_attendance',
          'read_reports', 'write_reports', 'export_reports',
          'read_assets', 'write_assets', 'assign_assets',
          'read_documents', 'write_documents', 'delete_documents',
          'read_transfers', 'write_transfers', 'approve_transfers',
          'read_stores', 'write_stores', 'create_stores', 'update_stores',
          'read_roles', 'write_roles', 'create_roles', 'update_roles',
          'system_admin', 'audit_logs', 'backup_restore',
          'view_dashboard', 'manage_dashboard', 'view_all_widgets', 'manage_widgets'
        ],
        is_active: true,
        is_system: true
      });
      await adminRole.save();
      console.log('✅ Admin role created');
    } else {
      console.log('✅ Admin role already exists');
    }
    
    return adminRole;
  } catch (error) {
    console.error('❌ Error ensuring role exists:', error.message);
    throw error;
  }
}

async function createAdminUser() {
  try {
    console.log('\n👤 Creating admin user...');
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: ADMIN_USER.email },
        { employee_id: ADMIN_USER.employee_id }
      ]
    });
    
    if (existingUser) {
      console.log('⚠️  Admin user already exists');
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Employee ID: ${existingUser.employee_id}`);
      console.log(`   User ID: ${existingUser._id}`);
      
      // Hash password and update if needed
      if (ADMIN_USER.password) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(ADMIN_USER.password, salt);
        existingUser.password = hashedPassword;
        existingUser.is_active = true;
        existingUser.status = 'active';
        await existingUser.save();
        console.log('✅ Password updated for existing user');
      }
      
      return existingUser;
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_USER.password, salt);
    
    // Create user
    const user = new User({
      ...ADMIN_USER,
      password: hashedPassword
    });
    
    await user.save();
    console.log('✅ Admin user created successfully');
    console.log(`   Email: ${user.email}`);
    console.log(`   Employee ID: ${user.employee_id}`);
    console.log(`   User ID: ${user._id}`);
    console.log(`   Role: ${user.role}`);
    
    return user;
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.errors) {
      console.error('   Validation errors:', JSON.stringify(error.errors, null, 2));
    }
    throw error;
  }
}

async function generateToken(user) {
  try {
    console.log('\n🔑 Generating bearer token...');
    
    const accessToken = generateAccessToken({ 
      userId: user._id.toString(), 
      role: user.role 
    });
    
    const refreshToken = generateRefreshToken({ 
      userId: user._id.toString() 
    });
    
    console.log('✅ Tokens generated successfully');
    console.log('\n📋 TOKEN INFORMATION:');
    console.log('='.repeat(80));
    console.log(`Access Token: ${accessToken}`);
    console.log(`Refresh Token: ${refreshToken}`);
    console.log('='.repeat(80));
    
    return { accessToken, refreshToken };
  } catch (error) {
    console.error('❌ Error generating token:', error.message);
    throw error;
  }
}

async function testToken(token) {
  try {
    console.log('\n🧪 Testing token with API calls...');
    
    const BASE_URL = process.env.BASE_URL || 'https://98.70.245.87';
    const headers = {
      'Host': 'api.etelios.com',
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Test 1: Get user profile
    console.log('\n1. Testing GET /api/auth/profile...');
    try {
      const profileResponse = await fetch(`${BASE_URL}/api/auth/profile`, {
        method: 'GET',
        headers: headers,
        rejectUnauthorized: false
      });
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        console.log('   ✅ Profile API working');
        console.log(`   User: ${profileData.data?.name || profileData.data?.email}`);
      } else {
        console.log(`   ⚠️  Profile API returned: ${profileResponse.status}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Profile API error: ${error.message}`);
    }
    
    // Test 2: Get employees list
    console.log('\n2. Testing GET /api/hr/employees...');
    try {
      const employeesResponse = await fetch(`${BASE_URL}/api/hr/employees?page=1&limit=10`, {
        method: 'GET',
        headers: headers,
        rejectUnauthorized: false
      });
      
      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json();
        console.log('   ✅ Employees API working');
        console.log(`   Total employees: ${employeesData.data?.total || employeesData.total || 0}`);
      } else {
        console.log(`   ⚠️  Employees API returned: ${employeesResponse.status}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Employees API error: ${error.message}`);
    }
    
    // Test 3: Create employee
    console.log('\n3. Testing POST /api/hr/employees...');
    try {
      const testEmployee = {
        firstName: 'Test',
        lastName: 'Employee',
        email: `test.${Date.now()}@etelios.com`,
        phone: '+919999999999',
        department: 'SALES',
        designation: 'Sales Executive',
        joiningDate: new Date().toISOString(),
        role: 'employee'
      };
      
      const createResponse = await fetch(`${BASE_URL}/api/hr/employees`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(testEmployee),
        rejectUnauthorized: false
      });
      
      if (createResponse.ok) {
        const createData = await createResponse.json();
        console.log('   ✅ Create Employee API working');
        console.log(`   Employee ID: ${createData.data?.employeeId || createData.data?.employee_id || 'N/A'}`);
      } else {
        const errorData = await createResponse.json().catch(() => ({}));
        console.log(`   ⚠️  Create Employee API returned: ${createResponse.status}`);
        console.log(`   Error: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`   ⚠️  Create Employee API error: ${error.message}`);
    }
    
    console.log('\n✅ Token testing completed');
    
  } catch (error) {
    console.error('❌ Error testing token:', error.message);
  }
}

async function main() {
  try {
    console.log('🚀 Creating Real Admin User in Database\n');
    console.log('='.repeat(80));
    
    // Connect to database
    await connectDB();
    
    // Ensure admin role exists
    await ensureRoleExists();
    
    // Create admin user
    const user = await createAdminUser();
    
    // Generate token
    const { accessToken, refreshToken } = await generateToken(user);
    
    // Save token to file
    const fs = require('fs');
    const tokenData = {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        employee_id: user.employee_id,
        name: user.name,
        role: user.role
      },
      createdAt: new Date().toISOString()
    };
    
    const tokenFilePath = require('path').join(__dirname, 'admin-token.json');
    fs.writeFileSync(tokenFilePath, JSON.stringify(tokenData, null, 2));
    console.log(`\n💾 Token saved to: ${tokenFilePath}`);
    
    // Test token
    await testToken(accessToken);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ SUCCESS: Real admin user created and token generated!');
    console.log('='.repeat(80));
    console.log('\n📝 Login Credentials:');
    console.log(`   Email: ${ADMIN_USER.email}`);
    console.log(`   Password: ${ADMIN_USER.password}`);
    console.log(`   Employee ID: ${ADMIN_USER.employee_id}`);
    console.log('\n🔑 Bearer Token:');
    console.log(`   ${accessToken}`);
    console.log('\n💡 Use this token in API requests:');
    console.log(`   Authorization: Bearer ${accessToken}`);
    console.log('\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { createAdminUser, generateToken };

