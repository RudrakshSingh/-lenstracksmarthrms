const express = require('express');
const router = express.Router();
const statutoryController = require('../controllers/statutoryController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const asyncHandler = require('../utils/asyncHandler');
const Joi = require('joi');

// All routes require authentication
router.use(authenticate);

// Validation schemas
const generateEPFExportSchema = {
  body: Joi.object({
    month: Joi.number().integer().min(1).max(12).required(),
    year: Joi.number().integer().min(2020).max(2100).required()
  })
};

const generateESICExportSchema = {
  body: Joi.object({
    month: Joi.number().integer().min(1).max(12).required(),
    year: Joi.number().integer().min(2020).max(2100).required()
  })
};

const generateTDSForm24QSchema = {
  body: Joi.object({
    quarter: Joi.number().integer().min(1).max(4).required(),
    year: Joi.number().integer().min(2020).max(2100).required()
  })
};

const generateForm16Schema = {
  body: Joi.object({
    employee_id: Joi.string().required(),
    year: Joi.number().integer().min(2020).max(2100).required()
  })
};

// Routes
router.post(
  '/stat-exports/epf',
  requireRole(['hr', 'admin', 'accountant']),
  requirePermission('hr.statutory.export'),
  validateRequest(generateEPFExportSchema),
  asyncHandler(statutoryController.generateEPFExport)
);

router.post(
  '/stat-exports/esic',
  requireRole(['hr', 'admin', 'accountant']),
  requirePermission('hr.statutory.export'),
  validateRequest(generateESICExportSchema),
  asyncHandler(statutoryController.generateESICExport)
);

router.post(
  '/stat-exports/form24q',
  requireRole(['hr', 'admin', 'accountant']),
  requirePermission('hr.statutory.export'),
  validateRequest(generateTDSForm24QSchema),
  asyncHandler(statutoryController.generateTDSForm24Q)
);

router.post(
  '/stat-exports/form16',
  requireRole(['hr', 'admin', 'accountant']),
  requirePermission('hr.statutory.export'),
  validateRequest(generateForm16Schema),
  asyncHandler(statutoryController.generateForm16)
);

router.get(
  '/stat-exports',
  requireRole(['hr', 'admin', 'accountant']),
  requirePermission('hr.statutory.read'),
  asyncHandler(statutoryController.getStatExports)
);

router.post(
  '/stat-exports/:id/validate',
  requireRole(['hr', 'admin', 'accountant']),
  requirePermission('hr.statutory.validate'),
  asyncHandler(statutoryController.validateExport)
);

module.exports = router;

