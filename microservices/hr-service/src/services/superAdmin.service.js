const User = require('../models/User.model');
const Role = require('../models/Role.model');
const bcrypt = require('bcryptjs');
const logger = require('../config/logger');

// Single admin user for production
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@etelios.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123456';
const ADMIN_EMPLOYEE_ID = process.env.ADMIN_EMPLOYEE_ID || 'ADMIN-001';

/**
 * Create or get admin user (single admin for production)
 * This ensures one admin exists in the system for login and employee creation
 */
const ensureSuperAdmin = async () => {
  try {
    // Check if admin role exists
    let adminRole = await Role.findOne({ 
      $or: [
        { name: 'admin' },
        { name: 'Admin' },
        { name: 'ADMIN' }
      ]
    });

    if (!adminRole) {
      // Create admin role with all permissions
      adminRole = await Role.create({
        name: 'admin',
        display_name: 'Admin',
        description: 'System administrator with full access',
        is_active: true,
        is_system: true,
        permissions: ['*'] // All permissions
      });
      logger.info('Created admin role', { roleId: adminRole._id });
    }

    // Check if admin user exists
    let admin = await User.findOne({ 
      $or: [
        { email: ADMIN_EMAIL.toLowerCase() },
        { employeeId: ADMIN_EMPLOYEE_ID }
      ]
    });

    if (!admin) {
      // Create admin user
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      admin = await User.create({
        employeeId: ADMIN_EMPLOYEE_ID,
        firstName: 'System',
        lastName: 'Administrator',
        email: ADMIN_EMAIL.toLowerCase(),
        phone: '+919999999999',
        password: hashedPassword,
        role: adminRole._id,
        department: 'TECH',
        jobTitle: 'System Administrator',
        status: 'active',
        is_active: true,
        band_level: 'A',
        hierarchy_level: 'NATIONAL',
        joining_date: new Date()
      });
      logger.info('Created admin user', { 
        userId: admin._id, 
        email: admin.email,
        employeeId: admin.employeeId
      });
    } else {
      // Update existing user to ensure they have admin role
      if (admin.role.toString() !== adminRole._id.toString()) {
        admin.role = adminRole._id;
      }
      admin.is_active = true;
      admin.status = 'active';
      await admin.save();
      logger.info('Updated admin user', { userId: admin._id });
    }

    return {
      user: admin,
      role: adminRole,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD // Only for initial setup
    };
  } catch (error) {
    logger.error('Error ensuring admin user', { error: error.message });
    throw error;
  }
};

module.exports = {
  ensureSuperAdmin,
  // Alias for backward compatibility
  ensureAdmin: ensureSuperAdmin
};

