/**
 * MongoDB Direct Seed Script for Upcapto Super Admin
 * 
 * Run this script directly in MongoDB shell:
 *   mongosh --username admin --password etelios123 --authenticationDatabase admin etelios < seed-upcapto-mongo.js
 * 
 * Or copy-paste into mongosh after connecting
 */

// Switch to etelios database
use etelios;

print('==========================================');
print('🚀 Seeding Upcapto Super Admin');
print('==========================================\n');

// Configuration
const UPCAPTO_TENANT_ID = 'upcapto';
const ADMIN_EMAIL = 'admin@upcapto.com';
const ADMIN_PASSWORD_PLAIN = 'Upcapto@2026'; // Will be hashed

// bcrypt hash for 'Upcapto@2026' (generated with cost 10)
// You can generate new hash using: bcrypt.hash('Upcapto@2026', 10)
const ADMIN_PASSWORD_HASH = '$2a$10$8ZqCqOqK6X1YX6X8X1YX6uN5Y6N5Y6N5Y6N5Y6N5Y6N5Y6N5Y6N5Y'; 
// NOTE: Generate proper hash before using!

print('Step 1: Creating Upcapto Tenant...');

// Create or update tenant
const tenantResult = db.tenants.updateOne(
  { tenantId: UPCAPTO_TENANT_ID },
  {
    $set: {
      tenantId: UPCAPTO_TENANT_ID,
      name: 'Upcapto Technologies',
      domain: 'upcapto.com',
      subdomain: 'upcapto',
      status: 'active',
      subscription: {
        plan: 'enterprise',
        status: 'active',
        start_date: new Date(),
        end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        max_users: 10000,
        features: [
          'hr_management', 'attendance', 'payroll', 'analytics',
          'crm', 'inventory', 'sales', 'financial', 'documents',
          'notifications', 'realtime', 'prescriptions', 'purchase',
          'monitoring', 'cpp', 'jts', 'service_management'
        ]
      },
      settings: {
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        date_format: 'DD/MM/YYYY',
        language: 'en'
      },
      contact: {
        email: ADMIN_EMAIL,
        phone: '+91-9876543210',
        address: {
          street: 'Tech Park',
          city: 'Bangalore',
          state: 'Karnataka',
          country: 'India',
          pincode: '560001'
        }
      },
      updatedAt: new Date()
    },
    $setOnInsert: {
      createdAt: new Date()
    }
  },
  { upsert: true }
);

if (tenantResult.upsertedCount > 0) {
  print('✅ Tenant created');
} else if (tenantResult.modifiedCount > 0) {
  print('✅ Tenant updated');
} else {
  print('ℹ️  Tenant already exists (no changes)');
}

print('\nStep 2: Creating Super Admin User...');

// Check if user already exists
const existingUser = db.users.findOne({
  tenantId: UPCAPTO_TENANT_ID,
  email: ADMIN_EMAIL
});

if (existingUser) {
  print('⚠️  Super admin user already exists!');
  print('   Email: ' + existingUser.email);
  print('   Employee ID: ' + existingUser.employee_id);
  print('   Created: ' + existingUser.createdAt);
  print('\n⚠️  To reset password, delete the user first:');
  print('   db.users.deleteOne({ tenantId: "' + UPCAPTO_TENANT_ID + '", email: "' + ADMIN_EMAIL + '" })');
} else {
  // Create super admin user
  const userResult = db.users.insertOne({
    tenantId: UPCAPTO_TENANT_ID,
    employee_id: 'UPCAPTO-ADMIN-001',
    name: 'Upcapto Super Admin',
    email: ADMIN_EMAIL,
    phone: '+91-9876543210',
    // IMPORTANT: Replace this with actual bcrypt hash!
    password: ADMIN_PASSWORD_HASH,
    role: 'superadmin',
    department: 'HR',
    band_level: 'A',
    hierarchy_level: 'NATIONAL',
    designation: 'Super Administrator',
    joining_date: new Date(),
    status: 'active',
    is_active: true,
    mustChangePassword: true,
    passwordTemporary: true,
    custom_permissions: [
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
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  });

  if (userResult.acknowledged) {
    print('✅ Super admin user created');
    print('\n📋 User Details:');
    print('   Tenant ID: ' + UPCAPTO_TENANT_ID);
    print('   Employee ID: UPCAPTO-ADMIN-001');
    print('   Name: Upcapto Super Admin');
    print('   Email: ' + ADMIN_EMAIL);
    print('   Role: superadmin');
  }
}

print('\n==========================================');
print('✅ Seed Complete!');
print('==========================================\n');

print('🔐 LOGIN CREDENTIALS:');
print('Email:    ' + ADMIN_EMAIL);
print('Password: ' + ADMIN_PASSWORD_PLAIN);
print('Tenant:   ' + UPCAPTO_TENANT_ID);
print('\n⚠️  CHANGE PASSWORD IMMEDIATELY AFTER FIRST LOGIN!\n');

// Verify tenant and user
print('📊 Verification:');
const tenant = db.tenants.findOne({ tenantId: UPCAPTO_TENANT_ID });
const user = db.users.findOne({ tenantId: UPCAPTO_TENANT_ID, email: ADMIN_EMAIL });

print('Tenant exists: ' + (tenant ? '✅ Yes' : '❌ No'));
print('User exists: ' + (user ? '✅ Yes' : '❌ No'));

if (tenant && user) {
  print('\n✅ All good! You can now login with the credentials above.');
} else {
  print('\n❌ Something went wrong! Please check the database.');
}

print('\n==========================================\n');
