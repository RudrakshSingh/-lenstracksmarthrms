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
          const tenantFromToken = decoded.tenantId || decoded.tenant_id || decoded.tid || decoded.tenant;
          req.user = { 
            id: decoded.userId || decoded.id || 'test-user-id', 
            role: decoded.role || 'test-user',
            email: decoded.email || 'test@example.com',
            tenantId: tenantFromToken || 'default'
          };
        } catch (error) {
          // Invalid token, but continue in test mode
          req.user = { id: 'test-user-id', role: 'test-user', email: 'test@example.com', tenantId: 'default' };
        }
      } else {
        // No token, but allow in test mode
        req.user = { id: 'test-user-id', role: 'test-user', email: 'test@example.com', tenantId: 'default' };
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

    // Enhanced JWT verification with multiple secret fallbacks (matching auth-service)
    let decoded;
    try {
      // CRITICAL: Match auth-service JWT secrets exactly
      const jwtSecrets = [
        process.env.JWT_SECRET,
        'etelios-dev-secret-key-2024',       // Auth-service default fallback
        'etelios-super-secret-jwt-key-2024', // Production secret
        'etelios-refresh-secret-key-2024',   // Refresh secret (might be used)
        'fallback-secret'                    // Final fallback
      ].filter(Boolean);
      
      let verified = false;
      let verificationError = null;
      
      for (const secret of jwtSecrets) {
        try {
          // CRITICAL: Try without issuer/audience first (more lenient)
          // Auth-service tokens might not always have these claims
          try {
            decoded = jwt.verify(token, secret);
            verified = true;
            logger.debug('JWT verification successful (no issuer/audience)', {
              userId: decoded.userId || decoded.id,
              email: decoded.email,
              role: decoded.role,
              tenantId: decoded.tenantId,
              secretUsed: secret.substring(0, 10) + '...'
            });
            break;
          } catch (noIssuerError) {
            // If that fails, try with issuer/audience validation
            try {
              decoded = jwt.verify(token, secret, {
                issuer: 'hrms-backend',
                audience: 'hrms-frontend'
              });
              verified = true;
              logger.debug('JWT verification successful (with issuer/audience)', {
                userId: decoded.userId || decoded.id,
                email: decoded.email,
                role: decoded.role,
                tenantId: decoded.tenantId,
                secretUsed: secret.substring(0, 10) + '...'
              });
              break;
            } catch (issuerError) {
              // Both failed, continue to next secret
              verificationError = issuerError;
              logger.debug(`JWT verification failed with secret: ${secret.substring(0, 5)}...`, { 
                error: issuerError.message,
                noIssuerError: noIssuerError.message
              });
            }
          }
        } catch (err) {
          verificationError = err;
          logger.debug(`JWT verification failed with secret: ${secret.substring(0, 5)}...`, { 
            error: err.message 
          });
        }
      }
      
      if (!verified) {
        // Log detailed error for debugging
        logger.error('JWT verification failed with all secrets', {
          tokenPreview: token.substring(0, 20) + '...',
          error: verificationError?.message,
          errorName: verificationError?.name,
          secretsTried: jwtSecrets.length
        });
        
        if (verificationError?.name === 'JsonWebTokenError') {
          return res.status(401).json({
            success: false,
            message: 'Invalid token',
            code: 'INVALID_TOKEN',
            hint: 'Token signature verification failed. Ensure JWT_SECRET matches auth-service.'
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
          message: 'Token verification failed',
          code: 'TOKEN_VERIFICATION_FAILED'
        });
      }
    } catch (error) {
      logger.error('JWT verification error', { error: error.message });
      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
        code: 'AUTH_FAILED'
      });
    }

    // Get user from database (if User model exists)
    // Note: User may exist in auth-db but not in attendance-db
    // So we use token data as fallback to avoid "User not found" errors
    try {
      const User = require('../models/User.model');
      const user = await User.findById(decoded.userId || decoded.id);
      
      if (user) {
        // User exists in attendance-db, use it
        if (!user.is_active && user.status !== 'active') {
          return res.status(401).json({
            success: false,
            message: 'Account is inactive',
            code: 'ACCOUNT_INACTIVE'
          });
        }

        const tenantFromToken = decoded.tenantId || decoded.tenant_id || decoded.tid || decoded.tenant;
        req.user = {
          _id: user._id,
          id: user._id,
          userId: user._id,
          employee_id: user.employee_id,
          employeeId: user.employee_id,
          name: user.name,
          email: user.email,
          role: user.role || decoded.role,
          status: user.status,
          // CRITICAL: Always use token's tenantId (most accurate, matches auth-service)
          tenantId: tenantFromToken || user.tenantId || user.tenant_id || 'default'
        };
      } else {
        // User not found in attendance-db, use token data (user exists in auth-db)
        const tenantFromToken = decoded.tenantId || decoded.tenant_id || decoded.tid || decoded.tenant;
        req.user = {
          _id: decoded.userId || decoded.id || 'unknown',
          id: decoded.userId || decoded.id || 'unknown',
          userId: decoded.userId || decoded.id,
          employee_id: decoded.employee_id || decoded.employeeId || null,
          employeeId: decoded.employee_id || decoded.employeeId || null,
          name: decoded.name || 'Unknown User',
          email: decoded.email || 'unknown@example.com',
          role: decoded.role || 'user',
          status: 'active', // Assume active if not in attendance-db
          // CRITICAL: Always use token's tenantId (most accurate, matches auth-service)
          tenantId: tenantFromToken || 'default'
        };
      }
    } catch (dbError) {
      // If User model doesn't exist or DB lookup fails, use token data
      logger.warn('User lookup failed in attendance-db, using token data', {
        userId: decoded.userId,
        error: dbError.message
      });
      // CRITICAL: Extract employee_id from token - auth-service might not include it
      // Try to get it from token claims or use userId as fallback
      let employeeId = decoded.employee_id || decoded.employeeId;
      if (!employeeId && decoded.userId) {
        // If employee_id not in token, we'll need to look it up from HR service
        // But for now, set a placeholder that will trigger lookup
        employeeId = null; // Will be looked up from HR service
      }
      
      const tenantFromToken = decoded.tenantId || decoded.tenant_id || decoded.tid || decoded.tenant;
      req.user = {
        _id: decoded.userId || decoded.id || 'unknown',
        id: decoded.userId || decoded.id || 'unknown',
        userId: decoded.userId || decoded.id,
        employee_id: employeeId, // May be null, will be looked up
        employeeId: employeeId, // May be null, will be looked up
        name: decoded.name || 'Unknown User',
        email: decoded.email || 'unknown@example.com',
        role: decoded.role || 'user',
        status: 'active',
        // CRITICAL: Always use token's tenantId (most accurate, matches auth-service)
        tenantId: tenantFromToken || 'default'
      };
    }

    if (req.user && req.user.permissions == null) {
      req.user.permissions = [];
    }

    try {
      const uid = decoded.userId || decoded.id;
      if (uid && req.user) {
        const permRev = decoded.permRev != null ? decoded.permRev : 0;
        const { connectRedis } = require('../config/redis');
        const { userEffectiveKey } = require('../../../shared/utils/permissionCacheKeys');
        const r = connectRedis();
        const raw = await r.get(userEffectiveKey(uid, permRev));
        let fromRedis = false;
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            req.user.permissions = list;
            fromRedis = true;
          }
        }
        // Redis TTL miss or cold path: auth-service puts effective permissions on JWT (same formula as permRev)
        if (!fromRedis && Array.isArray(decoded.permissions)) {
          req.user.permissions = decoded.permissions;
        }
      }
    } catch (permCacheErr) {
      logger.debug('Attendance: permission Redis cache unavailable', {
        error: permCacheErr.message
      });
      if (Array.isArray(decoded.permissions) && req.user) {
        req.user.permissions = decoded.permissions;
      }
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
