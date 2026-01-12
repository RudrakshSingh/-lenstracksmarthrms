/**
 * Script to fix duplicate store names in the database
 * Run this script once to clean up existing duplicates
 * 
 * Usage: node src/scripts/fix-duplicate-stores.js
 */

const mongoose = require('mongoose');
const Store = require('../models/Store.model');
require('dotenv').config();

async function fixDuplicateStores() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/hr-db';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find all stores grouped by name and tenantId
    const duplicates = await Store.aggregate([
      {
        $match: {
          isDeleted: { $ne: true }
        }
      },
      {
        $group: {
          _id: { name: '$name', tenantId: '$tenantId' },
          count: { $sum: 1 },
          stores: { $push: { id: '$_id', code: '$code', createdAt: '$createdAt' } }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    console.log(`\n🔍 Found ${duplicates.length} duplicate store name(s)\n`);

    if (duplicates.length === 0) {
      console.log('✅ No duplicate store names found!');
      await mongoose.disconnect();
      return;
    }

    // Fix each duplicate
    for (const dup of duplicates) {
      const storeName = dup._id.name;
      const tenantId = dup._id.tenantId;
      const stores = dup.stores;

      console.log(`📝 Fixing: "${storeName}" (${stores.length} duplicates)`);
      
      // Keep the oldest store (first created), rename others
      const oldestStore = stores.sort((a, b) => 
        new Date(a.createdAt) - new Date(b.createdAt)
      )[0];

      let counter = 1;
      for (const store of stores) {
        if (store.id.toString() === oldestStore.id.toString()) {
          console.log(`  ✓ Keeping: "${storeName}" (ID: ${store.id})`);
          continue;
        }

        // Rename duplicate stores
        const newName = `${storeName} ${counter}`;
        await Store.findByIdAndUpdate(store.id, { 
          name: newName 
        });
        console.log(`  → Renamed: "${storeName}" → "${newName}" (ID: ${store.id})`);
        counter++;
      }
    }

    console.log('\n✅ All duplicates fixed!');
    console.log('\n📊 Summary:');
    console.log(`   - Total duplicates processed: ${duplicates.length}`);
    console.log(`   - Stores renamed: ${duplicates.reduce((sum, d) => sum + (d.count - 1), 0)}`);
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error fixing duplicates:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
fixDuplicateStores();

