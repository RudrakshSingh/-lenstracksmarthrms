const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { verifyAccessToken } = require('../config/jwt');
const logger = require('../config/logger');

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

    // Get user from database
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

    // Attach user to request
    req.user = {
      _id: user._id,
      id: user._id,
      employee_id: user.employee_id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      stores: user.stores,
      reporting_manager: user.reporting_manager,
      permissions: user.permissions
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
        req.user = {
          id: user._id,
          employee_id: user.employee_id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          stores: user.stores,
          reporting_manager: user.reporting_manager,
          permissions: user.permissions
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