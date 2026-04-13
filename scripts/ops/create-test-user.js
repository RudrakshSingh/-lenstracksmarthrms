/**
 * Create Test User in MongoDB
 * This script creates a dummy user for frontend testing
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB Connection String (update with your actual connection)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb-service:27017/etelios_auth';

// User Schema (matching your auth-service schema)
const UserSchema = new mongoose.Schema({
  employee_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['superadmin', 'admin', 'hr', 'manager', 'employee', 'accounts'],
    default: 'employee' 
  },
  department: { type: String },
  designation: { type: String },
  joining_date: { type: Date },
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'suspended'],
    default: 'active' 
  },
  stores: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Store' }],
  reporting_manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date_of_birth: { type: Date },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    pincode: String
  },
  emergency_contact: {
    name: String,
    relationship: String,
    phone: String
  },
  is_verified: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// Test Users to Create
const testUsers = [
  {
    employee_id: 'EMP001',
    name: 'Test Admin',
    email: 'admin@test.com',
    phone: '+919876543210',
    password: 'Admin@123',
    role: 'admin',
    department: 'IT',
    designation: 'System Administrator',
    joining_date: new Date('2024-01-01'),
    status: 'active'
  },
  {
    employee_id: 'EMP002',
    name: 'Test HR',
    email: 'hr@test.com',
    phone: '+919876543211',
    password: 'HR@123',
    role: 'hr',
    department: 'Human Resources',
    designation: 'HR Manager',
    joining_date: new Date('2024-01-01'),
    status: 'active'
  },
  {
    employee_id: 'EMP003',
    name: 'Test Employee',
    email: 'employee@test.com',
    phone: '+919876543212',
    password: 'Employee@123',
    role: 'employee',
    department: 'Sales',
    designation: 'Sales Executive',
    joining_date: new Date('2024-01-01'),
    status: 'active'
  },
  {
    employee_id: 'EMP004',
    name: 'Test Manager',
    email: 'manager@test.com',
    phone: '+919876543213',
    password: 'Manager@123',
    role: 'manager',
    department: 'Operations',
    designation: 'Operations Manager',
    joining_date: new Date('2024-01-01'),
    status: 'active'
  }
];

async function createTestUsers() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    console.log('\n🔄 Creating test users...\n');

    for (const userData of testUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ 
          $or: [
            { email: userData.email },
            { employee_id: userData.employee_id }
          ]
        });

        if (existingUser) {
          console.log(`⚠️  User ${userData.email} already exists, skipping...`);
          continue;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(userData.password, salt);

        // Create user
        const user = new User({
          ...userData,
          password: hashedPassword
        });

        await user.save();
        
        console.log(`✅ Created user: ${userData.name}`);
        console.log(`   Email: ${userData.email}`);
        console.log(`   Employee ID: ${userData.employee_id}`);
        console.log(`   Password: ${userData.password}`);
        console.log(`   Role: ${userData.role}`);
        console.log('');
      } catch (error) {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
      }
    }

    console.log('\n✅ Test users creation completed!');
    console.log('\n📋 Summary of Test Credentials:\n');
    console.log('='.repeat(60));
    testUsers.forEach(user => {
      console.log(`Role: ${user.role.toUpperCase()}`);
      console.log(`Email: ${user.email}`);
      console.log(`Employee ID: ${user.employee_id}`);
      console.log(`Password: ${user.password}`);
      console.log('-'.repeat(60));
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔒 MongoDB connection closed');
  }
}

// Run the script
createTestUsers();

