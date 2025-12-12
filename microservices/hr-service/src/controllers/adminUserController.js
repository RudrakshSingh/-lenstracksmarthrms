const adminUserService = require('../services/adminUser.service');
const logger = require('../config/logger');
const { 
  sendSuccess, 
  sendError, 
  sendNotFound,
  createPagination,
  parsePagination,
  parseFilters
} = require('../../../shared/utils/response.util.js');

/**
 * Get all users
 * GET /api/admin/users
 */
const getUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const allowedFilters = ['status', 'role', 'department'];
    const filters = parseFilters(req.query, allowedFilters);
    
    if (req.query.search) {
      filters.search = req.query.search;
    }

    const result = await adminUserService.getUsers(filters, page, limit);
    const pagination = createPagination(page, limit, result.total);

    return sendSuccess(res, result.data, 'Users retrieved successfully', pagination, 200);
  } catch (error) {
    logger.error('Error in getUsers controller', { error: error.message });
    next(error);
  }
};

/**
 * Get user by ID
 * GET /api/admin/users/:id
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await adminUserService.getUserById(req.params.id);
    return sendSuccess(res, user, 'User retrieved successfully', null, 200);
  } catch (error) {
    if (error.statusCode === 404) {
      return sendNotFound(res, 'User', req.params.id);
    }
    logger.error('Error in getUserById controller', { error: error.message });
    next(error);
  }
};

/**
 * Create new user
 * POST /api/admin/users
 */
const createUser = async (req, res, next) => {
  try {
    const user = await adminUserService.createUser(req.body, req.user.id);
    return sendSuccess(res, user, 'User created successfully', null, 201);
  } catch (error) {
    if (error.statusCode === 400) {
      return sendError(res, error.message, error.message, 400);
    }
    logger.error('Error in createUser controller', { error: error.message });
    next(error);
  }
};

/**
 * Update user
 * PUT /api/admin/users/:id
 */
const updateUser = async (req, res, next) => {
  try {
    const user = await adminUserService.updateUser(req.params.id, req.body, req.user.id);
    return sendSuccess(res, user, 'User updated successfully', null, 200);
  } catch (error) {
    if (error.statusCode === 404) {
      return sendNotFound(res, 'User', req.params.id);
    }
    if (error.statusCode === 400) {
      return sendError(res, error.message, error.message, 400);
    }
    logger.error('Error in updateUser controller', { error: error.message });
    next(error);
  }
};

/**
 * Suspend user
 * POST /api/admin/users/:id/suspend
 */
const suspendUser = async (req, res, next) => {
  try {
    const user = await adminUserService.suspendUser(
      req.params.id, 
      req.body.reason || 'Suspended by admin',
      req.user.id
    );
    return sendSuccess(res, user, 'User suspended successfully', null, 200);
  } catch (error) {
    if (error.statusCode === 404) {
      return sendNotFound(res, 'User', req.params.id);
    }
    logger.error('Error in suspendUser controller', { error: error.message });
    next(error);
  }
};

/**
 * Reset user password
 * POST /api/admin/users/:id/reset-password
 */
const resetPassword = async (req, res, next) => {
  try {
    const result = await adminUserService.resetPassword(
      req.params.id,
      req.body.newPassword,
      req.user.id
    );
    return sendSuccess(res, result, 'Password reset successfully', null, 200);
  } catch (error) {
    if (error.statusCode === 404) {
      return sendNotFound(res, 'User', req.params.id);
    }
    logger.error('Error in resetPassword controller', { error: error.message });
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  suspendUser,
  resetPassword
};

