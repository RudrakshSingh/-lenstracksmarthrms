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

/** Multer / clients may send "" for optional GPS fields; Joi.number() would fail without this. */
function stripEmptyClockCoords(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    ['latitude', 'longitude'].forEach((key) => {
      const v = req.body[key];
      if (v === '' || v == null) {
        delete req.body[key];
      } else if (typeof v === 'string' && v.trim() === '') {
        delete req.body[key];
      }
    });
  }
  next();
}

const {
  clockIn,
  clockOut,
  getAttendanceHistory,
  getAttendanceSummary,
  getAttendanceRecords,
  getAttendanceById,
  markAttendance,
  getAttendanceStats,
  getAttendanceReports,
  getDailyAttendanceTimeline,
  trackLocation,
  updateAttendance,
  editAttendance,
  getAttendanceByStore,
  getAttendanceByDepartment,
  getTodayAttendance,
  bulkUpdateAttendance,
  deleteAttendance,
  getLeaveRequests,
  getExpiringLeaveBalances
} = require('../controllers/attendanceController');

// Validation schemas
const clockInSchema = {
  body: Joi.object({
    // Optional when employee is NO_GEOFENCE / roaming / optional-GPS role (see controller + getEmployeeAttendanceConfig)
    latitude: Joi.number().optional(),
    longitude: Joi.number().optional(),
    notes: Joi.string().optional(),
    selfie: Joi.string().optional(), // Allow base64 selfie string (will be ignored if not valid)
    timestamp: Joi.number().optional(),
    deviceSecurity: Joi.any().optional(),
    appState: Joi.any().optional(),
    networkLocation: Joi.any().optional(),
    ipLocation: Joi.any().optional(),
    satelliteInfo: Joi.any().optional()
  })
};

const clockOutSchema = {
  body: Joi.object({
    latitude: Joi.number().optional(),
    longitude: Joi.number().optional(),
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
    startDate: Joi.string().isoDate().required().messages({
      'string.isoDate': 'startDate must be a valid ISO date string (e.g., 2026-02-01)',
      'any.required': 'startDate is required'
    }),
    endDate: Joi.string().isoDate().required().messages({
      'string.isoDate': 'endDate must be a valid ISO date string (e.g., 2026-02-16)',
      'any.required': 'endDate is required'
    }),
    employeeId: Joi.string().optional() // Allow query employeeId for HR/Admin
  })
};

// Routes
router.post('/clock-in', 
  authenticate,
  checkEmployeeStatus(['active']),
  // All active employees can clock-in (no special permission needed)
  upload.single('selfie'), // Selfie upload is optional
  uploadToBlobStorage, // Upload selfie to AWS S3
  stripEmptyClockCoords,
  validateRequest(clockInSchema),
  clockIn
);

// Alias for /clock-in - MUST be right after /clock-in to ensure proper route matching
router.post('/check-in', 
  authenticate,
  checkEmployeeStatus(['active']),
  // All active employees can clock-in (no special permission needed)
  upload.single('selfie'), // Selfie upload is optional
  uploadToBlobStorage, // Upload selfie to AWS S3
  stripEmptyClockCoords,
  validateRequest(clockInSchema),
  clockIn
);

router.post('/clock-out',
  authenticate,
  checkEmployeeStatus(['active']),
  // All active employees can clock-out (no special permission needed)
  upload.single('selfie'), // Selfie upload is optional
  uploadToBlobStorage, // Upload selfie to AWS S3
  stripEmptyClockCoords,
  validateRequest(clockOutSchema),
  clockOut
);

// Alias for /clock-out - MUST be right after /clock-out to ensure proper route matching
router.post('/check-out',
  authenticate,
  checkEmployeeStatus(['active']),
  // All active employees can clock-out (no special permission needed)
  upload.single('selfie'), // Selfie upload is optional
  uploadToBlobStorage, // Upload selfie to AWS S3
  stripEmptyClockCoords,
  validateRequest(clockOutSchema),
  clockOut
);

router.get('/history',
  authenticate,
  checkEmployeeStatus(['active', 'inactive', 'on-leave']), // Allow all employees to view their history
  validateRequest(attendanceHistorySchema),
  getAttendanceHistory
);

// CRITICAL: Place /summary BEFORE /:id route to avoid route conflicts
router.get('/summary',
  authenticate,
  // Allow all authenticated users (employees can view their own summary)
  validateRequest(attendanceSummarySchema),
  asyncHandler(getAttendanceSummary)
);

// Get today's attendance - MUST come before generic / route
router.get('/today',
  authenticate,
  // Allow all authenticated users (employees can view their own, admin/HR can view any)
  asyncHandler(getTodayAttendance)
);

