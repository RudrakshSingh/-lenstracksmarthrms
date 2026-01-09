const AttendanceService = require('../services/attendance.service');
const securityService = require('../services/security/security.service');
const { upload, uploadToCloudinary } = require('../middleware/upload.middleware');
const Attendance = require('../models/Attendance.model');
const User = require('../models/User.model');
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

    // Selfie is optional (Azure Blob Storage will handle upload if provided)
    // No validation required here

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
      selfie: req.file?.blobUrl || 'no-selfie', // For face verification
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

    // Proceed with clock-in (selfie URL from Azure Blob Storage)
    const selfieUrl = req.file?.blobUrl || null;
    
    // Extract token from request for HR service API calls
    const token = req.headers.authorization?.split(' ')[1] || null;
    
    const attendance = await AttendanceService.clockIn(
      employeeId,
      parseFloat(latitude),
      parseFloat(longitude),
      selfieUrl,
      notes,
      token
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

    // Selfie is optional
    const selfieUrl = req.file?.blobUrl || null;

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
      selfie: selfieUrl || 'no-selfie', // For face verification
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

    // Proceed with clock-out (selfie URL from Azure Blob Storage)
    const attendance = await AttendanceService.clockOut(
      employeeId,
      parseFloat(latitude),
      parseFloat(longitude),
      selfieUrl,
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

/**
 * Get attendance statistics
 * GET /api/attendance/stats
 */
const getAttendanceStats = async (req, res, next) => {
  try {
    const { date, month, storeId } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const query = {
      date: { $gte: startOfDay, $lte: endOfDay }
    };

    if (storeId) {
      query.store = storeId;
    }

    // Get total employees
    const totalEmployeesQuery = { isDeleted: { $ne: true }, status: { $in: ['active', 'ACTIVE'] } };
    if (storeId) {
      totalEmployeesQuery.store = storeId;
    }
    const totalEmployees = await User.countDocuments(totalEmployeesQuery);

    // Get attendance records for the day
    const attendanceRecords = await Attendance.find(query).lean();

    const presentToday = attendanceRecords.filter(r => r.status === 'present' || r.status === 'approved').length;
    const absentToday = totalEmployees - presentToday;
    const lateArrivals = attendanceRecords.filter(r => r.is_late).length;
    const onLeave = 0; // Would need to check leave requests
    const attendanceRate = totalEmployees > 0 ? (presentToday / totalEmployees) * 100 : 0;

    // Calculate average hours
    const totalHours = attendanceRecords.reduce((sum, r) => sum + (r.total_hours || 0), 0);
    const averageHours = attendanceRecords.length > 0 ? totalHours / attendanceRecords.length : 0;

    const stats = {
      totalEmployees,
      presentToday,
      absentToday,
      lateArrivals,
      onLeave,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      averageHours: Math.round(averageHours * 100) / 100
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
 */
const getAttendanceReports = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, employeeId, storeId, format = 'json' } = req.query;

    if (!dateFrom || !dateTo) {
      return sendError(res, 'Validation failed', 'dateFrom and dateTo are required', 400);
    }

    const startDate = new Date(dateFrom);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999);

    const query = {
      date: { $gte: startDate, $lte: endDate }
    };

    if (employeeId) {
      query.employee = employeeId;
    }
    if (storeId) {
      query.store = storeId;
    }

    const attendanceRecords = await Attendance.find(query)
      .populate('employee', 'fullName employeeId')
      .populate('store', 'name code')
      .sort({ date: -1 })
      .lean();

    const reportData = attendanceRecords.map(record => ({
      id: record._id,
      employeeId: record.employee_id,
      employeeName: record.employee?.fullName || 'N/A',
      date: record.date,
      checkIn: record.check_in_time,
      checkOut: record.check_out_time,
      status: record.status,
      totalHours: record.total_hours,
      overtimeHours: record.overtime_hours,
      location: record.check_in_location ? {
        lat: record.check_in_location.latitude,
        lng: record.check_in_location.longitude,
        address: record.check_in_location.address
      } : null
    }));

    if (format === 'csv' || format === 'excel') {
      // For CSV/Excel, would need to format differently
      // For now, return JSON
      return sendSuccess(res, reportData, 'Attendance report retrieved successfully', null, 200);
    }

    return sendSuccess(res, reportData, 'Attendance report retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getAttendanceReports', { error: error.message, stack: error.stack });
    return sendError(res, error.message || 'Failed to retrieve attendance reports', 'Internal server error', 500);
  }
};

/**
 * Track location and auto-logout if out of geofence
 * POST /api/attendance/track-location
 * Required: latitude, longitude
 */
const trackLocation = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.body;
    const employeeId = req.user._id || req.user.id;

    // Find current open attendance session
    const openAttendance = await Attendance.findOne({
      employee: employeeId,
      check_in_time: { $exists: true },
      check_out_time: { $exists: false }
    }).populate('store').sort({ check_in_time: -1 });

    if (!openAttendance) {
      return sendSuccess(res, { 
        message: 'No active session',
        action: 'none'
      }, 'No active clock-in session found', null, 200);
    }

    // Check geofence
    const store = openAttendance.store;
    if (!store || !store.coordinates || !store.coordinates.latitude || !store.coordinates.longitude) {
      return sendSuccess(res, {
        message: 'Store coordinates not configured',
        action: 'none',
        withinGeofence: true // Don't auto-logout if store config missing
      }, 'Location tracked', null, 200);
    }

    // Calculate distance using Haversine formula
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371e3; // Earth radius in meters
      const φ1 = lat1 * Math.PI / 180;
      const φ2 = lat2 * Math.PI / 180;
      const Δφ = (lat2 - lat1) * Math.PI / 180;
      const Δλ = (lon2 - lon1) * Math.PI / 180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      return R * c; // Distance in meters
    };

    const distance = calculateDistance(
      parseFloat(latitude),
      parseFloat(longitude),
      store.coordinates.latitude,
      store.coordinates.longitude
    );

    const geofenceRadius = store.geofenceRadius || 100; // Default 100 meters
    const withinGeofence = distance <= geofenceRadius;

    if (!withinGeofence) {
      // Auto clock-out due to geofence violation
      openAttendance.check_out_time = new Date();
      openAttendance.check_out_location = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: `Auto-logout: ${Math.round(distance)}m from store`
      };
      openAttendance.logout_reason = 'auto_geofence';
      
      // Calculate total hours
      if (openAttendance.check_in_time) {
        const diffMs = openAttendance.check_out_time - openAttendance.check_in_time;
        openAttendance.total_hours = diffMs / (1000 * 60 * 60);
      }

      await openAttendance.save();

      logger.info('Auto-logout due to geofence violation', {
        employeeId,
        distance: Math.round(distance),
        geofenceRadius,
        storeId: store._id
      });

      return sendSuccess(res, {
        action: 'auto_logout',
        withinGeofence: false,
        distance: Math.round(distance),
        geofenceRadius,
        message: `Auto-logged out: You are ${Math.round(distance)}m away from store (limit: ${geofenceRadius}m)`
      }, 'Auto-logout performed', null, 200);
    }

    // Within geofence - just acknowledge
    return sendSuccess(res, {
      action: 'none',
      withinGeofence: true,
      distance: Math.round(distance),
      geofenceRadius,
      message: 'Location tracked successfully'
    }, 'Location tracked', null, 200);

  } catch (error) {
    logger.error('Error in trackLocation controller', { error: error.message, userId: req.user?._id });
    return sendError(res, error.message || 'Failed to track location', 'Internal server error', 500);
  }
};

