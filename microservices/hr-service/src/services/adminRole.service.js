const Role = require('../models/Role.model');
const User = require('../models/User.model');
const logger = require('../config/logger');

class AdminRoleService {
  /**
   * Get all roles
   */
  async getRoles(filters = {}, page = 1, limit = 25) {
    try {
      const skip = (page - 1) * limit;
      const query = { is_active: true };

      // Apply filters
      if (filters.search) {
        query.$or = [
          { name: { $regex: filters.search, $options: 'i' } },
          { display_name: { $regex: filters.search, $options: 'i' } }
        ];
      }

      const [roles, total] = await Promise.all([
        Role.find(query)
          .populate('created_by', 'firstName lastName email')
          .populate('updated_by', 'firstName lastName email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Role.countDocuments(query)
      ]);

      return {
        data: roles,
        total,
        page,
        limit
      };
    } catch (error) {
      logger.error('Error in getRoles service', { error: error.message });
      throw error;
    }
  }

  /**
   * Get role by ID
   */
  async getRoleById(roleId) {
    try {
      const role = await Role.findOne({ _id: roleId, is_active: true })
        .populate('created_by', 'firstName lastName email')
        .populate('updated_by', 'firstName lastName email')
        .lean();

      if (!role) {
        const error = new Error('Role not found');
        error.statusCode = 404;
        throw error;
      }

      return role;
    } catch (error) {
      logger.error('Error in getRoleById service', { error: error.message });
      throw error;
    }
  }

  /**
   * Create new role
   */
  async createRole(roleData, createdBy) {
    try {
      // Check if role already exists
      const existingRole = await Role.findOne({ 
        name: roleData.name.toLowerCase(),
        is_active: true
      });

      if (existingRole) {
        const error = new Error('Role with this name already exists');
        error.statusCode = 400;
        throw error;
      }

      // Validate permissions if provided
      if (roleData.permissions && roleData.permissions.length > 0) {
        const validPermissions = [
          'read_users', 'write_users', 'delete_users',
          'create_users', 'update_users', 'activate_users', 'deactivate_users',
          'user:read', 'user:create', 'user:update', 'user:delete',
          'read_hr', 'write_hr', 'create_hr', 'update_hr', 'delete_hr',
          'read_leave', 'write_leave', 'create_leave', 'update_leave', 'approve_leave',
          'hr.leave.read', 'hr.leave.create', 'hr.leave.update', 'hr.leave.approve',
          'hr.leave.yearclose',
          'read_payroll', 'write_payroll', 'create_payroll', 'update_payroll', 'process_payroll',
          'hr.payroll.read', 'hr.payroll.create', 'hr.payroll.update', 'hr.payroll.process',
          'hr.payroll.lock', 'hr.payroll.post', 'hr.payroll.override',
          'read_stores', 'write_stores', 'create_stores', 'update_stores', 'delete_stores',
          'store:read', 'store:create', 'store:update', 'store:delete',
          'read_roles', 'write_roles', 'create_roles', 'update_roles',
          'role:assign', 'role:read', 'role:update',
          'transfer:read', 'transfer:create', 'transfer:update', 'transfer:approve', 'transfer:request',
          'read_reports', 'write_reports', 'export_reports',
          'hr.reports.read',
          'read_audit', 'view_audit_logs',
          'hr.audit.read', 'hr.audit.verify',
          'hr.fnf.read', 'hr.fnf.create', 'hr.fnf.update', 'hr.fnf.approve', 'hr.fnf.payout',
          'hr.incentive.read', 'hr.incentive.create', 'hr.incentive.approve',
          'hr.clawback.apply',
          'hr.statutory.read', 'hr.statutory.export', 'hr.statutory.validate',
          'hr.letters.create', 'hr.letters.read', 'hr.letters.update', 'hr.letters.submit',
          'hr.letters.approve',
          '*'
        ];

        const invalidPermissions = roleData.permissions.filter(
          perm => !validPermissions.includes(perm)
        );

        if (invalidPermissions.length > 0) {
          const error = new Error(`Invalid permissions: ${invalidPermissions.join(', ')}`);
          error.statusCode = 400;
          throw error;
        }
      }

      // Create role
      const role = new Role({
        ...roleData,
        name: roleData.name.toLowerCase(),
        created_by: createdBy
      });

      await role.save();

      return role.toObject();
    } catch (error) {
      logger.error('Error in createRole service', { error: error.message });
      throw error;
    }
  }

  /**
   * Update role
   */
  async updateRole(roleId, updateData, updatedBy) {
    try {
      const role = await Role.findOne({ _id: roleId, is_active: true });

      if (!role) {
        const error = new Error('Role not found');
        error.statusCode = 404;
        throw error;
      }

      // If name is being updated, check for duplicates
      if (updateData.name && updateData.name.toLowerCase() !== role.name) {
        const existingRole = await Role.findOne({
          name: updateData.name.toLowerCase(),
          _id: { $ne: roleId },
          is_active: true
        });

        if (existingRole) {
          const error = new Error('Role with this name already exists');
          error.statusCode = 400;
          throw error;
        }
        updateData.name = updateData.name.toLowerCase();
      }

      // Validate permissions if being updated
      if (updateData.permissions && updateData.permissions.length > 0) {
        const validPermissions = [
          'read_users', 'write_users', 'delete_users',
          'create_users', 'update_users', 'activate_users', 'deactivate_users',
          'user:read', 'user:create', 'user:update', 'user:delete',
          'read_hr', 'write_hr', 'create_hr', 'update_hr', 'delete_hr',
          'read_leave', 'write_leave', 'create_leave', 'update_leave', 'approve_leave',
          'hr.leave.read', 'hr.leave.create', 'hr.leave.update', 'hr.leave.approve',
          'hr.leave.yearclose',
          'read_payroll', 'write_payroll', 'create_payroll', 'update_payroll', 'process_payroll',
          'hr.payroll.read', 'hr.payroll.create', 'hr.payroll.update', 'hr.payroll.process',
          'hr.payroll.lock', 'hr.payroll.post', 'hr.payroll.override',
          'read_stores', 'write_stores', 'create_stores', 'update_stores', 'delete_stores',
          'store:read', 'store:create', 'store:update', 'store:delete',
          'read_roles', 'write_roles', 'create_roles', 'update_roles',
          'role:assign', 'role:read', 'role:update',
          'transfer:read', 'transfer:create', 'transfer:update', 'transfer:approve', 'transfer:request',
          'read_reports', 'write_reports', 'export_reports',
          'hr.reports.read',
          'read_audit', 'view_audit_logs',
          'hr.audit.read', 'hr.audit.verify',
          'hr.fnf.read', 'hr.fnf.create', 'hr.fnf.update', 'hr.fnf.approve', 'hr.fnf.payout',
          'hr.incentive.read', 'hr.incentive.create', 'hr.incentive.approve',
          'hr.clawback.apply',
          'hr.statutory.read', 'hr.statutory.export', 'hr.statutory.validate',
          'hr.letters.create', 'hr.letters.read', 'hr.letters.update', 'hr.letters.submit',
          'hr.letters.approve',
          '*'
        ];

        const invalidPermissions = updateData.permissions.filter(
          perm => !validPermissions.includes(perm)
        );

        if (invalidPermissions.length > 0) {
          const error = new Error(`Invalid permissions: ${invalidPermissions.join(', ')}`);
          error.statusCode = 400;
          throw error;
        }
      }

      // Update role
      Object.assign(role, updateData);
      role.updated_by = updatedBy;
      await role.save();

      return role.toObject();
    } catch (error) {
      logger.error('Error in updateRole service', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete role (soft delete)
   */
  async deleteRole(roleId, deletedBy) {
    try {
      const role = await Role.findOne({ _id: roleId, is_active: true });

      if (!role) {
        const error = new Error('Role not found');
        error.statusCode = 404;
        throw error;
      }

      // Check if any users are using this role
      const usersWithRole = await User.countDocuments({ 
        role: roleId,
        isDeleted: false
      });

      if (usersWithRole > 0) {
        const error = new Error(`Cannot delete role. ${usersWithRole} user(s) are assigned this role`);
        error.statusCode = 400;
        throw error;
      }

      // Soft delete
      role.is_active = false;
      role.updated_by = deletedBy;
      await role.save();

      return { message: 'Role deleted successfully' };
    } catch (error) {
      logger.error('Error in deleteRole service', { error: error.message });
      throw error;
    }
  }
}

module.exports = new AdminRoleService();

