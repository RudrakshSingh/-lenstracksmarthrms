const tenantService = require('../services/tenant.service');
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
 * Get all tenants
 * GET /api/admin/tenants
 */
const getTenants = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const allowedFilters = ['status', 'subscriptionPlan'];
    const filters = parseFilters(req.query, allowedFilters);
    
    if (req.query.search) {
      filters.search = req.query.search;
    }

    const result = await tenantService.getTenants(filters, page, limit);
    const pagination = createPagination(page, limit, result.total);

    return sendSuccess(res, result.data, 'Tenants retrieved successfully', pagination, 200);
  } catch (error) {
    logger.error('Error in getTenants controller', { error: error.message });
    next(error);
  }
};

/**
 * Get tenant by ID
 * GET /api/admin/tenants/:id
 */
const getTenantById = async (req, res, next) => {
  try {
    const tenant = await tenantService.getTenantById(req.params.id);
    return sendSuccess(res, tenant, 'Tenant retrieved successfully', null, 200);
  } catch (error) {
    if (error.statusCode === 404) {
      return sendNotFound(res, 'Tenant', req.params.id);
    }
    logger.error('Error in getTenantById controller', { error: error.message });
    next(error);
  }
};

/**
 * Create tenant
 * POST /api/admin/tenants
 */
const createTenant = async (req, res, next) => {
  try {
    const createdBy = req.user?.id || req.user?._id;
    const tenant = await tenantService.createTenant(req.body, createdBy);
    return sendSuccess(res, tenant, 'Tenant created successfully', null, 201);
  } catch (error) {
    logger.error('Error in createTenant controller', { error: error.message });
    if (error.statusCode === 409) {
      return sendError(res, error.message, 'Tenant already exists', 409);
    }
    next(error);
  }
};

/**
 * Update tenant
 * PUT /api/admin/tenants/:id
 */
const updateTenant = async (req, res, next) => {
  try {
    const tenant = await tenantService.updateTenant(req.params.id, req.body);
    return sendSuccess(res, tenant, 'Tenant updated successfully', null, 200);
  } catch (error) {
    if (error.statusCode === 404) {
      return sendNotFound(res, 'Tenant', req.params.id);
    }
    logger.error('Error in updateTenant controller', { error: error.message });
    next(error);
  }
};

/**
 * Suspend tenant
 * POST /api/admin/tenants/:id/suspend
 */
const suspendTenant = async (req, res, next) => {
  try {
    const { reason, suspensionDate } = req.body;
    const tenant = await tenantService.suspendTenant(req.params.id, reason, suspensionDate);
    return sendSuccess(res, tenant, 'Tenant suspended successfully', null, 200);
  } catch (error) {
    if (error.statusCode === 404) {
      return sendNotFound(res, 'Tenant', req.params.id);
    }
    logger.error('Error in suspendTenant controller', { error: error.message });
    next(error);
  }
};

/**
 * Get tenant statistics
 * GET /api/admin/tenants/stats
 */
const getTenantStats = async (req, res, next) => {
  try {
    const stats = await tenantService.getTenantStats();
    // Format response to match documentation
    const formattedStats = {
      totalTenants: stats.totalTenants,
      activeTenants: stats.activeTenants,
      suspendedTenants: stats.suspendedTenants,
      inactiveTenants: stats.inactiveTenants,
      byPlan: stats.byPlan,
      totalUsers: stats.totalUsers,
      totalStorage: stats.totalStorage
    };
    return sendSuccess(res, formattedStats, 'Tenant statistics retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getTenantStats controller', { error: error.message });
    next(error);
  }
};

module.exports = {
  getTenants,
  getTenantById,
  createTenant,
  updateTenant,
  suspendTenant,
  getTenantStats
};

