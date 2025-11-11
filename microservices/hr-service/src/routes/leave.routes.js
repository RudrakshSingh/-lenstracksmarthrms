const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const asyncHandler = require('../utils/asyncHandler');
const Joi = require('joi');

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createLeaveRequestSchema = {
  body: Joi.object({
    employee_id: Joi.string().required(),
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
  asyncHandler(leaveController.getLeavePolicy)
);

router.post(
  '/leave-requests',
  requireRole(['hr', 'admin', 'employee']),
  requirePermission('hr.leave.create'),
  validateRequest(createLeaveRequestSchema),
  asyncHandler(leaveController.createLeaveRequest)
);

router.get(
  '/leave-requests',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.leave.read'),
  asyncHandler(leaveController.getLeaveRequests)
);

router.get(
  '/leave-requests/:id',
  requireRole(['hr', 'admin', 'manager', 'employee']),
  requirePermission('hr.leave.read'),
  asyncHandler(leaveController.getLeaveRequestById)
);

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
  requirePermission('hr.leave.approve'),
  asyncHandler(leaveController.rejectLeaveRequest)
);

router.post(
  '/leave-requests/:id/cancel',
  requireRole(['hr', 'admin', 'employee']),
  requirePermission('hr.leave.update'),
  asyncHandler(leaveController.cancelLeaveRequest)
);

module.exports = router;

