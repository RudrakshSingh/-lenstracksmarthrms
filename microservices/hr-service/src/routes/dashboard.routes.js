const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const asyncHandler = require('../utils/asyncHandler');
const {
  getDashboardStats,
  getRecentActivities,
  getDashboardDepartments,
  getUnifiedDashboard,
  getStoreDashboard,
  getHRMSDashboard
} = require('../controllers/dashboardController');

// All routes require authentication
router.use(authenticate);

// ============================================
// NEW UNIFIED DASHBOARD APIS (Frontend aligned)
// ============================================

// Main Dashboard (Unified, role-based)
// GET /api/hr/dashboard?role={role}&employeeId={employeeId}
router.get(
  '/dashboard',
  asyncHandler(getUnifiedDashboard)
);

// Store Manager Dashboard
// GET /api/hr/dashboard/store-manager?storeId={storeId}
router.get(
  '/dashboard/store-manager',
  requireRole(['manager', 'admin', 'superadmin'], []),
  asyncHandler(getStoreDashboard)
);

// HRMS Dashboard
// GET /api/hrms/dashboard?role={role}&employeeId={employeeId}
router.get(
  '/hrms/dashboard',
  asyncHandler(getHRMSDashboard)
);

// ============================================
// LEGACY DASHBOARD APIS (backwards compatibility)
// ============================================

// Dashboard statistics
router.get(
  '/dashboard/stats',
  requireRole(['hr', 'admin', 'superadmin', 'manager'], []),
  asyncHandler(getDashboardStats)
);

// Recent activities
router.get(
  '/dashboard/recent-activities',
  requireRole(['hr', 'admin', 'superadmin', 'manager'], []),
  asyncHandler(getRecentActivities)
);

// Department overview
router.get(
  '/dashboard/departments',
  requireRole(['hr', 'admin', 'superadmin', 'manager'], []),
  asyncHandler(getDashboardDepartments)
);

module.exports = router;

