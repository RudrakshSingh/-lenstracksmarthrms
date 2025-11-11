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

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
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
      const user = await User.findById(decoded.userId || decoded.id);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      if (!user.is_active && user.status !== 'active') {
        return res.status(401).json({
          success: false,
          message: 'Account is inactive',
          code: 'ACCOUNT_INACTIVE'
        });
      }

      req.user = {
        id: user._id,
        userId: user._id,
        employee_id: user.employee_id,
        name: user.name,
        email: user.email,
        role: user.role || decoded.role,
        status: user.status
      };
    } catch (dbError) {
      // If User model doesn't exist or DB lookup fails, use token data
      req.user = {
        id: decoded.userId || decoded.id || 'unknown',
        userId: decoded.userId || decoded.id,
        role: decoded.role || 'user',
        email: decoded.email || 'unknown@example.com'
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
