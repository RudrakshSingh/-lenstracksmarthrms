#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/etelios';

async function checkUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

    // List all users first
    const allUsers = await User.find({}).limit(10).select('email tenantId role name');
    console.log(`\n📊 Total users found: ${await User.countDocuments()}`);
    console.log('Sample users:');
    allUsers.forEach(u => {
      console.log(`  - ${u.email} (${u.tenantId}) - Role: ${u.role} - Name: ${u.name}`);
    });

    // Check Rudi
    const rudi = await User.findOne({ email: /rudi/i });
    if (rudi) {
      console.log('\n📋 Rudi:');
      console.log(`   Email: ${rudi.email}`);
      console.log(`   Tenant: ${rudi.tenantId}`);
      console.log(`   Role: ${rudi.role}`);
      console.log(`   ID: ${rudi._id}`);
    } else {
      console.log('\n❌ Rudi not found');
    }

    // Check Aditya
    const aditya = await User.findOne({ email: /aditya/i });
    if (aditya) {
      console.log('\n📋 Aditya:');
      console.log(`   Email: ${aditya.email}`);
      console.log(`   Tenant: ${aditya.tenantId}`);
      console.log(`   Role: ${aditya.role}`);
      console.log(`   ID: ${aditya._id}`);
    } else {
      console.log('\n❌ Aditya not found');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUsers();
