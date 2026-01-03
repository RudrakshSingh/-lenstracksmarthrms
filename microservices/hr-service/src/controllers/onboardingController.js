const onboardingService = require('../services/onboarding.service');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

/**
 * Step 1: Register basic information
 * @route POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const result = await onboardingService.registerBasicInfo(req.body);

    res.status(201).json({
      success: true,
      message: 'Basic information registered successfully',
      data: result
    });
  } catch (error) {
    logger.error('Registration error', { 
      error: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      code: error.code,
      body: req.body
    });
    
    // Handle ApiError properly
    if (error instanceof ApiError) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
        code: error.code || 'REGISTRATION_ERROR'
      });
    }
    
    // Handle other errors
    next(error);
  }
};

/**
 * Step 2: Add work details
 * @route POST /api/hr/employees
 */
const addWorkDetails = async (req, res, next) => {
  try {
    const { employeeId } = req.body;
    const createdBy = req.user?.id || req.user?._id;

    // Log request for debugging
    logger.info('Add work details request', {
      employeeId,
      hasJobTitle: !!req.body.jobTitle,
      hasDepartment: !!req.body.department,
      createdBy
    });

    if (!employeeId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Employee ID is required');
    }

    const result = await onboardingService.addWorkDetails(employeeId, req.body, createdBy);

    res.status(200).json({
      success: true,
      message: 'Work details added successfully',
      data: result
    });
  } catch (error) {
    logger.error('Add work details error', { 
      error: error.message,
      stack: error.stack,
      employeeId: req.body?.employeeId,
      statusCode: error.statusCode || error.status
    });
    next(error);
  }
};

/**
 * Step 3: Add statutory information
 * @route PATCH /api/hr/employees/:employeeId or POST /api/hr/onboarding/statutory-info
 */
const addStatutoryInfo = async (req, res, next) => {
  try {
    // Support both :employeeId param (PATCH) and employeeId in body (POST)
    const employeeId = req.params.employeeId || req.body.employeeId;
    const updatedBy = req.user?.id || req.user?._id;

    if (!employeeId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Employee ID is required');
    }

    const result = await onboardingService.addStatutoryInfo(employeeId, req.body, updatedBy);

    res.status(200).json({
      success: true,
      message: 'Statutory information added successfully',
      data: result
    });
  } catch (error) {
    logger.error('Add statutory info error', { error: error.message });
    next(error);
  }
};

/**
 * Step 5: Complete onboarding
 * @route POST /api/hr/employees/:employeeId/complete-onboarding
 */
const completeOnboarding = async (req, res, next) => {
  try {
    // Support both :id and :employeeId params
    const employeeId = req.params.employeeId || req.params.id;
    const completedBy = req.user?.id || req.user?._id;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
        error: 'EMPLOYEE_ID_REQUIRED'
      });
    }

    if (!completedBy) {
      logger.warn('Complete onboarding called without authenticated user', {
        employeeId,
        user: req.user
      });
    }

    logger.info('Completing onboarding', {
      employeeId,
      completedBy,
      hasBody: !!req.body
    });

    const result = await onboardingService.completeOnboarding(employeeId, req.body || {}, completedBy);

    res.status(200).json({
      success: true,
      message: 'Onboarding completed successfully',
      data: result
    });
  } catch (error) {
    logger.error('Complete onboarding error', { 
      error: error.message,
      stack: error.stack,
      employeeId: req.params.employeeId || req.params.id,
      userId: req.user?.id || req.user?._id
    });
    next(error);
  }
};

/**
 * Save onboarding draft
 * @route POST /api/hr/onboarding/draft
 */
const saveDraft = async (req, res, next) => {
  try {
    const { employee_id, step, data } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!employee_id || !step || !data) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'employee_id, step, and data are required');
    }

    const result = await onboardingService.saveDraft(employee_id, step, data, userId);

    res.status(200).json({
      success: true,
      message: 'Draft saved successfully',
      data: result
    });
  } catch (error) {
    logger.error('Save draft error', { error: error.message });
    next(error);
  }
};

/**
 * Get onboarding draft
 * @route GET /api/hr/onboarding/draft
 */
const getDraft = async (req, res, next) => {
  try {
    const { employee_id } = req.query;

    if (!employee_id) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'employee_id is required');
    }

    const result = await onboardingService.getDraft(employee_id);

    res.status(200).json({
      success: true,
      message: 'Draft retrieved successfully',
      data: result
    });
  } catch (error) {
    logger.error('Get draft error', { error: error.message });
    next(error);
  }
};

/**
 * Step 1: Add personal details (onboarding-specific)
 * @route POST /api/hr/onboarding/personal-details
 */
const addPersonalDetails = async (req, res, next) => {
  try {
    const createdBy = req.user?.id || req.user?._id;
    const result = await onboardingService.addPersonalDetails(req.body, createdBy);

    res.status(201).json({
      success: true,
      message: 'Personal details added successfully',
      data: result
    });
  } catch (error) {
    logger.error('Add personal details error', { error: error.message });
    next(error);
  }
};

/**
 * Step 4: Add onboarding documents
 * @route POST /api/hr/onboarding/documents
 */
const addDocuments = async (req, res, next) => {
  try {
    const { employeeId } = req.body;
    const uploadedBy = req.user?.id || req.user?._id;

    if (!employeeId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Employee ID is required');
    }

    const result = await onboardingService.addDocuments(employeeId, req.body, uploadedBy);

    res.status(200).json({
      success: true,
      message: 'Documents added successfully',
      data: result
    });
  } catch (error) {
    logger.error('Add documents error', { error: error.message });
    next(error);
  }
};

module.exports = {
  register,
  addPersonalDetails,
  addWorkDetails,
  addStatutoryInfo,
  addDocuments,
  completeOnboarding,
  saveDraft,
  getDraft
};

