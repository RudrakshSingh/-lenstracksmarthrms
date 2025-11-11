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
    logger.error('Registration error', { error: error.message });
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
    logger.error('Add work details error', { error: error.message });
    next(error);
  }
};

/**
 * Step 3: Add statutory information
 * @route PATCH /api/hr/employees/:employeeId
 */
const addStatutoryInfo = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const updatedBy = req.user?.id || req.user?._id;

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
    const { employeeId } = req.params;
    const completedBy = req.user?.id || req.user?._id;

    const result = await onboardingService.completeOnboarding(employeeId, req.body, completedBy);

    res.status(200).json({
      success: true,
      message: 'Onboarding completed successfully',
      data: result
    });
  } catch (error) {
    logger.error('Complete onboarding error', { error: error.message });
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

module.exports = {
  register,
  addWorkDetails,
  addStatutoryInfo,
  completeOnboarding,
  saveDraft,
  getDraft
};

