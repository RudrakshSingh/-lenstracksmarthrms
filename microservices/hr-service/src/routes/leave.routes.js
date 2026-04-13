const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const leaveManagementController = require('../controllers/leaveManagementController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const asyncHandler = require('../utils/asyncHandler');
const Joi = require('joi');
const { cacheMiddleware } = require('../middleware/cache.middleware');

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createLeaveRequestSchema = {
  body: Joi.object({
    employee_id: Joi.string().optional(), // Optional - auto-set from token for employees/managers
    leave_type: Joi.string().valid('CL', 'SL', 'EL', 'WO', 'PH', 'LWP', 'MATERNITY', 'PATERNITY', 'BEREAVEMENT', 'MARRIAGE', 'COMP_OFF', 'TRAINING').required(),
    from_date: Joi.date().required(),
    to_date: Joi.date().required(),
    reason: Joi.string().required().max(1000),
    half_day: Joi.boolean().default(false),
    half_day_type: Joi.string().valid('FIRST_HALF', 'SECOND_HALF'),
    attachments: Joi.array().items(Joi.object({
      file_name: Joi.string().required(),
      file_url: Joi.string().required(),
      file_type: Joi.string().valid('MEDICAL_CERTIFICATE', 'DOCUMENT', 'OTHER')
    }))
  })
};

const approveLeaveRequestSchema = {
  body: Joi.object({
    level: Joi.number().integer().min(1).max(3).required(),
    comments: Joi.string().max(500)
  })
};

// Routes
router.get(
  '/policies/leave',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.leave.read'),
  cacheMiddleware(600), // Cache leave policies for 10 minutes (they don't change often)
  asyncHandler(leaveController.getLeavePolicy)
);

// Leave request creation - employees can create for themselves
router.post(
  '/leave-requests',
  requireRole(['hr', 'admin', 'employee', 'manager']),
  // Note: Permission check removed for employees - they can create their own leave requests
  // HR/Admin/Manager still need permission check (handled in controller)
  validateRequest(createLeaveRequestSchema),
  asyncHandler(leaveController.createLeaveRequest)
);

router.get(
  '/leave-requests',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  // Permission check removed - employees can view their own leaves (handled in controller)
  // requirePermission('hr.leave.read'), // Removed - controller handles employee access
  asyncHandler(leaveController.getLeaveRequests)
);

router.get(
  '/leave-requests/:id',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.leave.read'),
  asyncHandler(leaveController.getLeaveRequestById)
);

// Simple approve endpoint (for Manager/HR)
router.post(
  '/leave-requests/:id/approve',
  requireRole(['hr', 'admin', 'manager']),
  asyncHandler(leaveController.approveLeaveRequestSimple)
);

// Original approve endpoint (with level)
router.patch(
  '/leave-requests/:id',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.leave.update'),
  validateRequest(approveLeaveRequestSchema),
  asyncHandler(leaveController.approveLeaveRequest)
);

router.get(
  '/leave-ledger',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.leave.read'),
  asyncHandler(leaveController.getLeaveLedger)
);

router.post(
  '/leave-requests/:id/reject',
  requireRole(['hr', 'admin', 'manager']),
  asyncHandler(leaveController.rejectLeaveRequest)
);

router.post(
  '/leave-requests/:id/cancel',
  requireRole(['hr', 'admin', 'employee']),
  requirePermission('hr.leave.update'),
  asyncHandler(leaveController.cancelLeaveRequest)
);

// Alias routes for path compatibility with frontend
router.get(
  '/leave',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  // Permission check removed - employees can view their own leaves (handled in controller)
  // requirePermission('hr.leave.read'), // Removed - controller handles employee access
  asyncHandler(leaveController.getLeaveRequests)
);

router.get(
  '/leaves',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  // Permission check removed - employees can view their own leaves (handled in controller)
  // requirePermission('hr.leave.read'), // Removed - controller handles employee access
  asyncHandler(leaveController.getLeaveRequests)
);

router.post(
  '/leave',
  requireRole(['hr', 'admin', 'employee', 'manager']),
  validateRequest(createLeaveRequestSchema),
  asyncHandler(leaveController.createLeaveRequest)
);

router.post(
  '/leaves',
  requireRole(['hr', 'admin', 'employee', 'manager']),
  validateRequest(createLeaveRequestSchema),
  asyncHandler(leaveController.createLeaveRequest)
);

// Get leave applications (alias for getLeaveRequests with employeeId required)
// Allow employees to view their own applications, admins/HR to view all
router.get(
  '/leaves/applications',
  requireRole(['hr', 'admin', 'manager', 'employee'], []), // No permission check - controller handles own data check
  asyncHandler(leaveController.getLeaveApplications)
);

// Mark leave for today - simple endpoint
router.post(
  '/leave/mark-today',
  requireRole(['hr', 'admin', 'employee', 'manager']),
  asyncHandler(leaveController.markLeaveToday)
);

// Alias routes for frontend compatibility (leaves/:id/approve, leaves/:id/reject)
router.post(
  '/leaves/:id/approve',
  requireRole(['hr', 'admin', 'manager']),
  asyncHandler(leaveController.approveLeaveRequestSimple)
);

router.post(
  '/leaves/:id/reject',
  requireRole(['hr', 'admin', 'manager']),
  asyncHandler(leaveController.rejectLeaveRequest)
);

// Bulk approve/reject
router.post(
  '/leaves/bulk-action',
  requireRole(['hr', 'admin', 'manager']),
  asyncHandler(leaveController.bulkApproveRejectLeave)
);

// Get expiring leave balances
router.get(
  '/leave/balances',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.leave.read'),
  asyncHandler(leaveController.getExpiringLeaveBalances)
);

// Get leaves for roster (employee profile)
router.get(
  '/leaves/roster',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.leave.read'),
  asyncHandler(leaveController.getLeavesForRoster)
);

// Alias for /api/leaves (roster endpoint - frontend calls /api/leaves directly)
// Note: This should be mounted at root level in server.js for /api/leaves path
// For now, keeping it here as /api/hr/leaves/roster

// ============================================
// Leave Type Management
// ============================================
router.post(
  '/policies/leave/types',
  requireRole(['hr', 'admin']),
  requirePermission('hr.leave.update'),
  asyncHandler(leaveManagementController.createLeaveType)
);

router.put(
  '/policies/leave/types/:id',
  requireRole(['hr', 'admin']),
  requirePermission('hr.leave.update'),
  asyncHandler(leaveManagementController.updateLeaveType)
);

// ============================================
// Holidays Management
// ============================================
router.get(
  '/holidays',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.leave.read'),
  asyncHandler(leaveManagementController.getHolidays)
);

router.post(
  '/holidays',
  requireRole(['hr', 'admin']),
  requirePermission('hr.leave.update'),
  asyncHandler(leaveManagementController.createHoliday)
);

router.put(
  '/holidays/:id',
  requireRole(['hr', 'admin']),
  requirePermission('hr.leave.update'),
  asyncHandler(leaveManagementController.updateHoliday)
);

// ============================================
// Blackout Periods Management
// ============================================
router.get(
  '/leave/blackout',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.leave.read'),
  asyncHandler(leaveManagementController.getBlackoutPeriods)
);

router.post(
  '/leave/blackout',
  requireRole(['hr', 'admin']),
  requirePermission('hr.leave.update'),
  asyncHandler(leaveManagementController.createBlackoutPeriod)
);

router.put(
  '/leave/blackout/:id',
  requireRole(['hr', 'admin']),
  requirePermission('hr.leave.update'),
  asyncHandler(leaveManagementController.updateBlackoutPeriod)
);

// ============================================
// Leave Approval Workflow
// ============================================
router.get(
  '/leave/workflow',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.leave.read'),
  asyncHandler(leaveManagementController.getLeaveWorkflow)
);

router.put(
  '/leave/workflow',
  requireRole(['hr', 'admin']),
  requirePermission('hr.leave.update'),
  asyncHandler(leaveManagementController.saveLeaveWorkflow)
);

// ============================================
// Leave Reports & Analytics
// ============================================
router.get(
  '/leave/reports',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.leave.read'),
  asyncHandler(leaveManagementController.getLeaveReports)
);

// ============================================
// Leave Notification Settings
// ============================================
router.get(
  '/leave/notification-settings',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.leave.read'),
  asyncHandler(leaveManagementController.getLeaveNotificationSettings)
);

router.put(
  '/leave/notification-settings',
  requireRole(['hr', 'admin']),
  requirePermission('hr.leave.update'),
  asyncHandler(leaveManagementController.saveLeaveNotificationSettings)
);

module.exports = router;

