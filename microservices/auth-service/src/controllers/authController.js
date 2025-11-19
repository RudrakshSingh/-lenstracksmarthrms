const AuthService = require('../services/auth.service');
const logger = require('../config/logger');

/**
 * Register a new user
 */
const register = async (req, res, next) => {
  try {
    const userData = req.body;
    const user = await AuthService.registerUser(userData);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: user
    });
  } catch (error) {
    logger.error('Error in register controller', { error: error.message });
    next(error);
  }
};

/**
 * Login user
 */
const login = async (req, res, next) => {
  try {
    const { emailOrEmployeeId, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    const result = await AuthService.login(emailOrEmployeeId, password, ip, userAgent);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    logger.error('Error in login controller', { error: error.message });
    next(error);
  }
};

/**
 * Refresh access token
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const result = await AuthService.refreshAccessToken(refreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in refreshToken controller', { error: error.message });
    next(error);
  }
};

/**
 * Logout user
 */
const logout = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    const result = await AuthService.logout(userId, ip, userAgent);

    res.status(200).json({
      success: true,
      message: 'Logout successful',
      data: result
    });
  } catch (error) {
    logger.error('Error in logout controller', { error: error.message });
    next(error);
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res, next) => {
  try {
    const user = req.user;
    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: user
    });
  } catch (error) {
    logger.error('Error in getProfile controller', { error: error.message });
    next(error);
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const updateData = req.body;
    
    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updateData.password;
    delete updateData.role;
    delete updateData.status;
    delete updateData.isDeleted;

    const user = await AuthService.updateUserProfile(userId, updateData);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    logger.error('Error in updateProfile controller', { error: error.message });
    next(error);
  }
};

/**
 * Change password
 */
const changePassword = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword } = req.body;

    await AuthService.changePassword(userId, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Error in changePassword controller', { error: error.message });
    next(error);
  }
};

/**
 * Request password reset
 */
const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    // This would typically send a password reset email
    // For now, we'll just return a success message
    res.status(200).json({
      success: true,
      message: 'Password reset instructions sent to your email'
    });
  } catch (error) {
    logger.error('Error in requestPasswordReset controller', { error: error.message });
    next(error);
  }
};

/**
 * Reset password
 */
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    
    // This would typically validate the token and reset the password
    // For now, we'll just return a success message
    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    logger.error('Error in resetPassword controller', { error: error.message });
    next(error);
  }
};

/**
 * Mock login for frontend testing
 * Creates or finds a user with specified role and returns valid tokens
 */
const mockLogin = async (req, res, next) => {
  try {
    const User = require('../models/User.model');
    const { generateAccessToken, generateRefreshToken } = require('../config/jwt');
    const { role = 'hr', email, employeeId, name } = req.body;
    
    // Validate role
    const validRoles = ['admin', 'hr', 'manager', 'employee', 'superadmin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }

    // Default values for mock user
    const mockEmail = email || `mock.${role}@etelios.com`;
    const mockEmployeeId = employeeId || `MOCK${role.toUpperCase()}001`;
    const mockName = name || `Mock ${role.toUpperCase()} User`;

    // Find or create mock user
    let user = await User.findOne({ 
      $or: [
        { email: mockEmail },
        { employee_id: mockEmployeeId }
      ]
    });

    if (!user) {
      // Create new mock user
      // Map role to appropriate department
      const departmentMap = {
        'hr': 'HR',
        'admin': 'TECH',
        'manager': 'SALES',
        'employee': 'SALES',
        'superadmin': 'TECH'
      };
      
      user = new User({
        tenantId: 'default',
        employee_id: mockEmployeeId,
        name: mockName,
        email: mockEmail,
        phone: '+919999999999',
        password: 'mockpassword123', // Will be hashed
        role: role,
        department: departmentMap[role] || 'SALES',
        designation: `${role.toUpperCase()} Manager`,
        joining_date: new Date(),
        is_active: true,
        status: 'active',
        band_level: 'A',
        hierarchy_level: 'NATIONAL'
      });
      
      // Hash password
      const bcrypt = require('bcryptjs');
      user.password = await bcrypt.hash('mockpassword123', 10);
      
      await user.save();
    } else {
      // Update existing user to ensure it's active
      user.is_active = true;
      user.status = 'active';
      user.role = role;
      await user.save();
    }

    // Generate tokens
    const accessToken = generateAccessToken({ userId: user._id, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user._id });

    // Update last login
    user.last_login = new Date();
    user.last_activity = new Date();
    await user.save();

    // Get public profile
    const userProfile = user.getPublicProfile ? user.getPublicProfile() : {
      _id: user._id,
      employee_id: user.employee_id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      designation: user.designation
    };

    logger.info('Mock login successful', { userId: user._id, role: user.role, email: user.email });

    res.status(200).json({
      success: true,
      message: 'Mock login successful',
      data: {
        user: userProfile,
        accessToken,
        refreshToken
      },
      mock: true
    });
  } catch (error) {
    logger.error('Error in mockLogin controller', { error: error.message });
    next(error);
  }
};

module.exports = {
  register,
  login,
  mockLogin,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword
};