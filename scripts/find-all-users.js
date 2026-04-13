#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/etelios-hr';

async function findAllUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('\n📁 Collections:', collections.map(c => c.name).join(', '));

    // Try different collection names
    const possibleCollections = ['users', 'Users', 'user', 'User'];
    
    for (const collName of possibleCollections) {
      try {
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), collName);
        const count = await User.countDocuments();
        console.log(`\n📊 ${collName}: ${count} documents`);
        
        if (count > 0) {
          const users = await User.find({}).limit(5).select('email tenantId role');
          console.log('Sample users:');
          users.forEach(u => {
            console.log(`  - ${u.email} (${u.tenantId}) - Role: ${u.role}`);
          });
        }
      } catch (e) {
        // Collection doesn't exist
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

findAllUsers();
