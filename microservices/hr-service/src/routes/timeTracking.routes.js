const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const asyncHandler = require('../utils/asyncHandler');
const {
  getTimeTracking,
  startTimeTracking,
  stopTimeTracking,
  getTimeTrackingStats
} = require('../controllers/timeTrackingController');

// All routes require authentication
router.use(authenticate);

// Routes
router.get(
  '/time-tracking',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.timetracking.read'),
  asyncHandler(getTimeTracking)
);

router.post(
  '/time-tracking/start',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.timetracking.create'),
  asyncHandler(startTimeTracking)
);

router.post(
  '/time-tracking/:id/stop',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.timetracking.update'),
  asyncHandler(stopTimeTracking)
);

router.get(
  '/time-tracking/stats',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.timetracking.read'),
  asyncHandler(getTimeTrackingStats)
);

module.exports = router;

