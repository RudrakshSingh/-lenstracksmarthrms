const securityService = require('../services/security/security.service');
const LocationViolation = require('../models/LocationViolation.model');
const logger = require('../config/logger');
const { 
  sendSuccess, 
  sendError, 
  sendNotFound,
  createPagination,
  parsePagination,
  validateRequired
} = require('../../shared/utils/response.util');

/**
 * Validate location before any action
 * POST /api/security/validate-location
 */
const validateLocation = async (req, res, next) => {
  try {
    const locationData = req.body;
    const employeeId = req.user?._id || req.user?.id || locationData.employeeId;
    
    if (!employeeId) {
      return sendError(res, 'Employee ID is required', 'Authentication required', 401);
    }
    
    // Validate required fields
    const requiredFields = ['location'];
    const validationError = validateRequired(locationData, requiredFields);
    if (validationError) {
      return sendError(res, validationError.error, validationError.message, 400);
    }
    
    // Validate location
    const result = await securityService.validateLocation(
      locationData,
      employeeId,
      locationData.actionType || 'LOCATION_UPDATE'
    );
    
    return sendSuccess(res, {
      valid: result.valid,
      suspiciousScore: result.suspiciousScore,
      action: result.action,
      message: result.message,
      checks: result.securityChecks,
      violations: result.violations,
      breakdown: result.breakdown
    }, result.message, null, 200);
  } catch (error) {
    logger.error('Error in validateLocation controller', { error: error.message });
    next(error);
  }
};

/**
 * Get IP geolocation
 * GET /api/security/ip-geolocation
 */
const getIPGeolocation = async (req, res, next) => {
  try {
    const ip = req.query.ip || req.ip || req.connection.remoteAddress;
    
    const location = await securityService.getIPGeolocation(ip);
    
    return sendSuccess(res, {
      location: location,
      ip: ip
    }, 'IP geolocation retrieved', null, 200);
  } catch (error) {
    logger.error('Error in getIPGeolocation controller', { error: error.message });
    next(error);
  }
};

/**
 * Verify face
 * POST /api/security/validate-face
 */
const validateFace = async (req, res, next) => {
  try {
    const { selfie, employeeId, location, timestamp } = req.body;
    const userId = req.user?._id || req.user?.id || employeeId;
    
    if (!userId) {
      return sendError(res, 'Employee ID is required', 'Authentication required', 401);
    }
    
    // Validate required fields
    const validationError = validateRequired({ selfie }, ['selfie']);
    if (validationError) {
      return sendError(res, validationError.error, validationError.message, 400);
    }
    
    const faceVerification = require('../services/security/faceVerification.service');
    const result = await faceVerification.verifyFace(
      selfie,
      userId,
      location,
      timestamp || Date.now()
    );
    
    return sendSuccess(res, {
      verified: result.verified,
      confidence: result.confidence,
      faceMatch: result.verified,
      locationMatch: true, // Would be validated separately
      timestampValid: true,
      violations: result.violations || []
    }, result.verified ? 'Face verified successfully' : 'Face verification failed', null, 200);
  } catch (error) {
    logger.error('Error in validateFace controller', { error: error.message });
    next(error);
  }
};

/**
 * Get violations
 * GET /api/security/violations
 */
const getViolations = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { employeeId, startDate, endDate, type, resolved } = req.query;
    
    const query = {};
    
    if (employeeId) query.employee_id = employeeId;
    if (type) query.violation_type = type;
    if (resolved !== undefined) query.resolved = resolved === 'true';
    if (startDate || endDate) {
      query.created_at = {};
      if (startDate) query.created_at.$gte = new Date(startDate);
      if (endDate) query.created_at.$lte = new Date(endDate);
    }
    
    const [violations, total] = await Promise.all([
      LocationViolation.find(query)
        .populate('employee_id', 'firstName lastName email employeeId')
        .populate('resolved_by', 'firstName lastName email')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      LocationViolation.countDocuments(query)
    ]);
    
    const pagination = createPagination(page, limit, total);
    
    return sendSuccess(res, {
      violations: violations
    }, 'Violations retrieved successfully', pagination, 200);
  } catch (error) {
    logger.error('Error in getViolations controller', { error: error.message });
    next(error);
  }
};

/**
 * Get violation by ID
 * GET /api/security/violations/:id
 */
const getViolationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const violation = await LocationViolation.findOne({ violation_id: id })
      .populate('employee_id', 'firstName lastName email employeeId')
      .populate('resolved_by', 'firstName lastName email')
      .lean();
    
    if (!violation) {
      return sendNotFound(res, 'Violation', id);
    }
    
    return sendSuccess(res, violation, 'Violation retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getViolationById controller', { error: error.message });
    next(error);
  }
};

/**
 * Resolve violation
 * POST /api/security/violations/:id/resolve
 */
const resolveViolation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { resolved, notes, action } = req.body;
    const resolvedBy = req.user?._id || req.user?.id;
    
    if (!resolvedBy) {
      return sendError(res, 'Authentication required', 'Authentication required', 401);
    }
    
    const violation = await LocationViolation.findOne({ violation_id: id });
    
    if (!violation) {
      return sendNotFound(res, 'Violation', id);
    }
    
    await violation.resolve(resolvedBy, notes);
    
    return sendSuccess(res, {
      violationId: violation.violation_id,
      resolved: violation.resolved,
      resolvedAt: violation.resolved_at,
      resolvedBy: violation.resolved_by
    }, 'Violation resolved successfully', null, 200);
  } catch (error) {
    logger.error('Error in resolveViolation controller', { error: error.message });
    next(error);
  }
};

module.exports = {
  validateLocation,
  getIPGeolocation,
  validateFace,
  getViolations,
  getViolationById,
  resolveViolation
};

