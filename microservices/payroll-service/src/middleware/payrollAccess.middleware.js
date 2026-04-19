const logger = require('../config/logger');

function normalizeRole(role) {
  return String(role || '').toLowerCase().replace(/-/g, '');
}

function hasAnyPermission(user, permissionIds) {
  const perms = user?.permissions || [];
  if (perms.includes('*')) return true;
  return permissionIds.some((p) => perms.includes(p));
}

/**
 * Backend payroll RBAC: JWT permissions first, then legacy roles (brief-aligned).
 * Admin / superadmin bypass when allowAdminBypass !== false.
 */
function requirePayrollAccess({ anyPermissions = [], anyRoles = [], allowAdminBypass = true }) {
  return (req, res, next) => {
    try {
      if (process.env.TEST_MODE === 'true') return next();

      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, code: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const nr = normalizeRole(user.role);
      if (allowAdminBypass && (nr === 'admin' || nr === 'superadmin')) {
        return next();
      }

      /** Superadmin-only paths (e.g. unlock frozen cycle) — no admin bypass */
      if (!allowAdminBypass && nr === 'superadmin') {
        return next();
      }

      if (anyPermissions.length > 0 && hasAnyPermission(user, anyPermissions)) {
        return next();
      }

      if (anyRoles.length > 0) {
        const allowed = anyRoles.map(normalizeRole);
        if (allowed.some((r) => r === nr || (r === 'finance' && (nr === 'accountant' || nr === 'finance')))) {
          return next();
        }
      }

      logger.warn('payroll access denied', {
        userId: user.id,
        role: user.role,
        requiredPermissions: anyPermissions,
        requiredRoles: anyRoles
      });

      return res.status(403).json({
        success: false,
        code: 'INSUFFICIENT_PERMISSION',
        message: 'Access denied for this payroll action',
        requiredPermissions: anyPermissions,
        requiredRoles: anyRoles
      });
    } catch (e) {
      return res.status(500).json({ success: false, message: 'RBAC error' });
    }
  };
}

module.exports = { requirePayrollAccess, normalizeRole, hasAnyPermission };
