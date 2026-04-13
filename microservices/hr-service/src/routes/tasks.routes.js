const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../../shared/utils/response.util');
const logger = require('../config/logger');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/tasks
 * @desc    Get tasks for an employee
 * @access  Private (Employee can view own tasks, Admin/HR can view all)
 */
router.get(
  '/tasks',
  requireRole(['hr', 'admin', 'manager', 'employee'], []),
  asyncHandler(async (req, res, next) => {
    try {
      const { employeeId } = req.query;
      const userRole = (req.user?.role || '').toUpperCase();
      const isAdminOrHR = ['ADMIN', 'HR', 'SUPERADMIN', 'MANAGER'].includes(userRole);
      const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.user?.tenantId || 'default';
      
      // Determine target employee
      let targetEmployeeId = employeeId;
      if (!targetEmployeeId) {
        targetEmployeeId = req.user?.employee_id || req.user?.employeeId;
      }
      
      // If employee is trying to view someone else's tasks and not admin/HR, deny
      if (!isAdminOrHR && targetEmployeeId && targetEmployeeId !== req.user?.employee_id && targetEmployeeId !== req.user?.employeeId) {
        return sendError(res, 'You can only view your own tasks', 'FORBIDDEN', 403);
      }
      
      // TODO: Implement actual task fetching logic
      // For now, return empty array
      return sendSuccess(res, {
        tasks: [],
        total: 0,
        message: 'Tasks endpoint - implementation pending'
      }, 'Tasks retrieved successfully');
    } catch (error) {
      logger.error('Error in getTasks controller', { error: error.message });
      next(error);
    }
  })
);

module.exports = router;
