const logger = require('../config/logger');

/**
 * Role-based access control middleware
 * Checks if user has required role or permission
 */
const requireRole = (roles = [], permissions = []) => {
  return (req, res, next) => {
    try {
      // Allow if no restrictions
      if (roles.length === 0 && permissions.length === 0) {
        return next();
      }

      // Check if user exists (should be set by authenticate middleware)
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Check role
      if (roles.length > 0) {
        const userRole = req.user.role?.toUpperCase();
        const allowedRoles = roles.map(r => r.toUpperCase());
        
        if (!allowedRoles.includes(userRole)) {
          logger.warn('Access denied - insufficient role', {
            userId: req.user.id,
            userRole: req.user.role,
            requiredRoles: roles
          });
          
          return res.status(403).json({
            success: false,
            message: 'Access denied. Insufficient permissions.',
            code: 'FORBIDDEN',
            required: roles
          });
        }
      }

      // Check permissions
      if (permissions.length > 0) {
        const userRole = req.user.role?.toUpperCase();
        // SuperAdmin and Admin bypass all permission checks
        if (userRole === 'SUPERADMIN' || userRole === 'ADMIN') {
          return next();
        }
        
        const userPermissions = req.user.permissions || [];
        const hasPermission = permissions.some(p => userPermissions.includes(p));
        
        if (!hasPermission) {
          logger.warn('Access denied - insufficient permissions', {
            userId: req.user.id,
            userPermissions,
            requiredPermissions: permissions
          });
          
          return res.status(403).json({
            success: false,
            message: 'Access denied. Required permissions not found.',
            code: 'FORBIDDEN',
            required: permissions
          });
        }
      }

      next();
    } catch (error) {
      logger.error('RBAC middleware error', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Authorization check failed',
        code: 'RBAC_ERROR'
      });
    }
  };
};

/**
 * Check specific permission
 */
const requirePermission = (permission) => {
  return requireRole([], [permission]);
};

module.exports = {
  requireRole,
  requirePermission
};

