const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const {
  getSalaryDeductions,
  searchEmployees
} = require('../controllers/deductionController');

// Middleware to protect routes
router.use(authenticate);

/**
 * @route GET /api/payroll/salary/deductions
 * @desc Get salary deductions for an employee
 * @access Private
 */
router.get('/salary/deductions',
  requireRole(['admin', 'hr', 'manager', 'employee', 'accountant']),
  requirePermission('read_payroll'),
  getSalaryDeductions
);

/**
 * @route GET /api/payroll/employees
 * @desc Search employees for payroll
 * @access Private
 */
router.get('/employees',
  requireRole(['admin', 'hr', 'manager', 'accountant']),
  requirePermission('read_employees'),
  searchEmployees
);

module.exports = router;

