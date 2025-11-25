const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const checkEmployeeStatus = require('../middleware/statusCheck.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const { upload, uploadToCloudinary } = require('../middleware/upload.middleware');
const Joi = require('joi');

const {
  clockIn,
  clockOut,
  getAttendanceHistory,
  getAttendanceSummary,
  getAttendanceRecords,
  markAttendance
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
  requireRole([], ['attendance:record']),
  upload.single('selfie'),
  uploadToCloudinary,
  validateRequest(clockInSchema),
  clockIn
);

router.post('/clock-out',
  authenticate,
  checkEmployeeStatus(['active']),
  requireRole([], ['attendance:record']),
  upload.single('selfie'),
  uploadToCloudinary,
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

module.exports = router;