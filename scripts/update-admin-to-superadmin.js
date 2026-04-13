#!/usr/bin/env node

/**
 * Update existing admin user to superadmin role
 * 
 * Usage:
 *   MONGODB_URI="mongodb://..." node scripts/update-admin-to-superadmin.js
 * 
 * OR use AUTH_SERVICE_DB_URI from secrets.yaml
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB Connection - use AUTH_SERVICE_DB_URI or main MONGO_URI
// Users are stored in the main "etelios" database
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.AUTH_SERVICE_DB_URI;

// User to update
const ADMIN_EMAIL = 'admin@upcapto.com';
const TENANT_ID = 'upcapto';

// User Schema (simplified - matches auth-service model)
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
  custom_permissions: Array,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'users', strict: false });

const User = mongoose.model('User', userSchema);

async function updateToSuperadmin() {
  try {
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI is required');
      console.error('\n💡 Usage:');
      console.error('   MONGODB_URI="mongodb://user:password@host:27017/dbname" node scripts/update-admin-to-superadmin.js');
      console.error('\n💡 Or use AUTH_SERVICE_DB_URI from k8s/secrets.yaml');
      process.exit(1);
    }

    console.log('🚀 Updating Admin to Superadmin...');
    console.log('=====================================\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    console.log(`   URI: ${MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`);
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 15000
    });
    
    console.log('✅ Connected to MongoDB\n');

    // Find the user
    console.log(`🔍 Finding user: ${ADMIN_EMAIL} (tenant: ${TENANT_ID})...`);
    const user = await User.findOne({
      tenantId: TENANT_ID,
      email: ADMIN_EMAIL.toLowerCase()
    });

    if (!user) {
      console.error(`❌ User not found: ${ADMIN_EMAIL}`);
      console.error('\n💡 User might not exist. Create it first using:');
      console.error('   node scripts/seed-upcapto-superadmin.js');
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.name || user.email}`);
    console.log(`   Current role: ${user.role}`);
    console.log(`   Employee ID: ${user.employee_id}`);
    console.log(`   Status: ${user.status}\n`);

    if (user.role === 'superadmin') {
      console.log('✅ User is already a superadmin!');
      console.log('\n🔐 Login Credentials:');
      console.log(`   Email: ${ADMIN_EMAIL}`);
      console.log(`   Password: (existing password)`);
      console.log(`   Tenant: ${TENANT_ID}`);
      console.log(`   Role: superadmin`);
      await mongoose.connection.close();
      return;
    }

    // Update to superadmin
    console.log('🔄 Updating role to superadmin...');
    user.role = 'superadmin';
    user.designation = 'Super Administrator';
    user.updatedAt = new Date();
    
    // Add superadmin permissions if custom_permissions exists
    if (!user.custom_permissions || user.custom_permissions.length === 0) {
      user.custom_permissions = [
        'create_users', 'read_users', 'update_users', 'delete_users',
        'create_employees', 'read_employees', 'update_employees', 'delete_employees',
        'create_departments', 'read_departments', 'update_departments', 'delete_departments',
        'create_roles', 'read_roles', 'update_roles', 'delete_roles',
        'view_attendance', 'approve_attendance', 'edit_attendance',
        'view_payroll', 'process_payroll', 'approve_payroll',
        'view_analytics', 'create_reports', 'export_data',
        'manage_tenants', 'create_tenants', 'delete_tenants',
        'system_settings', 'backup_data', 'restore_data',
        'view_audit_logs', 'manage_integrations'
      ];
    }

    await user.save();
    
    console.log('✅ User updated to superadmin successfully!');
    console.log('\n🔐 Login Credentials:');
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Password: (existing password)`);
    console.log(`   Tenant: ${TENANT_ID}`);
    console.log(`   Role: superadmin`);
    console.log('\n📝 Next Steps:');
    console.log('   1. Login with the credentials above');
    console.log('   2. Create tenants: POST /api/tenants');
    console.log('   3. Create tenant admin users (automatically created when creating tenants)');

    await mongoose.connection.close();
    console.log('\n✅ Done!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('timeout')) {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Check MongoDB/DocumentDB connection string');
      console.error('   2. Verify network connectivity');
      console.error('   3. Check security group rules (for DocumentDB)');
    }
    console.error(error);
    process.exit(1);
  }
}

// Run update
if (require.main === module) {
  updateToSuperadmin();
}

module.exports = { updateToSuperadmin };
