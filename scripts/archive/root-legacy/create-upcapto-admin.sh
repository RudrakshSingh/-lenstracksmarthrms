#!/bin/bash

###############################################################################
# Create Upcapto Super Admin User
# Simple script that runs directly in auth-service pod
###############################################################################

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

NAMESPACE="etelios-prod"

log "=========================================="
log "Creating Upcapto Super Admin"
log "=========================================="
echo ""

# Find auth-service pod
log "Finding auth-service pod..."
AUTH_POD=$(kubectl get pods -n $NAMESPACE | grep auth-service | grep Running | head -1 | awk '{print $1}')

if [ -z "$AUTH_POD" ]; then
    error "No running auth-service pod found!"
fi

log "Using pod: $AUTH_POD"
echo ""

log "Running seed script in pod..."
echo ""

# Execute inline Node.js script in the pod
kubectl exec -n $NAMESPACE $AUTH_POD -- node -e "
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:etelios123@mongodb.etelios-prod.svc.cluster.local:27017/etelios?authSource=admin';

// Schemas
const tenantSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  domain: String,
  subdomain: String,
  status: { type: String, enum: ['active', 'inactive', 'suspended', 'trial'], default: 'active' },
  subscription: {
    plan: String,
    status: String,
    start_date: Date,
    end_date: Date,
    max_users: Number,
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
  }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  employee_id: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  password: { type: String, required: true },
  role: { type: String, required: true },
  department: String,
  band_level: String,
  hierarchy_level: String,
  designation: String,
  joining_date: Date,
  status: { type: String, default: 'active' },
  is_active: { type: Boolean, default: true },
  mustChangePassword: { type: Boolean, default: false },
  custom_permissions: [String]
}, { timestamps: true });

userSchema.index({ tenantId: 1, employee_id: 1 }, { unique: true });
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });

async function seed() {
  try {
    console.log('🚀 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected!\\n');

    const Tenant = mongoose.model('Tenant', tenantSchema);
    const User = mongoose.model('User', userSchema);

    // Create tenant
    console.log('📝 Creating Upcapto tenant...');
    const tenant = await Tenant.findOneAndUpdate(
      { tenantId: 'upcapto' },
      {
        tenantId: 'upcapto',
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
          features: ['hr_management', 'attendance', 'payroll', 'analytics', 'crm']
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
            city: 'Bangalore',
            state: 'Karnataka',
            country: 'India'
          }
        }
      },
      { upsert: true, new: true }
    );
    console.log('✅ Tenant created/updated\\n');

    // Check if user exists
    const existingUser = await User.findOne({ tenantId: 'upcapto', email: 'admin@upcapto.com' });
    
    if (existingUser) {
      console.log('⚠️  Super admin already exists!');
      console.log('   Email: admin@upcapto.com');
      console.log('   Employee ID:', existingUser.employee_id);
    } else {
      console.log('👤 Creating super admin user...');
      const hashedPassword = await bcrypt.hash('Upcapto@2026', 10);
      
      const user = await User.create({
        tenantId: 'upcapto',
        employee_id: 'UPCAPTO-ADMIN-001',
        name: 'Upcapto Super Admin',
        email: 'admin@upcapto.com',
        phone: '+91-9876543210',
        password: hashedPassword,
        role: 'superadmin',
        department: 'HR',
        band_level: 'A',
        hierarchy_level: 'NATIONAL',
        designation: 'Super Administrator',
        joining_date: new Date(),
        status: 'active',
        is_active: true,
        mustChangePassword: true,
        custom_permissions: [
          'create_users', 'read_users', 'update_users', 'delete_users',
          'create_employees', 'read_employees', 'update_employees', 'delete_employees',
          'manage_tenants', 'create_tenants', 'delete_tenants',
          'system_settings', 'view_analytics'
        ]
      });
      
      console.log('✅ Super admin created!\\n');
      console.log('========================================');
      console.log('🔐 LOGIN CREDENTIALS');
      console.log('========================================');
      console.log('Email:    admin@upcapto.com');
      console.log('Password: Upcapto@2026');
      console.log('Tenant:   upcapto');
      console.log('========================================\\n');
      console.log('⚠️  CHANGE PASSWORD AFTER FIRST LOGIN!\\n');
    }

    await mongoose.connection.close();
    console.log('✅ Done!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

seed();
"

echo ""
log "=========================================="
log "✅ Seed script completed!"
log "=========================================="
echo ""

log "🔐 Login Credentials:"
echo "   Email:    admin@upcapto.com"
echo "   Password: Upcapto@2026"
echo "   Tenant:   upcapto"
echo ""

warning "⚠️  CHANGE PASSWORD IMMEDIATELY AFTER FIRST LOGIN!"
echo ""
