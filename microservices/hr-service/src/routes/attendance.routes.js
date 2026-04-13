const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const asyncHandler = require('../utils/asyncHandler');
const {
  getAttendanceStats,
  getAttendanceReports
} = require('../controllers/attendanceController');
const { sendSuccess, sendError } = require('../../shared/utils/response.util');
const logger = require('../config/logger');

// All routes require authentication
router.use(authenticate);

// Routes
router.get(
  '/attendance/stats',
  requireRole(['hr', 'admin', 'manager', 'employee'], []), // Allow employees to view own stats
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
  requireRole(['hr', 'admin', 'manager', 'employee'], []), // Allow employees to view own stats
  asyncHandler(getAttendanceStats)
);

router.get(
  '/reports',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.attendance.read'),
  asyncHandler(getAttendanceReports)
);

/**
 * @route   POST /api/hr/attendance/check-in
 * @desc    Proxy check-in to attendance service
 * @access  Private (All authenticated users)
 */
router.post(
  '/attendance/check-in',
  requireRole(['hr', 'admin', 'manager', 'employee'], []),
  asyncHandler(async (req, res, next) => {
    try {
      // Proxy to attendance service
      const axios = require('axios');
      const ATTENDANCE_SERVICE_URL = process.env.ATTENDANCE_SERVICE_URL || 'http://attendance-service:80';
      const token = req.headers.authorization;
      
      const response = await axios.post(`${ATTENDANCE_SERVICE_URL}/api/attendance/check-in`, req.body, {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
          'x-tenant-id': req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default'
        },
        timeout: 10000
      });
      
      return res.status(response.status).json(response.data);
    } catch (error) {
      logger.error('Error proxying check-in to attendance service', { error: error.message });
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      return sendError(res, error.message || 'Failed to check in', 'INTERNAL_ERROR', 500);
    }
  })
);

/**
 * @route   POST /api/hr/attendance/check-out
 * @desc    Proxy check-out to attendance service
 * @access  Private (All authenticated users)
 */
router.post(
  '/attendance/check-out',
  requireRole(['hr', 'admin', 'manager', 'employee'], []),
  asyncHandler(async (req, res, next) => {
    try {
      // Proxy to attendance service
      const axios = require('axios');
      const ATTENDANCE_SERVICE_URL = process.env.ATTENDANCE_SERVICE_URL || 'http://attendance-service:80';
      const token = req.headers.authorization;
      
      const response = await axios.post(`${ATTENDANCE_SERVICE_URL}/api/attendance/check-out`, req.body, {
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
          'x-tenant-id': req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default'
        },
        timeout: 10000
      });
      
      return res.status(response.status).json(response.data);
    } catch (error) {
      logger.error('Error proxying check-out to attendance service', { error: error.message });
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      return sendError(res, error.message || 'Failed to check out', 'INTERNAL_ERROR', 500);
    }
  })
);

module.exports = router;