/**
 * Get daily attendance timeline for all employees (HR/Admin Dashboard)
 * GET /api/attendance/daily-timeline
 * Query params: date (optional, defaults to today)
 */
const getDailyAttendanceTimeline = async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all attendance records for the day
    const attendanceRecords = await Attendance.find({
      check_in_time: { $gte: startOfDay, $lte: endOfDay }
    })
    .populate('employee', 'employeeId firstName lastName fullName email')
    .populate('store', 'name code')
    .sort({ check_in_time: 1 })
    .lean();

    // Group by employee and format timeline
    const employeeTimelines = {};
    
    attendanceRecords.forEach(record => {
      const empId = record.employee?._id?.toString();
      if (!empId) return;

      if (!employeeTimelines[empId]) {
        employeeTimelines[empId] = {
          employee: {
            id: record.employee._id,
            employeeId: record.employee.employeeId,
            name: record.employee.fullName || `${record.employee.firstName || ''} ${record.employee.lastName || ''}`.trim(),
            email: record.employee.email
          },
          store: record.store ? {
            id: record.store._id,
            name: record.store.name,
            code: record.store.code
          } : null,
          sessions: [],
          totalWorkingMinutes: 0,
          autoLogoutCount: 0
        };
      }

      const session = {
        sessionId: record._id,
        checkIn: {
          time: record.check_in_time,
          location: record.check_in_location,
          selfie: record.check_in_selfie?.secure_url,
          geofenceStatus: record.geofence_status
        },
        checkOut: record.check_out_time ? {
          time: record.check_out_time,
          location: record.check_out_location,
          selfie: record.check_out_selfie?.secure_url,
          type: record.logout_reason || 'manual' // 'manual' or 'auto_geofence'
        } : null,
        duration: record.total_hours ? Math.round(record.total_hours * 60) : null, // minutes
        status: record.status
      };

      employeeTimelines[empId].sessions.push(session);

      if (record.total_hours) {
        employeeTimelines[empId].totalWorkingMinutes += Math.round(record.total_hours * 60);
      }

      if (record.logout_reason === 'auto_geofence') {
        employeeTimelines[empId].autoLogoutCount += 1;
      }
    });

    // Convert to array and add summary
    const timeline = Object.values(employeeTimelines).map(emp => ({
      ...emp,
      totalWorkingHours: (emp.totalWorkingMinutes / 60).toFixed(2),
      totalSessions: emp.sessions.length,
      currentlyLoggedIn: emp.sessions.some(s => !s.checkOut)
    }));

    return sendSuccess(res, {
      date: targetDate.toISOString().split('T')[0],
      totalEmployees: timeline.length,
      employeesLoggedIn: timeline.filter(e => e.currentlyLoggedIn).length,
      timeline
    }, 'Daily attendance timeline retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getDailyAttendanceTimeline controller', { error: error.message });
    return sendError(res, error.message || 'Failed to retrieve daily attendance timeline', 'Internal server error', 500);
  }
};

module.exports = {
  clockIn,
  clockOut,
  getAttendanceHistory,
  getAttendanceSummary,
  getAttendanceRecords,
  markAttendance,
  getAttendanceStats,
  getAttendanceReports,
  getDailyAttendanceTimeline,
  trackLocation
};