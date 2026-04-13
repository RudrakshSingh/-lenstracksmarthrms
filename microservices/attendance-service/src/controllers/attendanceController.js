const AttendanceService = require('../services/attendance.service');
const { getEmployeeAttendanceConfig } = AttendanceService;
const { getEmployeeByUser } = require('../utils/hrServiceClient');
const securityService = require('../services/security/security.service');
const { upload, uploadToCloudinary } = require('../middleware/upload.middleware');
const Attendance = require('../models/Attendance.model');
const User = require('../models/User.model');
const logger = require('../config/logger');
const realtimeClient = require('../utils/realtime.client');
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
const { attachJtsTasksToTodayPayload } = require('../utils/jtsTodayEnrichment');

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
    const token = req.headers.authorization?.split(' ')[1] || null;

    let hrEmployee = null;
    try {
      hrEmployee = await getEmployeeByUser(req.user, token);
    } catch (policyErr) {
      logger.warn('Clock-in: HR employee lookup for policy failed (strict GPS may apply)', {
        error: policyErr.message,
        userId: employeeId
      });
    }
    const policy = getEmployeeAttendanceConfig(hrEmployee || {}, req.user);

    const la =
      latitude !== undefined && latitude !== null && String(latitude).trim() !== ''
        ? parseFloat(latitude)
        : NaN;
    const lo =
      longitude !== undefined && longitude !== null && String(longitude).trim() !== ''
        ? parseFloat(longitude)
        : NaN;
    const hasGps = Number.isFinite(la) && Number.isFinite(lo);

    let finalLat;
    let finalLng;
    if (policy.relaxLocationForClockIn) {
      if (!hasGps) {
        finalLat = parseFloat(process.env.NO_GEOFENCE_DEFAULT_LAT || '0');
        finalLng = parseFloat(process.env.NO_GEOFENCE_DEFAULT_LNG || '0');
        logger.info('Clock-in: relaxed policy — GPS/camera not required; using default coordinates', {
          userId: employeeId,
          attendancePolicy: policy.attendancePolicy,
          workMode: policy.workMode,
          roleAllowsOptionalGps: policy.roleAllowsOptionalGps
        });
      } else {
        finalLat = la;
        finalLng = lo;
      }
    } else {
      if (!hasGps) {
        const validationError = validateRequired(req.body, ['latitude', 'longitude']);
        if (validationError) {
          return sendError(res, validationError.error, validationError.message, 400);
        }
      }
      finalLat = la;
      finalLng = lo;
    }

    // Handle selfie - can come from file upload OR base64 string in body
    let selfieUrl = req.file?.s3Url || req.file?.blobUrl || null;
    
    // If no file upload but selfie is provided as base64 in body, process it
    if (!selfieUrl && req.body.selfie) {
      try {
        const selfieData = req.body.selfie;
        
        // Check if it's a base64 data URI (e.g., "data:image/jpeg;base64,/9j/4AAQ...")
        if (typeof selfieData === 'string' && selfieData.startsWith('data:image/')) {
          logger.info('Processing base64 selfie from request body');
          
          // Extract base64 data and mime type
          const matches = selfieData.match(/^data:image\/(\w+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const mimeType = matches[1]; // e.g., 'jpeg', 'png'
            const base64Data = matches[2];
            
            // Convert base64 to buffer
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            // Upload to S3
            const { uploadToS3, isS3StorageReady } = require('../config/s3Storage');
            if (isS3StorageReady()) {
              const fileName = `selfie-${Date.now()}.${mimeType === 'jpeg' ? 'jpg' : mimeType}`;
              const contentType = `image/${mimeType}`;
              
              const uploadResult = await uploadToS3(imageBuffer, fileName, contentType);
              if (uploadResult && uploadResult.url) {
                selfieUrl = uploadResult.url;
                logger.info('Base64 selfie uploaded to S3 successfully', {
                  url: selfieUrl,
                  size: imageBuffer.length
                });
              }
            } else {
              logger.warn('S3 storage not ready, skipping base64 selfie upload');
            }
          } else {
            logger.warn('Invalid base64 selfie format, ignoring');
          }
        } else {
          // If it's not a data URI, log and ignore (don't throw error)
          logger.debug('Selfie field present but not in expected base64 format, ignoring', {
            type: typeof selfieData,
            startsWith: selfieData?.substring?.(0, 20)
          });
        }
      } catch (selfieError) {
        // Don't block clock-in if selfie processing fails
        logger.warn('Failed to process base64 selfie, continuing without selfie', {
          error: selfieError.message
        });
        selfieUrl = null;
      }
    }

    const locationData = {
      location: {
        latitude: finalLat,
        longitude: finalLng,
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
      selfie: selfieUrl || req.file?.blobUrl || 'no-selfie',
      timestamp: timestamp || Date.now()
    };

    let securityResult;
    if (policy.relaxLocationForClockIn) {
      securityResult = {
        action: 'ALLOW',
        suspiciousScore: 0,
        securityChecks: {},
        violations: []
      };
    } else {
      securityResult = await securityService.validateLocation(
        locationData,
        employeeId,
        'CLOCK_IN'
      );
    }

    if (securityResult.action === 'BLOCK') {
      return sendError(res, {
        message: securityResult.message,
        suspiciousScore: securityResult.suspiciousScore,
        violations: securityResult.violations
      }, 'Clock-in blocked due to security violation', 403);
    }

    if (securityResult.action === 'FLAG') {
      logger.warn('Clock-in flagged for review', {
        employeeId,
        suspiciousScore: securityResult.suspiciousScore,
        violations: securityResult.violations
      });
    }

    const attendance = await AttendanceService.clockIn(
      req.user,
      finalLat,
      finalLng,
      selfieUrl,
      notes,
      token
    );

    // Format attendance response using the same utility as other endpoints
    // This ensures frontend gets consistent response format
    const { formatAttendance } = require('../../shared/utils/response.util');
    const formattedAttendance = formatAttendance(attendance);
    
    // Add security info to formatted response
    const responseData = {
      ...formattedAttendance,
      security: {
        validated: true,
        suspiciousScore: securityResult.suspiciousScore,
        action: securityResult.action,
        checks: securityResult.securityChecks
      }
    };

    // Send realtime notifications
    const userId = req.user._id;
    const tenantId = req.tenantId || req.user?.tenantId || 'default';

    // Notify user
    realtimeClient.sendNotification(userId, {
      id: `clock-in-${Date.now()}`,
      title: 'Clocked In',
      message: securityResult.action === 'FLAG' 
        ? 'Clock-in recorded but flagged for review' 
        : 'Clock-in recorded successfully',
      type: securityResult.action === 'FLAG' ? 'warning' : 'success'
    }).catch(err => logger.warn('Failed to send realtime notification', { error: err.message }));

    // Broadcast attendance update
    realtimeClient.broadcastAttendance(tenantId, {
      employeeId: formattedAttendance.employeeId || attendance.employee_id || attendance.employeeId,
      action: 'check_in',
      timestamp: formattedAttendance.checkIn?.time || attendance.check_in_time || new Date().toISOString(),
      location: `${finalLat}, ${finalLng}`
    }).catch(err => logger.warn('Failed to broadcast attendance update', { error: err.message }));

    return sendSuccess(res, responseData, 
      securityResult.action === 'FLAG' 
        ? 'Clock-in recorded but flagged for review' 
        : 'Clock-in recorded successfully', 
      null, 201);
  } catch (error) {
    logger.error('Error in clockIn controller', { 
      error: error.message, 
      userId: req.user?._id,
      employeeId: req.user?.employee_id || req.user?.employeeId,
      email: req.user?.email
    });
    
    if (error.statusCode === 400 || error.name === 'ValidationError') {
      return sendError(res, error.message, 'Bad Request', error.statusCode || 400);
    }
    if (error.statusCode === 403) {
      return sendError(res, error.message, error.message, 403);
    }
    if (error.statusCode === 404) {
      // Use detailed error message from service if available
      const errorMessage = error.message || `Employee not found in backend`;
      const suggestion = error.userId || error.employeeId || error.email 
        ? `User ID: ${error.userId || 'N/A'}, Employee ID: ${error.employeeId || 'N/A'}, Email: ${error.email || 'N/A'}. Please ensure the employee exists in HR service and is assigned to a store.`
        : 'Please ensure the employee exists in HR service and is assigned to a store.';
      return sendError(res, 'Employee not found in backend', errorMessage + (suggestion ? ` ${suggestion}` : ''), 404);
    }
    if (error.statusCode === 504 || error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('timed out'))) {
      return sendError(
        res,
        'Employee lookup timeout',
        'HR service lookup timed out. Please retry. If issue continues, verify employee/store mapping in HR data.',
        504
      );
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
    const token = req.headers.authorization?.split(' ')[1] || null;

    let hrEmployee = null;
    try {
      hrEmployee = await getEmployeeByUser(req.user, token);
    } catch (policyErr) {
      logger.warn('Clock-out: HR employee lookup for policy failed (strict GPS may apply)', {
        error: policyErr.message,
        userId: employeeId
      });
    }
    const policy = getEmployeeAttendanceConfig(hrEmployee || {}, req.user);

    const la =
      latitude !== undefined && latitude !== null && String(latitude).trim() !== ''
        ? parseFloat(latitude)
        : NaN;
    const lo =
      longitude !== undefined && longitude !== null && String(longitude).trim() !== ''
        ? parseFloat(longitude)
        : NaN;
    const hasGps = Number.isFinite(la) && Number.isFinite(lo);

    let finalLat;
    let finalLng;
    if (policy.relaxLocationForClockIn) {
      if (!hasGps) {
        finalLat = parseFloat(process.env.NO_GEOFENCE_DEFAULT_LAT || '0');
        finalLng = parseFloat(process.env.NO_GEOFENCE_DEFAULT_LNG || '0');
        logger.info('Clock-out: relaxed policy — GPS not required; using default coordinates', {
          userId: employeeId,
          attendancePolicy: policy.attendancePolicy,
          workMode: policy.workMode,
          roleAllowsOptionalGps: policy.roleAllowsOptionalGps
        });
      } else {
        finalLat = la;
        finalLng = lo;
      }
    } else {
      if (!hasGps) {
        const validationError = validateRequired(req.body, ['latitude', 'longitude']);
        if (validationError) {
          return sendError(res, validationError.error, validationError.message, 400);
        }
      }
      finalLat = la;
      finalLng = lo;
    }

    const selfieUrl = req.file?.blobUrl || null;

    const locationData = {
      location: {
        latitude: finalLat,
        longitude: finalLng,
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
      selfie: selfieUrl || 'no-selfie',
      timestamp: timestamp || Date.now()
    };

    let securityResult;
    if (policy.relaxLocationForClockIn) {
      securityResult = {
        action: 'ALLOW',
        suspiciousScore: 0,
        securityChecks: {},
        violations: []
      };
    } else {
      securityResult = await securityService.validateLocation(
        locationData,
        employeeId,
        'CLOCK_OUT'
      );
    }

    if (securityResult.action === 'BLOCK') {
      return sendError(res, {
        message: securityResult.message,
        suspiciousScore: securityResult.suspiciousScore,
        violations: securityResult.violations
      }, 'Clock-out blocked due to security violation', 403);
    }

    if (securityResult.action === 'FLAG') {
      logger.warn('Clock-out flagged for review', {
        employeeId,
        suspiciousScore: securityResult.suspiciousScore,
        violations: securityResult.violations
      });
    }

    const attendance = await AttendanceService.clockOut(
      req.user,
      finalLat,
      finalLng,
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

    // Send realtime notifications
    const userId = req.user._id;
    const tenantId = req.tenantId || req.user?.tenantId || 'default';

    // Notify user
    realtimeClient.sendNotification(userId, {
      id: `clock-out-${Date.now()}`,
      title: 'Clocked Out',
      message: securityResult.action === 'FLAG' 
        ? 'Clock-out recorded but flagged for review' 
        : 'Clock-out recorded successfully',
      type: securityResult.action === 'FLAG' ? 'warning' : 'success'
    }).catch(err => logger.warn('Failed to send realtime notification', { error: err.message }));

    // Broadcast attendance update
    realtimeClient.broadcastAttendance(tenantId, {
      employeeId: attendance.employeeId,
      action: 'check_out',
      timestamp: attendance.clockOutTime || new Date().toISOString(),
      location: `${finalLat}, ${finalLng}`
    }).catch(err => logger.warn('Failed to broadcast attendance update', { error: err.message }));

    return sendSuccess(res, responseData, 
      securityResult.action === 'FLAG' 
        ? 'Clock-out recorded but flagged for review' 
        : 'Clock-out recorded successfully', 
      null, 200);
  } catch (error) {
    logger.error('Error in clockOut controller', { 
      error: error.message, 
      userId: req.user?._id,
      employeeId: req.user?.employee_id || req.user?.employeeId,
      email: req.user?.email
    });
    
    if (error.statusCode === 400 || error.name === 'ValidationError') {
      return sendError(res, error.message, 'Bad Request', error.statusCode || 400);
    }
    if (error.statusCode === 403) {
      return sendError(res, error.message, error.message, 403);
    }
    if (error.statusCode === 404) {
      // Use detailed error message from service if available
      const errorMessage = error.message || `Employee not found in backend`;
      const suggestion = error.userId || error.employeeId || error.email 
        ? `User ID: ${error.userId || 'N/A'}, Employee ID: ${error.employeeId || 'N/A'}, Email: ${error.email || 'N/A'}. Please ensure the employee exists in HR service and is assigned to a store.`
        : 'Please ensure the employee exists in HR service and is assigned to a store.';
      return sendError(res, 'Employee not found in backend', errorMessage + (suggestion ? ` ${suggestion}` : ''), 404);
    }
    if (error.statusCode === 504 || error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('timed out'))) {
      return sendError(
        res,
        'Employee lookup timeout',
        'HR service lookup timed out. Please retry. If issue continues, verify employee/store mapping in HR data.',
        504
      );
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
    const { startDate, endDate, employeeId: queryEmployeeId } = req.query;
    
    // CRITICAL: Handle both employeeId string (like "EMP-2026-969954") and ObjectId
    // If queryEmployeeId is provided, use it (could be string or ObjectId)
    // Otherwise, use authenticated user's employee_id or _id
    let employeeId = queryEmployeeId;
    
    if (!employeeId) {
      // Try employee_id string first (preferred for attendance queries)
      employeeId = req.user?.employee_id || req.user?.employeeId;
      
      // Fallback to _id if employee_id not available
      if (!employeeId) {
        employeeId = req.user?._id || req.user?.id || req.user?.userId;
      }
    }

    // Validate dates - provide helpful error message
    if (!startDate || !endDate) {
      return sendError(res, 
        'Start date and end date are required', 
        'Both startDate and endDate query parameters are required (format: YYYY-MM-DD)', 
        400
      );
    }

    // Validate date format (basic check)
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return sendError(res, 
        'Invalid date format', 
        'startDate and endDate must be valid dates (format: YYYY-MM-DD)', 
        400
      );
    }

    if (!employeeId) {
      return sendError(res, 'Employee ID not found', 'Employee ID is required. Please ensure you are authenticated.', 400);
    }

    logger.info('getAttendanceSummary called', { 
      employeeId, 
      startDate, 
      endDate,
      hasUser: !!req.user,
      employeeIdType: typeof employeeId
    });

    const summary = await AttendanceService.getAttendanceSummary(
      employeeId,
      startDate,
      endDate
    );

    return sendSuccess(res, summary, 'Attendance summary retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getAttendanceSummary controller', { 
      error: error.message, 
      userId: req.user?._id || req.user?.id,
      stack: error.stack
    });
    return sendError(res, error.message || 'Failed to retrieve attendance summary', 'Internal server error', 500);
  }
};

/**
 * Get all attendance records
 * GET /api/attendance
 * Query Parameters: employeeId, date (YYYY-MM-DD), startDate, endDate, month, year
 */
const getAttendanceRecords = async (req, res, next) => {
  try {
    // CRITICAL: Get tenantId for tenant isolation
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    
    // Parse pagination
    const { page, limit, skip } = parsePagination(req.query);
    
    // Parse filters
    const allowedFilters = ['employeeId', 'status', 'storeId', 'departmentId'];
    const filters = parseFilters(req.query, allowedFilters);
    
    // CRITICAL: Add tenantId filter for tenant isolation
    filters.tenantId = tenantId;
    
    // ROLE-BASED FILTERING:
    // Admin/HR/SuperAdmin: Can see all employees in their tenant (with optional filters)
    // Employee: Can only see their own attendance (NO PERMISSION CHECK NEEDED)
    const userRole = (req.user?.role || '').toUpperCase();
    const isAdminOrHR = ['ADMIN', 'HR', 'SUPERADMIN', 'MANAGER'].includes(userRole);
    
    if (!isAdminOrHR) {
      // Employee can only see their own attendance
      // Force filter to their employee_id - NO PERMISSION CHECK
      const employeeId = req.user?.employee_id || req.user?.employeeId;
      if (employeeId) {
        filters.employeeId = employeeId;
      } else {
        // If no employee_id, use user._id to find their attendance
        filters.employee = req.user?._id || req.user?.id;
      }
      logger.info('Employee viewing own attendance (no permission check)', { 
        userId: req.user?._id, 
        employeeId: filters.employeeId || filters.employee,
        tenantId
      });
    } else {
      // Admin/HR can see all employees in their tenant
      // Optional filters: storeId, departmentId, employeeId
      logger.info('Admin/HR viewing attendance', { 
        userId: req.user?._id, 
        filters: filters,
        tenantId
      });
    }
    
    // Handle date filters - CRITICAL: Frontend sends 'date' parameter (YYYY-MM-DD)
    // Support both dateFrom/dateTo (frontend) and startDate/endDate (backend)
    if (req.query.date) {
      filters.date = req.query.date; // Pass date directly to service
    }
    // Support dateFrom/dateTo (frontend format)
    if (req.query.dateFrom) {
      filters.startDate = req.query.dateFrom;
    }
    if (req.query.dateTo) {
      filters.endDate = req.query.dateTo;
    }
    // Support startDate/endDate (backend format)
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
    const total = result.pagination?.total || result.total || result.count || attendanceRecords.length;
    const pagination = createPagination(page, limit, total);

    return sendSuccess(res, attendanceRecords, 'Attendance retrieved successfully', pagination, 200);
  } catch (error) {
    logger.error('Error in getAttendanceRecords controller', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?._id,
      filters: req.query
    });
    
    // Handle timeout errors gracefully
    if (error.message && error.message.includes('timeout')) {
      return sendSuccess(res, [], 'Attendance retrieved successfully (timeout - no records found)', createPagination(1, 10, 0), 200);
    }
    
    if (error.message && error.message.includes('unavailable')) {
      return sendServiceUnavailable(res, 'fetch attendance');
    }
    
    // For other errors, return empty result instead of 500
    logger.warn('Returning empty result due to error', { error: error.message });
    return sendSuccess(res, [], 'Attendance retrieved successfully', createPagination(1, 10, 0), 200);
  }
};

