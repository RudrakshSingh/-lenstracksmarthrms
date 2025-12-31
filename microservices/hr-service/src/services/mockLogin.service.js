const User = require('../models/User.model');
const Role = require('../models/Role.model');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const logger = require('../config/logger');

/**
 * Mock login service for HR users
 * Creates or finds an HR user and returns tokens without password verification
 */
const mockLogin = async (email = null, roleName = 'hr') => {
  try {
    // Default HR email if not provided
    const hrEmail = email || 'hr@company.com';
    
    // Find or create HR role
    let hrRole = await Role.findOne({ name: roleName });
    if (!hrRole) {
      // Try alternative role names
      hrRole = await Role.findOne({ 
        $or: [
          { name: 'HR' },
          { name: 'hr' },
          { name: 'hr-manager' },
          { name: 'hr-head' },
          { name: 'admin' },
          { name: 'Admin' }
        ]
      });
    }

    // If still no role found, create a default HR role with all necessary permissions
    if (!hrRole) {
      hrRole = await Role.create({
        name: roleName,
        display_name: 'HR',
        permissions: [
          // User Management (required for employee endpoints)
          'read_users', 'write_users', 'create_users', 'update_users', 'delete_users',
          'user:read', 'user:create', 'user:update', 'user:delete',
          
          // HR Management
          'read_hr', 'write_hr', 'create_hr', 'update_hr', 'delete_hr',
          
          // Role Management
          'read_roles', 'write_roles', 'create_roles', 'update_roles',
          'role:assign', 'role:read', 'role:update',
          
          // Leave Management
          'read_leave', 'write_leave', 'create_leave', 'update_leave', 'approve_leave',
          'hr.leave.read', 'hr.leave.create', 'hr.leave.update', 'hr.leave.approve',
          'hr.leave.yearclose',
          
          // Payroll Management
          'read_payroll', 'write_payroll', 'create_payroll', 'update_payroll', 'process_payroll',
          'hr.payroll.read', 'hr.payroll.create', 'hr.payroll.update', 'hr.payroll.process',
          'hr.payroll.lock', 'hr.payroll.post', 'hr.payroll.override',
          
          // Store Management
          'read_stores', 'write_stores', 'create_stores', 'update_stores', 'delete_stores',
          'store:read', 'store:create', 'store:update', 'store:delete',
          
          // Transfer Management
          'transfer:read', 'transfer:create', 'transfer:update', 'transfer:approve', 'transfer:request',
          
          // Reports
          'read_reports', 'write_reports', 'export_reports',
          'hr.reports.read',
          
          // Audit
          'read_audit', 'view_audit_logs', 'hr.audit.read', 'hr.audit.verify',
          
          // F&F Settlement
          'hr.fnf.read', 'hr.fnf.create', 'hr.fnf.update', 'hr.fnf.approve', 'hr.fnf.payout',
          
          // Incentive & Claw-back
          'hr.incentive.read', 'hr.incentive.create', 'hr.incentive.approve',
          'hr.clawback.apply',
          
          // Statutory
          'hr.statutory.read', 'hr.statutory.export', 'hr.statutory.validate',
          
          // HR Letters
          'hr.letters.create', 'hr.letters.read', 'hr.letters.update', 'hr.letters.submit',
          'hr.letters.approve',
          
          // Legacy permissions for compatibility
          'hr.read', 'hr.create', 'hr.update', 'hr.delete',
          'employee.read', 'employee.create', 'employee.update', 'employee.delete',
          'dashboard.read'
        ]
      });
      logger.info('Created default HR role with full permissions', { roleId: hrRole._id });
    } else {
      // Ensure the role has user:read permission
      if (!hrRole.permissions.includes('user:read') && !hrRole.permissions.includes('read_users')) {
        hrRole.permissions.push('user:read', 'read_users');
        await hrRole.save();
        logger.info('Added user:read permission to HR role', { roleId: hrRole._id });
      }
    }

    // Find or create HR user
    let user = await User.findOne({ email: hrEmail.toLowerCase() })
      .populate('role', 'name display_name permissions');

    if (!user) {
      // Create mock HR user
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      user = await User.create({
        employeeId: `HR${Date.now().toString().slice(-6)}`,
        firstName: 'HR',
        lastName: 'Manager',
        email: hrEmail.toLowerCase(),
        phone: '+91-9876543210',
        password: hashedPassword,
        role: hrRole._id,
        department: 'Human Resources',
        jobTitle: 'HR Manager',
        status: 'active',
        is_active: true,
        isDeleted: false
      });

      logger.info('Created mock HR user', { userId: user._id, email: hrEmail });
    } else {
      // Ensure user is active and has HR role
      if (user.role && typeof user.role === 'object') {
        // Role already populated
      } else {
        // Populate role if not already populated
        await user.populate('role', 'name display_name permissions');
      }

      // Update user to ensure active status
      user.status = 'active';
      user.is_active = true;
      user.isDeleted = false;
      if (!user.role || (typeof user.role === 'object' && user.role.name !== roleName)) {
        user.role = hrRole._id;
      }
      await user.save({ validateBeforeSave: false });
    }

    // Get role information
    let roleData = null;
    if (user.role) {
      if (typeof user.role === 'object' && user.role._id) {
        roleData = {
          id: user.role._id,
          name: user.role.name,
          displayName: user.role.display_name,
          permissions: user.role.permissions || []
        };
      } else {
        const role = await Role.findById(user.role);
        if (role) {
          roleData = {
            id: role._id,
            name: role.name,
            displayName: role.display_name,
            permissions: role.permissions || []
          };
        }
      }
    }

    // Generate tokens
    const tokenPayload = {
      userId: user._id.toString(),
      id: user._id.toString(),
      email: user.email,
      role: roleData?.name || roleName,
      employeeId: user.employeeId,
      permissions: roleData?.permissions || []
    };

    const accessToken = generateAccessToken(tokenPayload, '24h'); // 24 hours for mock login
    const refreshToken = generateRefreshToken({ userId: user._id.toString() }, '30d');

    // Update user with refresh token and last login
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // Get tenantId from store if available
    let tenantId = null;
    if (user.store) {
      if (typeof user.store === 'object') {
        tenantId = user.store._id?.toString() || user.store.id;
      } else {
        tenantId = user.store.toString();
      }
    }

    logger.info('Mock login successful', {
      userId: user._id,
      email: user.email,
      role: roleData?.name
    });

    // Return response in same format as regular login
    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim() || user.email,
        role: roleData?.name || roleName,
        permissions: roleData?.permissions || [],
        tenantId: tenantId,
        employeeId: user.employeeId
      },
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresIn: 86400, // 24 hours in seconds
      mockLogin: true // Flag to indicate this is a mock login
    };
  } catch (error) {
    logger.error('Mock login error', { error: error.message, stack: error.stack });
    throw error;
  }
};

module.exports = { mockLogin };

