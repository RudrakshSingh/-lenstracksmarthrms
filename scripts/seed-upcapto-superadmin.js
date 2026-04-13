#!/usr/bin/env node

/**
 * Upcapto Superadmin Seed Script
 * 
 * Creates Upcapto superadmin user in the database
 * 
 * Usage:
 *   MONGODB_URI="mongodb://..." node scripts/seed-upcapto-superadmin.js
 * 
 * OR via API (if first user registration is allowed):
 *   BASE_URL="http://..." node scripts/seed-upcapto-superadmin.js --api
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const axios = require('axios');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const BASE_URL = process.env.BASE_URL || 'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';
const USE_API = process.argv.includes('--api');

// Upcapto Superadmin Configuration
const SUPERADMIN = {
  tenantId: 'upcapto',
  employee_id: 'UPCAPTO-ADMIN-001',
  name: 'Upcapto Super Admin',
  email: 'admin@upcapto.com',
  phone: '+91-9876543210',
  password: 'Upcapto@2026',
  role: 'superadmin',
  department: 'HR',
  band_level: 'A',
  hierarchy_level: 'NATIONAL',
  designation: 'Super Administrator',
  joining_date: new Date(),
  status: 'active',
  is_active: true,
  mustChangePassword: false,
  passwordTemporary: false
};

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Method 1: Create via API
async function createViaAPI() {
  log('\n🌐 Creating Superadmin via API...', 'blue');
  log('=====================================\n', 'blue');

  try {
    const response = await axios.post(`${BASE_URL}/api/auth/register`, {
      email: SUPERADMIN.email,
      password: SUPERADMIN.password,
      name: SUPERADMIN.name,
      employee_id: SUPERADMIN.employee_id,
      role: SUPERADMIN.role,
      tenantId: SUPERADMIN.tenantId,
      department: SUPERADMIN.department,
      band_level: SUPERADMIN.band_level,
      hierarchy_level: SUPERADMIN.hierarchy_level,
      designation: SUPERADMIN.designation,
      phone: SUPERADMIN.phone,
      status: SUPERADMIN.status,
      is_active: SUPERADMIN.is_active,
      mustChangePassword: SUPERADMIN.mustChangePassword,
      passwordTemporary: SUPERADMIN.passwordTemporary
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
      validateStatus: () => true
    });

    if (response.status === 200 || response.status === 201) {
      if (response.data.success) {
        log('✅ Superadmin created successfully via API!', 'green');
        log('\n🔐 Login Credentials:', 'cyan');
        log(`   Email: ${SUPERADMIN.email}`, 'cyan');
        log(`   Password: ${SUPERADMIN.password}`, 'cyan');
        log(`   Tenant: ${SUPERADMIN.tenantId}`, 'cyan');
        return true;
      } else {
        log(`❌ API returned error: ${response.data.message || JSON.stringify(response.data)}`, 'red');
        return false;
      }
    } else {
      log(`❌ API returned status ${response.status}: ${response.data.message || JSON.stringify(response.data)}`, 'red');
      return false;
    }
  } catch (error) {
    if (error.response) {
      log(`❌ API Error: ${error.response.status} - ${error.response.data?.message || JSON.stringify(error.response.data)}`, 'red');
    } else {
      log(`❌ Network Error: ${error.message}`, 'red');
    }
    return false;
  }
}

// Method 2: Create via Direct Database
async function createViaDatabase() {
  log('\n💾 Creating Superadmin via Database...', 'blue');
  log('=====================================\n', 'blue');

  if (!MONGODB_URI) {
    log('❌ MONGODB_URI is required for database seeding', 'red');
    log('\n💡 Usage:', 'yellow');
    log('   MONGODB_URI="mongodb://user:password@host:27017/dbname" node scripts/seed-upcapto-superadmin.js', 'yellow');
    return false;
  }

  try {
    log('📡 Connecting to MongoDB...', 'cyan');
    log(`   URI: ${MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`, 'cyan');

    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000
    });

    log('✅ Connected to MongoDB\n', 'green');

    // User Schema (simplified - matches auth-service model)
    const userSchema = new mongoose.Schema({
      tenantId: { type: String, required: true, index: true },
      employee_id: { type: String, required: true },
      name: String,
      email: { type: String, required: true, unique: true, lowercase: true },
      phone: String,
      password: { type: String, required: true },
      role: { type: String, required: true },
      department: String,
      band_level: String,
      hierarchy_level: String,
      designation: String,
      joining_date: Date,
      status: String,
      is_active: Boolean,
      mustChangePassword: Boolean,
      passwordTemporary: Boolean,
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    }, { collection: 'users', strict: false });

    const User = mongoose.model('User', userSchema);

    // Check if user already exists
    log('🔍 Checking if superadmin already exists...', 'cyan');
    const existingUser = await User.findOne({
      tenantId: SUPERADMIN.tenantId,
      email: SUPERADMIN.email.toLowerCase()
    });

    if (existingUser) {
      log('⚠️  Superadmin already exists!', 'yellow');
      log(`   Email: ${existingUser.email}`, 'cyan');
      log(`   Employee ID: ${existingUser.employee_id}`, 'cyan');
      log(`   Role: ${existingUser.role}`, 'cyan');
      log(`   Status: ${existingUser.status}`, 'cyan');
      log(`   Created: ${existingUser.createdAt}`, 'cyan');
      log('\n✅ Superadmin is ready to use!', 'green');
      log('\n🔐 Login Credentials:', 'cyan');
      log(`   Email: ${SUPERADMIN.email}`, 'cyan');
      log(`   Password: ${SUPERADMIN.password}`, 'cyan');
      log(`   Tenant: ${SUPERADMIN.tenantId}`, 'cyan');
    } else {
      // Hash password
      log('🔐 Hashing password...', 'cyan');
      const hashedPassword = await bcrypt.hash(SUPERADMIN.password, 10);

      // Create superadmin user
      log('👤 Creating superadmin user...', 'cyan');
      const user = new User({
        ...SUPERADMIN,
        email: SUPERADMIN.email.toLowerCase(),
        password: hashedPassword
      });

      await user.save();

      log('✅ Superadmin created successfully!', 'green');
      log('\n🔐 Login Credentials:', 'cyan');
      log(`   Email: ${SUPERADMIN.email}`, 'cyan');
      log(`   Password: ${SUPERADMIN.password}`, 'cyan');
      log(`   Tenant: ${SUPERADMIN.tenantId}`, 'cyan');
    }

    await mongoose.connection.close();
    log('\n✅ Done!', 'green');
    return true;

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    if (error.message.includes('timeout')) {
      log('\n💡 Troubleshooting:', 'yellow');
      log('   1. Check MongoDB/DocumentDB connection string', 'yellow');
      log('   2. Verify network connectivity', 'yellow');
      log('   3. Check security group rules (for DocumentDB)', 'yellow');
      log('   4. Try API method instead: node scripts/seed-upcapto-superadmin.js --api', 'yellow');
    }
    console.error(error);
    return false;
  }
}

// Main function
async function seedUpcaptoSuperadmin() {
  try {
    log('\n🚀 Starting Upcapto Superadmin Seed...', 'blue');
    log('=====================================\n', 'blue');

    let success = false;

    if (USE_API) {
      // Try API method first
      success = await createViaAPI();
      if (!success) {
        log('\n⚠️  API method failed. Trying database method...', 'yellow');
        success = await createViaDatabase();
      }
    } else {
      // Try database method first
      success = await createViaDatabase();
      if (!success && MONGODB_URI) {
        log('\n⚠️  Database method failed. Trying API method...', 'yellow');
        success = await createViaAPI();
      } else if (!success) {
        log('\n💡 Trying API method as fallback...', 'yellow');
        success = await createViaAPI();
      }
    }

    if (success) {
      log('\n🎉 Upcapto Superadmin Setup Complete!', 'green');
      log('=====================================\n', 'green');
      log('📝 Next Steps:', 'cyan');
      log('   1. Login with credentials above', 'cyan');
      log('   2. Create tenants: node scripts/seed-complete-system.js', 'cyan');
      log('   3. Test APIs: node scripts/test-complete-flow.js', 'cyan');
      log('');
    } else {
      log('\n❌ Failed to create superadmin', 'red');
      log('\n💡 Options:', 'yellow');
      log('   1. Provide MONGODB_URI for database seeding', 'yellow');
      log('   2. Try API method: node scripts/seed-upcapto-superadmin.js --api', 'yellow');
      log('   3. Create user manually via database admin tool', 'yellow');
      process.exit(1);
    }

  } catch (error) {
    log(`\n❌ Fatal Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run seed
if (require.main === module) {
  seedUpcaptoSuperadmin();
}

module.exports = { seedUpcaptoSuperadmin };
