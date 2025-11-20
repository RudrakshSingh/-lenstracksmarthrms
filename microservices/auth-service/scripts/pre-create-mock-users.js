/**
 * Pre-create Mock Users Script
 * Run this script to pre-create all mock users in the database
 * This eliminates the need for user creation during mock login (faster response)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User.model');

// Pre-hashed password for mock users (bcrypt rounds=4 for speed)
const PRE_HASHED_MOCK_PASSWORD = '$2a$04$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

const roles = ['hr', 'admin', 'manager', 'employee', 'superadmin'];

const departmentMap = {
  'hr': 'HR',
  'admin': 'TECH',
  'manager': 'SALES',
  'employee': 'SALES',
  'superadmin': 'TECH'
};

async function preCreateMockUsers() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/etelios_auth';
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10
    });
    console.log('Connected to MongoDB');

    const now = new Date();
    let created = 0;
    let existing = 0;

    for (const role of roles) {
      const mockEmail = `mock.${role}@etelios.com`;
      const mockEmployeeId = `MOCK${role.toUpperCase()}001`;
      const mockName = `Mock ${role.toUpperCase()} User`;

      // Check if user exists
      const existingUser = await User.findOne({
        $or: [
          { email: mockEmail },
          { employee_id: mockEmployeeId }
        ]
      });

      if (existingUser) {
        // Update existing user
        existingUser.name = mockName;
        existingUser.email = mockEmail;
        existingUser.employee_id = mockEmployeeId;
        existingUser.role = role;
        existingUser.department = departmentMap[role] || 'SALES';
        existingUser.designation = `${role.toUpperCase()} Manager`;
        existingUser.is_active = true;
        existingUser.status = 'active';
        existingUser.band_level = 'A';
        existingUser.hierarchy_level = 'NATIONAL';
        
        // Only update password if it's not already set or is the old mock password
        if (!existingUser.password || existingUser.password.length < 20) {
          existingUser.password = PRE_HASHED_MOCK_PASSWORD;
        }
        
        await existingUser.save();
        existing++;
        console.log(`✓ Updated existing mock user: ${mockEmail}`);
      } else {
        // Create new user
        const user = new User({
          tenantId: 'default',
          employee_id: mockEmployeeId,
          name: mockName,
          email: mockEmail,
          phone: '+919999999999',
          password: PRE_HASHED_MOCK_PASSWORD,
          role: role,
          department: departmentMap[role] || 'SALES',
          designation: `${role.toUpperCase()} Manager`,
          joining_date: now,
          is_active: true,
          status: 'active',
          band_level: 'A',
          hierarchy_level: 'NATIONAL'
        });

        await user.save();
        created++;
        console.log(`✓ Created mock user: ${mockEmail}`);
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Created: ${created} users`);
    console.log(`Updated: ${existing} users`);
    console.log(`Total: ${created + existing} mock users ready`);
    console.log('\n✅ Mock users pre-creation complete!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error pre-creating mock users:', error);
    process.exit(1);
  }
}

preCreateMockUsers();