// Alias for /today - frontend compatibility
router.get('/current',
  authenticate,
  // Allow all authenticated users (employees can view their own, admin/HR can view any)
  asyncHandler(getTodayAttendance)
);

// Status check endpoint - frontend compatibility
router.get('/check-status',
  authenticate,
  // Allow all authenticated users (employees can view their own, admin/HR can view any)
  asyncHandler(getTodayAttendance)
);

// Attendance statistics - MUST come BEFORE /:id route to avoid route conflicts
router.get('/stats',
  authenticate,
  // Allow employees to view their own stats, admins/HR to view all
  asyncHandler(getAttendanceStats)
);

// Get leave requests (proxies to HR service) - MUST come BEFORE /:id route
// GET /api/attendance/leave?page=1&limit=10
router.get('/leave',
  authenticate,
  // No role/permission check - employees can view their own leaves (handled in HR service)
  asyncHandler(getLeaveRequests)
);

// Get expiring leave balances (proxies to HR service)
router.get('/leave/balances',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager', 'Employee'], ['attendance:read']),
  asyncHandler(getExpiringLeaveBalances)
);

// Bulk attendance update (approve/reject/edit status)
router.post('/bulk',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], ['attendance:update']),
  validateRequest({
    body: Joi.object({
      ids: Joi.array().items(Joi.string()).min(1).required(),
      status: Joi.string().required(),
      approvalNotes: Joi.string().allow('', null).optional(),
      managerNotes: Joi.string().allow('', null).optional()
    })
  }),
  asyncHandler(bulkUpdateAttendance)
);

// Attendance reports (must be before /:id)
router.get('/reports',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], ['attendance:read']),
  asyncHandler(getAttendanceReports)
);

// Daily attendance timeline (must be before /:id)
router.get('/daily-timeline',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['attendance:read']),
  asyncHandler(getDailyAttendanceTimeline)
);

// Store-wise attendance (must be before /:id)
router.get('/store/:storeId',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], ['attendance:read']),
  asyncHandler(getAttendanceByStore)
);

// Department-wise attendance (must be before /:id)
router.get('/department/:departmentId',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], ['attendance:read']),
  asyncHandler(getAttendanceByDepartment)
);

// Get all attendance records (general endpoint)
// Allow employees to view their own attendance (NO PERMISSION CHECK - handled in controller)
// CRITICAL: This route must be AFTER /today, /current, /check-status, /summary, /stats, and /:id to avoid conflicts
router.get('/',
  authenticate,
  // No permission check - controller handles role-based filtering
  // Employees can only see their own, Admin/HR can see all in their tenant
  asyncHandler(getAttendanceRecords)
);


// Location tracking for auto-logout (geofence violation) and auto-checkin
router.post('/track-location',
  authenticate,
  checkEmployeeStatus(['active']),
  validateRequest({
    body: Joi.object({
      latitude: Joi.number().required(),
      longitude: Joi.number().required(),
      autoCheckIn: Joi.boolean().optional() // Optional flag to trigger auto check-in
    })
  }),
  asyncHandler(trackLocation)
);

// Mark attendance (POST /api/attendance) - Catch-all route, MUST come AFTER specific routes
router.post('/',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['attendance:create']),
  markAttendance
);

// PATCH endpoint for clock-out (frontend compatibility)
// PATCH /api/attendance/:id
// Body: { "checkOut": "<ISO 8601 string>" }
router.patch('/:id',
  authenticate,
  checkEmployeeStatus(['active']),
  validateRequest({
    body: Joi.object({
      checkOut: Joi.string().isoDate().required()
    })
  }),
  asyncHandler(updateAttendance)
);

// PUT endpoint for general attendance editing (HR/Admin only)
// PUT /api/attendance/:id
// Body: { notes, status, check_in_time, check_out_time }
router.put('/:id',
  authenticate,
  // Controller enforces owner-vs-admin edit permissions
  validateRequest({
    body: Joi.object({
      notes: Joi.string().optional(),
      status: Joi.string().valid('present', 'absent', 'late', 'half_day', 'on_leave', 'holiday').optional(),
      check_in_time: Joi.string().isoDate().optional(),
      check_out_time: Joi.string().isoDate().optional()
    }).min(1) // At least one field must be provided
  }),
  asyncHandler(editAttendance)
);

// Delete attendance record
router.delete('/:id',
  authenticate,
  // Controller enforces owner-vs-admin delete permissions
  asyncHandler(deleteAttendance)
);

// Get attendance by ID - keep after specific routes to avoid conflicts
router.get('/:id',
  authenticate,
  asyncHandler(getAttendanceById)
);

module.exports = router;