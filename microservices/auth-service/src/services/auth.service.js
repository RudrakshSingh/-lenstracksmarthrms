const User = require('../models/User.model');
const Role = require('../models/Role.model');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../config/jwt');
const { hashPassword, comparePassword } = require('../utils/hashUtils');
const { connectRedis } = require('../config/redis');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/email');
const { logAuthEvent } = require('../utils/audit');
const logger = require('../config/logger');

class AuthService {
  constructor() {
    this.redis = connectRedis();
  }

  /**
   * Register a new user
   * @param {object} userData - User registration data
   * @param {string} createdBy - ID of user creating this account
   * @returns {Promise<object>} Created user and tokens
   */
  async register(userData, createdBy) {
    try {
      const {
        employee_id,
        name,
        email,
        phone,
        password,
        role,
        department,
        designation,
        joining_date,
        stores,
        reporting_manager
      } = userData;

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [{ email }, { employee_id: employee_id.toUpperCase() }]
      });

      if (existingUser) {
        throw new Error('User with this email or employee ID already exists');
      }

      // Validate role exists
      const roleExists = await Role.findOne({ name: role, is_active: true });
      if (!roleExists) {
        throw new Error('Invalid role specified');
      }

      // Create user
      const user = new User({
        employee_id: employee_id.toUpperCase(),
        name,
        email,
        phone,
        password,
        role,
        department,
        designation,
        joining_date,
        stores,
        reporting_manager,
        created_by: createdBy
      });

      await user.save();

      // Generate tokens
      const accessToken = generateAccessToken({ userId: user._id, role: user.role });
      const refreshToken = generateRefreshToken({ userId: user._id });

      // Store refresh token in Redis
      await this.storeRefreshToken(user._id, refreshToken);

      // Send welcome email
      try {
        await sendWelcomeEmail({
          name: user.name,
          email: user.email,
          employee_id: user.employee_id,
          password: password // In production, generate a temporary password
        });
      } catch (emailError) {
        logger.warn('Failed to send welcome email', { error: emailError.message, userId: user._id });
      }

      logger.info('User registered successfully', { userId: user._id, employeeId: user.employee_id });

