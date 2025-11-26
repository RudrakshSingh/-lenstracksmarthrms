const authService = require('../services/auth.service');
const mockLoginService = require('../services/mockLogin.service');
const logger = require('../config/logger');

/**
 * Login controller
 * @route POST /api/hr/auth/login
 * @access Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password, rememberMe = false } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Email and password are required'
      });
    }

    const result = await authService.login(email, password, rememberMe);

    // Return response in exact format as per backend documentation
    res.status(200).json({
      success: true,
      data: result,
      message: 'Login successful'
    });
  } catch (error) {
    logger.error('Login controller error', { error: error.message, email: req.body.email });
    next(error);
  }
};

/**
 * Refresh token controller
 * @route POST /api/hr/auth/refresh
 * @access Public
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Refresh token is required'
      });
    }

    const result = await authService.refreshAccessToken(refreshToken);

    // Return response in format matching backend documentation
    res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn || 3600
      }
    });
  } catch (error) {
    logger.error('Refresh token controller error', { error: error.message });
    next(error);
  }
};

/**
 * Logout controller
 * @route POST /api/hr/auth/logout
 * @access Private
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const userId = req.user?.id || req.user?._id;

    // If refreshToken is provided in body, use it; otherwise use userId from auth middleware
    if (refreshToken) {
      // Verify and get userId from refresh token
      try {
        const { verifyRefreshToken } = require('../config/jwt');
        const decoded = verifyRefreshToken(refreshToken);
        if (decoded && decoded.userId) {
          await authService.logout(decoded.userId);
        }
      } catch (tokenError) {
        // If token is invalid, still return success (idempotent logout)
        logger.warn('Invalid refresh token in logout', { error: tokenError.message });
      }
    } else if (userId) {
      await authService.logout(userId);
    }

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error('Logout controller error', { error: error.message, userId: req.user?.id });
    next(error);
  }
};

/**
 * Get current user info
 * @route GET /api/hr/auth/me
 * @access Private
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const User = require('../models/User.model');
    const Role = require('../models/Role.model');
    const mongoose = require('mongoose');

    // Get user ID from various possible fields
    let userId = req.user.id || req.user._id || req.user.userId;
    
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      // If not valid ObjectId, try to find by employeeId or email
      if (req.user.employeeId) {
        const userByEmployeeId = await User.findOne({ employeeId: req.user.employeeId });
        if (userByEmployeeId) {
          userId = userByEmployeeId._id;
        }
      } else if (req.user.email) {
        const userByEmail = await User.findOne({ email: req.user.email });
        if (userByEmail) {
          userId = userByEmail._id;
        }
      }
    }

    const user = await User.findById(userId)
      .populate('role', 'name display_name permissions')
      .populate('store', 'name code')
      .select('-password -refreshToken');

    if (!user) {
      // In TEST_MODE, return a mock user
      if (process.env.TEST_MODE === 'true') {
        return res.status(200).json({
          success: true,
          message: 'User retrieved successfully (TEST_MODE)',
          data: {
            user: {
              id: req.user.id || req.user._id,
              employeeId: req.user.employeeId || 'TEST001',
              email: req.user.email || 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              fullName: 'Test User',
              role: {
                name: req.user.role || 'employee',
                displayName: req.user.role || 'Employee',
                permissions: []
              },
              status: 'active'
            }
          }
        });
      }
      
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get role data
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

    // Get tenantId from store if available
    let tenantId = null;
    if (user.store) {
      if (typeof user.store === 'object') {
        tenantId = user.store._id?.toString() || user.store.id;
      } else {
        tenantId = user.store.toString();
      }
    }

    // Return response in format matching backend documentation
    res.status(200).json({
      success: true,
      data: {
        id: user._id.toString(),
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim() || user.email,
        role: roleData?.name || 'employee',
        permissions: roleData?.permissions || [],
        tenantId: tenantId,
        employeeId: user.employeeId,
        departmentId: user.department?.toString() || null,
        status: user.status || 'ACTIVE',
        avatar: user.avatar || null,
        lastLogin: user.lastLogin || null
      }
    });
  } catch (error) {
    logger.error('Get current user error', { error: error.message, userId: req.user?.id });
    next(error);
  }
};

/**
 * Mock login controller for HR users
 * @route POST /api/auth/mock-login
 * @access Public (for development/testing)
 */
const mockLogin = async (req, res, next) => {
  try {
    const { email, role } = req.body;

    // Only allow in development or if MOCK_LOGIN_ENABLED is true
    if (process.env.NODE_ENV === 'production' && process.env.MOCK_LOGIN_ENABLED !== 'true') {
      return res.status(403).json({
        success: false,
        error: 'MOCK_LOGIN_DISABLED',
        message: 'Mock login is disabled in production'
      });
    }

    const result = await mockLoginService.mockLogin(email, role || 'hr');

    res.status(200).json(result);
  } catch (error) {
    logger.error('Mock login controller error', { error: error.message, email: req.body.email });
    next(error);
  }
};

/**
 * Change password controller
 * @route POST /api/auth/change-password
 * @access Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id || req.user?._id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required'
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Current password and new password are required'
      });
    }

    await authService.changePassword(userId, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Change password controller error', { error: error.message, userId: req.user?.id });
    next(error);
  }
};

/**
 * Forgot password controller
 * @route POST /api/auth/forgot-password
 * @access Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Email is required'
      });
    }

    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    await authService.forgotPassword(email, ipAddress, userAgent);

    // Always return success (don't reveal if email exists)
    res.status(200).json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    logger.error('Forgot password controller error', { error: error.message, email: req.body.email });
    next(error);
  }
};

/**
 * Reset password controller
 * @route POST /api/auth/reset-password
 * @access Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Token and new password are required'
      });
    }

    await authService.resetPassword(token, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    logger.error('Reset password controller error', { error: error.message });
    next(error);
  }
};

module.exports = {
  login,
  refreshToken,
  logout,
  getCurrentUser,
  mockLogin,
  changePassword,
  forgotPassword,
  resetPassword
};

