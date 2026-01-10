const LeaveService = require('../services/leave.service');
const { sendSuccess, sendError } = require('../../shared/utils/response.util');
const logger = require('../config/logger');
const { asyncHandler } = require('../middleware/errorHandler.middleware');

/**
 * Get leave balance for an employee
 * GET /api/hr/leaves/balance
 */
const getLeaveBalance = async (req, res, next) => {
  try {
    const { employeeId } = req.query;
    const leaveYear = req.query.leaveYear ? parseInt(req.query.leaveYear) : null;
    const tenantId = req.tenantId || 'default';

    // If employeeId not provided, use logged-in user's employeeId
    const targetEmployeeId = employeeId || req.user?.employee_id || req.user?.employeeId;

    if (!targetEmployeeId) {
      return sendError(res, 'employeeId is required', 'Validation failed', 400);
    }

    const leaveBalance = await LeaveService.getLeaveBalance(targetEmployeeId, tenantId, leaveYear);

    return sendSuccess(res, leaveBalance, 'Leave balance retrieved successfully');
  } catch (error) {
    logger.error('Error in getLeaveBalance controller', {
      error: error.message,
      userId: req.user?._id
    });
    next(error);
  }
};

/**
 * Update leave balance (Admin/HR only)
 * PUT /api/hr/leaves/balance
 */
const updateLeaveBalance = async (req, res, next) => {
  try {
    const { employeeId, ...updates } = req.body;

    if (!employeeId) {
      return sendError(res, 'employeeId is required', 'Validation failed', 400);
    }

    const tenantId = req.tenantId || 'default';
    const leaveBalance = await LeaveService.updateLeaveBalance(employeeId, updates, tenantId);

    return sendSuccess(res, leaveBalance, 'Leave balance updated successfully');
  } catch (error) {
    logger.error('Error in updateLeaveBalance controller', {
      error: error.message,
      userId: req.user?._id
    });
    next(error);
  }
};

/**
 * Deduct leave (when leave is approved)
 * POST /api/hr/leaves/deduct
 */
const deductLeave = async (req, res, next) => {
  try {
    const { employeeId, leaveType, days } = req.body;

    if (!employeeId || !leaveType || !days) {
      return sendError(res, 'employeeId, leaveType, and days are required', 'Validation failed', 400);
    }

    const tenantId = req.tenantId || 'default';
    const leaveBalance = await LeaveService.deductLeave(employeeId, leaveType, days, tenantId);

    return sendSuccess(res, leaveBalance, 'Leave deducted successfully');
  } catch (error) {
    logger.error('Error in deductLeave controller', {
      error: error.message,
      userId: req.user?._id
    });
    next(error);
  }
};

/**
 * Add compensatory off
 * POST /api/hr/leaves/comp-off
 */
const addCompensatoryOff = async (req, res, next) => {
  try {
    const { employeeId, days } = req.body;

    if (!employeeId || !days) {
      return sendError(res, 'employeeId and days are required', 'Validation failed', 400);
    }

    const tenantId = req.tenantId || 'default';
    const leaveBalance = await LeaveService.addCompensatoryOff(employeeId, days, tenantId);

    return sendSuccess(res, leaveBalance, 'Compensatory off added successfully');
  } catch (error) {
    logger.error('Error in addCompensatoryOff controller', {
      error: error.message,
      userId: req.user?._id
    });
    next(error);
  }
};

/**
 * Reset leave balance for new year (Admin/HR only)
 * POST /api/hr/leaves/reset
 */
const resetLeaveBalance = async (req, res, next) => {
  try {
    const { employeeId, newYear } = req.body;

    if (!employeeId || !newYear) {
      return sendError(res, 'employeeId and newYear are required', 'Validation failed', 400);
    }

    const tenantId = req.tenantId || 'default';
    const leaveBalance = await LeaveService.resetLeaveBalance(employeeId, newYear, tenantId);

    return sendSuccess(res, leaveBalance, 'Leave balance reset for new year', 201);
  } catch (error) {
    logger.error('Error in resetLeaveBalance controller', {
      error: error.message,
      userId: req.user?._id
    });
    next(error);
  }
};

/**
 * Get all leave balances (Admin/HR only)
 * GET /api/hr/leaves/all
 */
const getAllLeaveBalances = async (req, res, next) => {
  try {
    const {
      leaveYear,
      department,
      page = 1,
      limit = 100
    } = req.query;

    const filters = {
      tenantId: req.tenantId || 'default',
      leaveYear: leaveYear ? parseInt(leaveYear) : null,
      department
    };

    const result = await LeaveService.getAllLeaveBalances(filters, page, limit);

    return sendSuccess(res, result, 'Leave balances retrieved successfully');
  } catch (error) {
    logger.error('Error in getAllLeaveBalances controller', {
      error: error.message,
      userId: req.user?._id
    });
    next(error);
  }
};

module.exports = {
  getLeaveBalance: asyncHandler(getLeaveBalance),
  updateLeaveBalance: asyncHandler(updateLeaveBalance),
  deductLeave: asyncHandler(deductLeave),
  addCompensatoryOff: asyncHandler(addCompensatoryOff),
  resetLeaveBalance: asyncHandler(resetLeaveBalance),
  getAllLeaveBalances: asyncHandler(getAllLeaveBalances)
};

