#!/usr/bin/env node

/**
 * Cleanup Mock Data Script
 * Removes all mock users except one admin user
 * 
 * Usage:
 *   node scripts/cleanup-mock-data.js
 * 
 * Environment Variables:
 *   MONGO_URI - MongoDB connection string
 *   KEEP_ADMIN_EMAIL - Email of admin to keep (default: admin@etelios.com)
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Admin user to keep
const KEEP_ADMIN_EMAIL = process.env.KEEP_ADMIN_EMAIL || 'admin@etelios.com';
const KEEP_ADMIN_EMPLOYEE_ID = process.env.KEEP_ADMIN_EMPLOYEE_ID || 'ADMIN-001';

async function cleanupMockData() {
  try {
    console.log('🧹 Cleaning Up Mock Data');
    console.log('========================');
    console.log('');

    // Connect to database
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/etelios_auth';
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    console.log('✅ Connected to MongoDB');
    console.log('');

    const User = require('../microservices/auth-service/src/models/User.model');
    const Role = require('../microservices/auth-service/src/models/Role.model');

    // Find admin role
    const adminRole = await Role.findOne({ 
      $or: [
        { name: 'admin' },
        { name: 'Admin' },
        { name: 'ADMIN' }
      ]
    });

    if (!adminRole) {
      console.log('⚠️  Admin role not found. Creating admin role...');
      const adminRole = await Role.create({
        name: 'admin',
        display_name: 'Admin',
        description: 'Administrator with full access',
        is_active: true,
        is_system: true,
        permissions: ['*'] // All permissions
      });
      console.log('✅ Admin role created');
    }

    // Find admin user to keep
    let adminUser = await User.findOne({
      $or: [
        { email: KEEP_ADMIN_EMAIL.toLowerCase() },
        { employee_id: KEEP_ADMIN_EMPLOYEE_ID }
      ]
    });

    // If admin doesn't exist, create it
    if (!adminUser) {
      console.log('👤 Creating admin user...');
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('Admin@123456', 10);
      
      adminUser = await User.create({
        tenantId: 'default',
        employee_id: KEEP_ADMIN_EMPLOYEE_ID,
        name: 'System Administrator',
        email: KEEP_ADMIN_EMAIL.toLowerCase(),
        phone: '+919999999999',
        password: hashedPassword,
        role: adminRole._id,
        department: 'TECH',
        designation: 'System Administrator',
        joining_date: new Date(),
        is_active: true,
        status: 'active',
        band_level: 'A',
        hierarchy_level: 'NATIONAL'
      });
      console.log('✅ Admin user created');
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Password: Admin@123456`);
      console.log(`   Employee ID: ${adminUser.employee_id}`);
    } else {
      // Ensure admin user has admin role
      if (adminUser.role.toString() !== adminRole._id.toString()) {
        adminUser.role = adminRole._id;
        adminUser.is_active = true;
        adminUser.status = 'active';
        await adminUser.save();
        console.log('✅ Updated existing admin user');
      } else {
        console.log('✅ Admin user already exists and is correct');
      }
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Employee ID: ${adminUser.employee_id}`);
    }

    console.log('');
    console.log('🗑️  Removing mock users...');

    // Find all mock users (by email pattern or employee ID pattern)
    const mockUsers = await User.find({
      $or: [
        { email: { $regex: /^mock\./i } },
        { employee_id: { $regex: /^MOCK/i } },
        { email: { $regex: /mock/i } },
        { name: { $regex: /Mock/i } }
      ],
      _id: { $ne: adminUser._id } // Don't delete the admin we're keeping
    });

    console.log(`   Found ${mockUsers.length} mock users to delete`);

    if (mockUsers.length > 0) {
      const deleted = await User.deleteMany({
        _id: { $in: mockUsers.map(u => u._id) }
      });
      console.log(`✅ Deleted ${deleted.deletedCount} mock users`);
      
      // Show what was deleted
      mockUsers.forEach(user => {
        console.log(`   - Deleted: ${user.email} (${user.employee_id})`);
      });
    } else {
      console.log('   No mock users found to delete');
    }

    // Also clean up any users with mock in name/email (case-insensitive)
    const additionalMockUsers = await User.find({
      $or: [
        { email: { $regex: /mock/i } },
        { name: { $regex: /mock/i } },
        { employee_id: { $regex: /MOCK/i } }
      ],
      _id: { $ne: adminUser._id }
    });

    if (additionalMockUsers.length > 0) {
      const deleted = await User.deleteMany({
        _id: { $in: additionalMockUsers.map(u => u._id) }
      });
      console.log(`✅ Deleted ${deleted.deletedCount} additional mock users`);
    }

    console.log('');
    console.log('📊 Final Status');
    console.log('===============');
    
    const totalUsers = await User.countDocuments();
    const adminUsers = await User.find({ role: adminRole._id });
    
    console.log(`Total users: ${totalUsers}`);
    console.log(`Admin users: ${adminUsers.length}`);
    console.log('');
    console.log('✅ Admin user details:');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Employee ID: ${adminUser.employee_id}`);
    console.log(`   Password: Admin@123456`);
    console.log(`   Role: admin`);
    console.log('');
    console.log('✅ Cleanup complete!');
    console.log('');
    console.log('🔑 Use these credentials to login:');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Password: Admin@123456`);

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error cleaning up mock data:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

cleanupMockData();

