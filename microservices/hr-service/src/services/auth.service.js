const User = require('../models/User.model');
const Role = require('../models/Role.model');
const { generateAccessToken, generateRefreshToken } = require('../config/jwt');
const auditUtils = require('../utils/audit');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

// Use logAuthEvent for audit logging
const { logAuthEvent } = auditUtils;

/**
 * Login service with RBAC
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {boolean} rememberMe - Remember me flag (affects token expiry)
 * @returns {Promise<Object>} Login response with tokens and user info
 */
const login = async (email, password, rememberMe = false) => {
  try {
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() })
      .populate('role', 'name display_name permissions')
      .select('+password');

    if (!user) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Check if account is blocked/suspended
    if (user.isDeleted) {
      throw new ApiError(httpStatus.FORBIDDEN, 'ACCOUNT_BLOCKED', 'Account has been deleted');
    }

    // Check if user is active (allow pending status for newly registered users)
    if (user.status === 'terminated' || (user.status !== 'active' && user.status !== 'pending' && !user.is_active)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'ACCOUNT_BLOCKED', 'Account is inactive or suspended');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Log failed login attempt
      logger.warn('Failed login attempt', { email, userId: user._id });
      throw new ApiError(httpStatus.UNAUTHORIZED, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Get role information
    let roleData = null;
    if (user.role) {
      if (typeof user.role === 'object') {
        roleData = {
          id: user.role._id,
          name: user.role.name,
          displayName: user.role.display_name,
          permissions: user.role.permissions || []
        };
      } else {
        // If role is just an ID, fetch it
        const role = await Role.findById(user.role);
        if (role) {
          roleData = {
            id: role._id,
            name: role.name,
            displayName: role.display_name,
            permissions: role.permissions || []
          };
        }
      }
    }

    // Generate tokens
    const tokenPayload = {
      userId: user._id.toString(),
      id: user._id.toString(),
      email: user.email,
      role: roleData?.name || 'employee',
      employeeId: user.employeeId,
      permissions: roleData?.permissions || []
    };

    // Generate tokens with appropriate expiry based on rememberMe
    const accessTokenExpiry = '1h'; // 1 hour (3600 seconds)
    const refreshTokenExpiry = rememberMe ? '30d' : '1d'; // 30 days if rememberMe, else 1 day
    
    const accessToken = generateAccessToken(tokenPayload, accessTokenExpiry);
    const refreshToken = generateRefreshToken({ userId: user._id.toString() }, refreshTokenExpiry);

    // Save refresh token and update last login
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    try {
      await user.save({ validateBeforeSave: false });
      logger.info('User tokens saved', { userId: user._id, rememberMe });
    } catch (saveError) {
      logger.error('Failed to save refresh token', { error: saveError.message, userId: user._id });
      // Don't throw error, token generation was successful
    }

    // Record audit log
    try {
      if (logAuthEvent) {
        logAuthEvent('login', user._id.toString(), {
          email: user.email,
          role: roleData?.name
        });
      }
    } catch (auditError) {
      logger.warn('Failed to record audit log', { error: auditError.message });
    }

    logger.info('User logged in successfully', {
      userId: user._id,
      email: user.email,
      role: roleData?.name
    });

    // Determine redirect URL based on role (mapped to frontend spec)
    const redirectUrl = getRedirectUrlForRole(roleData?.name || 'employee');

    // Get tenantId from store if available
    let tenantId = null;
    if (user.store) {
      if (typeof user.store === 'object') {
        tenantId = user.store._id?.toString() || user.store.id;
      } else {
        tenantId = user.store.toString();
      }
    }

    // Format response according to frontend spec
    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim() || user.email,
        role: roleData?.name || 'employee',
        permissions: roleData?.permissions || [],
        tenantId: tenantId
      },
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresIn: 3600 // 1 hour in seconds
    };
  } catch (error) {
    logger.error('Login error', { error: error.message, email });
    throw error;
  }
};

