const express = require('express');
const router = express.Router();
const leaveBalanceController = require('../controllers/leaveBalanceController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');

/**
 * @route   GET /api/hr/leaves/balance
 * @desc    Get leave balance for an employee
 * @access  Private (All authenticated users can see their own balance)
 */
router.get(
  '/balance',
  authenticate,
  leaveBalanceController.getLeaveBalance
);

/**
 * @route   PUT /api/hr/leaves/balance
 * @desc    Update leave balance (Admin/HR only)
 * @access  Private (HR, Admin, SuperAdmin)
 */
router.put(
  '/balance',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin']),
  leaveBalanceController.updateLeaveBalance
);

/**
 * @route   POST /api/hr/leaves/deduct
 * @desc    Deduct leave (when leave is approved)
 * @access  Private (HR, Admin, SuperAdmin, Manager)
 */
router.post(
  '/deduct',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager']),
  leaveBalanceController.deductLeave
);

/**
 * @route   POST /api/hr/leaves/comp-off
 * @desc    Add compensatory off
 * @access  Private (HR, Admin, SuperAdmin, Manager)
 */
router.post(
  '/comp-off',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager']),
  leaveBalanceController.addCompensatoryOff
);

/**
 * @route   POST /api/hr/leaves/reset
 * @desc    Reset leave balance for new year
 * @access  Private (HR, Admin, SuperAdmin)
 */
router.post(
  '/reset',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin']),
  leaveBalanceController.resetLeaveBalance
);

/**
 * @route   GET /api/hr/leaves/all
 * @desc    Get all leave balances
 * @access  Private (HR, Admin, SuperAdmin, Manager)
 */
router.get(
  '/all',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager']),
  leaveBalanceController.getAllLeaveBalances
);

module.exports = router;

