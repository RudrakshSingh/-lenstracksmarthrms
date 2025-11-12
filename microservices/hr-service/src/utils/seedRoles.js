/**
 * Seed default roles in the database
 */
const Role = require('../models/Role.model');
const logger = require('../config/logger');

const defaultRoles = [
  {
    name: 'superadmin',
    display_name: 'Super Admin',
    description: 'Super Administrator with all permissions',
    permissions: [
      'read_users', 'write_users', 'delete_users', 'create_users', 'update_users',
      'read_hr', 'write_hr', 'create_hr', 'update_hr', 'delete_hr',
      'read_leave', 'write_leave', 'create_leave', 'update_leave', 'approve_leave',
      'read_payroll', 'write_payroll', 'create_payroll', 'update_payroll', 'process_payroll',
      'read_stores', 'write_stores', 'create_stores', 'update_stores', 'delete_stores',
      'read_roles', 'write_roles', 'create_roles', 'update_roles',
      'read_reports', 'write_reports', 'export_reports',
      'read_audit', 'view_audit_logs'
    ]
  },
  {
    name: 'admin',
    display_name: 'Admin',
    description: 'Administrator with most permissions',
    permissions: [
      'read_users', 'write_users', 'create_users', 'update_users',
      'read_hr', 'write_hr', 'create_hr', 'update_hr',
      'read_leave', 'write_leave', 'create_leave', 'update_leave', 'approve_leave',
      'read_payroll', 'write_payroll', 'create_payroll', 'update_payroll', 'process_payroll',
      'read_stores', 'write_stores', 'create_stores', 'update_stores',
      'read_roles', 'read_reports', 'write_reports', 'export_reports',
      'read_audit', 'view_audit_logs'
    ]
  },
  {
    name: 'hr',
    display_name: 'HR',
    description: 'HR Manager with HR-related permissions',
    permissions: [
      // User Management (matching route requirements)
      'read_users', 'write_users', 'create_users', 'update_users', 'delete_users',
      'user:read', 'user:create', 'user:update', 'user:delete',
      
      // Role Management
      'read_roles', 'write_roles', 'create_roles', 'update_roles',
      'role:assign', 'role:read', 'role:update',
      
      // HR Management
      'read_hr', 'write_hr', 'create_hr', 'update_hr', 'delete_hr',
      
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
      'hr.letters.approve'
    ]
  },
  {
    name: 'manager',
    display_name: 'Manager',
    description: 'Manager with team management permissions',
    permissions: [
      'read_users', 'read_hr', 'read_leave', 'write_leave', 'approve_leave',
      'read_payroll', 'read_reports', 'export_reports'
    ]
  },
  {
    name: 'employee',
    display_name: 'Employee',
    description: 'Regular employee with basic permissions',
    permissions: [
      'read_users', 'read_hr', 'read_leave', 'write_leave', 'create_leave',
      'read_payroll'
    ]
  }
];

async function seedRoles() {
  try {
    logger.info('Seeding roles...');
    
    for (const roleData of defaultRoles) {
      const existingRole = await Role.findOne({ name: roleData.name });
      
      if (!existingRole) {
        const role = new Role(roleData);
        await role.save();
        logger.info(`Created role: ${roleData.name}`);
      } else {
        // Update permissions if role exists
        existingRole.permissions = roleData.permissions;
        existingRole.display_name = roleData.display_name;
        existingRole.description = roleData.description;
        await existingRole.save();
        logger.info(`Updated role: ${roleData.name}`);
      }
    }
    
    logger.info('Roles seeded successfully');
    return true;
  } catch (error) {
    logger.error('Error seeding roles', { error: error.message });
    throw error;
  }
}

module.exports = { seedRoles };

