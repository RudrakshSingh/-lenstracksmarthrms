const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/jwt');
const logger = require('../config/logger');

/**
 * Authentication middleware
 * Extracts JWT token and validates it
 */
const authenticate = async (req, res, next) => {
  try {
    // TEST_MODE: Allow requests without authentication for testing
    if (process.env.TEST_MODE === 'true') {
      req.user = {
        id: 'test-user-id',
        tenant_id: 'test-tenant-id',
        org_node_id: 'test-org-node-id',
        role: 'EMPLOYEE',
        permissions: []
      };
      return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
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
    // Expected format: { sub: employee_id, tid: tenant_id, oid: org_node_id, rol: role, perms: permissions[] }
    req.user = {
      id: decoded.sub || decoded.userId || decoded.id,
      tenant_id: decoded.tid || decoded.tenant_id,
      org_node_id: decoded.oid || decoded.org_node_id,
      role: decoded.rol || decoded.role,
      permissions: decoded.perms || decoded.permissions || []
    };

    next();
  } catch (error) {
    logger.error('Authentication error', { error: error.message });
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_FAILED'
    });
  }
};

module.exports = { authenticate };

