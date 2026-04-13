const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendError } = require('../../shared/utils/response.util');
const logger = require('../config/logger');
const { getEmployeePayroll } = require('../utils/payrollServiceClient');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/payroll/preview
 * @desc    Get payroll preview for an employee
 * @access  Private (Employee can view own payroll, Admin/HR can view all)
 */
router.get(
  '/payroll/preview',
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
      
      // If employee is trying to view someone else's payroll and not admin/HR, deny
      if (!isAdminOrHR && targetEmployeeId && targetEmployeeId !== req.user?.employee_id && targetEmployeeId !== req.user?.employeeId) {
        return sendError(res, 'You can only view your own payroll', 'FORBIDDEN', 403);
      }
      
      if (!targetEmployeeId) {
        return sendError(res, 'employeeId is required', 'VALIDATION_ERROR', 400);
      }

      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const authorization = req.headers.authorization || req.headers.Authorization;
      const requestId = req.headers['x-request-id'] || req.headers['X-Request-ID'];

      const payrollResponse = await getEmployeePayroll({
        employeeCode: targetEmployeeId,
        month,
        year,
        authorization,
        tenantId,
        requestId
      });

      const payrollData = payrollResponse?.data || null;
      const preview = payrollData
        ? {
            basicSalary: payrollData.basic_salary || 0,
            allowances:
              (payrollData.hra || 0) +
              (payrollData.da || 0) +
              (payrollData.special_allowance || 0) +
              (payrollData.variable_pay || 0),
            deductions: payrollData.total_employee_deductions || 0,
            netSalary: payrollData.net_take_home || 0,
            period: `${year}-${String(month).padStart(2, '0')}`,
            status: payrollData.status || 'DRAFT'
          }
        : {
            basicSalary: 0,
            allowances: 0,
            deductions: 0,
            netSalary: 0,
            period: `${year}-${String(month).padStart(2, '0')}`,
            status: 'NOT_AVAILABLE'
          };

      return sendSuccess(res, {
        employeeId: targetEmployeeId,
        preview,
        source: payrollData ? 'payroll-service' : 'fallback',
        message: payrollData
          ? 'Payroll preview retrieved from payroll-service'
          : 'Payroll data not available for current month'
      }, 'Payroll preview retrieved successfully');
    } catch (error) {
      logger.error('Error in getPayrollPreview controller', { error: error.message });
      next(error);
    }
  })
);

module.exports = router;
