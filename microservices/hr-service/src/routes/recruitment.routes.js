const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const asyncHandler = require('../utils/asyncHandler');
const {
  getRecruitmentJobs
} = require('../controllers/recruitmentController');

// All routes require authentication
router.use(authenticate);

// Routes
router.get(
  '/recruitment/jobs',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.recruitment.read'),
  asyncHandler(getRecruitmentJobs)
);

module.exports = router;

