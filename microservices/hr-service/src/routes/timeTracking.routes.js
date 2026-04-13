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
// IMPORTANT: More specific routes must come BEFORE generic routes
// Support both /api/time-tracking (root path) and /api/hr/time-tracking

// Timesheets endpoint - MUST come before generic routes
router.get(
  '/time-tracking/timesheets',
  requireRole(['hr', 'admin', 'manager', 'employee'], []), // Make permission optional
  asyncHandler(async (req, res) => {
    try {
      const { startDate, endDate, employeeId } = req.query;
      const logger = require('../config/logger');
      
      // Return timesheets data (can be extended to fetch from database)
      return res.json({
        success: true,
        data: {
          timesheets: [],
          startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: endDate || new Date().toISOString(),
          total: 0
        },
        message: 'Timesheets retrieved successfully'
      });
    } catch (error) {
      const logger = require('../config/logger');
      logger.error('Error in getTimesheets', { error: error.message });
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve timesheets',
        error: error.message
      });
    }
  })
);

// Projects endpoint - MUST come before generic routes
router.get(
  '/time-tracking/projects',
  requireRole(['hr', 'admin', 'manager', 'employee'], []), // Make permission optional
  asyncHandler(async (req, res) => {
    try {
      // Return empty projects list for now (can be extended later)
      return res.json({
        success: true,
        data: {
          projects: [],
          total: 0
        },
        message: 'Projects retrieved successfully'
      });
    } catch (error) {
      const logger = require('../config/logger');
      logger.error('Error in getProjects', { error: error.message });
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve projects',
        error: error.message
      });
    }
  })
);

// Generic routes come AFTER specific routes
router.get(
  '/',
  requireRole(['hr', 'admin', 'manager', 'employee'], []), // Make permission optional
  asyncHandler(getTimeTracking)
);

router.get(
  '/time-tracking',
  requireRole(['hr', 'admin', 'manager', 'employee'], []), // Make permission optional
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

