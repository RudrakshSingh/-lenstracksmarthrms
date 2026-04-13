// Script to create/ensure employee with store assignment directly in database
// Works for any tenant - tenant-agnostic
// Usage: kubectl exec -n etelios-prod deployment/hr-service -- node /path/to/create-employee-direct.js <email> <employeeId> <tenantId> [firstName] [lastName]

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../microservices/hr-service/.env') });

const User = require('../microservices/hr-service/src/models/User.model');
const Store = require('../microservices/hr-service/src/models/Store.model');

const email = process.argv[2] || 'rudi@gmail.com';
const employeeId = process.argv[3] || 'EMP-2026-886706';
const tenantId = (process.argv[4] || 'default').toLowerCase().trim();
const firstName = process.argv[5] || email.split('@')[0].split('.')[0];
const lastName = process.argv[6] || 'Singh';

async function ensureEmployeeWithStore() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-service';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Normalize employee ID
    const normalizedEmployeeId = employeeId.toUpperCase().trim();
    const fullName = `${firstName} ${lastName}`.trim();

    // Check if employee exists
    let employee = await User.findOne({
      tenantId: tenantId,
      $or: [
        { email: email.toLowerCase() },
        { employeeId: normalizedEmployeeId },
        { employee_id: normalizedEmployeeId }
      ]
    }).populate('store');

    // Get or create store for this tenant
    let store = await Store.findOne({ tenantId: tenantId });
    if (!store) {
      console.log(`Creating default store for tenant: ${tenantId}...`);
      store = new Store({
        name: 'Default Store',
        code: 'DEF001',
        tenantId: tenantId,
        address: {
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India'
        },
        coordinates: {
          latitude: 19.076,
          longitude: 72.8777
        }
      });
      await store.save();
      console.log(`✅ Store created: ${store.name} (${store.code})`);
    } else {
      console.log(`✅ Store found: ${store.name} (${store.code})`);
    }

    if (employee) {
      console.log(`Employee exists: ${employee.employeeId || employee.employee_id}`);
      
      // Update store if not assigned
      if (!employee.store || (typeof employee.store === 'object' && !employee.store._id)) {
        employee.store = store._id;
        await employee.save();
        console.log(`✅ Store assigned to existing employee`);
      } else {
        console.log(`✅ Employee already has store assigned`);
      }
      
      // Reload with populated store
      employee = await User.findById(employee._id).populate('store');
    } else {
      console.log(`Creating employee: ${normalizedEmployeeId}...`);
      employee = new User({
        email: email.toLowerCase(),
        employeeId: normalizedEmployeeId,
        employee_id: normalizedEmployeeId,
        firstName: firstName,
        lastName: lastName,
        fullName: fullName,
        name: fullName,
        tenantId: tenantId,
        status: 'active',
        role: 'employee',
        is_active: true,
        store: store._id
      });
      await employee.save();
      console.log(`✅ Employee created: ${employee.employeeId}`);
      
      // Reload with populated store
      employee = await User.findById(employee._id).populate('store');
    }

    console.log('\n✅ Employee Setup Complete:');
    console.log(`   Email: ${employee.email}`);
    console.log(`   Employee ID: ${employee.employeeId || employee.employee_id}`);
    console.log(`   Name: ${employee.fullName || employee.name}`);
    console.log(`   Tenant: ${employee.tenantId}`);
    console.log(`   Store: ${employee.store ? employee.store.name : 'Not assigned'}`);
    console.log(`   Store Code: ${employee.store ? employee.store.code : 'N/A'}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

ensureEmployeeWithStore();
