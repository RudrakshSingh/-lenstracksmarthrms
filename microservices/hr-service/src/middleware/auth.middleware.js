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

    // Verify token
    let decoded;
    try {
      const { JWT_SECRET } = require('../config/jwt');
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

    // Get user from database (if User model exists)
    try {
      const User = require('../models/User.model');
      
      // Add timeout for database query to prevent hanging
      const userQuery = User.findById(decoded.userId || decoded.id).maxTimeMS(5000);
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
          email: decoded.email
        });
        req.user = {
          id: decoded.userId || decoded.id || 'unknown',
          userId: decoded.userId || decoded.id,
          role: decoded.role || 'user',
          email: decoded.email || 'unknown@example.com',
          permissions: decoded.permissions || []
        };
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

      // Get role name if role is populated or an ID
      let roleName = decoded.role;
      let permissions = decoded.permissions || [];
      
      if (user.role) {
        if (typeof user.role === 'object' && user.role.name) {
          roleName = user.role.name;
          permissions = user.role.permissions || permissions;
        } else if (typeof user.role === 'string') {
          // Try to populate role if it's an ID
          try {
            const Role = require('../models/Role.model');
            const role = await Role.findById(user.role).maxTimeMS(3000);
            if (role) {
              roleName = role.name;
              permissions = role.permissions || permissions;
            }
          } catch (roleError) {
            // If role lookup fails, use decoded role
            logger.warn('Role lookup failed, using decoded role', { error: roleError.message });
          }
        }
      }

      req.user = {
        id: user._id,
        _id: user._id,
        userId: user._id,
        employeeId: user.employeeId,
        employee_id: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.firstName ? `${user.firstName} ${user.lastName}` : user.email,
        email: user.email,
        role: roleName,
        roleId: typeof user.role === 'object' ? user.role._id : user.role,
        permissions: permissions,
        status: user.status
      };
    } catch (dbError) {
      // If User model doesn't exist or DB lookup fails, use token data
      logger.warn('Database lookup failed, using token data', {
        error: dbError.message,
        userId: decoded.userId || decoded.id
      });
      
      // Don't block request if DB is down - use token data
      req.user = {
        id: decoded.userId || decoded.id || 'unknown',
        userId: decoded.userId || decoded.id,
        role: decoded.role || 'user',
        email: decoded.email || 'unknown@example.com',
        permissions: decoded.permissions || []
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
