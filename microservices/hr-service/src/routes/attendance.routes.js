const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const asyncHandler = require('../utils/asyncHandler');
const {
  getAttendanceStats,
  getAttendanceReports
} = require('../controllers/attendanceController');

// All routes require authentication
router.use(authenticate);

// Routes
router.get(
  '/attendance/stats',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.attendance.read'),
  asyncHandler(getAttendanceStats)
);

router.get(
  '/attendance/reports',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.attendance.read'),
  asyncHandler(getAttendanceReports)
);

// Also mount at /api/attendance for compatibility
router.get(
  '/stats',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.attendance.read'),
  asyncHandler(getAttendanceStats)
);

router.get(
  '/reports',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.attendance.read'),
  asyncHandler(getAttendanceReports)
);

module.exports = router;