/**
 * Get attendance by ID
 * GET /api/attendance/:id
 */
const getAttendanceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // CRITICAL: Get tenantId for tenant isolation
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    
    const Attendance = require('../models/Attendance.model');
    const mongoose = require('mongoose');
    
    // Build query with tenant isolation
    const query = {};
    
    if (mongoose.Types.ObjectId.isValid(id)) {
      query._id = id;
    } else {
      return sendNotFound(res, 'Attendance', id);
    }
    
    // CRITICAL: Add tenant isolation with backward compatibility for old rows
    query.$and = [
      {
        $or: [
          { tenantId: tenantId },
          { tenantId: { $exists: false } },
          { tenantId: null }
        ]
      }
    ];
    
    // Check if user is viewing their own attendance or is admin/HR
    const userRole = (req.user?.role || '').toUpperCase();
    const isAdminOrHR = ['ADMIN', 'HR', 'SUPERADMIN', 'MANAGER'].includes(userRole);
    
    if (!isAdminOrHR) {
      // Employee can only view their own attendance
      const employeeId = req.user?.employee_id || req.user?.employeeId;
      if (employeeId) {
        query.employee_id = employeeId.toUpperCase().trim();
      } else {
        query.employee = req.user?._id || req.user?.id;
      }
    }
    
    const attendance = await Attendance.findOne(query)
      .populate('employee', 'name fullName firstName lastName email employee_id employeeId')
      .populate('store', 'name code')
      .lean();
    
    if (!attendance) {
      return sendNotFound(res, 'Attendance', id);
    }
    
    // Format attendance record
    const formattedAttendance = formatAttendance(attendance);
    
    return sendSuccess(res, formattedAttendance, 'Attendance retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getAttendanceById controller', { 
      error: error.message, 
      attendanceId: req.params.id,
      userId: req.user?._id
    });
    
    if (error.name === 'CastError' || error.statusCode === 404) {
      return sendNotFound(res, 'Attendance', req.params.id);
    }
    
    next(error);
  }
};

