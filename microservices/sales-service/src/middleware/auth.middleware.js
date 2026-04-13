const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

/**
 * Authentication middleware
 * Returns 401 (not 404) when authentication fails
 */
const authenticate = async (req, res, next) => {
  try {
    // TEST_MODE: Allow requests without authentication for testing
    if (process.env.TEST_MODE === 'true') {
      // If token is provided, try to validate it
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
          req.user = { 
            id: decoded.userId || decoded.id || 'test-user-id', 
            role: decoded.role || 'test-user',
            email: decoded.email || 'test@example.com'
          };
        } catch (error) {
          // Invalid token, but continue in test mode
          req.user = { id: 'test-user-id', role: 'test-user', email: 'test@example.com' };
        }
      } else {
        // No token, but allow in test mode
        req.user = { id: 'test-user-id', role: 'test-user', email: 'test@example.com' };
      }
      return next();
    }

    // PRODUCTION MODE: Require authentication
    const authHeader = req.headers.authorization;
    
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

    // Enhanced JWT verification with multiple secret fallbacks (matching HR/Attendance services)
    let decoded;
    try {
      const jwtSecrets = [
        process.env.JWT_SECRET,
        'etelios-super-secret-jwt-key-2024', // Production secret
        'etelios-dev-secret-key-2024',       // Fallback secret
        'fallback-secret'                    // Final fallback
      ].filter(Boolean);
      
      let verified = false;
      let verificationError = null;
      
      for (const secret of jwtSecrets) {
        try {
          // Try with issuer/audience validation first
          try {
            decoded = jwt.verify(token, secret, {
              issuer: 'hrms-backend',
              audience: 'hrms-frontend'
            });
          } catch (issuerError) {
            // If issuer/audience fails, try without validation (for compatibility)
            decoded = jwt.verify(token, secret);
          }
          verified = true;
          logger.debug('JWT verification successful', {
            userId: decoded.userId || decoded.id,
            email: decoded.email,
            role: decoded.role,
            tenantId: decoded.tenantId,
            secretUsed: secret.substring(0, 10) + '...'
          });
          break;
        } catch (err) {
          verificationError = err;
          logger.debug(`JWT verification failed with secret: ${secret.substring(0, 5)}...`, { 
            error: err.message 
          });
        }
      }
      
      if (!verified) {
        if (verificationError?.name === 'JsonWebTokenError') {
          return res.status(401).json({
            success: false,
            message: 'Invalid token',
            code: 'INVALID_TOKEN'
          });
        }
        
        if (verificationError?.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            message: 'Token expired',
            code: 'TOKEN_EXPIRED'
          });
        }
        
        return res.status(401).json({
          success: false,
          message: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }
    } catch (error) {
      logger.error('JWT verification error', { error: error.message });
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }

    // Use token data directly (sales-service doesn't need User model lookup)
    req.user = {
      id: decoded.userId || decoded.id || 'unknown',
      userId: decoded.userId || decoded.id,
      employee_id: decoded.employee_id || decoded.employeeId,
      role: decoded.role || 'user',
      email: decoded.email || 'unknown@example.com',
      tenantId: decoded.tenantId || 'default',
      permissions: Array.isArray(decoded.permissions) ? decoded.permissions : []
    };

    try {
      const { resolvePermissionsFromJwtOrRedis } = require('../../../shared/utils/resolvePermissionsFromJwtOrRedis');
      const { connectRedis } = require('../config/redis');
      const layer = await resolvePermissionsFromJwtOrRedis(decoded, () => connectRedis(), logger);
      if (layer.source !== 'none') {
        req.user.permissions = layer.permissions;
      }
    } catch (e) {
      logger.debug('Sales: permission cache layer skipped', { error: e.message });
    }

    next();
  } catch (error) {
    logger.error('Authentication error', { 
      error: error.message,
      stack: error.stack,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Always return 401, never 404
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_FAILED',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

module.exports = { authenticate };
