const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboardingController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const asyncHandler = require('../utils/asyncHandler');
const Joi = require('joi');

// Validation schemas
const registerSchema = {
  body: Joi.object({
    employee_id: Joi.string().required(),
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().valid('employee', 'hr', 'manager', 'admin', 'superadmin').default('employee'),
    date_of_birth: Joi.date().optional(),
    address: Joi.object({
      address_line_1: Joi.string().optional(),
      street: Joi.string().optional(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      pincode: Joi.string().pattern(/^\d{6}$/).required(),
      zip: Joi.string().optional(),
      country: Joi.string().default('India')
    }).required()
  })
};

const workDetailsSchema = {
  body: Joi.object({
    employeeId: Joi.string().required(),
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    email: Joi.string().email().optional(),
    jobTitle: Joi.string().required(),
    department: Joi.string().required(),
    storeId: Joi.string().allow(null, '').optional(), // Make storeId optional
    designation: Joi.string().required(),
    role_family: Joi.string().required(),
    joining_date: Joi.date().required(),
    reporting_manager_id: Joi.string().allow(null, '').optional(), // Make reporting_manager_id optional
    employee_status: Joi.string().valid('ACTIVE', 'PENDING', 'INACTIVE').default('ACTIVE'),
    base_salary: Joi.number().min(0).optional(),
    target_sales: Joi.number().min(0).optional(),
    pf_applicable: Joi.boolean().optional(),
    esic_applicable: Joi.boolean().optional(),
    pt_applicable: Joi.boolean().optional(),
    tds_applicable: Joi.boolean().optional(),
    pan_number: Joi.string().optional(),
    tax_state: Joi.string().optional(),
    leave_entitlements: Joi.object().optional(),
    incentive_slabs: Joi.object().optional()
  })
};

const statutoryInfoSchema = {
  body: Joi.object({
    bankAccount: Joi.object({
      account_number: Joi.string().required(),
      ifsc_code: Joi.string().pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/).required(),
      bank_name: Joi.string().required(),
      account_type: Joi.string().valid('Savings', 'Current', 'Salary').required()
    }).required(),
    uan: Joi.string().pattern(/^\d{12}$/).optional(),
    esiNo: Joi.string().pattern(/^\d{15}$/).optional(),
    panNumber: Joi.string().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).optional(),
    previousEmployment: Joi.object({
      has_previous_employment: Joi.boolean().required(),
      employer_name: Joi.string().optional(),
      from_date: Joi.date().optional(),
      to_date: Joi.date().optional()
    }).optional()
  })
};

const completeOnboardingSchema = {
  body: Joi.object({
    system_access: Joi.object({
      create_system_account: Joi.boolean().default(true),
      role_name: Joi.string().optional(),
      default_password: Joi.string().optional(),
      password_options: Joi.object({
        force_change_on_first_login: Joi.boolean().default(true),
        send_via_email: Joi.boolean().default(false),
        send_via_sms: Joi.boolean().default(false)
      }).optional(),
      notifications: Joi.object({
        email_welcome: Joi.boolean().default(true),
        email_credentials: Joi.boolean().default(true),
        notify_manager: Joi.boolean().default(true),
        notify_hr: Joi.boolean().default(true)
      }).optional()
    }).optional()
  })
};

const saveDraftSchema = {
  body: Joi.object({
    employee_id: Joi.string().required(),
    step: Joi.number().integer().min(1).max(5).required(),
    data: Joi.object().required()
  })
};

const getDraftSchema = {
  query: Joi.object({
    employee_id: Joi.string().required()
  })
};

// Routes
// Note: Register endpoint is handled separately at /api/auth/register in server.js

/**
 * Step 2: Add work details (uses existing employee creation endpoint)
 * This will be handled by the existing POST /api/hr/employees endpoint
 * but we'll add a specific onboarding route as well
 */
router.post(
  '/work-details',
  authenticate,
  requireRole(['hr', 'admin', 'superadmin']),
  validateRequest(workDetailsSchema),
  asyncHandler(onboardingController.addWorkDetails)
);

/**
 * Step 3: Add statutory information
 * @route PATCH /api/hr/employees/:employeeId/statutory
 * @access Private (HR, Admin)
 */
router.patch(
  '/employees/:employeeId/statutory',
  authenticate,
  requireRole(['hr', 'admin', 'superadmin']),
  validateRequest(statutoryInfoSchema),
  asyncHandler(onboardingController.addStatutoryInfo)
);

/**
 * Step 5: Complete onboarding
 * @route POST /api/hr/employees/:employeeId/complete-onboarding
 * @access Private (HR, Admin)
 */
router.post(
  '/employees/:employeeId/complete-onboarding',
  authenticate,
  requireRole(['hr', 'admin', 'superadmin']),
  validateRequest(completeOnboardingSchema),
  asyncHandler(onboardingController.completeOnboarding)
);

/**
 * Save onboarding draft
 * @route POST /api/hr/onboarding/draft
 * @access Private (HR, Admin)
 */
router.post(
  '/onboarding/draft',
  authenticate,
  requireRole(['hr', 'admin', 'superadmin']),
  validateRequest(saveDraftSchema),
  asyncHandler(onboardingController.saveDraft)
);

/**
 * Get onboarding draft
 * @route GET /api/hr/onboarding/draft
 * @access Private (HR, Admin)
 */
router.get(
  '/onboarding/draft',
  authenticate,
  requireRole(['hr', 'admin', 'superadmin']),
  validateRequest(getDraftSchema),
  asyncHandler(onboardingController.getDraft)
);

module.exports = router;

