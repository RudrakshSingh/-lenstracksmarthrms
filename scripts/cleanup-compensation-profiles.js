#!/usr/bin/env node

/**
 * Database Cleanup Script for CompensationProfile
 * 
 * This script removes all CompensationProfile documents with null employeeId
 * to fix the duplicate key error in onboarding Steps 2 and 3.
 * 
 * Usage: 
 *   cd microservices/hr-service
 *   node ../../scripts/cleanup-compensation-profiles.js
 * 
 * Or set NODE_PATH:
 *   NODE_PATH=./microservices/hr-service/node_modules node scripts/cleanup-compensation-profiles.js
 */

const path = require('path');

// Try to load mongoose from hr-service
let mongoose;
try {
  // Try loading from hr-service node_modules
  const hrServiceNodeModules = path.join(__dirname, '..', 'microservices', 'hr-service', 'node_modules');
  const mongoosePath = require.resolve('mongoose', { paths: [hrServiceNodeModules] });
  delete require.cache[mongoosePath];
  mongoose = require(mongoosePath);
} catch (e) {
  try {
    mongoose = require('mongoose');
  } catch (e2) {
    console.error('❌ Error: mongoose not found');
    console.error('Please run: cd microservices/hr-service && npm install');
    console.error('Or run this script from microservices/hr-service directory');
    process.exit(1);
  }
}

// MongoDB connection string
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/etelios_hr_service';

async function cleanupCompensationProfiles() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get the database and collection directly
    const db = mongoose.connection.db;
    const collection = db.collection('compensationprofiles');

    // Find all profiles with null employeeId
    console.log('Finding CompensationProfile documents with null employeeId...');
    const nullProfiles = await collection.find({ 
      $or: [
        { employeeId: null },
        { employeeId: { $exists: false } }
      ]
    }).toArray();

    console.log(`Found ${nullProfiles.length} profiles with null employeeId\n`);

    if (nullProfiles.length > 0) {
      console.log('Deleting profiles with null employeeId...');
      const deleteResult = await collection.deleteMany({ 
        $or: [
          { employeeId: null },
          { employeeId: { $exists: false } }
        ]
      });

      console.log(`✅ Deleted ${deleteResult.deletedCount} profiles\n`);
    }

    // Also find and fix profiles with empty string employeeId
    console.log('Finding CompensationProfile documents with empty employeeId...');
    const emptyProfiles = await collection.find({ 
      employeeId: ''
    }).toArray();

    console.log(`Found ${emptyProfiles.length} profiles with empty employeeId\n`);

    if (emptyProfiles.length > 0) {
      console.log('Deleting profiles with empty employeeId...');
      const deleteResult = await collection.deleteMany({ 
        employeeId: ''
      });

      console.log(`✅ Deleted ${deleteResult.deletedCount} profiles\n`);
    }

    // Find all remaining profiles and check for issues
    console.log('Checking remaining CompensationProfile documents...');
    const allProfiles = await collection.find({}).toArray();
    console.log(`Total CompensationProfile documents: ${allProfiles.length}`);

    const profilesWithIssues = allProfiles.filter(p => 
      !p.employeeId || 
      p.employeeId === null || 
      p.employeeId === '' || 
      p.employeeId === 'null' || 
      p.employeeId === 'undefined'
    );

    if (profilesWithIssues.length > 0) {
      console.log(`⚠️  Found ${profilesWithIssues.length} profiles with invalid employeeId`);
      console.log('These profiles may need manual review:\n');
      profilesWithIssues.forEach((profile, index) => {
        console.log(`  ${index + 1}. Profile ID: ${profile._id}, Employee: ${profile.employee}, EmployeeId: ${profile.employeeId || 'null'}`);
      });
    } else {
      console.log('✅ All remaining profiles have valid employeeId values\n');
    }

    console.log('✅ Cleanup completed successfully!');
    console.log('\nYou can now retry the onboarding test.');

  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\nDisconnected from MongoDB');
    }
  }
}

// Run cleanup
cleanupCompensationProfiles().catch(console.error);
