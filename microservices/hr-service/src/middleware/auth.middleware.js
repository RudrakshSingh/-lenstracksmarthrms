const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const logger = require('../config/logger');

/**
 * Authentication middleware
 * Returns 401 (not 404) when authentication fails
 */
const authenticate = async (req, res, next) => {
  try {
    // TEST_MODE: Allow requests without authentication for testing
    if (process.env.TEST_MODE === 'true') {
      // Generate a valid ObjectId for test mode
      const testObjectId = new mongoose.Types.ObjectId();
      
      // If token is provided, try to validate it
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const { JWT_SECRET } = require('../config/jwt');
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, JWT_SECRET || process.env.JWT_SECRET || 'fallback-secret');
          
          // Use decoded user ID if valid ObjectId, otherwise use test ObjectId
          let userId = testObjectId;
          if (decoded.userId || decoded.id) {
            try {
              userId = new mongoose.Types.ObjectId(decoded.userId || decoded.id);
            } catch (e) {
              // Invalid ObjectId, use test ObjectId
              userId = testObjectId;
            }
          }
          
          req.user = { 
            id: userId.toString(),
            _id: userId,
            userId: userId.toString(),
            role: decoded.role || 'employee',
            email: decoded.email || 'test@example.com',
            employeeId: decoded.employeeId || 'TEST001'
          };
        } catch (error) {
          // Invalid token, but continue in test mode with test ObjectId
          req.user = { 
            id: testObjectId.toString(),
            _id: testObjectId,
            userId: testObjectId.toString(),
            role: 'employee',
            email: 'test@example.com',
            employeeId: 'TEST001'
          };
        }
      } else {
        // No token, but allow in test mode with test ObjectId
        req.user = { 
          id: testObjectId.toString(),
          _id: testObjectId,
          userId: testObjectId.toString(),
          role: 'employee',
          email: 'test@example.com',
          employeeId: 'TEST001'
        };
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

    // Enhanced JWT verification with multiple secrets (matching attendance service)
    let decoded;
    try {
      const jwtSecrets = [
        process.env.JWT_SECRET,
        'etelios-super-secret-jwt-key-2024', // Production secret
        'etelios-dev-secret-key-2024',       // Fallback secret
        'fallback-secret'                    // Final fallback
      ].filter(Boolean);
      
      let verificationError = null;
      decoded = null;
      
      for (const secret of jwtSecrets) {
        try {
          decoded = jwt.verify(token, secret);
          logger.debug('JWT verified in HR service', { 
            secret: secret.substring(0, 10) + '...',
            userId: decoded.userId || decoded.id 
          });
          break;
        } catch (err) {
          verificationError = err;
          continue;
        }
      }
      
      if (!decoded) {
        logger.warn('JWT verification failed with all secrets in HR service', {
          tokenStart: token.substring(0, 30),
          secretsTriedCount: jwtSecrets.length
        });
        throw verificationError;
      }
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

    // Get user from database (if User model exists)
    try {
      const User = require('../models/User.model');
      
      // Add timeout for database query to prevent hanging
      const userQuery = User.findById(decoded.userId || decoded.id)
        .populate('role', 'name permissions')
        .maxTimeMS(5000);
      const user = await Promise.race([
        userQuery,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database query timeout')), 5000)
        )
      ]);
      
      if (!user) {
        // If user not found in DB, use token data but log warning
        logger.warn('User not found in database, using token data', {
          userId: decoded.userId || decoded.id,
          email: decoded.email,
          employeeId: decoded.employee_id || decoded.employeeId,
          tenantId: decoded.tenantId // Log tenantId for debugging
        });
        let fallbackPerms = decoded.permissions || [];
        try {
          const { resolvePermissionsFromJwtOrRedis } = require('../../../shared/utils/resolvePermissionsFromJwtOrRedis');
          const { connectRedis } = require('../config/redis');
          const layer = await resolvePermissionsFromJwtOrRedis(decoded, () => connectRedis(), logger);
          if (layer.source !== 'none') fallbackPerms = layer.permissions;
        } catch (_) {
          /* keep decoded.permissions */
        }
        req.user = {
          id: decoded.userId || decoded.id || 'unknown',
          userId: decoded.userId || decoded.id,
          role: decoded.role || 'user',
          email: decoded.email || 'unknown@example.com',
          permissions: fallbackPerms,
          // CRITICAL: Extract tenantId from decoded JWT token (normalize to lowercase)
          tenantId: decoded.tenantId ? String(decoded.tenantId).toLowerCase().trim() : null,
          employee_id: decoded.employee_id || decoded.employeeId || null,
          employeeId: decoded.employee_id || decoded.employeeId || null
        };
        // Log tenantId extraction for debugging
        if (decoded.tenantId) {
          logger.debug('Extracted tenantId from JWT token (user not in DB)', {
            tenantId: req.user.tenantId,
            original: decoded.tenantId
          });
        } else {
          logger.warn('JWT token missing tenantId (user not in DB)', {
            decodedKeys: Object.keys(decoded)
          });
        }
        return next();
      }

      // Allow 'pending' status for newly registered users, but reject 'terminated' or inactive
      if (user.isDeleted || (user.status === 'terminated')) {
        return res.status(403).json({
          success: false,
          message: 'Account is inactive or deleted',
          code: 'ACCOUNT_BLOCKED'
        });
      }

      // Allow 'active' and 'pending' status, but check is_active flag
      if (!user.is_active && user.status !== 'pending') {
        return res.status(401).json({
          success: false,
          message: 'Account is inactive',
          code: 'ACCOUNT_INACTIVE'
        });
      }

      let roleName = decoded.role;
      if (user.role) {
        if (typeof user.role === 'object' && user.role.name) {
          roleName = user.role.name;
        } else if (typeof user.role === 'string') {
          try {
            const Role = require('../models/Role.model');
            const role = await Role.findById(user.role).maxTimeMS(3000);
            if (role) roleName = role.name;
          } catch (roleError) {
            logger.warn('Role lookup failed, using decoded role', { error: roleError.message });
          }
        }
      }

      const { resolveEffectivePermissionsForUser } = require('../utils/effectivePermissions');
      const { resolvePermissionsFromJwtOrRedis } = require('../../../shared/utils/resolvePermissionsFromJwtOrRedis');
      const { connectRedis } = require('../config/redis');

      let effectivePermissions = [];
      try {
        const layer = await resolvePermissionsFromJwtOrRedis(decoded, () => connectRedis(), logger);
        if (layer.source !== 'none') {
          effectivePermissions = layer.permissions;
        } else {
          const resolved = await resolveEffectivePermissionsForUser(user);
          effectivePermissions = resolved.effectivePermissions || [];
        }
      } catch (permErr) {
        logger.warn('HR effective permissions resolution failed', {
          error: permErr.message,
          userId: user._id
        });
        effectivePermissions = user.permissions || [];
      }

      // CRITICAL: Extract tenantId from JWT token (preferred) or user document (fallback)
      // JWT token is source of truth for tenant context
      const tenantIdFromToken = decoded.tenantId;
      const tenantIdFromUser = user.tenantId;

      // Prefer token's tenantId (it's validated during login)
      // Fallback to user's tenantId if token doesn't have it (for backward compatibility)
      let tenantId = tenantIdFromToken || tenantIdFromUser;
      
      // CRITICAL: Normalize tenantId to lowercase (must match validateTenantMiddleware normalization)
      if (tenantId) {
        tenantId = String(tenantId).toLowerCase().trim();
      }

      if (!tenantId && roleName !== 'superadmin' && roleName !== 'super-admin') {
        logger.warn('User missing tenantId in both token and database', {
          userId: user._id,
          email: user.email,
          role: roleName,
          decodedTenantId: decoded.tenantId,
          userTenantId: user.tenantId,
          decodedKeys: Object.keys(decoded)
        });
      } else if (tenantId) {
        // Log tenantId extraction for debugging
        logger.debug('Extracted tenantId from JWT token', {
          tenantId: tenantId,
          source: tenantIdFromToken ? 'token' : 'database',
          originalTokenValue: decoded.tenantId,
          originalUserValue: user.tenantId
        });
      }

      req.user = {
        id: user._id,
        _id: user._id,
        userId: user._id,
        // CRITICAL: Use employeeId from user object OR fallback to JWT token
        employeeId: user.employeeId || user.employee_id || decoded.employee_id || decoded.employeeId || null,
        employee_id: user.employeeId || user.employee_id || decoded.employee_id || decoded.employeeId || null,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.firstName ? `${user.firstName} ${user.lastName}` : user.email,
        email: user.email,
        role: roleName,
        roleId: typeof user.role === 'object' ? user.role._id : user.role,
        permissions: effectivePermissions,
        status: user.status,
        // CRITICAL: Include normalized tenantId (lowercase, trimmed)
        tenantId: tenantId
      };
      
      // Log if we had to use JWT token for employee_id
      if (!user.employeeId && !user.employee_id && (decoded.employee_id || decoded.employeeId)) {
        logger.info('Using employee_id from JWT token (not in DB)', {
          userId: user._id,
          employeeId: decoded.employee_id || decoded.employeeId
        });
      }
    } catch (dbError) {
      // If User model doesn't exist or DB lookup fails, use token data
      logger.warn('Database lookup failed, using token data', {
        error: dbError.message,
        userId: decoded.userId || decoded.id,
        employeeId: decoded.employee_id || decoded.employeeId
      });
      
      // Don't block request if DB is down - use token data
      req.user = {
        id: decoded.userId || decoded.id || 'unknown',
        userId: decoded.userId || decoded.id,
        role: decoded.role || 'user',
        email: decoded.email || 'unknown@example.com',
        permissions: decoded.permissions || [],
        tenantId: decoded.tenantId, // ✅ CRITICAL: Extract from token
        employee_id: decoded.employee_id || decoded.employeeId || null, // ✅ CRITICAL: Extract employee_id from token
        employeeId: decoded.employee_id || decoded.employeeId || null // ✅ CRITICAL: Extract employee_id from token
      };
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
