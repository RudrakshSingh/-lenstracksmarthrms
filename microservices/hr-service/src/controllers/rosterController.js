const RosterService = require('../services/roster.service');
const { sendSuccess, sendError } = require('../../shared/utils/response.util');
const logger = require('../config/logger');
const { asyncHandler } = require('../middleware/errorHandler.middleware');

/**
 * Get roster entries
 * GET /api/hr/roster
 */
const getRoster = async (req, res, next) => {
  try {
    const {
      employeeId,
      storeId,
      startDate,
      endDate,
      status,
      shift,
      page = 1,
      limit = 100
    } = req.query;

    const filters = {
      employeeId,
      storeId,
      startDate,
      endDate,
      status,
      shift,
      tenantId: req.tenantId || 'default'
    };

    const result = await RosterService.getRoster(filters, page, limit);

    return sendSuccess(res, result, 'Roster entries retrieved successfully');
  } catch (error) {
    logger.error('Error in getRoster controller', {
      error: error.message,
      userId: req.user?._id
    });
    next(error);
  }
};

/**
 * Create a new roster entry
 * POST /api/hr/roster
 */
const createRoster = async (req, res, next) => {
  try {
    const rosterData = {
      ...req.body,
      tenantId: req.tenantId || 'default'
    };

    const createdBy = req.user?._id || req.user?.id;
    if (!createdBy) {
      return sendError(res, 'Authentication required', 'User not authenticated', 401);
    }

    const roster = await RosterService.createRoster(rosterData, createdBy);

    return sendSuccess(res, roster, 'Roster created successfully', 201);
  } catch (error) {
    logger.error('Error in createRoster controller', {
      error: error.message,
      userId: req.user?._id
    });
    next(error);
  }
};

/**
 * Update a roster entry
 * PUT /api/hr/roster
 */
const updateRoster = async (req, res, next) => {
  try {
    const { id } = req.body;
    if (!id) {
      return sendError(res, 'Roster ID is required', 'Validation failed', 400);
    }

    const updatedBy = req.user?._id || req.user?.id;
    const roster = await RosterService.updateRoster(id, req.body, updatedBy);

    return sendSuccess(res, roster, 'Roster updated successfully');
  } catch (error) {
    logger.error('Error in updateRoster controller', {
      error: error.message,
      userId: req.user?._id
    });
    next(error);
  }
};

/**
 * Delete a roster entry
 * DELETE /api/hr/roster
 */
const deleteRoster = async (req, res, next) => {
  try {
    const { id } = req.query;
    if (!id) {
      return sendError(res, 'Roster ID is required', 'Validation failed', 400);
    }

    await RosterService.deleteRoster(id);

    return sendSuccess(res, null, 'Roster deleted successfully');
  } catch (error) {
    logger.error('Error in deleteRoster controller', {
      error: error.message,
      userId: req.user?._id
    });
    next(error);
  }
};

/**
 * Get weekly roster for a store
 * GET /api/hr/roster/weekly
 */
const getWeeklyRoster = async (req, res, next) => {
  try {
    const { storeId, weekStartDate } = req.query;

    if (!storeId || !weekStartDate) {
      return sendError(res, 'storeId and weekStartDate are required', 'Validation failed', 400);
    }

    const result = await RosterService.getWeeklyRoster(storeId, weekStartDate);

    return sendSuccess(res, result, 'Weekly roster retrieved successfully');
  } catch (error) {
    logger.error('Error in getWeeklyRoster controller', {
      error: error.message,
      userId: req.user?._id
    });
    next(error);
  }
};

/**
 * Bulk create roster entries
 * POST /api/hr/roster/bulk
 */
const bulkCreateRoster = async (req, res, next) => {
  try {
    const { entries } = req.body;

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return sendError(res, 'entries array is required', 'Validation failed', 400);
    }

    const createdBy = req.user?._id || req.user?.id;
    const result = await RosterService.bulkCreateRoster(entries, createdBy);

    return sendSuccess(res, result, 'Bulk roster creation completed', 201);
  } catch (error) {
    logger.error('Error in bulkCreateRoster controller', {
      error: error.message,
      userId: req.user?._id
    });
    next(error);
  }
};

/**
 * Get roster settings for a store
 * GET /api/hr/roster/settings
 */
const getRosterSettings = async (req, res, next) => {
  try {
    const { storeId } = req.query;

    if (!storeId) {
      return sendError(res, 'storeId is required', 'Validation failed', 400);
    }

    const settings = await RosterService.getRosterSettings(storeId);

    return sendSuccess(res, settings, 'Roster settings retrieved successfully');
  } catch (error) {
    logger.error('Error in getRosterSettings controller', {
      error: error.message,
      userId: req.user?._id
    });
    next(error);
  }
};

module.exports = {
  getRoster: asyncHandler(getRoster),
  createRoster: asyncHandler(createRoster),
  updateRoster: asyncHandler(updateRoster),
  deleteRoster: asyncHandler(deleteRoster),
  getWeeklyRoster: asyncHandler(getWeeklyRoster),
  bulkCreateRoster: asyncHandler(bulkCreateRoster),
  getRosterSettings: asyncHandler(getRosterSettings)
};
