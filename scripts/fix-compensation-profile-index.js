#!/usr/bin/env node

/**
 * Fix CompensationProfile Index Script
 * 
 * This script drops the old employee_id index and ensures only employeeId index exists
 * 
 * Usage: NODE_PATH=./microservices/hr-service/node_modules:$NODE_PATH node scripts/fix-compensation-profile-index.js
 */

const path = require('path');
let mongoose;

try {
  const hrServiceNodeModules = path.join(__dirname, '..', 'microservices', 'hr-service', 'node_modules');
  const mongoosePath = require.resolve('mongoose', { paths: [hrServiceNodeModules] });
  delete require.cache[mongoosePath];
  mongoose = require(mongoosePath);
} catch (e) {
  try {
    mongoose = require('mongoose');
  } catch (e2) {
    console.error('❌ Error: mongoose not found');
    process.exit(1);
  }
}

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/etelios_hr_service';

async function fixIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db.collection('compensationprofiles');

    console.log('Current indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} (unique: ${idx.unique || false})`);
    });
    console.log('');

    // Drop the old employee_id index if it exists
    try {
      console.log('Dropping old employee_id_1 index...');
      await collection.dropIndex('employee_id_1');
      console.log('✅ Dropped employee_id_1 index\n');
    } catch (e) {
      if (e.code === 27 || e.message.includes('index not found')) {
        console.log('ℹ employee_id_1 index does not exist\n');
      } else {
        throw e;
      }
    }

    // Ensure employeeId index exists (non-unique, sparse to allow nulls during migration)
    try {
      console.log('Creating/updating employeeId index (non-unique, sparse)...');
      await collection.createIndex(
        { employeeId: 1 },
        { 
          name: 'employeeId_1',
          unique: false, // Make it non-unique to avoid conflicts
          sparse: true,  // Sparse index allows documents without the field
          background: true
        }
      );
      console.log('✅ Created/updated employeeId_1 index\n');
    } catch (e) {
      console.log('ℹ employeeId_1 index already exists or error:', e.message);
    }

    // Clean up any documents with null employee_id or employeeId
    console.log('Cleaning up documents with null employee_id or employeeId...');
    const deleteResult = await collection.deleteMany({
      $or: [
        { employee_id: null },
        { employeeId: null },
        { employee_id: { $exists: false } },
        { employeeId: { $exists: false } }
      ]
    });
    console.log(`✅ Deleted ${deleteResult.deletedCount} documents with null employee_id/employeeId\n`);

    console.log('Final indexes:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)} (unique: ${idx.unique || false})`);
    });

    console.log('\n✅ Index fix completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
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

fixIndexes().catch(console.error);

