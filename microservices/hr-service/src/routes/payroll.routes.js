const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const asyncHandler = require('../utils/asyncHandler');
const Joi = require('joi');

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createPayrollRunSchema = {
  body: Joi.object({
    month: Joi.number().integer().min(1).max(12).required(),
    year: Joi.number().integer().min(2020).max(2100).required()
  })
};

const lockPayrollRunSchema = {
  params: Joi.object({
    id: Joi.string().required()
  })
};

const postPayrollRunSchema = {
  body: Joi.object({
    jv_number: Joi.string().required(),
    jv_date: Joi.date().optional()
  })
};

const createOverrideSchema = {
  body: Joi.object({
    employee_id: Joi.string().required(),
    run_id: Joi.string().required(),
    component_code: Joi.string().required(),
    original_amount: Joi.number().required(),
    override_amount: Joi.number().required(),
    reason_code: Joi.string().valid('ARREAR', 'BONUS', 'PENALTY_WAIVE', 'ADJUSTMENT', 'CORRECTION', 'OTHER').required(),
    reason: Joi.string().required().max(1000),
    attachment_url: Joi.string().optional()
  })
};

// Routes
router.post(
  '/payroll-runs',
  requireRole(['hr', 'admin', 'accountant']),
  requirePermission('hr.payroll.create'),
  validateRequest(createPayrollRunSchema),
  asyncHandler(payrollController.createPayrollRun)
);

router.post(
  '/payroll-runs/:id/process',
  requireRole(['hr', 'admin', 'accountant']),
  requirePermission('hr.payroll.process'),
  asyncHandler(payrollController.processPayrollRun)
);

router.post(
  '/payroll-runs/:id/lock',
  requireRole(['hr', 'admin', 'accountant']),
  requirePermission('hr.payroll.lock'),
  asyncHandler(payrollController.lockPayrollRun)
);

router.post(
  '/payroll-runs/:id/post',
  requireRole(['hr', 'admin', 'accountant']),
  requirePermission('hr.payroll.post'),
  validateRequest(postPayrollRunSchema),
  asyncHandler(payrollController.postPayrollRun)
);

router.get(
  '/payroll-runs',
  requireRole(['hr', 'admin', 'accountant', 'manager']),
  requirePermission('hr.payroll.read'),
  asyncHandler(payrollController.getPayrollRuns)
);

router.get(
  '/payroll-runs/:id',
  requireRole(['hr', 'admin', 'accountant', 'manager']),
  requirePermission('hr.payroll.read'),
  asyncHandler(payrollController.getPayrollRunById)
);

router.post(
  '/payroll-runs/:id/override',
  requireRole(['hr', 'admin', 'accountant']),
  requirePermission('hr.payroll.override'),
  validateRequest(createOverrideSchema),
  asyncHandler(payrollController.createPayrollOverride)
);

router.get(
  '/payslips',
  requireRole(['hr', 'admin', 'accountant', 'manager', 'employee']),
  requirePermission('hr.payroll.read'),
  asyncHandler(payrollController.getPayslips)
);

module.exports = router;

