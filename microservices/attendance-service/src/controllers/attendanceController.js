const AttendanceService = require('../services/attendance.service');
const securityService = require('../services/security/security.service');
const { upload, uploadToCloudinary } = require('../middleware/upload.middleware');
const logger = require('../config/logger');
const { 
  sendSuccess, 
  sendError, 
  sendNotFound, 
  sendServiceUnavailable,
  createPagination,
  parsePagination,
  parseFilters,
  formatAttendance,
  validateRequired
} = require('../../shared/utils/response.util');

/**
 * Clock in endpoint
 * POST /api/attendance/clock-in
 * Required fields: latitude, longitude, selfie (file upload)
 * Optional: deviceSecurity, appState, networkLocation, ipLocation, satelliteInfo
 */
const clockIn = async (req, res, next) => {
  try {
    const { 
      latitude, 
      longitude, 
      notes,
      deviceSecurity,
      appState,
      networkLocation,
      ipLocation,
      satelliteInfo,
      timestamp
    } = req.body;
    const employeeId = req.user._id;

    // Validate required fields
    const validationError = validateRequired(req.body, ['latitude', 'longitude']);
    if (validationError) {
      return sendError(res, validationError.error, validationError.message, 400);
    }

    if (!req.file || !req.file.cloudinaryUrl) {
      return sendError(res, 'Selfie is required', 'Validation failed', 400);
    }

    // Prepare location data for security validation
    const locationData = {
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: req.body.accuracy,
        altitude: req.body.altitude,
        heading: req.body.heading,
        speed: req.body.speed,
        timestamp: timestamp || Date.now()
      },
      networkLocation: networkLocation,
      ipLocation: ipLocation,
      deviceSecurity: deviceSecurity,
      appState: appState,
      satelliteInfo: satelliteInfo,
      selfie: req.file.cloudinaryUrl, // For face verification
      timestamp: timestamp || Date.now()
    };

    // Validate location with security checks
    const securityResult = await securityService.validateLocation(
      locationData,
      employeeId,
      'CLOCK_IN'
    );

    // If security check blocks the action, return error
    if (securityResult.action === 'BLOCK') {
      return sendError(res, {
        message: securityResult.message,
        suspiciousScore: securityResult.suspiciousScore,
        violations: securityResult.violations
      }, 'Clock-in blocked due to security violation', 403);
    }

    // If flagged, log but allow
    if (securityResult.action === 'FLAG') {
      logger.warn('Clock-in flagged for review', {
        employeeId,
        suspiciousScore: securityResult.suspiciousScore,
        violations: securityResult.violations
      });
    }

    // Proceed with clock-in
    const attendance = await AttendanceService.clockIn(
      employeeId,
      parseFloat(latitude),
      parseFloat(longitude),
      req.file.cloudinaryUrl,
      notes
    );

    // Add security info to response
    const responseData = {
      ...attendance.toObject ? attendance.toObject() : attendance,
      security: {
        validated: true,
        suspiciousScore: securityResult.suspiciousScore,
        action: securityResult.action,
        checks: securityResult.securityChecks
      }
    };

    return sendSuccess(res, responseData, 
      securityResult.action === 'FLAG' 
        ? 'Clock-in recorded but flagged for review' 
        : 'Clock-in recorded successfully', 
      null, 201);
  } catch (error) {
    logger.error('Error in clockIn controller', { error: error.message, userId: req.user?._id });
    
    if (error.statusCode === 400 || error.name === 'ValidationError') {
      return sendError(res, error.message, 'Bad Request', error.statusCode || 400);
    }
    if (error.statusCode === 404) {
      return sendNotFound(res, 'Employee', req.user._id);
    }
    if (error.message && error.message.includes('unavailable')) {
      return sendServiceUnavailable(res, 'record clock-in');
    }

    next(error);
  }
};

/**
 * Clock out endpoint
 * POST /api/attendance/clock-out
 * Required fields: latitude, longitude, selfie (file upload)
 * Optional: deviceSecurity, appState, networkLocation, ipLocation, satelliteInfo
 */
