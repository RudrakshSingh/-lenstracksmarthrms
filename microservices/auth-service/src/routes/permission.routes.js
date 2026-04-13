const express = require('express');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const permissionWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.PERMISSION_WRITE_RATE_MAX, 10) || 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many permission writes, slow down' }
});
const {
  getPermissionCatalog,
  getAllPermissions,
  getDepartmentPermissions,
  getUserPermissions,
  patchUserPermissionOverrides,
  updateUserPermissions,
  getAllUsersWithPermissions,
  resetUserPermissions,
  previewUserPermissionEscalation,
  getPermissionMetrics
} = require('../controllers/permissionController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');

const TENANT_MANAGERS = ['superadmin', 'admin', 'hr'];

router.get('/catalog', authenticate, requireRole(TENANT_MANAGERS), getPermissionCatalog);

router.get('/permissions', authenticate, requireRole(TENANT_MANAGERS), getAllPermissions);

router.get(
  '/permissions/department/:department',
  authenticate,
  requireRole(TENANT_MANAGERS),
  getDepartmentPermissions
);

router.get(
  '/internal/metrics',
  authenticate,
  requireRole(['superadmin']),
  getPermissionMetrics
);

router.get('/users', authenticate, requireRole(TENANT_MANAGERS), getAllUsersWithPermissions);

router.get('/user/:userId', authenticate, requireRole(TENANT_MANAGERS), getUserPermissions);

router.patch(
  '/user/:userId/overrides',
  authenticate,
  requireRole(TENANT_MANAGERS),
  permissionWriteLimiter,
  patchUserPermissionOverrides
);

router.post(
  '/user/:userId/escalation-preview',
  authenticate,
  requireRole(TENANT_MANAGERS),
  previewUserPermissionEscalation
);

router.put(
  '/user/:userId',
  authenticate,
  requireRole(TENANT_MANAGERS),
  permissionWriteLimiter,
  updateUserPermissions
);

router.post(
  '/user/:userId/reset',
  authenticate,
  requireRole(TENANT_MANAGERS),
  permissionWriteLimiter,
  resetUserPermissions
);

module.exports = router;
