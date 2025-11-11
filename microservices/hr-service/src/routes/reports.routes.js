const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const asyncHandler = require('../utils/asyncHandler');

// All routes require authentication
router.use(authenticate);

// Routes
router.get(
  '/reports/payroll-cost',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.reports.read'),
  asyncHandler(reportsController.getPayrollCostByStoreRole)
);

router.get(
  '/reports/incentive-sales',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.reports.read'),
  asyncHandler(reportsController.getIncentiveAsPercentOfSales)
);

router.get(
  '/reports/clawback',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.reports.read'),
  asyncHandler(reportsController.getClawbackReport)
);

router.get(
  '/reports/lwp-days',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.reports.read'),
  asyncHandler(reportsController.getLWPDaysReport)
);

router.get(
  '/reports/leave-utilization',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.reports.read'),
  asyncHandler(reportsController.getLeaveUtilizationReport)
);

router.get(
  '/reports/attrition',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.reports.read'),
  asyncHandler(reportsController.getAttritionReport)
);

router.get(
  '/reports/fnf-stats',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.reports.read'),
  asyncHandler(reportsController.getFnFStats)
);

router.get(
  '/reports/statutory-filing',
  requireRole(['hr', 'admin', 'accountant']),
  requirePermission('hr.reports.read'),
  asyncHandler(reportsController.getStatutoryFilingOnTimePercent)
);

module.exports = router;

