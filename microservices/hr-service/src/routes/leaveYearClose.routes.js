const express = require('express');
const router = express.Router();
const leaveYearCloseController = require('../controllers/leaveYearCloseController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const asyncHandler = require('../utils/asyncHandler');
const Joi = require('joi');

// All routes require authentication
router.use(authenticate);

// Validation schemas
const processLeaveYearCloseSchema = {
  body: Joi.object({
    year: Joi.number().integer().min(2020).max(2100).required()
  })
};

// Routes
router.post(
  '/leave-year-close',
  requireRole(['hr', 'admin']),
  requirePermission('hr.leave.yearclose'),
  validateRequest(processLeaveYearCloseSchema),
  asyncHandler(leaveYearCloseController.processLeaveYearClose)
);

module.exports = router;

