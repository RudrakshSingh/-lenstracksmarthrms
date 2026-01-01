#!/usr/bin/env node

/**
 * Check if employee exists in database
 */

const mongoose = require('mongoose');

const employeeId = process.argv[2] || 'EMP-1767193592130';
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/etelios_hr_service';

async function checkEmployee() {
  try {
    console.log('Connecting to MongoDB...');
    console.log(`URI: ${mongoUri.replace(/(:\/\/[^:]+:)([^@]+)(@)/, '$1****$3')}`);
    
    await mongoose.connect(mongoUri);
    const dbName = mongoose.connection.name;
    console.log(`✅ Connected to database: ${dbName}\n`);
    
    // Get User model
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    
    // Search by employeeId
    console.log(`Searching for employee: ${employeeId}...`);
    const employee = await User.findOne({ employeeId: employeeId.toUpperCase() });
    
    if (employee) {
      console.log('✅ Employee found!');
      console.log(`   Employee ID: ${employee.employeeId}`);
      console.log(`   Name: ${employee.fullName || employee.firstName + ' ' + employee.lastName}`);
      console.log(`   Email: ${employee.email}`);
      console.log(`   MongoDB ID: ${employee._id}`);
      console.log(`   Status: ${employee.status}`);
    } else {
      console.log('❌ Employee NOT found');
      
      // Check all employees
      const allEmployees = await User.find({}).limit(5).select('employeeId fullName email');
      console.log(`\nTotal employees in database: ${await User.countDocuments({})}`);
      console.log('First 5 employees:');
      allEmployees.forEach(emp => {
        console.log(`   - ${emp.employeeId}: ${emp.fullName || 'N/A'} (${emp.email})`);
      });
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from database');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkEmployee();

