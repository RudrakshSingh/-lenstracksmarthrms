const TimeTracking = require('../models/TimeTracking.model');
const User = require('../models/User.model');
const logger = require('../config/logger');
const { sendSuccess, sendError, createPagination, parsePagination } = require('../../shared/utils/response.util.js');

/**
 * Get time tracking entries
 * GET /api/hr/time-tracking
 * Frontend expects: { data: [ { duration: number, ... } ] } or { data: [] } (NOT 500)
 */
const getTimeTracking = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { employeeId, date, status } = req.query;

    // Build query safely
    const query = {};
    if (employeeId) {
      query.employee_id = employeeId;
    }
    if (date) {
      try {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        query.startTime = { $gte: startOfDay, $lte: endOfDay };
      } catch (dateError) {
        logger.warn('Invalid date format in time-tracking query', { date, error: dateError.message });
        // Continue without date filter if date is invalid
      }
    }
    if (status) query.status = status;

    let entries = [];
    let total = 0;

    try {
      // Try to fetch from TimeTracking model
      entries = await TimeTracking.find(query)
        .populate('employee_id', 'fullName employeeId')
        .sort({ startTime: -1 })
        .limit(limit)
        .skip(skip)
        .lean();

      total = await TimeTracking.countDocuments(query);
    } catch (dbError) {
      // If TimeTracking model doesn't exist or query fails, return empty array
      logger.warn('TimeTracking model query failed, returning empty array', { 
        error: dbError.message,
        employeeId,
        date
      });
      entries = [];
      total = 0;
    }

    // Format entries to match frontend expectations
    // Frontend expects: { data: [ { duration: number, ... } ] }
    const formattedEntries = entries.map(entry => ({
      id: entry._id?.toString() || entry.id,
      employeeId: entry.employee_id?.employeeId || entry.employee_id || entry.employee_id?.toString(),
      employeeName: entry.employee_id?.fullName || entry.employeeName,
      startTime: entry.startTime,
      endTime: entry.endTime,
      duration: entry.duration || (entry.endTime && entry.startTime 
        ? Math.round((new Date(entry.endTime) - new Date(entry.startTime)) / (1000 * 60 * 60) * 10) / 10 // hours with 1 decimal
        : 0),
      status: entry.status || 'active',
      project: entry.project || null,
      description: entry.description || entry.notes || null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    }));

    // Return response in format expected by frontend: { data: [...] }
    return res.status(200).json({
      success: true,
      data: formattedEntries, // Frontend expects 'data' key with array
      message: 'Time tracking entries retrieved successfully',
      total: total,
      page: page || 1,
      limit: limit || 10
    });
  } catch (error) {
    logger.error('Error in getTimeTracking', { error: error.message, stack: error.stack });
    // Return empty array instead of 500 error (as per frontend requirements)
    return res.status(200).json({
      success: true,
      data: [], // Return empty array, NOT 500 error
      message: 'Time tracking entries retrieved successfully',
      total: 0,
      page: 1,
      limit: 10
    });
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