/**
 * Mark attendance
 * POST /api/attendance
 * Supports both regular attendance marking and roster sync
 */
const markAttendance = async (req, res, next) => {
  try {
    const attendanceData = req.body;
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || 'default';
    const employeeId = req.user?._id || attendanceData.employeeId;

    // Validate required fields
    const requiredFields = ['employeeId', 'date'];
    const validationError = validateRequired({ ...attendanceData, employeeId }, requiredFields);
    if (validationError) {
      return sendError(res, validationError.error, validationError.message, 400);
    }

    // Check if this is a roster sync request
    if (attendanceData.source === 'roster_sync' || attendanceData.rosterId) {
      // Use roster sync method
      const attendance = await AttendanceService.syncAttendanceFromRoster(
        { ...attendanceData, employeeId },
        tenantId
      );

      // Format response
      const formattedAttendance = formatAttendance(attendance);

      return sendSuccess(res, formattedAttendance, 'Attendance synced from roster successfully', null, 200);
    } else {
      // Regular attendance marking (if markAttendance method exists)
      // For now, use syncAttendanceFromRoster as fallback
      const attendance = await AttendanceService.syncAttendanceFromRoster(
        { ...attendanceData, employeeId },
        tenantId
      );

      // Format response
      const formattedAttendance = formatAttendance(attendance);

      return sendSuccess(res, formattedAttendance, 'Attendance marked successfully', null, 201);
    }
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
    const { date, month, storeId, employeeId } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // CRITICAL: Get tenantId for tenant isolation
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';

    // ROLE-BASED FILTERING:
    // Admin/HR/SuperAdmin: Can see all employees (with optional filters)
    // Employee: Can only see their own stats
    const userRole = (req.user?.role || '').toUpperCase();
    const isAdminOrHR = ['ADMIN', 'HR', 'SUPERADMIN', 'MANAGER'].includes(userRole);
    
    const query = {
      date: { $gte: startOfDay, $lte: endOfDay },
      tenantId: tenantId // CRITICAL: Filter by tenant
    };

    if (storeId) {
      query.store = storeId;
    }
    
    // If employee is viewing stats, filter by their employeeId
    if (!isAdminOrHR) {
      const userEmployeeId = req.user?.employee_id || req.user?.employeeId;
      if (userEmployeeId) {
        query.employee_id = userEmployeeId.toUpperCase();
        logger.info('Employee viewing own attendance stats', { 
          userId: req.user?._id, 
          employeeId: userEmployeeId,
          tenantId
        });
      } else {
        // If no employee_id, return empty stats
        return sendSuccess(res, {
          totalEmployees: 0,
          presentToday: 0,
          absentToday: 0,
          lateArrivals: 0,
          onLeave: 0,
          attendanceRate: 0,
          averageHours: 0
        }, 'Attendance statistics retrieved successfully', null, 200);
      }
    } else if (employeeId) {
      // Admin/HR can filter by specific employeeId
      query.employee_id = employeeId.toUpperCase();
    }

    // Get total employees - CRITICAL: Filter by tenantId
    // Note: User model in attendance-service doesn't have tenantId, so we need to call HR service
    let totalEmployees = 0;
    try {
      const axios = require('axios');
      const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:3002';
      const token = req.headers.authorization?.split(' ')[1] || null;
      
      // Build query params for HR service
      const hrQueryParams = new URLSearchParams();
      hrQueryParams.append('status', 'active');
      hrQueryParams.append('limit', '100'); // Get up to 100 to ensure we get pagination.total
      hrQueryParams.append('page', '1');
      if (storeId) {
        hrQueryParams.append('store', storeId);
      }
      
      const hrResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/employees?${hrQueryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      if (hrResponse.data && hrResponse.data.success) {
        // Priority: pagination.total (most accurate) > data.length (fallback)
        totalEmployees = hrResponse.data.pagination?.total || 
                        hrResponse.data.data?.length || 
                        (Array.isArray(hrResponse.data.data) ? hrResponse.data.data.length : 0) ||
                        0;
        logger.info('Employee count from HR service', { 
          totalEmployees, 
          paginationTotal: hrResponse.data.pagination?.total,
          dataLength: hrResponse.data.data?.length,
          tenantId 
        });
      } else {
        // Fallback: Use User model (but it won't have tenant isolation)
        logger.warn('HR service unavailable, falling back to local User model (no tenant isolation)', { tenantId });
        const totalEmployeesQuery = { 
          isDeleted: { $ne: true }, 
          status: { $in: ['active', 'ACTIVE'] }
        };
        if (storeId) {
          totalEmployeesQuery.store = storeId;
        }
        totalEmployees = await User.countDocuments(totalEmployeesQuery);
      }
    } catch (hrError) {
      // Fallback: Use User model (but it won't have tenant isolation)
      logger.warn('Failed to get employee count from HR service, falling back to local User model', { 
        error: hrError.message,
        tenantId 
      });
      const totalEmployeesQuery = { 
        isDeleted: { $ne: true }, 
        status: { $in: ['active', 'ACTIVE'] }
      };
      if (storeId) {
        totalEmployeesQuery.store = storeId;
      }
      totalEmployees = await User.countDocuments(totalEmployeesQuery);
    }

    // Get attendance records for the day
    // IMPORTANT: Also check for records where date might be stored as start of day (without time)
    // Some records might have date set to start of day, so we need to handle both cases
    const attendanceRecords = await Attendance.find(query).lean();
    
    // Log query details for debugging
    logger.info('Attendance stats query', {
      tenantId,
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString(),
      recordsFound: attendanceRecords.length,
      query: JSON.stringify(query)
    });

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

    // Log stats for debugging
    logger.info('Attendance stats calculated', {
      tenantId,
      totalEmployees,
      presentToday,
      absentToday,
      lateArrivals,
      attendanceRate
    });

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
 * Track location and auto-logout if out of geofence, auto-checkin if back within geofence
 * POST /api/attendance/track-location
 * Required: latitude, longitude
 * Optional: autoCheckIn (boolean) - if true, automatically check in when back within geofence
 */
const trackLocation = async (req, res, next) => {
  try {
    const { latitude, longitude, autoCheckIn } = req.body;
    const employeeId = req.user._id || req.user.id;

    // Find current open attendance session
    const openAttendance = await Attendance.findOne({
      employee: employeeId,
      check_in_time: { $exists: true },
      check_out_time: { $exists: false }
    }).populate('store').sort({ check_in_time: -1 });

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

    // Fetch latest roster-assigned store for today.
    // This keeps geofence dynamic when roster store changes daily (or mid-shift).
    const getTodayRosterStore = async () => {
      try {
        const axios = require('axios');
        const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:3002';
        const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:80';
        const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
        const user = req.user;
        const employeeIdStr = user.employee_id || user.employeeId || user._id?.toString() || user.id?.toString();

        if (!employeeIdStr) return null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayDateStr = today.toISOString().split('T')[0];

        let adminToken = req.headers.authorization?.split(' ')[1] || req.headers.authorization || '';
        try {
          const targetTenantId = tenantId.toLowerCase().trim();
          let ADMIN_EMAIL = process.env[`${targetTenantId.toUpperCase()}_ADMIN_EMAIL`] || process.env.ADMIN_EMAIL;
          let ADMIN_PASSWORD = process.env[`${targetTenantId.toUpperCase()}_ADMIN_PASSWORD`] || process.env.ADMIN_PASSWORD;

          if (!ADMIN_EMAIL) {
            if (targetTenantId === 'eyekra') {
              ADMIN_EMAIL = 'admin@eyekra.com';
              ADMIN_PASSWORD = ADMIN_PASSWORD || 'Eyekra@Admin2026!';
            } else if (targetTenantId === 'upcapto') {
              ADMIN_EMAIL = 'admin@upcapto.com';
              ADMIN_PASSWORD = ADMIN_PASSWORD || 'Upcapto@2026';
            } else {
              ADMIN_EMAIL = 'Admin@lenstrack.com';
              ADMIN_PASSWORD = ADMIN_PASSWORD || 'Kadarkhan@123';
            }
          }
          if (!ADMIN_PASSWORD) {
            if (targetTenantId === 'eyekra') {
              ADMIN_PASSWORD = 'Eyekra@Admin2026!';
            } else if (targetTenantId === 'upcapto') {
              ADMIN_PASSWORD = 'Upcapto@2026';
            } else {
              ADMIN_PASSWORD = 'Kadarkhan@123';
            }
          }

          const adminLoginResponse = await axios.post(`${AUTH_SERVICE_URL}/api/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
          }, {
            headers: {
              'Content-Type': 'application/json',
              'x-tenant-id': targetTenantId
            },
            timeout: 3000
          });

          if (adminLoginResponse.data && (adminLoginResponse.data.data?.accessToken || adminLoginResponse.data.accessToken)) {
            adminToken = adminLoginResponse.data.data?.accessToken || adminLoginResponse.data.accessToken;
          }
        } catch (adminTokenError) {
          // Fallback to incoming token
        }

        const rosterResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/roster`, {
          params: {
            employeeId: employeeIdStr,
            date: todayDateStr,
            limit: 1
          },
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json'
          },
          timeout: 5000,
          validateStatus: (status) => status < 500
        });

        if (!rosterResponse.data || !rosterResponse.data.success) return null;

        const rosterData = rosterResponse.data.data || rosterResponse.data.roster || [];
        const todayRoster = Array.isArray(rosterData) ? rosterData[0] : rosterData;
        if (!todayRoster || !todayRoster.storeId) return null;

        const storeResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/stores/${todayRoster.storeId}`, {
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json'
          },
          timeout: 5000,
          validateStatus: (status) => status < 500
        });

        if (storeResponse.data && storeResponse.data.success && storeResponse.data.data) {
          return storeResponse.data.data;
        }
      } catch (error) {
        logger.warn('Failed to resolve today roster store for dynamic geofence', { error: error.message, employeeId });
      }
      return null;
    };

    if (openAttendance) {
      // Dynamic geofence binding: latest roster store takes precedence over session store.
      const rosterStoreForToday = await getTodayRosterStore();
      const store = rosterStoreForToday || openAttendance.store;

      // If roster changed mid-shift, align session store for consistency.
      if (rosterStoreForToday && openAttendance.store) {
        try {
          const mongoose = require('mongoose');
          const currentStoreId = openAttendance.store?._id?.toString?.() || openAttendance.store?.toString?.();
          const rosterStoreId = rosterStoreForToday?._id?.toString?.() || rosterStoreForToday?.id?.toString?.();
          if (rosterStoreId && currentStoreId !== rosterStoreId && mongoose.Types.ObjectId.isValid(rosterStoreId)) {
            openAttendance.store = rosterStoreId;
            await openAttendance.save();
            logger.info('Updated active attendance session store from latest roster assignment', {
              employeeId,
              previousStoreId: currentStoreId,
              rosterStoreId
            });
          }
        } catch (syncErr) {
          logger.warn('Failed to sync active session store with roster assignment', {
            employeeId,
            error: syncErr.message
          });
        }
      }

      // Check geofence for active session
      if (!store || !store.coordinates || !store.coordinates.latitude || !store.coordinates.longitude) {
        return sendSuccess(res, {
          message: 'Store coordinates not configured',
          action: 'none',
          withinGeofence: true // Don't auto-logout if store config missing
        }, 'Location tracked', null, 200);
      }

      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        store.coordinates.latitude,
        store.coordinates.longitude
      );

      const geofenceRadius = store.geofenceRadius || 200; // Default 200 meters
      const withinGeofence = distance <= geofenceRadius;
      const GRACE_PERIOD_MINUTES = 10; // 10 minutes grace period
      const GRACE_PERIOD_MS = GRACE_PERIOD_MINUTES * 60 * 1000;

      if (!withinGeofence) {
        // User is outside geofence
        const now = new Date();
        
        // Check if this is the first time going outside (no violation start time set)
        if (!openAttendance.geofence_violation_start) {
          // First time outside - mark violation start time
          openAttendance.geofence_violation_start = now;
          openAttendance.geofence_grace_period_minutes = GRACE_PERIOD_MINUTES;
          await openAttendance.save();
          
          logger.info('Geofence violation detected - grace period started', {
            employeeId,
            distance: Math.round(distance),
            geofenceRadius,
            violationStart: now.toISOString(),
            gracePeriodMinutes: GRACE_PERIOD_MINUTES
          });
          
          // Return warning but don't logout yet
          return sendSuccess(res, {
            action: 'warning',
            withinGeofence: false,
            distance: Math.round(distance),
            geofenceRadius,
            gracePeriodRemaining: GRACE_PERIOD_MINUTES,
            message: `You are outside geofence. Auto-logout in ${GRACE_PERIOD_MINUTES} minutes if you don't return.`,
            requiresReLogin: false
          }, 'Location outside geofence - grace period active', null, 200);
        } else {
          // User has been outside - check if grace period has expired
          const violationStartTime = new Date(openAttendance.geofence_violation_start);
          const timeOutside = now - violationStartTime;
          
          if (timeOutside >= GRACE_PERIOD_MS) {
            // Grace period expired - auto clock-out (NOT logout - user stays logged in)
            openAttendance.check_out_time = now;
            openAttendance.check_out_location = {
              latitude: parseFloat(latitude),
              longitude: parseFloat(longitude),
              address: `Auto clock-out: ${Math.round(distance)}m from store (limit: ${geofenceRadius}m). Grace period (${GRACE_PERIOD_MINUTES} min) expired.`
            };
            openAttendance.logout_reason = 'auto_geofence';
            openAttendance.is_geofence_violation = true;
            
            // Calculate total hours
            if (openAttendance.check_in_time) {
              const diffMs = openAttendance.check_out_time - openAttendance.check_in_time;
              openAttendance.total_hours = diffMs / (1000 * 60 * 60);
            }

            await openAttendance.save();

            logger.info('Auto clock-out due to geofence violation after grace period', {
              employeeId,
              distance: Math.round(distance),
              geofenceRadius,
              violationStart: violationStartTime.toISOString(),
              timeOutsideMinutes: Math.round(timeOutside / (60 * 1000)),
              storeId: store._id
            });

            // Auto clock-out (NOT logout) - user stays logged in to app
            // Only attendance session ends, authentication remains valid
            return sendSuccess(res, {
              action: 'clock_out',  // Changed from 'auto_logout' - only clock-out, not app logout
              withinGeofence: false,
              distance: Math.round(distance),
              geofenceRadius,
              gracePeriodExpired: true,
              timeOutsideMinutes: Math.round(timeOutside / (60 * 1000)),
              totalHours: openAttendance.total_hours,
              checkOutTime: openAttendance.check_out_time,
              message: `Auto clock-out: You have been outside geofence for more than ${GRACE_PERIOD_MINUTES} minutes. Your attendance has been recorded.`,
              requiresReLogin: false  // User stays logged in - only attendance ends
            }, 'Auto clock-out due to geofence violation', null, 200);
          } else {
            // Still in grace period - return remaining time
            const remainingMinutes = Math.ceil((GRACE_PERIOD_MS - timeOutside) / (60 * 1000));
            
            logger.info('User still outside geofence - grace period active', {
              employeeId,
              distance: Math.round(distance),
              remainingMinutes,
              timeOutsideMinutes: Math.round(timeOutside / (60 * 1000))
            });
            
            return sendSuccess(res, {
              action: 'warning',
              withinGeofence: false,
              distance: Math.round(distance),
              geofenceRadius,
              gracePeriodRemaining: remainingMinutes,
              timeOutsideMinutes: Math.round(timeOutside / (60 * 1000)),
              message: `You are outside geofence. Auto-logout in ${remainingMinutes} minute(s) if you don't return.`,
              requiresReLogin: false
            }, 'Location outside geofence - grace period active', null, 200);
          }
        }
      } else {
        // User is within geofence
        // If there was a violation start time, clear it (user came back)
        if (openAttendance.geofence_violation_start) {
          const wasOutside = openAttendance.geofence_violation_start !== null;
          openAttendance.geofence_violation_start = null;
          openAttendance.geofence_grace_period_minutes = null;
          await openAttendance.save();
          
          if (wasOutside) {
            logger.info('User returned to geofence - violation cleared', {
              employeeId,
              distance: Math.round(distance),
              geofenceRadius
            });
          }
        }
        
        // Still within geofence, just acknowledge
        return sendSuccess(res, {
          action: 'none',
          withinGeofence: true,
          distance: Math.round(distance),
          geofenceRadius,
          message: 'Location tracked successfully'
        }, 'Location tracked', null, 200);
      }
    }

    // If no open attendance, check for recent auto-logout and potential auto check-in
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const recentAutoLogout = await Attendance.findOne({
      employee: employeeId,
      logout_reason: 'auto_geofence',
      check_out_time: { $gte: thirtyMinutesAgo },
      check_in_time: { $exists: true }
    }).populate('store').sort({ check_out_time: -1 });

    if (recentAutoLogout && recentAutoLogout.store) {
      const store = recentAutoLogout.store;
      if (store.coordinates && store.coordinates.latitude && store.coordinates.longitude) {
        const distance = calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          store.coordinates.latitude,
          store.coordinates.longitude
        );
        const geofenceRadius = store.geofenceRadius || 200; // Default 200 meters (updated from 100m)
        const withinGeofence = distance <= geofenceRadius;

        if (withinGeofence) {
          // Employee was auto-logged out and is now back within geofence
          // If autoCheckIn flag is true, automatically check them in
          if (autoCheckIn === true) {
            try {
              const token = req.headers.authorization?.split(' ')[1] || null;
              const userWithTenant = {
                ...req.user,
                tenantId: req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user.tenantId || 'upcapto'
              };
              const selfieUrl = null; // No selfie for auto check-in
              const notes = `Auto check-in: Returned to geofence after auto-logout`;

              const newAttendance = await AttendanceService.clockIn(
                userWithTenant,
                parseFloat(latitude),
                parseFloat(longitude),
                selfieUrl,
                notes,
                token
              );

              logger.info('Auto check-in performed after geofence return', {
                employeeId,
                distance: Math.round(distance),
                previousLogout: recentAutoLogout.check_out_time
              });

              return sendSuccess(res, {
                action: 'auto_checkin',
                withinGeofence: true,
                distance: Math.round(distance),
                geofenceRadius,
                attendance: {
                  id: newAttendance._id?.toString() || newAttendance.id,
                  checkInTime: newAttendance.check_in_time,
                  status: newAttendance.status
                },
                message: 'Auto check-in successful: You are back within geofence'
              }, 'Auto check-in performed', null, 201);
            } catch (autoCheckInError) {
              logger.error('Auto check-in failed', { error: autoCheckInError.message, employeeId });
              return sendSuccess(res, {
                action: 'auto_checkin_available',
                withinGeofence: true,
                distance: Math.round(distance),
                geofenceRadius,
                lastAutoLogout: recentAutoLogout.check_out_time,
                message: 'You are back within geofence. Auto check-in failed, please check in manually.',
                canAutoCheckIn: true,
                autoCheckInError: autoCheckInError.message
              }, 'Location tracked - Auto check-in available but failed', null, 200);
            }
          } else {
            // Auto check-in available, but not triggered by flag
            return sendSuccess(res, {
              action: 'auto_checkin_available',
              withinGeofence: true,
              distance: Math.round(distance),
              geofenceRadius,
              lastAutoLogout: recentAutoLogout.check_out_time,
              message: 'You are back within geofence. Auto check-in available.',
              canAutoCheckIn: true
            }, 'Location tracked - Auto check-in available', null, 200);
          }
        }
      }
    }

    // No active session - try to get store from roster for today
    // This allows geofence checking even when not checked in
    try {
      const axios = require('axios');
      const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:3002';
      const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
      const user = req.user;
      
      // Get employee ID
      const employeeId = user.employee_id || user.employeeId || user._id?.toString() || user.id?.toString();
      
      if (employeeId) {
        // Get today's roster to find assigned store
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayDateStr = today.toISOString().split('T')[0];
        
        // Get admin token for internal service call
        let adminToken = req.headers.authorization?.split(' ')[1] || req.headers.authorization || '';
        try {
          const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:80';
          const targetTenantId = tenantId.toLowerCase().trim();
          let ADMIN_EMAIL = process.env[`${targetTenantId.toUpperCase()}_ADMIN_EMAIL`] || process.env.ADMIN_EMAIL;
          let ADMIN_PASSWORD = process.env[`${targetTenantId.toUpperCase()}_ADMIN_PASSWORD`] || process.env.ADMIN_PASSWORD;

          if (!ADMIN_EMAIL) {
            if (targetTenantId === 'eyekra') {
              ADMIN_EMAIL = 'admin@eyekra.com';
              ADMIN_PASSWORD = ADMIN_PASSWORD || 'Eyekra@Admin2026!';
            } else if (targetTenantId === 'upcapto') {
              ADMIN_EMAIL = 'admin@upcapto.com';
              ADMIN_PASSWORD = ADMIN_PASSWORD || 'Upcapto@2026';
            } else {
              ADMIN_EMAIL = 'Admin@lenstrack.com';
              ADMIN_PASSWORD = ADMIN_PASSWORD || 'Kadarkhan@123';
            }
          }
          if (!ADMIN_PASSWORD) {
            if (targetTenantId === 'eyekra') {
              ADMIN_PASSWORD = 'Eyekra@Admin2026!';
            } else if (targetTenantId === 'upcapto') {
              ADMIN_PASSWORD = 'Upcapto@2026';
            } else {
              ADMIN_PASSWORD = 'Kadarkhan@123';
            }
          }

          const adminLoginResponse = await axios.post(`${AUTH_SERVICE_URL}/api/auth/login`, {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD
          }, {
            headers: {
              'Content-Type': 'application/json',
              'x-tenant-id': targetTenantId
            },
            timeout: 3000
          });

          if (adminLoginResponse.data && (adminLoginResponse.data.data?.accessToken || adminLoginResponse.data.accessToken)) {
            adminToken = adminLoginResponse.data.data?.accessToken || adminLoginResponse.data.accessToken;
          }
        } catch (adminTokenError) {
          // Use employee token as fallback
        }

        // Get roster for today
        const rosterResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/roster`, {
          params: {
            employeeId: employeeId,
            date: todayDateStr,
            limit: 1
          },
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'x-tenant-id': tenantId,
            'Content-Type': 'application/json'
          },
          timeout: 5000,
          validateStatus: (status) => status < 500
        });

        if (rosterResponse.data && rosterResponse.data.success) {
          const rosterData = rosterResponse.data.data || rosterResponse.data.roster || [];
          const todayRoster = Array.isArray(rosterData) ? rosterData[0] : rosterData;
          
          if (todayRoster && todayRoster.storeId) {
            // Get store details with coordinates
            const storeResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/stores/${todayRoster.storeId}`, {
              headers: {
                Authorization: `Bearer ${adminToken}`,
                'x-tenant-id': tenantId,
                'Content-Type': 'application/json'
              },
              timeout: 5000,
              validateStatus: (status) => status < 500
            });

            if (storeResponse.data && storeResponse.data.success && storeResponse.data.data) {
              const store = storeResponse.data.data;
              
              // Check if store has coordinates
              if (store.coordinates && store.coordinates.latitude && store.coordinates.longitude) {
                const distance = calculateDistance(
                  parseFloat(latitude),
                  parseFloat(longitude),
                  store.coordinates.latitude,
                  store.coordinates.longitude
                );
                const geofenceRadius = store.geofenceRadius || 200;
                const withinGeofence = distance <= geofenceRadius;
                
                return sendSuccess(res, {
                  action: 'none',
                  withinGeofence: withinGeofence,
                  distance: Math.round(distance),
                  geofenceRadius,
                  storeName: store.name,
                  message: withinGeofence ? 'Location tracked successfully - within geofence' : `Location tracked - ${Math.round(distance)}m from store (limit: ${geofenceRadius}m)`
                }, 'Location tracked', null, 200);
              }
            }
          }
        }
      }
    } catch (rosterError) {
      // Don't fail if roster lookup fails - just log and continue
      logger.warn('Failed to get store from roster for track-location', { error: rosterError.message });
    }

    // No active session, no recent auto-logout, no roster store found, just acknowledge location
    return sendSuccess(res, {
      action: 'none',
      withinGeofence: true,
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

    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    const token = req.headers.authorization?.split(' ')[1] || null;
    let tenantStoreIds = [];
    let tenantStoreCodes = [];

    // Build tenant-specific store scope to safely include legacy attendance rows (without tenantId).
    try {
      const axios = require('axios');
      const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:3002';
      const storesResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/stores`, {
        params: { limit: 1000 },
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json'
        },
        timeout: 8000
      });

      const stores = Array.isArray(storesResponse.data?.data) ? storesResponse.data.data : [];
      tenantStoreIds = stores
        .map(s => s?._id?.toString?.() || s?.id?.toString?.())
        .filter(Boolean);
      tenantStoreCodes = stores
        .map(s => (s?.code || s?.storeCode || s?.store_code || '').toString().toUpperCase().trim())
        .filter(Boolean);
    } catch (storeScopeError) {
      logger.warn('Failed to build tenant store scope for daily timeline; using strict tenantId only', {
        tenantId,
        error: storeScopeError.message
      });
    }

    // Get all attendance records for the day
    const attendanceQuery = {
      check_in_time: { $gte: startOfDay, $lte: endOfDay },
      $or: [{ tenantId: tenantId }]
    };

    if (tenantStoreIds.length > 0 || tenantStoreCodes.length > 0) {
      const legacyScoped = [{ tenantId: { $exists: false } }, { tenantId: null }];
      if (tenantStoreIds.length > 0) {
        legacyScoped.push({ store: { $in: tenantStoreIds } });
      }
      if (tenantStoreCodes.length > 0) {
        legacyScoped.push({ store_code: { $in: tenantStoreCodes } });
      }
      attendanceQuery.$or.push({ $and: [{ $or: [{ tenantId: { $exists: false } }, { tenantId: null }] }, { $or: legacyScoped.slice(2) }] });
    }

    const attendanceRecords = await Attendance.find(attendanceQuery)
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

/**
 * Update attendance record (for clock-out via PATCH)
 * PATCH /api/attendance/:id
 * Body: { "checkOut": "<ISO 8601 string>" }
 */
const updateAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { checkOut } = req.body;

    if (!checkOut) {
      return sendError(res, 'checkOut is required', 'checkOut field is required in request body', 400);
    }

    // Find attendance record
    const attendance = await Attendance.findById(id);

    if (!attendance) {
      return sendNotFound(res, 'Attendance record', id);
    }

    // Update check-out time
    const checkOutTime = new Date(checkOut);
    attendance.check_out_time = checkOutTime;

    // Calculate total hours if check-in exists
    if (attendance.check_in_time) {
      const diffMs = checkOutTime - attendance.check_in_time;
      attendance.total_hours = diffMs / (1000 * 60 * 60);
    }

    // Update status
    attendance.status = 'present';

    await attendance.save();

    // Format response according to frontend expectations
    const formattedResponse = {
      id: attendance._id?.toString() || attendance.id,
      employeeId: attendance.employee_id,
      date: attendance.date,
      checkIn: attendance.check_in_time,
      checkOut: attendance.check_out_time,
      status: attendance.status
    };

    return sendSuccess(res, formattedResponse, 'Attendance updated successfully', null, 200);
  } catch (error) {
    logger.error('Error in updateAttendance controller', { error: error.message, attendanceId: req.params.id });
    
    if (error.name === 'CastError') {
      return sendError(res, 'Invalid attendance record ID', 'The provided attendance record ID is invalid', 400);
    }

    next(error);
  }
};

/**
 * Edit attendance record (general edit for HR/Admin)
 * PUT /api/attendance/:id
 * Body: { notes, status, check_in_time, check_out_time }
 */
const editAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // CRITICAL: Get tenantId for tenant isolation
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    
    // Check permissions - HR/Admin can edit any, employee can edit own notes only
    const userRole = (req.user?.role || '').toUpperCase();
    const isAdminOrHR = ['ADMIN', 'HR', 'SUPERADMIN', 'MANAGER'].includes(userRole);
    
    const mongoose = require('mongoose');
    
    // Build query with tenant isolation
    const query = {};
    
    if (mongoose.Types.ObjectId.isValid(id)) {
      query._id = id;
    } else {
      return sendError(res, 'Invalid attendance ID', 'Attendance ID must be a valid MongoDB ObjectId', 400);
    }
    query.$and = [
      {
        $or: [
          { tenantId: tenantId },
          { tenantId: { $exists: false } },
          { tenantId: null }
        ]
      }
    ];
    
    // Find attendance record
    const attendance = await Attendance.findOne(query);
    
    if (!attendance) {
      return sendNotFound(res, 'Attendance', id);
    }

    if (!isAdminOrHR) {
      const userEmployeeId = (req.user?.employee_id || req.user?.employeeId || '').toUpperCase().trim();
      const recordEmployeeId = (attendance.employee_id || '').toUpperCase().trim();
      if (!userEmployeeId || userEmployeeId !== recordEmployeeId) {
        return sendError(res, 'Access denied', 'You can only edit your own attendance records', 403);
      }
      const disallowedKeys = Object.keys(updateData).filter(k => !['notes'].includes(k));
      if (disallowedKeys.length > 0) {
        return sendError(res, 'Access denied', 'Employees can edit only notes field', 403);
      }
    }
    
    // Update allowed fields
    if (updateData.notes !== undefined) {
      attendance.notes = updateData.notes;
    }
    
    if (updateData.status !== undefined) {
      // Validate status
      const validStatuses = ['present', 'absent', 'late', 'half_day', 'on_leave', 'holiday'];
      if (!validStatuses.includes(updateData.status.toLowerCase())) {
        return sendError(res, 'Invalid status', `Status must be one of: ${validStatuses.join(', ')}`, 400);
      }
      attendance.status = updateData.status.toLowerCase();
    }
    
    if (updateData.check_in_time !== undefined) {
      attendance.check_in_time = new Date(updateData.check_in_time);
      // Update date if check_in_time changed
      attendance.date = new Date(attendance.check_in_time);
      attendance.date.setHours(0, 0, 0, 0);
    }
    
    if (updateData.check_out_time !== undefined) {
      attendance.check_out_time = new Date(updateData.check_out_time);
    }
    
    // Recalculate total hours if both times are present
    if (attendance.check_in_time && attendance.check_out_time) {
      const diffMs = attendance.check_out_time - attendance.check_in_time;
      attendance.total_hours = Math.max(0, diffMs / (1000 * 60 * 60)); // Ensure non-negative
    } else if (attendance.check_in_time && !attendance.check_out_time) {
      // If only check-in, set hours to 0
      attendance.total_hours = 0;
    }
    
    // Update updated_at timestamp
    attendance.updated_at = new Date();
    
    await attendance.save();
    
    logger.info('Attendance edited by HR/Admin', {
      attendanceId: id,
      editedBy: req.user._id || req.user.id,
      tenantId,
      updates: Object.keys(updateData)
    });
    
    // Format and return response
    const formattedAttendance = formatAttendance(attendance);
    
    return sendSuccess(res, formattedAttendance, 'Attendance updated successfully', null, 200);
  } catch (error) {
    logger.error('Error in editAttendance controller', { 
      error: error.message, 
      attendanceId: req.params.id,
      userId: req.user?._id 
    });
    
    if (error.name === 'CastError') {
      return sendError(res, 'Invalid attendance record ID', 'The provided attendance record ID is invalid', 400);
    }
    
    if (error.name === 'ValidationError') {
      return sendError(res, error.message || 'Validation failed', 'Validation failed', 400);
    }
    
    next(error);
  }
};

/**
 * Get attendance by store (Admin/HR only)
 * GET /api/attendance/store/:storeId
 */
const getAttendanceByStore = async (req, res, next) => {
  try {
    const userRole = (req.user?.role || '').toUpperCase();
    const isAdminOrHR = ['ADMIN', 'HR', 'SUPERADMIN', 'MANAGER'].includes(userRole);
    
    if (!isAdminOrHR) {
      return sendError(res, 'Access denied', 'Only Admin/HR can view store-wise attendance', 403);
    }
    
    const { storeId } = req.params;
    const { page, limit } = parsePagination(req.query);
    const { date, startDate, endDate } = req.query;
    
    const filters = { storeId };
    if (date) filters.date = date;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    
    const result = await AttendanceService.getAttendanceRecords(filters, page, limit);
    
    const attendanceRecords = Array.isArray(result.data) 
      ? result.data.map(att => formatAttendance(att))
      : [];
    
    const total = result.pagination?.total || 0;
    const pagination = createPagination(page, limit, total);
    
    return sendSuccess(res, attendanceRecords, 'Store attendance retrieved successfully', pagination, 200);
  } catch (error) {
    logger.error('Error in getAttendanceByStore', { error: error.message, storeId: req.params.storeId });
    return sendError(res, error.message || 'Failed to retrieve store attendance', 'Internal server error', 500);
  }
};

/**
 * Get attendance by department (Admin/HR only)
 * GET /api/attendance/department/:departmentId
 */
const getAttendanceByDepartment = async (req, res, next) => {
  try {
    const userRole = (req.user?.role || '').toUpperCase();
    const isAdminOrHR = ['ADMIN', 'HR', 'SUPERADMIN', 'MANAGER'].includes(userRole);
    
    if (!isAdminOrHR) {
      return sendError(res, 'Access denied', 'Only Admin/HR can view department-wise attendance', 403);
    }
    
    const { departmentId } = req.params;
    const { page, limit } = parsePagination(req.query);
    const { date, startDate, endDate } = req.query;
    
    // Get employees in this department from HR service
    const axios = require('axios');
    const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:3002';
    const token = req.headers.authorization;
    
    let departmentEmployees = [];
    try {
      const employeesResponse = await axios.get(
        `${HR_SERVICE_URL}/api/hr/employees`,
        {
          params: { departmentId, limit: 1000 },
          headers: {
            'Authorization': token,
            'x-tenant-id': req.headers['x-tenant-id'] || req.user?.tenantId
          },
          timeout: 5000
        }
      );
      
      if (employeesResponse.data.success && employeesResponse.data.data) {
        const employees = Array.isArray(employeesResponse.data.data) 
          ? employeesResponse.data.data 
          : employeesResponse.data.data.employees || [];
        
        departmentEmployees = employees.map(emp => emp.employeeId || emp.employee_id).filter(Boolean);
      }
    } catch (hrError) {
      logger.warn('Failed to fetch department employees from HR service', { error: hrError.message });
    }
    
    if (departmentEmployees.length === 0) {
      return sendSuccess(res, [], 'No employees found in this department', createPagination(page, limit, 0), 200);
    }
    
    // Get attendance for all employees in this department
    const result = await AttendanceService.getAttendanceRecordsByEmployeeIds(
      departmentEmployees,
      { date, startDate, endDate },
      page,
      limit
    );
    
    const attendanceRecords = Array.isArray(result.data) 
      ? result.data.map(att => formatAttendance(att))
      : [];
    
    const total = result.pagination?.total || 0;
    const pagination = createPagination(page, limit, total);
    
    return sendSuccess(res, attendanceRecords, 'Department attendance retrieved successfully', pagination, 200);
  } catch (error) {
    logger.error('Error in getAttendanceByDepartment', { error: error.message, departmentId: req.params.departmentId });
    return sendError(res, error.message || 'Failed to retrieve department attendance', 'Internal server error', 500);
  }
};

/**
 * Get today's attendance for the current employee
 * GET /api/attendance/today
 * Query params: employeeId (optional, for admin/HR), date (optional, defaults to today)
 */
const getTodayAttendance = async (req, res, next) => {
  try {
    const { employeeId, date } = req.query;

    // Calendar day bounds in business TZ (default Asia/Kolkata) so IST "today" matches check_in_time UTC
    const businessTz = process.env.ATTENDANCE_BUSINESS_TZ || 'Asia/Kolkata';
    const ymd =
      date && /^\d{4}-\d{2}-\d{2}$/.test(String(date).trim())
        ? String(date).trim()
        : new Date().toLocaleDateString('en-CA', { timeZone: businessTz });
    let startOfDay;
    let endOfDay;
    if (businessTz === 'Asia/Kolkata') {
      startOfDay = new Date(`${ymd}T00:00:00+05:30`);
      endOfDay = new Date(`${ymd}T23:59:59.999+05:30`);
    } else {
      const targetDate = new Date(`${ymd}T12:00:00`);
      startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
    }
    
    // Determine which employee to query
    const userRole = (req.user?.role || '').toUpperCase();
    const isAdminOrHR = ['ADMIN', 'HR', 'SUPERADMIN', 'MANAGER'].includes(userRole);
    
    let queryEmployeeId;
    if (employeeId && isAdminOrHR) {
      // Admin/HR can query any employee
      queryEmployeeId = employeeId.toUpperCase().trim();
    } else {
      // Employee can only query their own attendance
      queryEmployeeId = (req.user?.employee_id || req.user?.employeeId || '').toUpperCase().trim();
    }
    
    if (!queryEmployeeId) {
      const emptyPayload = await attachJtsTasksToTodayPayload(req, queryEmployeeId, null);
      return sendSuccess(
        res,
        emptyPayload,
        'No attendance for today',
        null,
        200
      );
    }
    
    // Query attendance - check both date and check_in_time fields
    // Also check if checkIn.time exists (new format)
    const tenantIdRaw = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    const tenantId = String(tenantIdRaw).toLowerCase().trim();
    const attendance = await Attendance.findOne({
      $and: [
        {
          $or: [
            { tenantId },
            { tenantId: { $exists: false } },
            { tenantId: null }
          ]
        },
        {
          $or: [
            {
              employee_id: queryEmployeeId,
              date: { $gte: startOfDay, $lte: endOfDay }
            },
            {
              employee_id: queryEmployeeId,
              check_in_time: { $gte: startOfDay, $lte: endOfDay }
            }
          ]
        }
      ]
    })
    .sort({ check_in_time: -1 })
    .populate('employee', 'firstName lastName email employee_id employeeId')
    .populate('store', 'name code storeCode store_code _id') // Populate store with code fields
    .lean();
    
    if (!attendance) {
      const noRowPayload = await attachJtsTasksToTodayPayload(req, queryEmployeeId, null);
      return sendSuccess(
        res,
        noRowPayload,
        'No attendance for today',
        null,
        200
      );
    }
    
    // If store code is UNKNOWN or missing, try to fetch it from HR service
    const needsStoreCode = !attendance.store_code || 
                          attendance.store_code === 'UNKNOWN' || 
                          attendance.store_code.trim() === '';
    
    if (needsStoreCode) {
      try {
        const axios = require('axios');
        const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:3002';
        const tenantId = req.user?.tenantId || req.get('X-Tenant-Id') || 'default';
        const token = req.headers.authorization?.split(' ')[1] || null;
        
        // Get store ID from attendance record
        let storeId = null;
        if (attendance.store) {
          if (typeof attendance.store === 'object' && attendance.store._id) {
            storeId = attendance.store._id.toString();
          } else if (typeof attendance.store === 'string') {
            storeId = attendance.store;
          }
        } else if (attendance.storeId) {
          storeId = attendance.storeId.toString();
        }
        
        // If we have a store ID, fetch store details
        if (storeId && token) {
          const storeResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/stores/${storeId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'x-tenant-id': tenantId,
              'Content-Type': 'application/json'
            },
            timeout: 5000
          });
          
          if (storeResponse.data && storeResponse.data.success && storeResponse.data.data) {
            const storeData = storeResponse.data.data;
            const storeCode = storeData.code || 
                            storeData.storeCode || 
                            storeData.store_code;
            if (storeCode && storeCode !== 'UNKNOWN' && storeCode.trim() !== '') {
              // Update attendance record with correct store code (non-blocking)
              Attendance.findByIdAndUpdate(attendance._id, { store_code: storeCode }, { new: false }).catch(err => {
                logger.warn('Failed to update attendance store code', { error: err.message });
              });
              // Update in memory for this response
              attendance.store_code = storeCode;
              if (attendance.store && typeof attendance.store === 'object') {
                attendance.store.code = storeCode;
                attendance.store.storeCode = storeCode;
              }
              logger.info('Fetched and updated store code for attendance', { 
                attendanceId: attendance._id, 
                storeCode,
                storeId 
              });
            }
          }
        } else if (!storeId) {
          // No store ID in attendance - try to get from employee
          try {
            const employeeResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/employees/${queryEmployeeId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
                'x-tenant-id': tenantId,
                'Content-Type': 'application/json'
              },
              timeout: 5000
            });
            
            if (employeeResponse.data && employeeResponse.data.success && employeeResponse.data.data) {
              const employee = employeeResponse.data.data;
              // Priority 1: Try to get store code from employee's workLocation.storeId
              if (employee.workLocation && employee.workLocation.storeId) {
                const workLocationStoreId = employee.workLocation.storeId;
                const mongoose = require('mongoose');
                // If it looks like a code (not ObjectId), use it directly
                if (!mongoose.Types.ObjectId.isValid(workLocationStoreId)) {
                  attendance.store_code = workLocationStoreId;
                  // Also update the database record (non-blocking)
                  Attendance.findByIdAndUpdate(attendance._id, { store_code: workLocationStoreId }, { new: false }).catch(err => {
                    logger.warn('Failed to update attendance store code from workLocation', { error: err.message });
                  });
                  logger.info('Using store code from employee workLocation.storeId', { storeCode: workLocationStoreId });
                } else {
                  // It's an ObjectId, fetch store details to get code
                  try {
                    const storeResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/stores/${workLocationStoreId}`, {
                      headers: {
                        Authorization: `Bearer ${token}`,
                        'x-tenant-id': tenantId,
                        'Content-Type': 'application/json'
                      },
                      timeout: 5000
                    });
                    if (storeResponse.data && storeResponse.data.success && storeResponse.data.data) {
                      const storeCode = storeResponse.data.data.code || 
                                      storeResponse.data.data.storeCode || 
                                      storeResponse.data.data.store_code;
                      if (storeCode && storeCode !== 'UNKNOWN' && storeCode.trim() !== '') {
                        attendance.store_code = storeCode;
                        Attendance.findByIdAndUpdate(attendance._id, { store_code: storeCode }, { new: false }).catch(err => {
                          logger.warn('Failed to update attendance store code', { error: err.message });
                        });
                        logger.info('Fetched store code from employee store ObjectId', { storeCode });
                      }
                    }
                  } catch (storeErr) {
                    logger.debug('Could not fetch store by ObjectId', { error: storeErr.message });
                  }
                }
              }
              
              // Priority 2: Try to get from employee.store object if workLocation didn't work
              if ((!attendance.store_code || attendance.store_code === 'UNKNOWN') && employee.store) {
                if (typeof employee.store === 'object' && employee.store.code && employee.store.code.trim() !== '') {
                  attendance.store_code = employee.store.code;
                  Attendance.findByIdAndUpdate(attendance._id, { store_code: employee.store.code }, { new: false }).catch(err => {
                    logger.warn('Failed to update attendance store code from employee.store', { error: err.message });
                  });
                  logger.info('Using store code from employee.store', { storeCode: employee.store.code });
                } else if (typeof employee.store === 'string') {
                  // Store is an ID, fetch it
                  try {
                    const storeResponse = await axios.get(`${HR_SERVICE_URL}/api/hr/stores/${employee.store}`, {
                      headers: {
                        Authorization: `Bearer ${token}`,
                        'x-tenant-id': tenantId,
                        'Content-Type': 'application/json'
                      },
                      timeout: 5000
                    });
                    if (storeResponse.data && storeResponse.data.success && storeResponse.data.data) {
                      const storeCode = storeResponse.data.data.code || 
                                      storeResponse.data.data.storeCode || 
                                      storeResponse.data.data.store_code;
                      if (storeCode && storeCode !== 'UNKNOWN' && storeCode.trim() !== '') {
                        attendance.store_code = storeCode;
                        Attendance.findByIdAndUpdate(attendance._id, { store_code: storeCode }, { new: false }).catch(err => {
                          logger.warn('Failed to update attendance store code', { error: err.message });
                        });
                        logger.info('Fetched store code from employee.store ID', { storeCode });
                      }
                    }
                  } catch (storeErr) {
                    logger.debug('Could not fetch store from employee.store ID', { error: storeErr.message });
                  }
                }
              }
            }
          } catch (empError) {
            logger.debug('Could not fetch employee for store code', { error: empError.message });
          }
        }
      } catch (storeFetchError) {
        logger.debug('Could not fetch store code from HR service', { error: storeFetchError.message });
        // Continue without updating - not critical
      }
    }
    
    // Format the attendance record
    const formattedAttendance = formatAttendance(attendance);
    const out = await attachJtsTasksToTodayPayload(req, queryEmployeeId, formattedAttendance);

    return sendSuccess(res, out, 'Today\'s attendance retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getTodayAttendance controller', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?._id 
    });
    
    return sendError(res, error.message || 'Failed to retrieve today\'s attendance', 'Internal server error', 500);
  }
};

