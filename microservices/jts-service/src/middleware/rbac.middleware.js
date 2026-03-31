const logger = require('../config/logger');
const { buildErrorBody } = require('../utils/apiError.util');

/**
 * RBAC Middleware - Role-Based Access Control
 */

/**
 * Require specific role(s)
 */
const requireRole = (allowedRoles = [], allowedPermissions = []) => {
  return (req, res, next) => {
    try {
      // In TEST_MODE, allow all
      if (process.env.TEST_MODE === 'true') {
        return next();
      }

      const user = req.user;

      if (!user) {
        return res.status(401).json(buildErrorBody({ code: 'AUTH_REQUIRED', message: 'Authentication required' }));
      }

      const userRole = (user.role || '').toUpperCase();

      // SuperAdmin and Admin roles bypass all role and permission checks
      if (userRole === 'SUPERADMIN' || userRole === 'ADMIN' || userRole === 'TENANT_ADMIN') {
        return next();
      }

      // Check role if roles are specified
      if (allowedRoles.length > 0) {
        const normalizedAllowedRoles = allowedRoles.map(r => r.toUpperCase());

        // Check if user has required role
        const hasRole = normalizedAllowedRoles.includes(userRole);

        if (!hasRole) {
          return res.status(403).json(
            buildErrorBody({
              code: 'INSUFFICIENT_ROLE',
              message: 'Access denied. Insufficient role privileges.',
              extra: { required: allowedRoles, current: user.role }
            })
          );
        }
      }

      // Check permissions if permissions are specified
      if (allowedPermissions.length > 0) {
        const userPermissions = user.permissions || [];
        const hasPermission = allowedPermissions.some(permission =>
          userPermissions.includes(permission)
        );

        if (!hasPermission) {
          return res.status(403).json(
            buildErrorBody({
              code: 'INSUFFICIENT_PERMISSION',
              message: 'Access denied. Insufficient permissions.',
              extra: { required: allowedPermissions, current: userPermissions }
            })
          );
        }
      }

      next();
    } catch (error) {
      logger.error('RBAC middleware error:', error);
      return res.status(500).json(buildErrorBody({ code: 'INTERNAL_ERROR' }));
    }
  };
};

module.exports = { requireRole };