      return {
        user: user.getPublicProfile(),
        accessToken,
        refreshToken
      };

    } catch (error) {
      logger.error('User registration failed', { error: error.message, userData });
      throw error;
    }
  }

  /**
   * Login user (supports both email and employee ID)
   * @param {string} emailOrEmployeeId - User email or employee ID
   * @param {string} password - User password
   * @param {string} ip - User IP address
   * @param {string} userAgent - User agent
   * @returns {Promise<object>} User and tokens
   */
  async login(emailOrEmployeeId, password, ip, userAgent) {
    try {
      // Check database connection first
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        logger.error('Database not connected', { readyState: mongoose.connection.readyState });
        throw new Error('Database connection unavailable. Please try again later.');
      }
      
      // Find user by email or employee ID
      let user;
      
      if (emailOrEmployeeId.includes('@')) {
        // Login with email
        user = await User.findOne({ email: emailOrEmployeeId.toLowerCase() })
          .maxTimeMS(5000) // 5 second timeout for query
          .populate('stores', 'name code')
          .populate('reporting_manager', 'name employee_id');
      } else {
        // Login with employee ID
        user = await User.findOne({ employee_id: emailOrEmployeeId.toUpperCase() })
          .maxTimeMS(5000) // 5 second timeout for query
          .populate('stores', 'name code')
          .populate('reporting_manager', 'name employee_id');
      }

      if (!user) {
        logAuthEvent('failed_login', null, { emailOrEmployeeId, reason: 'user_not_found' }, ip, userAgent);
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (!user.is_active || user.status === 'inactive') {
        logAuthEvent('failed_login', user._id, { emailOrEmployeeId, reason: 'account_inactive' }, ip, userAgent);
        throw new Error('Account is inactive');
      }

      // Check if user is suspended
      if (user.status === 'suspended') {
        logAuthEvent('failed_login', user._id, { emailOrEmployeeId, reason: 'account_suspended' }, ip, userAgent);
        throw new Error('Account is suspended');
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        logAuthEvent('failed_login', user._id, { emailOrEmployeeId, reason: 'invalid_password' }, ip, userAgent);
        throw new Error('Invalid email or password');
      }

      // Update last login
      user.last_login = new Date();
      user.last_activity = new Date();
      await user.save();

      // Generate tokens
      const accessToken = generateAccessToken({ userId: user._id, role: user.role });
      const refreshToken = generateRefreshToken({ userId: user._id });

      // Store refresh token in Redis
      await this.storeRefreshToken(user._id, refreshToken);

      // Log successful login
      logAuthEvent('login', user._id, { emailOrEmployeeId, role: user.role }, ip, userAgent);

      logger.info('User logged in successfully', { userId: user._id, employeeId: user.employee_id });

      return {
        user: user.getPublicProfile(),
        accessToken,
        refreshToken
      };

    } catch (error) {
      // Check if it's a database connection error
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        logger.error('Database connection lost during login', {
          readyState: mongoose.connection.readyState,
          error: error.message,
          emailOrEmployeeId
        });
        throw new Error('Database connection unavailable. Please try again later.');
      }

      // Check if it's a timeout error
      if (error.name === 'MongoServerError' && error.message && error.message.includes('operation timed out')) {
        logger.error('Database query timeout during login', {
          error: error.message,
          emailOrEmployeeId
        });
        throw new Error('Database connection timeout. Please try again later.');
      }

      // Check if it's a network error
      if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
        logger.error('Database network error during login', {
          error: error.message,
          errorName: error.name,
          emailOrEmployeeId
        });
        throw new Error('Database connection error. Please try again later.');
      }

      // For other errors (authentication errors, etc.), log and re-throw
      logger.error('User login failed', { 
        error: error.message, 
        errorName: error.name,
        stack: error.stack,
        emailOrEmployeeId 
      });
      throw error;
    }
  }

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<object>} New access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);

      // Check if refresh token exists in Redis
      const storedToken = await this.getRefreshToken(decoded.userId);
      if (!storedToken || storedToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Get user
      const user = await User.findById(decoded.userId);
      if (!user || !user.is_active || user.status === 'inactive') {
        throw new Error('User not found or inactive');
      }

      // Generate new access token
      const accessToken = generateAccessToken({ userId: user._id, role: user.role });

      logger.info('Access token refreshed', { userId: user._id });

      return { accessToken };

    } catch (error) {
      logger.error('Token refresh failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Logout user
   * @param {string} userId - User ID
   * @param {string} ip - User IP address
   * @param {string} userAgent - User agent
   * @returns {Promise<void>}
   */
  async logout(userId, ip, userAgent) {
    try {
      // Remove refresh token from Redis
      await this.removeRefreshToken(userId);

      // Log logout
      logAuthEvent('logout', userId, {}, ip, userAgent);

      logger.info('User logged out successfully', { userId });

    } catch (error) {
      logger.error('User logout failed', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Remove all refresh tokens to force re-login
      await this.removeRefreshToken(userId);

      logger.info('Password changed successfully', { userId });

    } catch (error) {
      logger.error('Password change failed', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<void>}
   */
  async requestPasswordReset(email) {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Don't reveal if user exists or not
        return;
      }

      // Generate reset token
      const resetToken = require('crypto').randomBytes(32).toString('hex');
      
      // Store reset token in Redis with expiry (1 hour)
      await this.redis.set(
        `password_reset:${resetToken}`,
        user._id.toString(),
        'EX',
        3600
      );

      // Send password reset email
      await sendPasswordResetEmail(user, resetToken);

      logger.info('Password reset requested', { userId: user._id, email });

    } catch (error) {
      logger.error('Password reset request failed', { error: error.message, email });
      throw error;
    }
  }

  /**
   * Reset password with token
   * @param {string} resetToken - Password reset token
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  async resetPassword(resetToken, newPassword) {
    try {
      // Get user ID from reset token
      const userId = await this.redis.get(`password_reset:${resetToken}`);
      if (!userId) {
        throw new Error('Invalid or expired reset token');
      }

      // Get user
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Remove reset token
      await this.redis.del(`password_reset:${resetToken}`);

      // Remove all refresh tokens to force re-login
      await this.removeRefreshToken(userId);

      logger.info('Password reset successfully', { userId });

    } catch (error) {
      logger.error('Password reset failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Store refresh token in Redis
   * @param {string} userId - User ID
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<void>}
   */
  async storeRefreshToken(userId, refreshToken) {
    try {
      const key = `refresh_token:${userId}`;
      await this.redis.set(key, refreshToken, 'EX', 7 * 24 * 60 * 60); // 7 days
    } catch (error) {
      logger.error('Failed to store refresh token', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get refresh token from Redis
   * @param {string} userId - User ID
   * @returns {Promise<string|null>} Refresh token or null
   */
  async getRefreshToken(userId) {
    try {
      const key = `refresh_token:${userId}`;
      return await this.redis.get(key);
    } catch (error) {
      logger.error('Failed to get refresh token', { error: error.message, userId });
      return null;
    }
  }

  /**
   * Remove refresh token from Redis
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async removeRefreshToken(userId) {
    try {
      const key = `refresh_token:${userId}`;
      await this.redis.del(key);
    } catch (error) {
      logger.error('Failed to remove refresh token', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Get user profile
   * @param {string} userId - User ID
   * @returns {Promise<object>} User profile
   */
  async getUserProfile(userId) {
    try {
      const user = await User.findById(userId)
        .populate('stores', 'name code store_id')
        .populate('reporting_manager', 'name employee_id')
        .populate('created_by', 'name employee_id');

      if (!user) {
        throw new Error('User not found');
      }

      return user.getPublicProfile();

    } catch (error) {
      logger.error('Failed to get user profile', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {object} updateData - Profile update data
   * @returns {Promise<object>} Updated user profile
   */
  async updateUserProfile(userId, updateData) {
    try {
      const allowedFields = [
        'name', 'phone', 'address', 'emergency_contact', 'date_of_birth'
      ];

      const updateFields = {};
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          updateFields[key] = updateData[key];
        }
      });

      const user = await User.findByIdAndUpdate(
        userId,
        { ...updateFields, updated_by: userId },
        { new: true, runValidators: true }
      ).populate('stores', 'name code store_id')
       .populate('reporting_manager', 'name employee_id');

      if (!user) {
        throw new Error('User not found');
      }

      logger.info('User profile updated', { userId });

      return user.getPublicProfile();

    } catch (error) {
      logger.error('Failed to update user profile', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Update user (alias for updateUserProfile)
   * @param {string} userId - User ID
   * @param {object} updateData - Update data
   * @returns {Promise<object>} Updated user
   */
  async updateUser(userId, updateData) {
    return this.updateUserProfile(userId, updateData);
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      logger.info('Password changed successfully', { userId });

    } catch (error) {
      logger.error('Failed to change password', { error: error.message, userId });
      throw error;
    }
  }
}

module.exports = new AuthService();