/**
 * Get expiring leave balances
 * GET /api/attendance/leave/balances?expiringWithin=30
 * Proxies to HR service
 */
/**
 * Get leave requests (proxies to HR service)
 * GET /api/attendance/leave?page=1&limit=10
 * Allows employees to view their own leaves
 */
const getLeaveRequests = async (req, res, next) => {
  try {
    const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:3002';
    const { hrServiceClient } = require('../utils/httpClient');
    const token = req.headers.authorization;
    const tenantId = req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'];
    
    // Build query string from request query params
    const queryParams = new URLSearchParams(req.query).toString();
    
    const response = await hrServiceClient.get(
      `${HR_SERVICE_URL}/api/hr/leave-requests?${queryParams}`,
      {
        headers: {
          'Authorization': token || '',
          'X-Tenant-Id': tenantId || '',
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.status === 200 && response.data) {
      return res.status(200).json(response.data);
    } else {
      return sendError(res, 'Failed to get leave requests', 'HR_SERVICE_ERROR', response.status || 500);
    }
  } catch (error) {
    logger.error('Error in getLeaveRequests (proxy)', { error: error.message });
    return sendError(res, 'Failed to get leave requests', 'INTERNAL_ERROR', 500);
  }
};

/**
 * Get expiring leave balances
 * GET /api/attendance/leave/balances?expiringWithin=30
 * Proxies to HR service
 */
const getExpiringLeaveBalances = async (req, res, next) => {
  try {
    const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:3002';
    const { hrServiceClient } = require('../utils/httpClient');
    const token = req.headers.authorization;
    const tenantId = req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'];
    
    const response = await hrServiceClient.get(
      `${HR_SERVICE_URL}/api/hr/leave/balances?${new URLSearchParams(req.query).toString()}`,
      {
        headers: {
          'Authorization': token || '',
          'X-Tenant-Id': tenantId || '',
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.status === 200 && response.data) {
      return res.status(200).json(response.data);
    } else {
      return sendError(res, 'Failed to get expiring leave balances', 'HR_SERVICE_ERROR', response.status || 500);
    }
  } catch (error) {
    logger.error('Error in getExpiringLeaveBalances', { error: error.message });
    return sendError(res, 'Failed to get expiring leave balances', 'INTERNAL_ERROR', 500);
  }
};

const bulkUpdateAttendance = async (req, res, next) => {
  try {
    const { ids = [], status, approvalNotes, managerNotes, entries } = req.body || {};
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';

    // Frontend compatibility: some screens call /api/attendance/bulk for roster bulk create.
    // If payload is roster-like, proxy to HR roster bulk endpoint.
    if (Array.isArray(entries) && entries.length > 0) {
      const axios = require('axios');
      const HR_SERVICE_URL = process.env.HR_SERVICE_URL || 'http://hr-service:3002';
      const token = req.headers.authorization || '';
      const response = await axios.post(`${HR_SERVICE_URL}/api/hr/roster/bulk`, { entries }, {
        headers: {
          Authorization: token,
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      return res.status(response.status || 200).json(response.data);
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      return sendError(res, 'ids is required', 'Provide non-empty ids array', 400);
    }
    if (!status) {
      return sendError(res, 'status is required', 'Provide target status', 400);
    }

    const normalizedStatus = String(status).toLowerCase();
    const allowedStatuses = ['approved', 'rejected', 'present', 'absent', 'late', 'half_day', 'on_leave', 'holiday'];
    if (!allowedStatuses.includes(normalizedStatus)) {
      return sendError(res, 'Invalid status', `status must be one of: ${allowedStatuses.join(', ')}`, 400);
    }

    const mongoose = require('mongoose');
    const validIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return sendError(res, 'No valid IDs', 'No valid attendance record ids were provided', 400);
    }

    const updateDoc = { status: normalizedStatus, updated_at: new Date() };
    if (approvalNotes !== undefined) updateDoc.approval_notes = approvalNotes;
    if (managerNotes !== undefined) updateDoc.manager_notes = managerNotes;
    if (normalizedStatus === 'approved' || normalizedStatus === 'rejected') {
      updateDoc.is_approved = normalizedStatus === 'approved';
      updateDoc.approved_at = new Date();
      updateDoc.approved_by = req.user?._id || req.user?.id;
    }

    const result = await Attendance.updateMany(
      {
        _id: { $in: validIds },
        $or: [
          { tenantId: tenantId },
          { tenantId: { $exists: false } },
          { tenantId: null }
        ]
      },
      { $set: updateDoc }
    );

    return sendSuccess(res, {
      matched: result.matchedCount || result.n || 0,
      modified: result.modifiedCount || result.nModified || 0,
      status: normalizedStatus
    }, 'Bulk attendance update completed', null, 200);
  } catch (error) {
    logger.error('Error in bulkUpdateAttendance controller', { error: error.message, userId: req.user?._id });
    return sendError(res, error.message || 'Bulk update failed', 'Internal server error', 500);
  }
};

const deleteAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
    const userRole = (req.user?.role || '').toUpperCase();
    const isAdminOrHR = ['ADMIN', 'HR', 'SUPERADMIN', 'MANAGER'].includes(userRole);
    const mongoose = require('mongoose');

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid attendance ID', 'Attendance ID must be a valid MongoDB ObjectId', 400);
    }

    const attendance = await Attendance.findOne({
      _id: id,
      $or: [
        { tenantId: tenantId },
        { tenantId: { $exists: false } },
        { tenantId: null }
      ]
    });
    if (!attendance) return sendNotFound(res, 'Attendance', id);

    if (!isAdminOrHR) {
      const userEmployeeId = (req.user?.employee_id || req.user?.employeeId || '').toUpperCase().trim();
      const recordEmployeeId = (attendance.employee_id || '').toUpperCase().trim();
      if (!userEmployeeId || userEmployeeId !== recordEmployeeId) {
        return sendError(res, 'Access denied', 'You can only delete your own attendance records', 403);
      }
    }

    await Attendance.deleteOne({
      _id: id,
      $or: [
        { tenantId: tenantId },
        { tenantId: { $exists: false } },
        { tenantId: null }
      ]
    });
    return sendSuccess(res, { id }, 'Attendance deleted successfully', null, 200);
  } catch (error) {
    logger.error('Error in deleteAttendance controller', { error: error.message, attendanceId: req.params.id, userId: req.user?._id });
    return sendError(res, error.message || 'Failed to delete attendance', 'Internal server error', 500);
  }
};

module.exports = {
  clockIn,
  clockOut,
  getAttendanceHistory,
  getAttendanceSummary,
  getAttendanceRecords,
  editAttendance,
  getAttendanceById,
  markAttendance,
  getAttendanceStats,
  getAttendanceReports,
  getDailyAttendanceTimeline,
  trackLocation,
  updateAttendance,
  getAttendanceByStore,
  getAttendanceByDepartment,
  getTodayAttendance,
  bulkUpdateAttendance,
  deleteAttendance,
  getLeaveRequests,
  getExpiringLeaveBalances
};
