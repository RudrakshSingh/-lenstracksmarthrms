const User = require('../models/User.model');
const Role = require('../models/Role.model');
const bcrypt = require('bcryptjs');
const logger = require('../config/logger');

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'superadmin@etelios.com';
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@123';
const SUPER_ADMIN_EMPLOYEE_ID = process.env.SUPER_ADMIN_EMPLOYEE_ID || 'SUPERADMIN001';

/**
 * Create or get super admin user
 * This ensures a super admin exists in the system
 */
const ensureSuperAdmin = async () => {
  try {
    // Check if super admin role exists
    let superAdminRole = await Role.findOne({ 
      $or: [
        { name: 'superadmin' },
        { name: 'super-admin' },
        { name: 'SuperAdmin' }
      ]
    });

    if (!superAdminRole) {
      // Create super admin role with all permissions
      superAdminRole = await Role.create({
        name: 'superadmin',
        display_name: 'Super Admin',
        description: 'System super administrator with full access',
        permissions: ['*'] // All permissions
      });
      logger.info('Created super admin role', { roleId: superAdminRole._id });
    }

    // Check if super admin user exists
    let superAdmin = await User.findOne({ 
      email: SUPER_ADMIN_EMAIL.toLowerCase() 
    });

    if (!superAdmin) {
      // Create super admin user
      const hashedPassword = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
      superAdmin = await User.create({
        employeeId: SUPER_ADMIN_EMPLOYEE_ID,
        firstName: 'Super',
        lastName: 'Admin',
        email: SUPER_ADMIN_EMAIL.toLowerCase(),
        phone: '+919999999999',
        password: hashedPassword,
        role: superAdminRole._id,
        department: 'System Administration',
        jobTitle: 'Super Administrator',
        status: 'active',
        is_active: true
      });
      logger.info('Created super admin user', { 
        userId: superAdmin._id, 
        email: superAdmin.email,
        employeeId: superAdmin.employeeId
      });
    } else {
      // Update existing user to ensure they have super admin role
      if (superAdmin.role.toString() !== superAdminRole._id.toString()) {
        superAdmin.role = superAdminRole._id;
        superAdmin.is_active = true;
        superAdmin.status = 'active';
        await superAdmin.save();
        logger.info('Updated user to super admin role', { userId: superAdmin._id });
      }
    }

    return {
      user: superAdmin,
      role: superAdminRole,
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD // Only for initial setup
    };
  } catch (error) {
    logger.error('Error ensuring super admin', { error: error.message });
    throw error;
  }
};

module.exports = {
  ensureSuperAdmin
};

