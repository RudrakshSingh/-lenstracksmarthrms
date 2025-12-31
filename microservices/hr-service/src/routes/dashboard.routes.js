const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const asyncHandler = require('../utils/asyncHandler');
const {
  getDashboardStats,
  getRecentActivities,
  getDashboardDepartments
} = require('../controllers/dashboardController');

// All routes require authentication
router.use(authenticate);

// Dashboard statistics
router.get(
  '/dashboard/stats',
  requireRole(['hr', 'admin', 'superadmin', 'manager'], []),
  asyncHandler(getDashboardStats)
);

// Recent activities
router.get(
  '/dashboard/recent-activities',
  requireRole(['hr', 'admin', 'superadmin', 'manager'], []),
  asyncHandler(getRecentActivities)
);

// Department overview
router.get(
  '/dashboard/departments',
  requireRole(['hr', 'admin', 'superadmin', 'manager'], []),
  asyncHandler(getDashboardDepartments)
);

module.exports = router;

