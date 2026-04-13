const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Employee details
const EMPLOYEE_EMAIL = 'vaibhav.dwivedi@upcapto.com';
const EMPLOYEE_ID = 'VAIBHAV-218926';
const EMPLOYEE_NAME = 'Vaibhav Dwivedi';
const EMPLOYEE_PASSWORD = 'Vaibhav@123';
const TENANT_ID = 'upcapto';

async function createVaibhavAuthUser() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable not set');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB');

    // Load User model
    const User = mongoose.connection.collection('users');

    // Check if user exists
    const existingUser = await User.findOne({ email: EMPLOYEE_EMAIL });

    if (existingUser) {
      console.log('User already exists, updating password...');
      const hashedPassword = await bcrypt.hash(EMPLOYEE_PASSWORD, 12);
      await User.updateOne(
        { email: EMPLOYEE_EMAIL },
        {
          $set: {
            password: hashedPassword,
            employee_id: EMPLOYEE_ID,
            name: EMPLOYEE_NAME,
            role: 'employee',
            tenantId: TENANT_ID,
            status: 'active',
            is_active: true,
            department: 'SALES',
            designation: 'Sales Executive',
            hierarchy_level: 'STORE',
            band_level: 'F',
            joining_date: new Date('2024-01-15'),
          }
        }
      );
      console.log('✅ Password updated successfully');
    } else {
      // Create new user
      console.log('Creating new user...');
      const hashedPassword = await bcrypt.hash(EMPLOYEE_PASSWORD, 12);
      
      const newUser = {
        employee_id: EMPLOYEE_ID,
        name: EMPLOYEE_NAME,
        email: EMPLOYEE_EMAIL,
        password: hashedPassword,
        role: 'employee',
        tenantId: TENANT_ID,
        status: 'active',
        is_active: true,
        department: 'SALES',
        designation: 'Sales Executive',
        hierarchy_level: 'STORE',
        band_level: 'F',
        joining_date: new Date('2024-01-15'),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await User.insertOne(newUser);
      console.log('✅ User created successfully');
    }

    // Verify user was created
    const user = await User.findOne({ email: EMPLOYEE_EMAIL });
    if (user) {
      console.log('✅ User verified:', {
        email: user.email,
        employee_id: user.employee_id,
        role: user.role,
        tenantId: user.tenantId
      });
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

createVaibhavAuthUser();
