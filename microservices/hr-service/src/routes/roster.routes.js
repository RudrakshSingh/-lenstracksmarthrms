const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const asyncHandler = require('../utils/asyncHandler');
const Joi = require('joi');
const {
  getRoster,
  createRoster,
  getRosterSettings,
  uploadRoster
} = require('../controllers/rosterController');

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createRosterSchema = {
  body: Joi.object({
    employeeId: Joi.string().required(),
    storeId: Joi.string().required(),
    date: Joi.date().required(),
    shift: Joi.string().valid('MORNING', 'EVENING', 'NIGHT').required(),
    shiftStart: Joi.string().required(),
    shiftEnd: Joi.string().required()
  })
};

// Routes
router.get(
  '/roster',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.roster.read'),
  asyncHandler(getRoster)
);

router.post(
  '/roster',
  requireRole(['hr', 'admin']),
  requirePermission('hr.roster.create'),
  validateRequest(createRosterSchema),
  asyncHandler(createRoster)
);

router.get(
  '/roster/settings',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.roster.read'),
  asyncHandler(getRosterSettings)
);

router.post(
  '/roster/upload',
  requireRole(['hr', 'admin']),
  requirePermission('hr.roster.create'),
  asyncHandler(uploadRoster)
);

module.exports = router;

