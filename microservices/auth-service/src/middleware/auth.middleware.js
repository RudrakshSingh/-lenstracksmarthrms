const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { verifyAccessToken } = require('../config/jwt');
const logger = require('../config/logger');
const { resolveEffectivePermissionsForUser } = require('../utils/effectivePermissions');

async function authenticate(req, res, next) {
  try {
    // Get token from header or cookie
    let token = null;
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    // Handle mock tokens (from mock-login-fast) - userId starts with "mock_"
    if (decoded.userId && typeof decoded.userId === 'string' && decoded.userId.startsWith('mock_')) {
      // Extract role and employeeId from userId format: "mock_{role}_{employeeId}"
      const parts = decoded.userId.split('_');
      const mockRole = decoded.role || (parts.length > 1 ? parts[1] : 'employee');
      const mockEmployeeId = parts.length > 2 ? parts[2] : 'MOCK001';
      const mockName = `Mock ${mockRole.toUpperCase()} User`;
      const mockEmail = `mock.${mockRole}@etelios.com`;
      
      // For mock tokens, create a mock user object without database lookup
      req.user = {
        _id: decoded.userId,
        id: decoded.userId,
        employee_id: mockEmployeeId,
        name: mockName,
        email: mockEmail,
        role: mockRole,
        status: 'active',
        stores: [],
        reporting_manager: null,
        permissions: [],
        isMock: true
      };
      return next();
    }

    // For real tokens, get user from database
    // Check if userId is a valid MongoDB ObjectId
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(decoded.userId)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    const user = await User.findById(decoded.userId)
      .populate('stores', 'name code store_id')
      .populate('reporting_manager', 'name employee_id');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is active
    if (!user.is_active || user.status === 'inactive') {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    let effectivePermissions = [];
    try {
      const resolved = await resolveEffectivePermissionsForUser(user);
      effectivePermissions = resolved.effectivePermissions || [];
    } catch (permErr) {
      logger.warn('Effective permissions resolution failed, falling back to stored permissions', {
        error: permErr.message,
        userId: user._id
      });
      effectivePermissions = user.permissions || [];
    }

    // Attach user to request (permissions = effective set for RBAC)
    req.user = {
      _id: user._id,
      id: user._id,
      employee_id: user.employee_id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      tenantId: user.tenantId,
      stores: user.stores,
      reporting_manager: user.reporting_manager,
      permissions: effectivePermissions,
      permissionOverrides: {
        custom_permissions: user.custom_permissions || [],
        permission_denials: user.permission_denials || []
      }
    };

    next();

  } catch (error) {
    logger.error('Authentication error', { 
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
}

async function optionalAuthenticate(req, res, next) {
  try {
    let token = null;
    
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId)
        .populate('stores', 'name code store_id')
        .populate('reporting_manager', 'name employee_id');

      if (user && user.is_active && user.status !== 'inactive') {
        let effectivePermissions = [];
        try {
          const resolved = await resolveEffectivePermissionsForUser(user);
          effectivePermissions = resolved.effectivePermissions || [];
        } catch {
          effectivePermissions = user.permissions || [];
        }
        req.user = {
          id: user._id,
          employee_id: user.employee_id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          tenantId: user.tenantId,
          stores: user.stores,
          reporting_manager: user.reporting_manager,
          permissions: effectivePermissions,
          permissionOverrides: {
            custom_permissions: user.custom_permissions || [],
            permission_denials: user.permission_denials || []
          }
        };
      }
    }

    next();

  } catch (error) {
    // For optional auth, we don't fail on token errors
    logger.warn('Optional authentication error', { 
      error: error.message,
      ip: req.ip
    });
    next();
  }
}

module.exports = {
  authenticate,
  optionalAuthenticate
};