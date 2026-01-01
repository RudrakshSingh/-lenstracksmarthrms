const Roster = require('../models/Roster.model');
const User = require('../models/User.model');
const Store = require('../models/Store.model');
const logger = require('../config/logger');
const { sendSuccess, sendError, createPagination, parsePagination } = require('../../shared/utils/response.util.js');

/**
 * Get roster
 * GET /api/hr/roster
 */
const getRoster = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { startDate, endDate, storeId, employeeId } = req.query;

    const query = {};
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      query.date = { $gte: new Date(startDate) };
    }
    if (storeId) query.store_id = storeId;
    if (employeeId) query.employee_id = employeeId;

    const roster = await Roster.find(query)
      .populate('employee_id', 'fullName employeeId')
      .populate('store_id', 'name code')
      .sort({ date: 1, shiftStart: 1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const formattedRoster = roster.map(r => ({
      id: r._id,
      employeeId: r.employee_id?._id || r.employee_id,
      employeeName: r.employeeName || r.employee_id?.fullName || 'N/A',
      storeId: r.store_id?._id || r.store_id,
      storeName: r.storeName || r.store_id?.name || 'N/A',
      date: r.date,
      shift: r.shift,
      shiftStart: r.shiftStart,
      shiftEnd: r.shiftEnd,
      status: r.status
    }));

    const total = await Roster.countDocuments(query);
    const pagination = createPagination(page, limit, total);

    return sendSuccess(res, { roster: formattedRoster }, 'Roster retrieved successfully', pagination, 200);
  } catch (error) {
    logger.error('Error in getRoster', { error: error.message, stack: error.stack });
    return sendError(res, error.message || 'Failed to retrieve roster', 'Internal server error', 500);
  }
};

/**
 * Create roster entry
 * POST /api/hr/roster
 */
const createRoster = async (req, res, next) => {
  try {
    const { employeeId, storeId, date, shift, shiftStart, shiftEnd } = req.body;

    if (!employeeId || !storeId || !date || !shift || !shiftStart || !shiftEnd) {
      return sendError(res, 'Validation failed', 'All fields are required', 400);
    }

    // Get employee and store details
    const [employee, store] = await Promise.all([
      User.findById(employeeId).select('fullName employeeId').lean(),
      Store.findById(storeId).select('name code').lean()
    ]);

    if (!employee) {
      return sendError(res, 'Employee not found', 'Employee not found', 404);
    }
    if (!store) {
      return sendError(res, 'Store not found', 'Store not found', 404);
    }

    const roster = new Roster({
      employee_id: employeeId,
      employeeName: employee.fullName,
      store_id: storeId,
      storeName: store.name,
      date: new Date(date),
      shift,
      shiftStart,
      shiftEnd,
      status: 'ASSIGNED',
      created_by: req.user._id
    });

    await roster.save();

    return sendSuccess(res, roster, 'Roster entry created successfully', null, 201);
  } catch (error) {
    logger.error('Error in createRoster', { error: error.message, stack: error.stack });
    if (error.name === 'ValidationError') {
      return sendError(res, error.message, 'Validation failed', 400);
    }
    return sendError(res, error.message || 'Failed to create roster entry', 'Internal server error', 500);
  }
};

/**
 * Get roster settings
 * GET /api/hr/roster/settings
 */
const getRosterSettings = async (req, res, next) => {
  try {
    // Return default roster settings
    const settings = {
      shifts: [
        { name: 'MORNING', start: '09:00', end: '17:00' },
        { name: 'EVENING', start: '14:00', end: '22:00' },
        { name: 'NIGHT', start: '22:00', end: '06:00' }
      ],
      defaultShiftDuration: 8,
      allowOverlap: false,
      requireApproval: true,
      maxConsecutiveDays: 6
    };

    return sendSuccess(res, settings, 'Roster settings retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getRosterSettings', { error: error.message, stack: error.stack });
    return sendError(res, error.message || 'Failed to retrieve roster settings', 'Internal server error', 500);
  }
};

/**
 * Upload roster (bulk)
 * POST /api/hr/roster/upload
 */
const uploadRoster = async (req, res, next) => {
  try {
    // This would typically parse an uploaded file (CSV/Excel)
    // For now, return a placeholder response
    const { file, storeId, overwrite } = req.body;

    if (!file) {
      return sendError(res, 'Validation failed', 'File is required', 400);
    }

    // Placeholder: Would parse file and create roster entries
    const result = {
      totalRows: 0,
      successCount: 0,
      errorCount: 0,
      errors: []
    };

    return sendSuccess(res, result, 'Roster uploaded successfully', null, 200);
  } catch (error) {
    logger.error('Error in uploadRoster', { error: error.message, stack: error.stack });
    return sendError(res, error.message || 'Failed to upload roster', 'Internal server error', 500);
  }
};

module.exports = {
  getRoster,
  createRoster,
  getRosterSettings,
  uploadRoster
};

