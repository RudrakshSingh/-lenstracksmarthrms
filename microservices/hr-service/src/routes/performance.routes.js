const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const asyncHandler = require('../utils/asyncHandler');
const {
  getMyMetrics,
  getMyTrends,
  getMyPeers,
  getPerformanceReviews,
  getPerformanceAnalytics
} = require('../controllers/performanceController');

// All routes require authentication
router.use(authenticate);

// Routes
router.get(
  '/performance/me/metrics',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.performance.read'),
  asyncHandler(getMyMetrics)
);

router.get(
  '/performance/me/trends',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.performance.read'),
  asyncHandler(getMyTrends)
);

router.get(
  '/performance/me/peers',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.performance.read'),
  asyncHandler(getMyPeers)
);

router.get(
  '/performance/reviews',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.performance.read'),
  asyncHandler(getPerformanceReviews)
);

router.get(
  '/performance/analytics',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.performance.read'),
  asyncHandler(getPerformanceAnalytics)
);

module.exports = router;

