#!/usr/bin/env node

/**
 * Verify database connection and name
 */

const mongoose = require('mongoose');

// This should match what the server uses
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/etelios_hr_service';
let targetDbName = process.env.DB_NAME || process.env.MONGO_DB_NAME;

if (!targetDbName || targetDbName.toLowerCase().includes('test')) {
  targetDbName = 'etelios_hr_service';
}

async function verify() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Database Connection Verification');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log('Target Database:', targetDbName);
  console.log('Connection String:', mongoUri.replace(/(:\/\/[^:]+:)([^@]+)(@)/, '$1****$3'));
  console.log('');
  
  try {
    await mongoose.connect(mongoUri);
    
    const actualDbName = mongoose.connection.name;
    const host = mongoose.connection.host;
    
    console.log('✅ Connected to MongoDB');
    console.log('   Host:', host);
    console.log('   Actual Database:', actualDbName);
    console.log('   Target Database:', targetDbName);
    console.log('');
    
    if (actualDbName.toLowerCase().includes('test')) {
      console.log('❌ ERROR: Connected to TEST database!');
      console.log('   Expected:', targetDbName);
      console.log('   Actual:', actualDbName);
    } else if (actualDbName !== targetDbName) {
      console.log('⚠️  WARNING: Database name mismatch!');
      console.log('   Expected:', targetDbName);
      console.log('   Actual:', actualDbName);
    } else {
      console.log('✅ Database name is CORRECT!');
      console.log('   Using:', actualDbName);
    }
    
    // Check employee count
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    const count = await User.countDocuments({});
    console.log('');
    console.log('Employee Count:', count);
    
    if (count === 0) {
      console.log('⚠️  No employees found in database');
    } else {
      console.log('✅ Employees exist in database');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

verify();

