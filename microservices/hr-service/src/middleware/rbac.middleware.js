const logger = require('../config/logger');

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
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Check role if roles are specified
      if (allowedRoles.length > 0) {
        const userRole = (user.role || '').toLowerCase();
        const normalizedAllowedRoles = allowedRoles.map(r => r.toLowerCase());
        
        // Check if user has required role
        const hasRole = normalizedAllowedRoles.some(role => 
          userRole === role || 
          userRole === 'admin' || 
          userRole === 'superadmin' ||
          // Also check for HR variations
          (role === 'hr' && userRole === 'hr') ||
          (role === 'manager' && userRole === 'manager')
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

      // Check permissions if permissions are specified
      if (allowedPermissions.length > 0) {
        const userPermissions = user.permissions || [];
        const hasPermission = allowedPermissions.some(permission =>
          userPermissions.includes(permission) ||
          userPermissions.includes('*') // Admin has all permissions
        );

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. Insufficient permissions.',
            required: allowedPermissions
          });
        }
      }

      next();
    } catch (error) {
      logger.error('RBAC middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

/**
 * Require specific permission
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      // In TEST_MODE, allow all
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

      next();
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

