const User = require('../models/User.model');
const Store = require('../models/Store.model');
const bcrypt = require('bcryptjs');
const logger = require('../config/logger');
const { generateTokens } = require('../config/jwt');
const { promotePeopleManagerById } = require('../utils/peopleManagerRoleSync');

function normalizeTenantId(value) {
  return value == null ? '' : String(value).toLowerCase().trim();
}

function tenantHeader(req) {
  return normalizeTenantId(req.get('X-Tenant-Id') || req.get('x-tenant-id'));
}

/** Non–super-admin: require token tenant; optional header must match token. */
function resolveActorTenantForMutation(req) {
  const actorRole = String(req.user?.role || '').toLowerCase();
  if (actorRole === 'superadmin') {
    return { ok: true, tenantId: tenantHeader(req) || null, superadmin: true };
  }
  const tt = normalizeTenantId(req.user?.tenantId);
  if (!tt) {
    return { ok: false, status: 403, message: 'Token tenant is missing', code: 'TENANT_REQUIRED' };
  }
  const headerTenant = tenantHeader(req);
  if (headerTenant && headerTenant !== tt) {
    return { ok: false, status: 403, message: 'X-Tenant-Id does not match token tenant', code: 'TENANT_MISMATCH' };
  }
  return { ok: true, tenantId: tt, superadmin: false };
}

function assertAccessToTargetRealUser(req, targetUser) {
  if (!targetUser) {
    return { ok: false, status: 404, message: 'User not found' };
  }
  const actorRole = String(req.user?.role || '').toLowerCase();
  const ut = normalizeTenantId(targetUser.tenantId);
  if (actorRole === 'superadmin') {
    const ht = tenantHeader(req);
    if (ht && ht !== ut) {
      return { ok: false, status: 404, message: 'User not found' };
    }
    return { ok: true };
  }
  const gate = resolveActorTenantForMutation(req);
  if (!gate.ok) return gate;
  if (ut !== gate.tenantId) {
    return { ok: false, status: 404, message: 'User not found' };
  }
  return { ok: true };
}

/**
 * Real User Registration Controller
 * Handles registration of real users with proper validation
 */

/**
 * Register a new real user (HR/Admin only)
 */
const registerRealUser = async (req, res, next) => {
  try {
    const {
      employee_id,
      first_name,
      last_name,
      email,
      phone,
      password,
      role,
      store_id,
      department,
      designation,
      reporting_manager_id
    } = req.body;

    // Validate required fields
    if (!employee_id || !first_name || !last_name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: employee_id, first_name, last_name, email, password, role'
      });
    }

    const actorRole = String(req.user?.role || '').toLowerCase();
    let registrationTenantId;
    if (actorRole === 'superadmin') {
      registrationTenantId = tenantHeader(req) || normalizeTenantId(req.body.tenant_id) || 'default';
    } else {
      const gate = resolveActorTenantForMutation(req);
      if (!gate.ok) {
        return res.status(gate.status).json({
          success: false,
          message: gate.message,
          ...(gate.code ? { code: gate.code } : {})
        });
      }
      registrationTenantId = gate.tenantId;
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      tenantId: registrationTenantId,
      $or: [
        { email: email.toLowerCase() },
        { employee_id: employee_id.toUpperCase() }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or employee ID already exists'
      });
    }

    // Validate role
    const validRoles = ['admin', 'hr', 'manager', 'employee', 'accounts'];
    if (!validRoles.includes(role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be one of: admin, hr, manager, employee, accounts'
      });
    }

    // Validate store
    let store = null;
    if (store_id) {
      store = await Store.findById(store_id);
      if (!store) {
        return res.status(400).json({
          success: false,
          message: 'Store not found'
        });
      }
    }

    // Validate reporting manager
    let reportingManager = null;
    if (reporting_manager_id) {
      reportingManager = await User.findById(reporting_manager_id);
      if (!reportingManager) {
        return res.status(400).json({
          success: false,
          message: 'Reporting manager not found'
        });
      }
      if (normalizeTenantId(reportingManager.tenantId) !== registrationTenantId) {
        return res.status(400).json({
          success: false,
          message: 'Reporting manager must belong to the same tenant'
        });
      }
    }

    // Create user data
    const userData = {
      tenantId: registrationTenantId,
      employee_id: employee_id.toUpperCase(),
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email.toLowerCase().trim(),
      password: await bcrypt.hash(password, 12),
      phone: phone || null,
      role: role.toLowerCase(),
      stores: store ? [store._id] : [],
      primary_store: store ? store._id : null,
      department: department || null,
      designation: designation || null,
      reporting_manager: reportingManager ? reportingManager._id : null,
      status: 'active',
      is_verified: true,
      is_active: true,
      created_by: req.user._id
    };

    const user = new User(userData);
    await user.save();

    if (reportingManager) {
      try {
        const sync = await promotePeopleManagerById(reportingManager._id);
        logger.info('Reporting-manager role sync', { targetManagerId: reportingManager._id, sync });
      } catch (e) {
        logger.warn('promotePeopleManagerById failed (non-blocking)', { error: e.message });
      }
    }

    // Populate the response
    await user.populate([
      { path: 'primary_store', select: 'name code' },
      { path: 'reporting_manager', select: 'first_name last_name role' }
    ]);

    logger.info('Real user registered successfully', {
      userId: user._id,
      employeeId: user.employee_id,
      email: user.email,
      role: user.role,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Real user registered successfully',
      data: {
        id: user._id,
        employee_id: user.employee_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        store: user.primary_store,
        department: user.department,
        designation: user.designation,
        reporting_manager: user.reporting_manager,
        status: user.status,
        created_at: user.created_at
      }
    });

  } catch (error) {
    logger.error('Error in registerRealUser controller', { error: error.message });
    next(error);
  }
};

