const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../config/logger');
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
// LEGACY DASHBOARD APIS (backwards compatibility)
// MUST come BEFORE generic /dashboard route to avoid conflicts
// ============================================

// Dashboard overview - MUST be FIRST before /dashboard route to avoid conflicts
router.get(
  '/dashboard/overview',
  requireRole(['hr', 'admin', 'superadmin', 'manager', 'employee'], []),
  asyncHandler(getUnifiedDashboard)
);

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

// Store Manager Dashboard
// GET /api/hr/dashboard/store-manager?storeId={storeId}
router.get(
  '/dashboard/store-manager',
  requireRole(['manager', 'admin', 'superadmin'], []),
  asyncHandler(getStoreDashboard)
);

// ============================================
// NEW UNIFIED DASHBOARD APIS (Frontend aligned)
// ============================================

// Main Dashboard (Unified, role-based)
// GET /api/hr/dashboard?role={role}&employeeId={employeeId}
// MUST come AFTER specific routes like /dashboard/overview
router.get(
  '/dashboard',
  asyncHandler(getUnifiedDashboard)
);

// HRMS Dashboard
// GET /api/hrms/dashboard?role={role}&employeeId={employeeId}
router.get(
  '/hrms/dashboard',
  asyncHandler(getHRMSDashboard)
);

module.exports = router;

