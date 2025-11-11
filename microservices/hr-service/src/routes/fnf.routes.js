const express = require('express');
const router = express.Router();
const fnfController = require('../controllers/fnfController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const asyncHandler = require('../utils/asyncHandler');
const Joi = require('joi');

// All routes require authentication
router.use(authenticate);

// Validation schemas
const initiateFnFCaseSchema = {
  body: Joi.object({
    employee_id: Joi.string().required(),
    lwd: Joi.date().required(),
    reason: Joi.string().valid('RESIGNATION', 'TERMINATION', 'RETIREMENT', 'OTHER').required(),
    reason_details: Joi.string().max(1000).optional()
  })
};

const approveFnFCaseSchema = {
  body: Joi.object({
    level: Joi.number().integer().min(1).max(3).required(),
    comments: Joi.string().max(500).optional()
  })
};

const processPayoutSchema = {
  body: Joi.object({
    payout_method: Joi.string().valid('BANK_TRANSFER', 'CHEQUE', 'CASH', 'OTHER').required(),
    bank_details: Joi.object({
      account_number: Joi.string().optional(),
      ifsc: Joi.string().optional(),
      bank_name: Joi.string().optional()
    }).optional(),
    payout_ref: Joi.string().optional()
  })
};

// Routes
router.post(
  '/fnf',
  requireRole(['hr', 'admin']),
  requirePermission('hr.fnf.create'),
  validateRequest(initiateFnFCaseSchema),
  asyncHandler(fnfController.initiateFnFCase)
);

router.get(
  '/fnf',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.fnf.read'),
  asyncHandler(fnfController.getFnFCases)
);

router.get(
  '/fnf/:id',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.fnf.read'),
  asyncHandler(fnfController.getFnFCase)
);

router.post(
  '/fnf/:id/approve',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.fnf.approve'),
  validateRequest(approveFnFCaseSchema),
  asyncHandler(fnfController.approveFnFCase)
);

router.post(
  '/fnf/:id/payout',
  requireRole(['hr', 'admin', 'accountant']),
  requirePermission('hr.fnf.payout'),
  validateRequest(processPayoutSchema),
  asyncHandler(fnfController.processPayout)
);

module.exports = router;

