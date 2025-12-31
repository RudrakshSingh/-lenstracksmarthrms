const TimeTracking = require('../models/TimeTracking.model');
const User = require('../models/User.model');
const logger = require('../config/logger');
const { sendSuccess, sendError, createPagination, parsePagination } = require('../../../shared/utils/response.util.js');

/**
 * Get time tracking entries
 * GET /api/hr/time-tracking
 */
const getTimeTracking = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { employeeId, date, status } = req.query;

    const query = {};
    if (employeeId) query.employee_id = employeeId;
    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.startTime = { $gte: startOfDay, $lte: endOfDay };
    }
    if (status) query.status = status;

    const entries = await TimeTracking.find(query)
      .populate('employee_id', 'fullName employeeId')
      .sort({ startTime: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await TimeTracking.countDocuments(query);
    const pagination = createPagination(page, limit, total);

    return sendSuccess(res, entries, 'Time tracking entries retrieved successfully', pagination, 200);
  } catch (error) {
    logger.error('Error in getTimeTracking', { error: error.message, stack: error.stack });
    return sendError(res, error.message || 'Failed to retrieve time tracking entries', 'Internal server error', 500);
  }
};

/**
 * Start time tracking
 * POST /api/time-tracking/start
 */
const startTimeTracking = async (req, res, next) => {
  try {
    const { employeeId, taskId, description } = req.body;
    const targetEmployeeId = employeeId || req.user._id;

    // Check if there's an active tracking session
    const activeSession = await TimeTracking.findOne({
      employee_id: targetEmployeeId,
      status: 'Active'
    });

    if (activeSession) {
      return sendError(res, 'Active session exists', 'Please stop the current session before starting a new one', 400);
    }

    const timeTracking = new TimeTracking({
      employee_id: targetEmployeeId,
      taskId,
      description,
      startTime: new Date(),
      status: 'Active',
      created_by: req.user._id
    });

    await timeTracking.save();

    return sendSuccess(res, timeTracking, 'Time tracking started successfully', null, 201);
  } catch (error) {
    logger.error('Error in startTimeTracking', { error: error.message, stack: error.stack });
    if (error.name === 'ValidationError') {
      return sendError(res, error.message, 'Validation failed', 400);
    }
    return sendError(res, error.message || 'Failed to start time tracking', 'Internal server error', 500);
  }
};

/**
 * Stop time tracking
 * POST /api/time-tracking/:id/stop
 */
const stopTimeTracking = async (req, res, next) => {
  try {
    const { id } = req.params;

    const timeTracking = await TimeTracking.findById(id);

    if (!timeTracking) {
      return sendError(res, 'Time tracking not found', 'Time tracking entry not found', 404);
    }

    if (timeTracking.status !== 'Active') {
      return sendError(res, 'Not active', 'Time tracking session is not active', 400);
    }

    timeTracking.endTime = new Date();
    timeTracking.status = 'Completed';
    await timeTracking.save();

    return sendSuccess(res, timeTracking, 'Time tracking stopped successfully', null, 200);
  } catch (error) {
    logger.error('Error in stopTimeTracking', { error: error.message, stack: error.stack });
    if (error.name === 'CastError') {
      return sendError(res, 'Invalid ID', 'Invalid time tracking ID', 400);
    }
    return sendError(res, error.message || 'Failed to stop time tracking', 'Internal server error', 500);
  }
};

/**
 * Get time tracking statistics
 * GET /api/time-tracking/stats
 */
const getTimeTrackingStats = async (req, res, next) => {
  try {
    const { employeeId, startDate, endDate } = req.query;
    const targetEmployeeId = employeeId || req.user._id;

    const query = {
      employee_id: targetEmployeeId,
      status: 'Completed'
    };

    if (startDate && endDate) {
      query.startTime = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const entries = await TimeTracking.find(query).lean();

    const totalHours = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60; // Convert minutes to hours
    const totalEntries = entries.length;
    const avgSessionDuration = totalEntries > 0 ? totalHours / totalEntries : 0;

    const stats = {
      totalHours: Math.round(totalHours * 100) / 100,
      totalEntries,
      avgSessionDuration: Math.round(avgSessionDuration * 100) / 100,
      period: startDate && endDate ? `${startDate} to ${endDate}` : 'all time'
    };

    return sendSuccess(res, stats, 'Time tracking statistics retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getTimeTrackingStats', { error: error.message, stack: error.stack });
    return sendError(res, error.message || 'Failed to retrieve time tracking statistics', 'Internal server error', 500);
  }
};

module.exports = {
  getTimeTracking,
  startTimeTracking,
  stopTimeTracking,
  getTimeTrackingStats
};

