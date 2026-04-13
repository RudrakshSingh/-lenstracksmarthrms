const RosterService = require('../services/roster.service');
const { sendSuccess, sendError } = require('../../shared/utils/response.util.js');
const logger = require('../config/logger');

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
      date, // CRITICAL: Support single date parameter for today's roster
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
      date, // Pass date parameter to service
      status,
      shift,
      tenantId: req.tenantId || 'default'
    };

    logger.info('getRoster called', {
      filters,
      page,
      limit,
      tenantId: filters.tenantId,
      hasUser: !!req.user,
      userId: req.user?._id || req.user?.id
    });

    const result = await RosterService.getRoster(filters, page, limit);

    logger.info('getRoster result', {
      hasResult: !!result,
      dataLength: result?.data?.length || result?.roster?.length || 0,
      total: result?.total || 0,
      resultKeys: result ? Object.keys(result) : []
    });

    // Frontend expects: direct array or wrapped in data/roster/items/list/records
    // sendSuccess wraps in { success: true, data: ... }, so result.data will be accessible
    // Pass the full result object so frontend can access both .data.data and .data.roster
    // Ensure data array is always present (even if empty)
    const responseData = {
      data: result?.data || result?.roster || [],
      roster: result?.roster || result?.data || [],
      total: result?.total || 0,
      page: result?.page || parseInt(page),
      limit: result?.limit || parseInt(limit),
      totalPages: result?.totalPages || 0
    };

    logger.info('Sending roster response', {
      dataLength: responseData.data.length,
      total: responseData.total
    });

    return sendSuccess(res, responseData, 'Roster entries retrieved successfully');
  } catch (error) {
    logger.error('Error in getRoster controller', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id,
      tenantId: req.tenantId
    });
    next(error);
  }
};

/**
 * Create a new roster entry
 * POST /api/hr/roster
 * @note Frontend requires: employeeId, storeId, date, shift (required), shiftStart, shiftEnd (optional)
 */
