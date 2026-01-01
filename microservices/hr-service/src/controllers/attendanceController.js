const User = require('../models/User.model');
const logger = require('../config/logger');
const { sendSuccess, sendError } = require('../../shared/utils/response.util.js');

/**
 * Get attendance statistics
 * GET /api/attendance/stats
 * Proxy endpoint - provides basic stats even if attendance-service is not available
 */
const getAttendanceStats = async (req, res, next) => {
  try {
    const { date, month, storeId } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get total employees
    const totalEmployeesQuery = { isDeleted: { $ne: true }, status: { $in: ['active', 'ACTIVE'] } };
    if (storeId) {
      totalEmployeesQuery.store = storeId;
    }
    const totalEmployees = await User.countDocuments(totalEmployeesQuery);

    // Basic stats (would be enhanced with actual attendance data from attendance-service)
    const stats = {
      totalEmployees,
      presentToday: 0, // Would come from attendance-service
      absentToday: totalEmployees,
      lateArrivals: 0,
      onLeave: 0,
      attendanceRate: 0,
      averageHours: 0
    };

    return sendSuccess(res, stats, 'Attendance statistics retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getAttendanceStats', { error: error.message, stack: error.stack });
    return sendError(res, error.message || 'Failed to retrieve attendance statistics', 'Internal server error', 500);
  }
};

/**
 * Get attendance reports
 * GET /api/attendance/reports
 * Proxy endpoint - provides basic structure even if attendance-service is not available
 */
const getAttendanceReports = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, employeeId, storeId, format = 'json' } = req.query;

    if (!dateFrom || !dateTo) {
      return sendError(res, 'Validation failed', 'dateFrom and dateTo are required', 400);
    }

    // Return empty array - actual data would come from attendance-service
    const reportData = [];

    return sendSuccess(res, reportData, 'Attendance report retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getAttendanceReports', { error: error.message, stack: error.stack });
    return sendError(res, error.message || 'Failed to retrieve attendance reports', 'Internal server error', 500);
  }
};

module.exports = {
  getAttendanceStats,
  getAttendanceReports
};

