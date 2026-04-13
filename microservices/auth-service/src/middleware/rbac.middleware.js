const Role = require('../models/Role.model');
const logger = require('../config/logger');
const permissionMetrics = require('../utils/permissionMetrics');

// Check if user has required role
function requireRole(roles) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRole = req.user.role;
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      const allowedLower = new Set(
        allowedRoles.map((r) => String(r).toLowerCase())
      );
      const userRoleLower = String(userRole || '').toLowerCase();

      // Admin and superadmin have access to all roles
      if (userRoleLower === 'admin' || userRoleLower === 'superadmin') {
        next();
        return;
      }

      if (!allowedLower.has(userRoleLower)) {
        logger.warn('Access denied - insufficient role', {
          userId: req.user.id,
          userRole,
          requiredRoles: [...allowedLower],
          path: req.originalUrl
        });

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();

    } catch (error) {
      logger.error('RBAC error', { 
        error: error.message,
        userId: req.user?.id,
        path: req.originalUrl
      });

      return res.status(500).json({
        success: false,
        message: 'Permission check failed'
      });
    }
  };
}

// Check if user has required permission
function requirePermission(permissions) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRole = String(req.user.role || '').toLowerCase();
      const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];

      // Admin and superadmin have all permissions
      if (userRole === 'admin' || userRole === 'superadmin') {
        next();
        return;
      }

      // Check user's direct permissions first
      permissionMetrics.inc('rbacPermissionChecks');
      const userPermissions = req.user.permissions || [];
      const hasUserPermission = requiredPermissions.every((permission) =>
        userPermissions.includes(permission)
      );

      if (hasUserPermission) {
        next();
        return;
      }

      // Fallback to role permissions from database
      const role = await Role.findOne({ name: userRole });
      if (!role) {
        permissionMetrics.inc('rbacPermissionDenied');
        return res.status(403).json({
          success: false,
          message: 'Role not found'
        });
      }

      const hasPermission = requiredPermissions.every((permission) =>
        role.permissions.includes(permission)
      );

      if (!hasPermission) {
        permissionMetrics.inc('rbacPermissionDenied');
        logger.warn('Access denied - insufficient permissions', {
          userId: req.user.id,
          userRole,
          requiredPermissions,
          userPermissions: role.permissions,
          path: req.originalUrl,
          metrics: permissionMetrics.snapshot()
        });

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();

    } catch (error) {
      logger.error('Permission check error', { 
        error: error.message,
        userId: req.user?.id,
        path: req.originalUrl
      });

      return res.status(500).json({
        success: false,
        message: 'Permission check failed'
      });
    }
  };
}

// Check if user can access specific resource (e.g., own data or subordinate's data)
function requireResourceAccess(resourceType) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userId = req.user.id;
      const userRole = req.user.role;
      const resourceId = req.params.id || req.params.userId;

      // SuperAdmin, Admin and HR can access all resources
      if (['superadmin', 'admin', 'hr'].includes(userRole)) {
        return next();
      }

      // Manager can access their subordinates' resources
      if (userRole === 'manager') {
        // This would need to be implemented based on your hierarchy logic
        // For now, allowing managers to access any resource
        // You might want to add a check here to verify if the resource belongs to their subordinates
        return next();
      }

      // Regular employees can only access their own resources
      if (resourceId && resourceId !== userId) {
        logger.warn('Access denied - resource access violation', {
          userId,
          userRole,
          resourceId,
          resourceType,
          path: req.originalUrl
        });

        return res.status(403).json({
          success: false,
          message: 'Access denied to this resource'
        });
      }

      next();

    } catch (error) {
      logger.error('Resource access check error', { 
        error: error.message,
        userId: req.user?.id,
        path: req.originalUrl
      });

      return res.status(500).json({
        success: false,
        message: 'Resource access check failed'
      });
    }
  };
}

// Check if user can access store-specific resources
function requireStoreAccess() {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRole = req.user.role;
      const userStores = req.user.stores || [];
      const requestedStoreId = req.params.storeId || req.body.store_id;

      // SuperAdmin and Admin can access all stores
      if (['superadmin', 'admin'].includes(userRole)) {
        return next();
      }

      // If no specific store is requested, allow access
      if (!requestedStoreId) {
        return next();
      }

      // Check if user has access to the requested store
      const hasStoreAccess = userStores.some(store => 
        store._id.toString() === requestedStoreId || 
        store.store_id === requestedStoreId
      );

      if (!hasStoreAccess) {
        logger.warn('Access denied - store access violation', {
          userId: req.user.id,
          userRole,
          userStores: userStores.map(s => s._id),
          requestedStoreId,
          path: req.originalUrl
        });

        return res.status(403).json({
          success: false,
          message: 'Access denied to this store'
        });
      }

      next();

    } catch (error) {
      logger.error('Store access check error', { 
        error: error.message,
        userId: req.user?.id,
        path: req.originalUrl
      });

      return res.status(500).json({
        success: false,
        message: 'Store access check failed'
      });
    }
  };
}

module.exports = {
  requireRole,
  requirePermission,
  requireResourceAccess,
  requireStoreAccess
};