const createRoster = async (req, res, next) => {
  try {
    const { employeeId, storeId, date, shift, shiftStart, shiftEnd } = req.body;
    
    // Validate required fields as per frontend contract
    const missingFields = [];
    if (!employeeId) missingFields.push('employeeId');
    if (!storeId) missingFields.push('storeId');
    if (!date) missingFields.push('date');
    if (!shift) missingFields.push('shift');
    
    if (missingFields.length > 0) {
      return sendError(res, `Missing required fields: ${missingFields.join(', ')}`, 'Validation failed', 400);
    }

    // Normalize shift to uppercase enum value (before model validation)
    const shiftMap = {
      'morning': 'MORNING',
      'evening': 'EVENING',
      'night': 'NIGHT',
      'full_day': 'FULL_DAY',
      'fullday': 'FULL_DAY',
      'full day': 'FULL_DAY',
      'off': 'OFF'
    };
    const normalizedShift = shiftMap[shift?.toLowerCase()] || shift?.toUpperCase() || 'MORNING';
    
    // Default shift times if not provided (based on shift type)
    let finalShiftStart = shiftStart;
    let finalShiftEnd = shiftEnd;
    
    if (!finalShiftStart && normalizedShift !== 'OFF') {
      const defaultTimes = {
        'MORNING': { start: '09:00', end: '17:00' },
        'EVENING': { start: '14:00', end: '22:00' },
        'NIGHT': { start: '22:00', end: '06:00' },
        'FULL_DAY': { start: '09:00', end: '18:00' }
      };
      const defaults = defaultTimes[normalizedShift] || defaultTimes['MORNING'];
      finalShiftStart = defaults.start;
      finalShiftEnd = defaults.end;
    }

    const rosterData = {
      ...req.body,
      shift: normalizedShift,
      shiftStart: finalShiftStart,
      shiftEnd: finalShiftEnd,
      tenantId: req.tenantId || 'default'
    };

    const createdBy = req.user?._id || req.user?.id;
    if (!createdBy) {
      return sendError(res, 'Authentication required', 'User not authenticated', 401);
    }

    const roster = await RosterService.createRoster(rosterData, createdBy);
    
    // Check if it was an update (upsert) or create
    const isUpdate = roster.updatedAt && roster.createdAt && 
                     new Date(roster.updatedAt) > new Date(roster.createdAt);
    
    if (isUpdate) {
      return sendSuccess(res, roster, 'Roster updated successfully', 200);
    } else {
      return sendSuccess(res, roster, 'Roster created successfully', 201);
    }
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
 * PUT /api/hr/roster/:id
 * @note Frontend sends id in body, but we use path parameter for consistency
 */
const updateRoster = async (req, res, next) => {
  try {
    // Support both path parameter (preferred) and body id (for frontend compatibility)
    const id = req.params.id || req.body.id;
    if (!id) {
      return sendError(res, 'Roster ID is required', 'Validation failed', 400);
    }

    const updatedBy = req.user?._id || req.user?.id;
    // Remove id from body if present to avoid updating it
    const { id: _, ...updateData } = req.body;
    const roster = await RosterService.updateRoster(id, updateData, updatedBy);

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
 * DELETE /api/hr/roster/:id
 * @note Frontend sends id in query, but we use path parameter for consistency
 */
const deleteRoster = async (req, res, next) => {
  try {
    // Support path param, query param, and body id for broad frontend compatibility
    const id = req.params.id || req.query.id || req.body?.id;
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
    const tenantId = req.tenantId || 'default';

    if (!storeId || !weekStartDate) {
      return sendError(res, 'storeId and weekStartDate are required', 'Validation failed', 400);
    }

    const result = await RosterService.getWeeklyRoster(storeId, weekStartDate, tenantId);

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
 * Get roster settings for a store (or all stores)
 * GET /api/hr/roster/settings
 */
const getRosterSettings = async (req, res, next) => {
  try {
    const { storeId } = req.query;
    const tenantId = req.tenantId || 'default';

    const settings = await RosterService.getRosterSettings(storeId, tenantId);

    return sendSuccess(res, settings, 'Roster settings retrieved successfully');
  } catch (error) {
    logger.error('Error in getRosterSettings controller', {
      error: error.message,
      userId: req.user?._id
    });
    next(error);
  }
};

/**
 * Create or update roster settings
 * POST /api/hr/roster/settings
 * PUT /api/hr/roster/settings/:storeId
 * @note Frontend expects :storeId in path for PUT, and minimumRequired >= 1
 */
const upsertRosterSettings = async (req, res, next) => {
  try {
    // Support both path parameter (PUT) and body storeId (POST)
    const storeId = req.params.storeId || req.body.storeId;

    if (!storeId) {
      return sendError(res, 'storeId is required', 'Validation failed', 400);
    }

    // Validate minimumRequired >= 1 as per frontend contract
    if (req.body.minimumRequired !== undefined && req.body.minimumRequired < 1) {
      return sendError(res, 'minimumRequired must be >= 1', 'Validation failed', 400);
    }

    const userId = req.user?._id || req.user?.id;
    const settings = await RosterService.upsertRosterSettings(storeId, req.body, userId);

    return sendSuccess(res, settings, 'Roster settings saved successfully', 200);
  } catch (error) {
    logger.error('Error in upsertRosterSettings controller', {
      error: error.message,
      userId: req.user?._id
    });
    next(error);
  }
};

/**
 * AI-based roster generation
 * POST /api/hr/roster/ai-generate
 */
const generateAIRoster = async (req, res, next) => {
  try {
    const { startDate, endDate, stores, constraints, employeePool } = req.body;

    if (!startDate || !endDate || !stores || !Array.isArray(stores)) {
      return sendError(res, 'startDate, endDate, and stores array are required', 'Validation failed', 400);
    }

    const tenantId = req.tenantId || 'default';
    const params = {
      startDate,
      endDate,
      stores,
      constraints: constraints || {},
      employeePool: employeePool || [],
      tenantId
    };

    const result = await RosterService.generateAIRoster(params);

    return sendSuccess(res, result, 'AI roster generated successfully. Review and approve to save.', 200);
  } catch (error) {
    logger.error('Error in generateAIRoster controller', {
      error: error.message,
      userId: req.user?._id
    });
    next(error);
  }
};

/**
 * Get enhanced weekly roster with staffing summary
 * GET /api/hr/roster/weekly-enhanced
 */
const getEnhancedWeeklyRoster = async (req, res, next) => {
  try {
    const { storeId, weekStartDate } = req.query;

    if (!storeId || !weekStartDate) {
      return sendError(res, 'storeId and weekStartDate are required', 'Validation failed', 400);
    }

    const tenantId = req.tenantId || 'default';
    const result = await RosterService.getEnhancedWeeklyRoster(storeId, weekStartDate, tenantId);

    return sendSuccess(res, result, 'Enhanced weekly roster retrieved successfully');
  } catch (error) {
    logger.error('Error in getEnhancedWeeklyRoster controller', {
      error: error.message,
      userId: req.user?._id
    });
    next(error);
  }
};

/**
 * Sync roster with attendance
 * POST /api/hr/roster/sync-attendance
 * Syncs roster entries for a date with attendance records
 */
const syncAttendance = async (req, res, next) => {
  try {
    const { date, employeeId } = req.body;
    const tenantId = req.tenantId || 'default';

    if (!date) {
      return sendError(res, 'date is required', 'Validation failed', 400);
    }

    logger.info('syncAttendance called', {
      date,
      employeeId,
      tenantId,
      userId: req.user?._id
    });

    // Get token for service-to-service calls
    const token = req.headers?.authorization || null;
    const result = await RosterService.syncAttendance(date, employeeId, tenantId, req.user?._id, token);

    return sendSuccess(res, result, 'Roster synced with attendance successfully', 200);
  } catch (error) {
    logger.error('Error in syncAttendance controller', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id,
      tenantId: req.tenantId
    });
    
    if (error.statusCode === 404) {
      return sendError(res, error.message || 'No roster found', 'Not Found', 404);
    }
    
    next(error);
  }
};

module.exports = {
  getRoster,
  createRoster,
  updateRoster,
  deleteRoster,
  getWeeklyRoster,
  getEnhancedWeeklyRoster,
  bulkCreateRoster,
  getRosterSettings,
  upsertRosterSettings,
  generateAIRoster,
  syncAttendance
};
