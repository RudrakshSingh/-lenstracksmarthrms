#!/usr/bin/env node

/**
 * Reset Eyekra Admin Password
 * 
 * This script resets the admin password for eyekra tenant
 * 
 * Usage:
 *   MONGODB_URI="mongodb://..." NEW_PASSWORD="NewPass123!" node scripts/reset-eyekra-admin-password.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const NEW_PASSWORD = process.env.NEW_PASSWORD || 'Eyekra@Admin2026!';
const TENANT_ID = 'eyekra';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@eyekra.com';

async function resetPassword() {
  try {
    console.log('🚀 Resetting Eyekra Admin Password...');
    console.log(`Tenant: ${TENANT_ID}`);
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log('Connecting to MongoDB...');
    
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI is required');
      console.error('   Set it via: MONGODB_URI="mongodb://..." node scripts/reset-eyekra-admin-password.js');
      process.exit(1);
    }
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 30000,
      tls: true,
      tlsAllowInvalidCertificates: true
    });
    
    console.log('✅ Connected to MongoDB');
    
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
    
    const user = await User.findOne({
      tenantId: TENANT_ID,
      $or: [
        { email: ADMIN_EMAIL.toLowerCase() },
        { email: 'contact@eyekra.com' },
        { email: 'admin@eyekra.com' }
      ]
    });
    
    if (!user) {
      console.log('❌ User not found!');
      console.log('   Tried emails:', ADMIN_EMAIL, 'contact@eyekra.com', 'admin@eyekra.com');
      process.exit(1);
    }
    
    console.log(`✅ Found user: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Tenant: ${user.tenantId}`);
    console.log('🔐 Hashing new password...');
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 12);
    
    console.log('💾 Updating password...');
    user.password = hashedPassword;
    user.mustChangePassword = false;
    user.passwordTemporary = false;
    user.updatedAt = new Date();
    await user.save();
    
    console.log('✅ Password reset successfully!');
    console.log('\n🔐 Login Credentials:');
    console.log(`Email: ${user.email}`);
    console.log(`Password: ${NEW_PASSWORD}`);
    console.log(`Tenant: ${TENANT_ID}`);
    
    await mongoose.connection.close();
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

resetPassword();
