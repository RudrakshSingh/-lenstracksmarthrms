const jwt = require('jsonwebtoken');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Access token required');
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';

    try {
      const decoded = jwt.verify(token, jwtSecret);
      
      // Attach user info to request
      req.user = {
        id: decoded.sub || decoded.userId,
        email: decoded.email,
        role: decoded.role,
        tenantId: decoded.tenantId
      };

      next();
    } catch (error) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired token');
    }
  } catch (error) {
    next(error);
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(httpStatus.FORBIDDEN, 'Insufficient permissions'));
    }

    next();
  };
};

module.exports = {
  authenticate,
  requireRole
};

