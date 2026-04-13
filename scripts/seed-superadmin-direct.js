#!/usr/bin/env node

/**
 * Direct Superadmin Seed Script
 * 
 * Creates superadmin directly in database (bypasses API)
 * 
 * Usage:
 *   node scripts/seed-superadmin-direct.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB Connection (must be provided via environment)
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

// Superadmin Configuration
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

// User Schema (simplified)
const userSchema = new mongoose.Schema({
  tenantId: String,
  employee_id: String,
  name: String,
  email: String,
  phone: String,
  password: String,
  role: String,
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

async function seedSuperadmin() {
  try {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI/MONGO_URI is required. Refusing to use hardcoded credentials.');
    }
    console.log('🚀 Starting Superadmin Seed...');
    console.log('=====================================\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    console.log(`   URI: ${MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`);
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000
    });
    
    console.log('✅ Connected to MongoDB\n');

    // Check if user already exists
    const existingUser = await User.findOne({
      tenantId: SUPERADMIN.tenantId,
      email: SUPERADMIN.email
    });

    if (existingUser) {
      console.log('⚠️  Superadmin already exists!');
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Employee ID: ${existingUser.employee_id}`);
      console.log(`   Created: ${existingUser.createdAt}`);
      console.log('\n✅ Superadmin is ready to use!');
      console.log('\n🔐 Login Credentials:');
      console.log(`   Email: ${SUPERADMIN.email}`);
      console.log(`   Password: ${SUPERADMIN.password}`);
      console.log(`   Tenant: ${SUPERADMIN.tenantId}`);
    } else {
      // Hash password
      console.log('🔐 Hashing password...');
      const hashedPassword = await bcrypt.hash(SUPERADMIN.password, 10);

      // Create superadmin user
      console.log('👤 Creating superadmin user...');
      const user = new User({
        ...SUPERADMIN,
        password: hashedPassword
      });

      await user.save();
      
      console.log('✅ Superadmin created successfully!');
      console.log('\n🔐 Login Credentials:');
      console.log(`   Email: ${SUPERADMIN.email}`);
      console.log(`   Password: ${SUPERADMIN.password}`);
      console.log(`   Tenant: ${SUPERADMIN.tenantId}`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Done!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run seed
if (require.main === module) {
  seedSuperadmin();
}

module.exports = { seedSuperadmin };
