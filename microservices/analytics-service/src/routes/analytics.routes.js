const express = require('express');
const router = express.Router();
const {
  getHRAnalytics,
  getEmployeeStats,
  getAttendanceAnalytics,
  getPerformanceMetrics,
  getComplianceAnalytics,
  generateInsights,
  createDashboard,
  getDashboard,
  exportAnalytics,
  getConfigurationStatus
} = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');

// ── HR Analytics ──────────────────────────────────────────────────────────────
router.get('/hr-analytics',          authenticate, requireRole(['admin', 'hr']), getHRAnalytics);
router.get('/employee-stats',        authenticate, requireRole(['admin', 'hr']), getEmployeeStats);
router.get('/attendance-analytics',  authenticate, requireRole(['admin', 'hr']), getAttendanceAnalytics);
router.get('/performance-metrics',   authenticate, requireRole(['admin', 'hr']), getPerformanceMetrics);
router.get('/compliance-analytics',  authenticate, requireRole(['admin', 'hr']), getComplianceAnalytics);
router.get('/insights',              authenticate, requireRole(['admin', 'hr']), generateInsights);

// ── Dashboard Management ──────────────────────────────────────────────────────
router.post('/dashboard',             authenticate, requireRole(['admin']),       createDashboard);
router.get('/dashboard/:dashboardId', authenticate, requireRole(['admin', 'hr']), getDashboard);

// ── Export & Config ───────────────────────────────────────────────────────────
router.get('/export', authenticate, requireRole(['admin', 'hr']), exportAnalytics);
router.get('/config', authenticate, requireRole(['admin']),       getConfigurationStatus);

// ── Sales Analytics (CORE+ / GROWTH+) ────────────────────────────────────────
// Inline handlers — full implementation in Sprint 4 analytics module.
function salesHandler(label) {
  return (req, res) => {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    res.json({
      success: true,
      data: { label, tenantId, storeId: req.query.storeId || null, period: req.query },
      message: `${label} — live data available after analytics pipeline Sprint 4`,
    });
  };
}

router.get('/sales/daily',          authenticate, requireRole(['admin', 'manager', 'store_manager', 'accountant']), salesHandler('Sales Daily Summary'));
router.get('/sales/stores',         authenticate, requireRole(['admin', 'manager']), salesHandler('Sales by Store'));
router.get('/sales/categories',     authenticate, requireRole(['admin', 'manager', 'store_manager']), salesHandler('Sales by Category'));
router.get('/sales/payment-modes',  authenticate, requireRole(['admin', 'manager', 'accountant']), salesHandler('Sales by Payment Mode'));

// ── Inventory Analytics (GROWTH+) ────────────────────────────────────────────
router.get('/inventory/lens-power-stock', authenticate, requireRole(['admin', 'manager', 'store_manager']), salesHandler('Lens Power Stock Analytics'));
router.get('/inventory/cl-stock',         authenticate, requireRole(['admin', 'manager', 'store_manager']), salesHandler('CL Stock Analytics'));
router.get('/inventory/dead-stock',       authenticate, requireRole(['admin', 'manager']), salesHandler('Dead Stock Report'));
router.get('/inventory/audit-mismatches', authenticate, requireRole(['admin', 'manager']), salesHandler('Audit Mismatch Report'));
router.get('/inventory/damage',           authenticate, requireRole(['admin', 'manager', 'store_manager']), salesHandler('Damage Analytics'));

// ── Vendor Analytics (GROWTH+) ────────────────────────────────────────────────
router.get('/vendor/scorecard',       authenticate, requireRole(['admin', 'manager']), salesHandler('Vendor Scorecard'));
router.get('/vendor/return-pending',  authenticate, requireRole(['admin', 'manager']), salesHandler('Vendor Return Pending'));

// ── Lab Analytics (GROWTH+) ───────────────────────────────────────────────────
router.get('/lab/pending',      authenticate, requireRole(['admin', 'manager', 'store_manager']), salesHandler('Lab Pending Orders'));
router.get('/lab/delay',        authenticate, requireRole(['admin', 'manager']), salesHandler('Lab Delay Report'));
router.get('/lab/qc-rejections',authenticate, requireRole(['admin', 'manager']), salesHandler('Lab QC Rejections'));
router.get('/lab/breakage-value',authenticate, requireRole(['admin', 'manager']), salesHandler('Lab Breakage Value'));

// ── HR+JTS Analytics (ENTERPRISE) ────────────────────────────────────────────
router.get('/hr/attendance-payroll', authenticate, requireRole(['admin', 'hr', 'accountant']), salesHandler('HR Attendance x Payroll'));
router.get('/jts/productivity',      authenticate, requireRole(['admin', 'manager']), salesHandler('JTS Productivity Report'));

module.exports = router;
