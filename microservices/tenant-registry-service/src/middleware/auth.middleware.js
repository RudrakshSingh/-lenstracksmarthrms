const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Authentication middleware
 * Validates JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // TEST_MODE: Allow requests without authentication for testing
    if (process.env.TEST_MODE === 'true') {
      req.user = {
        id: 'test-user-id',
        role: 'superadmin',
        email: 'test@example.com'
      };
      return next();
    }

    const authHeader = req.headers.authorization || req.headers.Authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        hint: 'Include Authorization header: Bearer <token>',
        code: 'AUTH_REQUIRED'
      });
    }

    const token = authHeader.substring(7);
    
    if (!token || token.trim() === '') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format',
        code: 'INVALID_TOKEN'
      });
    }

    // Verify token
    let decoded;
    try {
      // Keep fallback consistent with auth-service default to make local dev work even without .env
      // auth-service default: 'etelios-dev-secret-key-2024'
      const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || 'etelios-dev-secret-key-2024';
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
          code: 'TOKEN_EXPIRED'
        });
      }

      throw error;
    }

    // Extract user info from JWT payload
    req.user = {
      id: decoded.userId || decoded.id || decoded.sub,
      role: decoded.role || 'user',
      email: decoded.email || '',
      permissions: Array.isArray(decoded.permissions) ? decoded.permissions : [],
      tenantId: decoded.tenantId || decoded.tenant_id // ✅ Extract tenantId from token
    };

    const { enrichReqUserPermissionsFromJwtRedis } = require('../../../shared/middleware/enrichReqUserPermissionsFromJwtRedis');
    await enrichReqUserPermissionsFromJwtRedis(req, decoded, () => null, logger);

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Role-based access control middleware
 * @param {string|string[]} allowedRoles - Role(s) allowed to access
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role?.toLowerCase();
    const roles = Array.isArray(allowedRoles) ? allowedRoles.map(r => r.toLowerCase()) : [allowedRoles.toLowerCase()];

    // Superadmin and admin have all access
    if (userRole === 'superadmin' || userRole === 'admin' || userRole === 'super-admin') {
      return next();
    }

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: roles,
        current: userRole
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  requireRole
};

