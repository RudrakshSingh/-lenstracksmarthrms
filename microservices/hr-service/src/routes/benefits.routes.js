const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const asyncHandler = require('../utils/asyncHandler');
const Joi = require('joi');
const {
  getBenefits,
  createBenefit,
  getBenefitsStats,
  getBenefitsActivity,
  getPendingTasks,
  enrollInBenefit
} = require('../controllers/benefitsController');

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createBenefitSchema = {
  body: Joi.object({
    name: Joi.string().required(),
    category: Joi.string().valid('Health', 'Insurance', 'Retirement', 'Wellness', 'Education', 'Other').required(),
    type: Joi.string().valid('Mandatory', 'Optional').required(),
    cost: Joi.number().min(0).required(),
    description: Joi.string().required(),
    provider: Joi.string().optional(),
    coverage: Joi.string().optional(),
    eligibilityCriteria: Joi.string().optional()
  })
};

const enrollmentSchema = {
  body: Joi.object({
    employeeId: Joi.string().required(),
    benefitId: Joi.string().required(),
    enrollmentDate: Joi.date().optional(),
    dependents: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        relationship: Joi.string().valid('Spouse', 'Child', 'Parent', 'Sibling', 'Other').required(),
        dateOfBirth: Joi.date().optional()
      })
    ).optional()
  })
};

// Routes
router.get(
  '/benefits',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.benefits.read'),
  asyncHandler(getBenefits)
);

router.post(
  '/benefits',
  requireRole(['hr', 'admin']),
  requirePermission('hr.benefits.create'),
  validateRequest(createBenefitSchema),
  asyncHandler(createBenefit)
);

router.get(
  '/benefits/stats',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.benefits.read'),
  asyncHandler(getBenefitsStats)
);

router.get(
  '/benefits/activity',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.benefits.read'),
  asyncHandler(getBenefitsActivity)
);

router.get(
  '/benefits/pending-tasks',
  requireRole(['hr', 'admin']),
  requirePermission('hr.benefits.read'),
  asyncHandler(getPendingTasks)
);

router.post(
  '/benefits/enrollment',
  requireRole(['hr', 'admin', 'employee']),
  requirePermission('hr.benefits.enroll'),
  validateRequest(enrollmentSchema),
  asyncHandler(enrollInBenefit)
);

module.exports = router;

