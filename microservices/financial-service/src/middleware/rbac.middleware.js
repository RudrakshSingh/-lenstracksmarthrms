const logger = require('../config/logger');

/**
 * RBAC Middleware - Role-Based Access Control
 */

const requireRole = (allowedRoles = [], allowedPermissions = []) => {
  return (req, res, next) => {
    try {
      if (process.env.TEST_MODE === 'true') {
        return next();
      }

      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (allowedRoles.length > 0) {
        const userRole = (user.role || '').toLowerCase().replace(/-/g, '');
        const normalizedAllowedRoles = allowedRoles.map((r) => r.toLowerCase().replace(/-/g, ''));

        if (userRole === 'superadmin' || userRole === 'admin') {
          return next();
        }

        const hasRole = normalizedAllowedRoles.some((role) =>
          userRole === role ||
          (role === 'hr' && userRole === 'hr') ||
          (role === 'manager' && userRole === 'manager') ||
          (role === 'finance' && userRole === 'finance') ||
          (role === 'accountant' && userRole === 'accountant')
        );

        if (!hasRole) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. Insufficient role privileges.',
            required: allowedRoles,
            current: user.role,
            code: 'INSUFFICIENT_ROLE'
          });
        }
      }

      if (allowedPermissions.length > 0) {
        const userRole = (user.role || '').toLowerCase();
        const userPermissions = user.permissions || [];

        if (userRole === 'superadmin' || userRole === 'admin') {
          return next();
        }

        const hasPermission = allowedPermissions.some((permission) =>
          userPermissions.includes(permission) || userPermissions.includes('*')
        );

        if (!hasPermission) {
          logger.warn('Permission denied', {
            userId: user.id,
            role: user.role,
            required: allowedPermissions,
            has: userPermissions
          });
          return res.status(403).json({
            success: false,
            message: 'Access denied. Insufficient permissions.',
            required: allowedPermissions,
            current: userPermissions
          });
        }
      }

      return next();
    } catch (error) {
      logger.error('RBAC middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      if (process.env.TEST_MODE === 'true') {
        return next();
      }

      const user = req.user;
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userPermissions = user.permissions || [];
      const hasPermission = userPermissions.includes(permission) ||
        userPermissions.includes('*') ||
        (user.role && (user.role.toLowerCase() === 'admin' || user.role.toLowerCase() === 'superadmin'));

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required permission: ${permission}`
        });
      }

      return next();
    } catch (error) {
      logger.error('Permission middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

module.exports = { requireRole, requirePermission };
