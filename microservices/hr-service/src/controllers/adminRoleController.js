const adminRoleService = require('../services/adminRole.service');
const logger = require('../config/logger');
const { 
  sendSuccess, 
  sendError, 
  sendNotFound,
  createPagination,
  parsePagination,
  parseFilters
} = require('../../shared/utils/response.util');

/**
 * Get all roles
 * GET /api/admin/roles
 */
const getRoles = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const allowedFilters = [];
    const filters = parseFilters(req.query, allowedFilters);
    
    if (req.query.search) {
      filters.search = req.query.search;
    }

    const result = await adminRoleService.getRoles(filters, page, limit);
    const pagination = createPagination(page, limit, result.total);

    return sendSuccess(res, result.data, 'Roles retrieved successfully', pagination, 200);
  } catch (error) {
    logger.error('Error in getRoles controller', { error: error.message });
    next(error);
  }
};

/**
 * Get role by ID
 * GET /api/admin/roles/:id
 */
const getRoleById = async (req, res, next) => {
  try {
    const role = await adminRoleService.getRoleById(req.params.id);
    return sendSuccess(res, role, 'Role retrieved successfully', null, 200);
  } catch (error) {
    if (error.statusCode === 404) {
      return sendNotFound(res, 'Role', req.params.id);
    }
    logger.error('Error in getRoleById controller', { error: error.message });
    next(error);
  }
};

/**
 * Create new role
 * POST /api/admin/roles
 */
const createRole = async (req, res, next) => {
  try {
    const role = await adminRoleService.createRole(req.body, req.user.id);
    return sendSuccess(res, role, 'Role created successfully', null, 201);
  } catch (error) {
    if (error.statusCode === 400) {
      return sendError(res, error.message, error.message, 400);
    }
    logger.error('Error in createRole controller', { error: error.message });
    next(error);
  }
};

/**
 * Update role
 * PUT /api/admin/roles/:id
 */
const updateRole = async (req, res, next) => {
  try {
    const role = await adminRoleService.updateRole(req.params.id, req.body, req.user.id);
    return sendSuccess(res, role, 'Role updated successfully', null, 200);
  } catch (error) {
    if (error.statusCode === 404) {
      return sendNotFound(res, 'Role', req.params.id);
    }
    if (error.statusCode === 400) {
      return sendError(res, error.message, error.message, 400);
    }
    logger.error('Error in updateRole controller', { error: error.message });
    next(error);
  }
};

/**
 * Delete role
 * DELETE /api/admin/roles/:id
 */
const deleteRole = async (req, res, next) => {
  try {
    const result = await adminRoleService.deleteRole(req.params.id, req.user.id);
    return sendSuccess(res, result, 'Role deleted successfully', null, 200);
  } catch (error) {
    if (error.statusCode === 404) {
      return sendNotFound(res, 'Role', req.params.id);
    }
    if (error.statusCode === 400) {
      return sendError(res, error.message, error.message, 400);
    }
    logger.error('Error in deleteRole controller', { error: error.message });
    next(error);
  }
};

module.exports = {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole
};

