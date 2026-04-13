#!/usr/bin/env node

/**
 * Seed Script: Create Upcapto Super Admin User
 * 
 * This script creates:
 * 1. Upcapto tenant in tenant registry
 * 2. Super admin user for Upcapto
 * 
 * Usage:
 *   node seed-upcapto-superadmin.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:etelios123@mongodb.etelios-prod.svc.cluster.local:27017/etelios?authSource=admin';

// Upcapto Configuration
const UPCAPTO_CONFIG = {
  // Tenant Details
  tenant: {
    id: 'upcapto',
    name: 'Upcapto Technologies',
    domain: 'upcapto.com',
    subdomain: 'upcapto',
    status: 'active',
    subscription: {
      plan: 'enterprise',
      status: 'active',
      start_date: new Date(),
      end_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      max_users: 10000,
      features: [
        'hr_management',
        'attendance',
        'payroll',
        'analytics',
        'crm',
        'inventory',
        'sales',
        'financial',
        'documents',
        'notifications',
        'realtime',
        'prescriptions',
        'purchase',
        'monitoring',
        'cpp',
        'jts',
        'service_management'
      ]
    },
    settings: {
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      date_format: 'DD/MM/YYYY',
      language: 'en'
    },
    contact: {
      email: 'admin@upcapto.com',
      phone: '+91-9876543210',
      address: {
        street: 'Tech Park',
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        pincode: '560001'
      }
    }
  },
  
  // Super Admin User Details
  superAdmin: {
    tenantId: 'upcapto',
    employee_id: 'UPCAPTO-ADMIN-001',
    name: 'Upcapto Super Admin',
    email: 'admin@upcapto.com',
    phone: '+91-9876543210',
    password: 'Upcapto@2026', // Change this after first login!
    role: 'superadmin',
    department: 'HR',
    band_level: 'A',
    hierarchy_level: 'NATIONAL',
    designation: 'Super Administrator',
    joining_date: new Date(),
    status: 'active',
    is_active: true,
    mustChangePassword: true, // Force password change on first login
    custom_permissions: [
      // All permissions
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
    ]
  }
};

// Tenant Schema
const tenantSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  domain: {
    type: String,
    trim: true,
    lowercase: true
  },
  subdomain: {
    type: String,
    trim: true,
    lowercase: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'trial'],
    default: 'active'
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'professional', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'expired', 'cancelled'],
      default: 'active'
    },
    start_date: Date,
    end_date: Date,
    max_users: {
      type: Number,
      default: 10
    },
    features: [String]
  },
  settings: {
    timezone: String,
    currency: String,
    date_format: String,
    language: String
  },
  contact: {
    email: String,
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      pincode: String
    }
  },
  database: {
    host: String,
    name: String,
    connection_string: String
  }
}, {
  timestamps: true
});

// User Schema
const userSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true,
    trim: true,
    lowercase: true
  },
  employee_id: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['superadmin', 'admin', 'hr', 'manager', 'employee', 'accountant', 'store_manager', 'sales', 'optometrist'],
    default: 'employee'
  },
  department: {
    type: String,
    required: true
  },
  band_level: {
    type: String,
    enum: ['A', 'B', 'B+', 'C', 'D', 'E', 'F']
  },
  hierarchy_level: {
    type: String,
    enum: ['STORE', 'AREA', 'REGIONAL', 'ZONAL', 'NATIONAL', 'SUPPORT']
  },
  designation: {
    type: String,
    trim: true
  },
  joining_date: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'terminated', 'probation'],
    default: 'active'
  },
  is_active: {
    type: Boolean,
    default: true
  },
  mustChangePassword: {
    type: Boolean,
    default: false
  },
  custom_permissions: [String]
}, {
  timestamps: true
});

// Multi-tenant indexes
userSchema.index({ tenantId: 1, employee_id: 1 }, { unique: true });
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Models
const Tenant = mongoose.model('Tenant', tenantSchema);
const User = mongoose.model('User', userSchema);

// Main seed function
async function seedUpcaptoSuperAdmin() {
  try {
    console.log('🚀 Starting Upcapto Super Admin Seed...');
    console.log('=====================================\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    console.log(`   URI: ${MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}`);
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Create/Update Tenant
    console.log('📝 Step 1: Creating/Updating Upcapto Tenant...');
    
    const existingTenant = await Tenant.findOne({ tenantId: UPCAPTO_CONFIG.tenant.id });
    
    if (existingTenant) {
      console.log('   ⚠️  Tenant already exists, updating...');
      await Tenant.updateOne(
        { tenantId: UPCAPTO_CONFIG.tenant.id },
        { $set: UPCAPTO_CONFIG.tenant }
      );
      console.log('   ✅ Tenant updated');
    } else {
      const tenant = new Tenant(UPCAPTO_CONFIG.tenant);
      await tenant.save();
      console.log('   ✅ Tenant created');
    }
    
    console.log(`   Tenant ID: ${UPCAPTO_CONFIG.tenant.id}`);
    console.log(`   Tenant Name: ${UPCAPTO_CONFIG.tenant.name}`);
    console.log(`   Status: ${UPCAPTO_CONFIG.tenant.status}`);
    console.log(`   Plan: ${UPCAPTO_CONFIG.tenant.subscription.plan}\n`);

    // Step 2: Create/Update Super Admin User
    console.log('👤 Step 2: Creating/Updating Super Admin User...');
    
    const existingUser = await User.findOne({
      tenantId: UPCAPTO_CONFIG.superAdmin.tenantId,
      email: UPCAPTO_CONFIG.superAdmin.email
    });

    if (existingUser) {
      console.log('   ⚠️  Super admin user already exists');
      console.log('   ℹ️  To reset password, delete the user first or update manually\n');
      
      console.log('📋 Existing User Details:');
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Employee ID: ${existingUser.employee_id}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Status: ${existingUser.status}`);
      console.log(`   Created: ${existingUser.createdAt}`);
    } else {
      const superAdmin = new User(UPCAPTO_CONFIG.superAdmin);
      await superAdmin.save();
      
      console.log('   ✅ Super admin user created\n');
      
      console.log('📋 Super Admin Details:');
      console.log(`   Tenant ID: ${UPCAPTO_CONFIG.superAdmin.tenantId}`);
      console.log(`   Employee ID: ${UPCAPTO_CONFIG.superAdmin.employee_id}`);
      console.log(`   Name: ${UPCAPTO_CONFIG.superAdmin.name}`);
      console.log(`   Email: ${UPCAPTO_CONFIG.superAdmin.email}`);
      console.log(`   Phone: ${UPCAPTO_CONFIG.superAdmin.phone}`);
      console.log(`   Role: ${UPCAPTO_CONFIG.superAdmin.role}`);
      console.log(`   Password: ${UPCAPTO_CONFIG.superAdmin.password}`);
      console.log(`   Status: ${UPCAPTO_CONFIG.superAdmin.status}`);
      console.log(`   ⚠️  Must Change Password: ${UPCAPTO_CONFIG.superAdmin.mustChangePassword}\n`);
    }

    // Step 3: Summary
    console.log('=====================================');
    console.log('✅ Seed Complete!\n');
    
    console.log('🔐 LOGIN CREDENTIALS:');
    console.log('=====================================');
    console.log(`Email:    ${UPCAPTO_CONFIG.superAdmin.email}`);
    console.log(`Password: ${UPCAPTO_CONFIG.superAdmin.password}`);
    console.log(`Tenant:   ${UPCAPTO_CONFIG.superAdmin.tenantId}`);
    console.log('=====================================\n');
    
    console.log('⚠️  IMPORTANT:');
    console.log('1. Change the password immediately after first login!');
    console.log('2. Store credentials securely');
    console.log('3. Use this account only for tenant/admin management\n');
    
    console.log('🎯 Next Steps:');
    console.log('1. Login with above credentials');
    console.log('2. Create other tenants if needed');
    console.log('3. Create additional admin users');
    console.log('4. Configure tenant settings\n');

  } catch (error) {
    console.error('❌ Error seeding super admin:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('📡 MongoDB connection closed');
  }
}

// Run the seed
if (require.main === module) {
  seedUpcaptoSuperAdmin()
    .then(() => {
      console.log('\n✅ Seed script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seed script failed:', error.message);
      process.exit(1);
    });
}

module.exports = seedUpcaptoSuperAdmin;
