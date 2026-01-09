const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const checkEmployeeStatus = require('../middleware/statusCheck.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const { upload } = require('../middleware/upload.middleware');
const { uploadToBlobStorage } = require('../middleware/blobUpload.middleware');
const asyncHandler = require('../utils/asyncHandler');
const Joi = require('joi');

const {
  clockIn,
  clockOut,
  getAttendanceHistory,
  getAttendanceSummary,
  getAttendanceRecords,
  markAttendance,
  getAttendanceStats,
  getAttendanceReports,
  getDailyAttendanceTimeline,
  trackLocation
} = require('../controllers/attendanceController');

// Validation schemas
const clockInSchema = {
  body: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
    notes: Joi.string().optional()
  })
};

const clockOutSchema = {
  body: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
    notes: Joi.string().optional()
  })
};

const attendanceHistorySchema = {
  query: Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  })
};

const attendanceSummarySchema = {
  query: Joi.object({
    startDate: Joi.date().required(),
    endDate: Joi.date().required()
  })
};

// Routes
router.post('/clock-in', 
  authenticate,
  checkEmployeeStatus(['active']),
  // All active employees can clock-in (no special permission needed)
  upload.single('selfie'), // Selfie upload is optional
  uploadToBlobStorage, // Upload selfie to Azure Blob Storage
  validateRequest(clockInSchema),
  clockIn
);

router.post('/clock-out',
  authenticate,
  checkEmployeeStatus(['active']),
  // All active employees can clock-out (no special permission needed)
  upload.single('selfie'), // Selfie upload is optional
  uploadToBlobStorage, // Upload selfie to Azure Blob Storage
  validateRequest(clockOutSchema),
  clockOut
);

router.get('/history',
  authenticate,
  requireRole([], ['attendance:read']),
  validateRequest(attendanceHistorySchema),
  getAttendanceHistory
);

router.get('/summary',
  authenticate,
  requireRole([], ['attendance:read']),
  validateRequest(attendanceSummarySchema),
  getAttendanceSummary
);

// Get all attendance records (general endpoint)
router.get('/',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['attendance:read']),
  getAttendanceRecords
);

// Mark attendance (POST /api/attendance)
router.post('/',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['attendance:create']),
  markAttendance
);

// Attendance statistics
router.get('/stats',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], ['attendance:read']),
  asyncHandler(getAttendanceStats)
);

// Attendance reports
router.get('/reports',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], ['attendance:read']),
  asyncHandler(getAttendanceReports)
);

// Daily attendance timeline for HR/Admin dashboard
router.get('/daily-timeline',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['attendance:read']),
  asyncHandler(getDailyAttendanceTimeline)
);

// Location tracking for auto-logout (geofence violation)
router.post('/track-location',
  authenticate,
  checkEmployeeStatus(['active']),
  validateRequest({
    body: Joi.object({
      latitude: Joi.number().required(),
      longitude: Joi.number().required()
    })
  }),
  asyncHandler(trackLocation)
);

// Alias routes for path compatibility
router.post('/check-in', 
  authenticate,
  checkEmployeeStatus(['active']),
  // All active employees can clock-in (no special permission needed)
  upload.single('selfie'), // Selfie upload is optional
  uploadToBlobStorage, // Upload selfie to Azure Blob Storage
  validateRequest(clockInSchema),
  clockIn
);

router.post('/check-out',
  authenticate,
  checkEmployeeStatus(['active']),
  // All active employees can clock-out (no special permission needed)
  upload.single('selfie'), // Selfie upload is optional
  uploadToBlobStorage, // Upload selfie to Azure Blob Storage
  validateRequest(clockOutSchema),
  clockOut
);

module.exports = router;