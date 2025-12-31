const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const asyncHandler = require('../utils/asyncHandler');
const Joi = require('joi');
const {
  getTrainingPrograms,
  createTrainingProgram,
  getTrainingProgress,
  getTrainingStats,
  getTrainingActivity,
  getTrainingLeaderboard
} = require('../controllers/trainingController');

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createTrainingProgramSchema = {
  body: Joi.object({
    programName: Joi.string().required(),
    programCode: Joi.string().required(),
    description: Joi.string().required(),
    category: Joi.string().valid('Technical', 'Soft Skills', 'Compliance', 'Safety', 'Product Knowledge', 'Other').required(),
    duration: Joi.string().optional(),
    targetAudience: Joi.string().optional(),
    department: Joi.string().optional(),
    role: Joi.string().optional(),
    instructor: Joi.string().optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional()
  })
};

// Routes
router.get(
  '/training/programs',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.training.read'),
  asyncHandler(getTrainingPrograms)
);

router.post(
  '/training/programs',
  requireRole(['hr', 'admin']),
  requirePermission('hr.training.create'),
  validateRequest(createTrainingProgramSchema),
  asyncHandler(createTrainingProgram)
);

router.get(
  '/training/progress',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.training.read'),
  asyncHandler(getTrainingProgress)
);

router.get(
  '/training/stats',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.training.read'),
  asyncHandler(getTrainingStats)
);

router.get(
  '/training/activity',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.training.read'),
  asyncHandler(getTrainingActivity)
);

router.get(
  '/training/leaderboard',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.training.read'),
  asyncHandler(getTrainingLeaderboard)
);

module.exports = router;

