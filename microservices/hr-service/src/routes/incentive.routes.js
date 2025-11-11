const express = require('express');
const router = express.Router();
const incentiveController = require('../controllers/incentiveController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const asyncHandler = require('../utils/asyncHandler');
const Joi = require('joi');

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createIncentiveClaimSchema = {
  body: Joi.object({
    employee_id: Joi.string().required(),
    month: Joi.number().integer().min(1).max(12).required(),
    year: Joi.number().integer().min(2020).max(2100).required(),
    store_id: Joi.string().required(),
    target_sales: Joi.number().min(0).required(),
    actual_sales: Joi.number().min(0).required(),
    basis_json: Joi.object().optional()
  })
};

const approveIncentiveClaimSchema = {
  body: Joi.object({
    level: Joi.number().integer().min(1).max(3).required(),
    amount: Joi.number().min(0).optional(),
    comments: Joi.string().max(500).optional()
  })
};

const applyClawbackSchema = {
  body: Joi.object({
    run_id: Joi.string().required()
  })
};

const processReturnsRemakesFeedSchema = {
  body: Joi.object({
    invoice_id: Joi.string().required(),
    employee_id: Joi.string().required(),
    type: Joi.string().valid('RETURN', 'REMAKE').required(),
    amount: Joi.number().min(0).required(),
    date: Joi.date().required(),
    original_sale_date: Joi.date().required(),
    reason: Joi.string().optional(),
    policy_window_days: Joi.number().integer().min(1).default(30)
  })
};

// Routes
router.post(
  '/incentive-claims',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.incentive.create'),
  validateRequest(createIncentiveClaimSchema),
  asyncHandler(incentiveController.createIncentiveClaim)
);

router.get(
  '/incentive-claims',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.incentive.read'),
  asyncHandler(incentiveController.getIncentiveClaims)
);

router.post(
  '/incentive-claims/:id/approve',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.incentive.approve'),
  validateRequest(approveIncentiveClaimSchema),
  asyncHandler(incentiveController.approveIncentiveClaim)
);

router.post(
  '/clawback/apply',
  requireRole(['hr', 'admin', 'accountant']),
  requirePermission('hr.clawback.apply'),
  validateRequest(applyClawbackSchema),
  asyncHandler(incentiveController.applyClawback)
);

router.post(
  '/webhooks/returns-remakes',
  validateRequest(processReturnsRemakesFeedSchema),
  asyncHandler(incentiveController.processReturnsRemakesFeed)
);

module.exports = router;