/**
 * Get redirect URL based on user role
 * @param {string} roleName - User role name
 * @returns {string} Redirect URL
 */
const getRedirectUrlForRole = (roleName) => {
  const role = roleName?.toLowerCase() || 'employee';
  // Use Azure frontend URL if available, otherwise use CORS origin or default
  const baseUrl = process.env.FRONTEND_URL || 
                  process.env.AZURE_FRONTEND_URL ||
                  process.env.CORS_ORIGIN || 
                  'http://localhost:3000';
  
  // Map roles according to frontend spec
  const roleRoutes = {
    'superadmin': '/admin/super-admin',
    'super-admin': '/admin/super-admin',
    'admin': '/tenant-admin',
    'tenant-admin': '/tenant-admin',
    'hr': '/dashboard/hr-head',
    'hr-head': '/dashboard/hr-head',
    'manager': '/dashboard',
    'employee': '/employee-dashboard',
    'accountant': '/dashboard'
  };

  return `${baseUrl}${roleRoutes[role] || '/dashboard'}`;
};

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object>} New access token
 */
const refreshAccessToken = async (refreshToken) => {
  try {
    const { verifyRefreshToken, generateAccessToken } = require('../config/jwt');
    
    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
      if (!decoded || !decoded.userId) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'Invalid refresh token payload');
      }
    } catch (error) {
      // If it's already an ApiError, re-throw it
      if (error instanceof ApiError) {
        throw error;
      }
      // Otherwise, wrap it with proper error code
      throw new ApiError(httpStatus.UNAUTHORIZED, 'UNAUTHORIZED', error.message || 'Invalid or expired refresh token');
    }
    
    // Find user (need to select refreshToken field)
    const user = await User.findById(decoded.userId)
      .populate('role', 'name permissions')
      .select('+refreshToken');
    
    if (!user) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'User not found');
    }

    if (!user.is_active || (user.status !== 'active' && user.status !== 'pending')) {
      throw new ApiError(httpStatus.FORBIDDEN, 'ACCOUNT_BLOCKED', 'Account is inactive');
    }

    // Verify refresh token matches (if stored)
    if (user.refreshToken && user.refreshToken !== refreshToken) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'Invalid refresh token');
    }

    // Get role data
    let roleData = null;
    if (user.role) {
      if (typeof user.role === 'object') {
        roleData = {
          name: user.role.name,
          permissions: user.role.permissions || []
        };
      } else {
        const role = await Role.findById(user.role);
        if (role) {
          roleData = {
            name: role.name,
            permissions: role.permissions || []
          };
        }
      }
    }

    // Generate new access token
    const tokenPayload = {
      userId: user._id.toString(),
      id: user._id.toString(),
      email: user.email,
      role: roleData?.name || 'employee',
      employeeId: user.employeeId,
      permissions: roleData?.permissions || []
    };

    const accessToken = generateAccessToken(tokenPayload, '1h');

    // Return expiresIn in seconds (1 hour = 3600 seconds)
    return {
      accessToken,
      expiresIn: 3600
    };
  } catch (error) {
    logger.error('Refresh token error', { error: error.message });
    throw error;
  }
};

/**
 * Logout service
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
const logout = async (userId) => {
  try {
    // Validate ObjectId
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      logger.warn('Invalid user ID for logout', { userId });
      return; // Silently return if invalid ID
    }
    
    const user = await User.findById(userId);
    if (user) {
      user.refreshToken = null;
      await user.save({ validateBeforeSave: false });

      try {
        if (logAuthEvent) {
          logAuthEvent('logout', userId, {
            email: user.email
          });
        }
      } catch (auditError) {
        logger.warn('Failed to record audit log', { error: auditError.message });
      }

      logger.info('User logged out', { userId, email: user.email });
    }
  } catch (error) {
    logger.error('Logout error', { error: error.message, userId });
    throw error;
  }
};

module.exports = {
  login,
  refreshAccessToken,
  logout,
  getRedirectUrlForRole
};