const clockOut = async (req, res, next) => {
  try {
    const { 
      latitude, 
      longitude, 
      notes,
      deviceSecurity,
      appState,
      networkLocation,
      ipLocation,
      satelliteInfo,
      timestamp
    } = req.body;
    const employeeId = req.user._id;

    // Validate required fields
    const validationError = validateRequired(req.body, ['latitude', 'longitude']);
    if (validationError) {
      return sendError(res, validationError.error, validationError.message, 400);
    }

    if (!req.file || !req.file.cloudinaryUrl) {
      return sendError(res, 'Selfie is required', 'Validation failed', 400);
    }

    // Prepare location data for security validation
    const locationData = {
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        accuracy: req.body.accuracy,
        altitude: req.body.altitude,
        heading: req.body.heading,
        speed: req.body.speed,
        timestamp: timestamp || Date.now()
      },
      networkLocation: networkLocation,
      ipLocation: ipLocation,
      deviceSecurity: deviceSecurity,
      appState: appState,
      satelliteInfo: satelliteInfo,
      selfie: req.file.cloudinaryUrl, // For face verification
      timestamp: timestamp || Date.now()
    };

    // Validate location with security checks
    const securityResult = await securityService.validateLocation(
      locationData,
      employeeId,
      'CLOCK_OUT'
    );

    // If security check blocks the action, return error
    if (securityResult.action === 'BLOCK') {
      return sendError(res, {
        message: securityResult.message,
        suspiciousScore: securityResult.suspiciousScore,
        violations: securityResult.violations
      }, 'Clock-out blocked due to security violation', 403);
    }

    // If flagged, log but allow
    if (securityResult.action === 'FLAG') {
      logger.warn('Clock-out flagged for review', {
        employeeId,
        suspiciousScore: securityResult.suspiciousScore,
        violations: securityResult.violations
      });
    }

    // Proceed with clock-out
    const attendance = await AttendanceService.clockOut(
      employeeId,
      parseFloat(latitude),
      parseFloat(longitude),
      req.file.cloudinaryUrl,
      notes
    );

    // Add security info to response
    const responseData = {
      ...attendance.toObject ? attendance.toObject() : attendance,
      security: {
        validated: true,
        suspiciousScore: securityResult.suspiciousScore,
        action: securityResult.action,
        checks: securityResult.securityChecks
      }
    };

    return sendSuccess(res, responseData, 
      securityResult.action === 'FLAG' 
        ? 'Clock-out recorded but flagged for review' 
        : 'Clock-out recorded successfully', 
      null, 200);
  } catch (error) {
    logger.error('Error in clockOut controller', { error: error.message, userId: req.user?._id });
    
    if (error.statusCode === 400 || error.name === 'ValidationError') {
      return sendError(res, error.message, 'Bad Request', error.statusCode || 400);
    }
    if (error.statusCode === 404) {
      return sendNotFound(res, 'Employee', req.user._id);
    }
    if (error.message && error.message.includes('unavailable')) {
      return sendServiceUnavailable(res, 'record clock-out');
    }

    next(error);
  }
};

/**
 * Get attendance history
 */
const getAttendanceHistory = async (req, res, next) => {
  try {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;
    const employeeId = req.user._id;

    const result = await AttendanceService.getAttendanceHistory(
      employeeId,
      startDate,
      endDate,
      parseInt(page),
      parseInt(limit)
    );

    res.status(200).json({
      success: true,
      message: 'Attendance history retrieved successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in getAttendanceHistory controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Get attendance summary
 */
const getAttendanceSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const employeeId = req.user._id;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }

    const summary = await AttendanceService.getAttendanceSummary(
      employeeId,
      startDate,
      endDate
    );

    res.status(200).json({
      success: true,
      message: 'Attendance summary retrieved successfully',
      data: summary
    });
  } catch (error) {
    logger.error('Error in getAttendanceSummary controller', { error: error.message, userId: req.user?._id });
    next(error);
  }
};

/**
 * Get all attendance records
 * GET /api/attendance
 * Query Parameters: employeeId, startDate, endDate, month, year
 */
const getAttendanceRecords = async (req, res, next) => {
  try {
    // Parse pagination
    const { page, limit, skip } = parsePagination(req.query);
    
    // Parse filters
    const allowedFilters = ['employeeId', 'status'];
    const filters = parseFilters(req.query, allowedFilters);
    
    // Handle date filters
    if (req.query.startDate) filters.startDate = req.query.startDate;
    if (req.query.endDate) filters.endDate = req.query.endDate;
    if (req.query.month) filters.month = parseInt(req.query.month);
    if (req.query.year) filters.year = parseInt(req.query.year);

    const result = await AttendanceService.getAttendanceRecords(filters, page, limit);

    // Format attendance records
    const attendanceRecords = Array.isArray(result.data) 
      ? result.data.map(att => formatAttendance(att))
      : (result.attendance || (Array.isArray(result) ? result : [])).map(att => formatAttendance(att));

    // Create pagination object
    const total = result.total || result.count || attendanceRecords.length;
    const pagination = createPagination(page, limit, total);

    return sendSuccess(res, attendanceRecords, 'Attendance retrieved successfully', pagination, 200);
  } catch (error) {
    logger.error('Error in getAttendanceRecords controller', { error: error.message, userId: req.user?._id });
    
    if (error.message && error.message.includes('unavailable')) {
      return sendServiceUnavailable(res, 'fetch attendance');
    }
    
    next(error);
  }
};

/**
 * Mark attendance
 * POST /api/attendance
 */
const markAttendance = async (req, res, next) => {
  try {
    const attendanceData = req.body;
    const employeeId = req.user?._id || attendanceData.employeeId;

    // Validate required fields
    const requiredFields = ['employeeId', 'date'];
    const validationError = validateRequired({ ...attendanceData, employeeId }, requiredFields);
    if (validationError) {
      return sendError(res, validationError.error, validationError.message, 400);
    }

    const attendance = await AttendanceService.markAttendance({
      ...attendanceData,
      employeeId
    });

    // Format response
    const formattedAttendance = formatAttendance(attendance);

    return sendSuccess(res, formattedAttendance, 'Attendance marked successfully', null, 201);
  } catch (error) {
    logger.error('Error in markAttendance controller', { error: error.message, userId: req.user?._id });
    
    if (error.message && error.message.includes('unavailable')) {
      return sendServiceUnavailable(res, 'mark attendance');
    }
    
    if (error.name === 'ValidationError' || error.statusCode === 400) {
      return sendError(res, error.message || 'Validation failed', 'Validation failed', 400);
    }
    
    next(error);
  }
};

module.exports = {
  clockIn,
  clockOut,
  getAttendanceHistory,
  getAttendanceSummary,
  getAttendanceRecords,
  markAttendance
};