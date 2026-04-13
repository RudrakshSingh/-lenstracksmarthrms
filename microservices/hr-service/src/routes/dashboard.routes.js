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
  getHRMSDashboard,
  getTopPerformers,
  getTopSales
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
  requireRole(['hr', 'admin', 'superadmin', 'manager', 'employee'], []),
  asyncHandler(getDashboardStats)
);

// Recent activities
router.get(
  '/dashboard/recent-activities',
  requireRole(['hr', 'admin', 'superadmin', 'manager'], []),
  asyncHandler(getRecentActivities)
);

// Top performers - Tenant Admin Dashboard
router.get(
  '/dashboard/top-performers',
  requireRole(['hr', 'admin', 'superadmin', 'manager'], []),
  asyncHandler(getTopPerformers)
);

// Top sales - Tenant Admin Dashboard
router.get(
  '/dashboard/top-sales',
  requireRole(['hr', 'admin', 'superadmin', 'manager'], []),
  asyncHandler(getTopSales)
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

// ============================================
// TENANT ADMIN DASHBOARD ROUTES
// These routes are mounted at /api/dashboard (without /dashboard prefix)
// ============================================

// Create a separate router for tenant admin dashboard routes
const tenantAdminRouter = express.Router();
tenantAdminRouter.use(authenticate);

// Stats endpoint for tenant admin
tenantAdminRouter.get(
  '/stats',
  requireRole(['hr', 'admin', 'superadmin', 'manager'], []),
  asyncHandler(getDashboardStats)
);

// Top performers endpoint
tenantAdminRouter.get(
  '/top-performers',
  requireRole(['hr', 'admin', 'superadmin', 'manager'], []),
  asyncHandler(getTopPerformers)
);

// Top sales endpoint
tenantAdminRouter.get(
  '/top-sales',
  requireRole(['hr', 'admin', 'superadmin', 'manager'], []),
  asyncHandler(getTopSales)
);

// Recent activities endpoint
tenantAdminRouter.get(
  '/recent-activities',
  requireRole(['hr', 'admin', 'superadmin', 'manager'], []),
  asyncHandler(getRecentActivities)
);

module.exports = router;
module.exports.tenantAdminRouter = tenantAdminRouter;