/**
 * Get all real users (with pagination and filtering)
 */
const getRealUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      store_id,
      department,
      status = 'active',
      search
    } = req.query;

    const filter = { is_active: true };

    const actorRole = String(req.user?.role || '').toLowerCase();
    if (actorRole !== 'superadmin') {
      const gate = resolveActorTenantForMutation(req);
      if (!gate.ok) {
        return res.status(gate.status).json({
          success: false,
          message: gate.message,
          ...(gate.code ? { code: gate.code } : {})
        });
      }
      filter.tenantId = gate.tenantId;
    } else if (tenantHeader(req)) {
      filter.tenantId = tenantHeader(req);
    }

    // Apply filters
    if (role) filter.role = role;
    if (store_id) filter.primary_store = store_id;
    if (department) filter.department = new RegExp(department, 'i');
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { first_name: new RegExp(search, 'i') },
        { last_name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { employee_id: new RegExp(search, 'i') }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const users = await User.find(filter)
      .populate('primary_store', 'name code')
      .populate('reporting_manager', 'first_name last_name role')
      .select('-password')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      message: 'Real users retrieved successfully',
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNextPage: parseInt(page) < Math.ceil(total / parseInt(limit)),
          hasPrevPage: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    logger.error('Error in getRealUsers controller', { error: error.message });
    next(error);
  }
};

/**
 * Get a specific real user
 */
const getRealUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .populate('primary_store', 'name code address contact')
      .populate('reporting_manager', 'first_name last_name role email')
      .select('-password');

    const access = assertAccessToTargetRealUser(req, user);
    if (!access.ok) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
        ...(access.code ? { code: access.code } : {})
      });
    }

    res.status(200).json({
      success: true,
      message: 'Real user retrieved successfully',
      data: user
    });

  } catch (error) {
    logger.error('Error in getRealUser controller', { error: error.message });
    next(error);
  }
};

/**
 * Update a real user
 */
const updateRealUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existingTarget = await User.findById(id).select('tenantId');
    const access = assertAccessToTargetRealUser(req, existingTarget);
    if (!access.ok) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
        ...(access.code ? { code: access.code } : {})
      });
    }

    // Remove sensitive fields
    delete updateData.password;
    delete updateData._id;
    delete updateData.created_at;
    delete updateData.created_by;
    delete updateData.tenantId;

    // Validate role if provided
    if (updateData.role) {
      const validRoles = ['admin', 'hr', 'manager', 'employee', 'accounts'];
      if (!validRoles.includes(updateData.role.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role'
        });
      }
    }

    // Validate store if provided
    if (updateData.primary_store) {
      const store = await Store.findById(updateData.primary_store);
      if (!store) {
        return res.status(400).json({
          success: false,
          message: 'Store not found'
        });
      }
    }

    // Validate reporting manager if provided
    if (updateData.reporting_manager) {
      const manager = await User.findById(updateData.reporting_manager);
      if (!manager) {
        return res.status(400).json({
          success: false,
          message: 'Reporting manager not found'
        });
      }
      if (normalizeTenantId(manager.tenantId) !== normalizeTenantId(existingTarget.tenantId)) {
        return res.status(400).json({
          success: false,
          message: 'Reporting manager must belong to the same tenant'
        });
      }
    }

    updateData.updated_by = req.user._id;
    updateData.updated_at = new Date();

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('primary_store', 'name code')
      .populate('reporting_manager', 'first_name last_name role')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (updateData.reporting_manager) {
      try {
        const sync = await promotePeopleManagerById(updateData.reporting_manager);
        logger.info('Reporting-manager role sync (update)', { targetManagerId: updateData.reporting_manager, sync });
      } catch (e) {
        logger.warn('promotePeopleManagerById failed (non-blocking)', { error: e.message });
      }
    }

    logger.info('Real user updated successfully', {
      userId: user._id,
      updatedBy: req.user._id,
      changes: Object.keys(updateData)
    });

    res.status(200).json({
      success: true,
      message: 'Real user updated successfully',
      data: user
    });

  } catch (error) {
    logger.error('Error in updateRealUser controller', { error: error.message });
    next(error);
  }
};

/**
 * Deactivate a real user
 */
const deactivateRealUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const existingTarget = await User.findById(id).select('tenantId');
    const access = assertAccessToTargetRealUser(req, existingTarget);
    if (!access.ok) {
      return res.status(access.status).json({
        success: false,
        message: access.message,
        ...(access.code ? { code: access.code } : {})
      });
    }

    const user = await User.findByIdAndUpdate(
      id,
      {
        is_active: false,
        status: 'inactive',
        deactivated_at: new Date(),
        deactivated_by: req.user._id,
        deactivation_reason: reason || 'Deactivated by admin'
      },
      { new: true }
    )
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    logger.info('Real user deactivated successfully', {
      userId: user._id,
      deactivatedBy: req.user._id,
      reason: reason
    });

    res.status(200).json({
      success: true,
      message: 'Real user deactivated successfully',
      data: user
    });

  } catch (error) {
    logger.error('Error in deactivateRealUser controller', { error: error.message });
    next(error);
  }
};

/**
 * Get user profile (for the logged-in user)
 */
const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('primary_store', 'name code address contact')
      .populate('reporting_manager', 'first_name last_name role email')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User profile retrieved successfully',
      data: user
    });

  } catch (error) {
    logger.error('Error in getUserProfile controller', { error: error.message });
    next(error);
  }
};

/**
 * Update user profile (for the logged-in user)
 */
const updateUserProfile = async (req, res, next) => {
  try {
    const { first_name, last_name, phone, department, designation } = req.body;
    const userId = req.user._id;

    const updateData = {};
    if (first_name) updateData.first_name = first_name.trim();
    if (last_name) updateData.last_name = last_name.trim();
    if (phone) updateData.phone = phone;
    if (department) updateData.department = department.trim();
    if (designation) updateData.designation = designation.trim();

    updateData.updated_at = new Date();

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('primary_store', 'name code')
      .populate('reporting_manager', 'first_name last_name role')
      .select('-password');

    logger.info('User profile updated successfully', {
      userId: user._id,
      changes: Object.keys(updateData)
    });

    res.status(200).json({
      success: true,
      message: 'User profile updated successfully',
      data: user
    });

  } catch (error) {
    logger.error('Error in updateUserProfile controller', { error: error.message });
    next(error);
  }
};

/**
 * Change user password
 */
const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user._id;

    if (!current_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    const hashed = await bcrypt.hash(new_password, 12);
    await User.updateOne(
      { _id: userId },
      {
        $set: {
          password: hashed,
          mustChangePassword: false,
          passwordTemporary: false,
          passwordChangedAt: new Date(),
          updated_at: new Date()
        }
      }
    );

    logger.info('User password changed successfully', {
      userId: user._id
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    logger.error('Error in changePassword controller', { error: error.message });
    next(error);
  }
};

module.exports = {
  registerRealUser,
  getRealUsers,
  getRealUser,
  updateRealUser,
  deactivateRealUser,
  getUserProfile,
  updateUserProfile,
  changePassword
};
