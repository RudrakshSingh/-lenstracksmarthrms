const opportunityService = require('../services/opportunityService');
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
 * Get all opportunities
 * GET /api/crm/opportunities
 */
const getOpportunities = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const allowedFilters = ['stage', 'status', 'customer_id', 'assigned_to', 'store_id'];
    const filters = parseFilters(req.query, allowedFilters);
    
    if (req.query.search) {
      filters.search = req.query.search;
    }

    const result = await opportunityService.getOpportunities(filters, page, limit);
    const pagination = createPagination(page, limit, result.total);

    return sendSuccess(res, result.data, 'Opportunities retrieved successfully', pagination, 200);
  } catch (error) {
    logger.error('Error in getOpportunities controller', { error: error.message });
    next(error);
  }
};

/**
 * Get opportunity by ID
 * GET /api/crm/opportunities/:id
 */
const getOpportunityById = async (req, res, next) => {
  try {
    const opportunity = await opportunityService.getOpportunityById(req.params.id);
    return sendSuccess(res, opportunity, 'Opportunity retrieved successfully', null, 200);
  } catch (error) {
    if (error.statusCode === 404) {
      return sendNotFound(res, 'Opportunity', req.params.id);
    }
    logger.error('Error in getOpportunityById controller', { error: error.message });
    next(error);
  }
};

/**
 * Create new opportunity
 * POST /api/crm/opportunities
 */
const createOpportunity = async (req, res, next) => {
  try {
    const opportunity = await opportunityService.createOpportunity(req.body, req.user.id);
    return sendSuccess(res, opportunity, 'Opportunity created successfully', null, 201);
  } catch (error) {
    if (error.statusCode === 400) {
      return sendError(res, error.message, error.message, 400);
    }
    logger.error('Error in createOpportunity controller', { error: error.message });
    next(error);
  }
};

/**
 * Update opportunity
 * PUT /api/crm/opportunities/:id
 */
const updateOpportunity = async (req, res, next) => {
  try {
    const opportunity = await opportunityService.updateOpportunity(req.params.id, req.body, req.user.id);
    return sendSuccess(res, opportunity, 'Opportunity updated successfully', null, 200);
  } catch (error) {
    if (error.statusCode === 404) {
      return sendNotFound(res, 'Opportunity', req.params.id);
    }
    if (error.statusCode === 400) {
      return sendError(res, error.message, error.message, 400);
    }
    logger.error('Error in updateOpportunity controller', { error: error.message });
    next(error);
  }
};

/**
 * Close opportunity
 * POST /api/crm/opportunities/:id/close
 */
const closeOpportunity = async (req, res, next) => {
  try {
    const opportunity = await opportunityService.closeOpportunity(
      req.params.id,
      req.body,
      req.user.id
    );
    return sendSuccess(res, opportunity, 'Opportunity closed successfully', null, 200);
  } catch (error) {
    if (error.statusCode === 404) {
      return sendNotFound(res, 'Opportunity', req.params.id);
    }
    logger.error('Error in closeOpportunity controller', { error: error.message });
    next(error);
  }
};

/**
 * Get opportunity statistics
 * GET /api/crm/opportunities/stats
 */
const getOpportunityStats = async (req, res, next) => {
  try {
    const allowedFilters = ['store_id', 'assigned_to'];
    const filters = parseFilters(req.query, allowedFilters);

    const stats = await opportunityService.getOpportunityStats(filters);
    return sendSuccess(res, stats, 'Opportunity statistics retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getOpportunityStats controller', { error: error.message });
    next(error);
  }
};

module.exports = {
  getOpportunities,
  getOpportunityById,
  createOpportunity,
  updateOpportunity,
  closeOpportunity,
  getOpportunityStats
};

