/**
 * Role-Based Access Control middleware
 */

/**
 * Check if user has required role
 * @param {Array} allowedRoles - Array of allowed roles
 * @param {Array} allowedPermissions - Array of allowed permissions
 */
const requireRole = (allowedRoles = [], allowedPermissions = []) => {
  return (req, res, next) => {
    try {
      // Mock RBAC middleware - in production, this would check user roles
      const user = req.user || {
        id: 'mock-user-id',
        role: 'admin',
        permissions: ['read', 'write', 'delete']
      };

      // Check role
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient role privileges.'
        });
      }

      // Check permissions
      if (allowedPermissions.length > 0) {
        const hasPermission = allowedPermissions.some(permission => 
          user.permissions.includes(permission)
        );
        
        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. Insufficient permissions.'
          });
        }
      }

      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

/**
 * Check if user has specific permission
 * @param {string} permission - Required permission
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    try {
      const user = req.user || {
        id: 'mock-user-id',
        role: 'admin',
        permissions: ['read', 'write', 'delete']
      };

      if (!user.permissions.includes(permission)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required permission: ${permission}`
        });
      }

      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
};

module.exports = { requireRole, requirePermission };

