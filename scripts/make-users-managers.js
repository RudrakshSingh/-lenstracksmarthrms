#!/usr/bin/env node

/**
 * Make Rudi and Aditya Managers for Testing
 * This script updates their roles to Manager so they can approve/reject leaves
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Users are stored in 'etelios' database (not etelios-hr)
// Production DocumentDB URI - will use MONGODB_URI from environment (Kubernetes secret)
// Fallback for local testing (requires VPN/bastion access)
const PROD_MONGODB_URI_BASE = 'mongodb://docdbadmin:jUADHkcYOtjG4527odqpzTPCYs5yFcj6ZYMSUdBS@lenstrack-docdb-cluster.cluster-cl002moksa9v.ap-south-1.docdb.amazonaws.com:27017/etelios?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false&authSource=admin&authMechanism=SCRAM-SHA-1';

// In Kubernetes pod, MONGODB_URI will be set from secret
// For local execution, use fallback (requires VPN/bastion)
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || PROD_MONGODB_URI_BASE;

async function makeUsersManagers() {
  try {
    // Check if DocumentDB (connection string contains docdb.amazonaws.com)
    const isDocumentDB = MONGODB_URI.includes('docdb.amazonaws.com');
    
    const connectionOptions = {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 15000,
      retryWrites: false, // DocumentDB doesn't support retryable writes
      retryReads: true,
    };
    
    // AWS DocumentDB specific options
    if (isDocumentDB) {
      connectionOptions.tls = true;
      connectionOptions.tlsInsecure = false;
      // Note: tlsCAFile path might not exist locally, DocumentDB will use system CA
      console.log('🔒 Connecting to AWS DocumentDB with TLS...');
    }
    
    await mongoose.connect(MONGODB_URI, connectionOptions);
    console.log('✅ Connected to DocumentDB');
    console.log(`📊 Database: ${mongoose.connection.name}`);
    console.log(`📊 Host: ${mongoose.connection.host}`);

    // Use the same User model as auth-service
    // Database: etelios, Collection: users
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    
    // Verify connection
    const userCount = await User.countDocuments();
    console.log(`📊 Total users in database: ${userCount}`);

    // First, find users with any case variation
    const allUsers = await User.find({
      $or: [
        { email: /rudi/i },
        { email: /aditya/i }
      ]
    }).limit(10);
    
    console.log(`\n📊 Found ${allUsers.length} users matching search`);
    allUsers.forEach(u => {
      console.log(`  - ${u.email} (${u.tenantId}) - Role: ${u.role}`);
    });
    
    // Update Rudi (upcapto tenant) to Manager - try multiple variations
    let rudi = await User.findOneAndUpdate(
      { email: 'rudi@gmail.com', tenantId: 'upcapto' },
      { $set: { role: 'manager' } },
      { new: true }
    );
    
    if (!rudi) {
      rudi = await User.findOneAndUpdate(
        { email: /^rudi@/i, tenantId: 'upcapto' },
        { $set: { role: 'manager' } },
        { new: true }
      );
    }

    if (rudi) {
      console.log('\n✅ Rudi updated to Manager');
      console.log(`   Name: ${rudi.fullName || rudi.name}`);
      console.log(`   Email: ${rudi.email}`);
      console.log(`   Tenant: ${rudi.tenantId}`);
      console.log(`   Role: ${rudi.role}`);
    } else {
      console.log('\n⚠️  Rudi not found or already updated');
    }

    // Update Aditya (eyekra tenant) to Manager - try multiple variations
    let aditya = await User.findOneAndUpdate(
      { email: /aditya/i, tenantId: 'eyekra' },
      { $set: { role: 'manager' } },
      { new: true }
    );
    
    if (!aditya) {
      aditya = await User.findOneAndUpdate(
        { email: /^aditya@/i, tenantId: 'eyekra' },
        { $set: { role: 'manager' } },
        { new: true }
      );
    }

    if (aditya) {
      console.log('\n✅ Aditya updated to Manager');
      console.log(`   Name: ${aditya.fullName || aditya.name}`);
      console.log(`   Email: ${aditya.email}`);
      console.log(`   Tenant: ${aditya.tenantId}`);
      console.log(`   Role: ${aditya.role}`);
    } else {
      console.log('\n⚠️  Aditya not found or already updated');
    }

    await mongoose.disconnect();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

makeUsersManagers();
