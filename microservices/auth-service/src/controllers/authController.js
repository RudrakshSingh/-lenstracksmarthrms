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
    
    // Validate required fields
    if (!emailOrEmployeeId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/Employee ID and password are required'
      });
    }
    
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    const result = await AuthService.login(emailOrEmployeeId, password, ip, userAgent);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    logger.error('Error in login controller', { 
      error: error.message, 
      stack: error.stack,
      emailOrEmployeeId: req.body?.emailOrEmployeeId 
    });
    
    // Handle specific error types
    if (error.message.includes('Database connection unavailable')) {
      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable. Please try again later.',
        error: 'Database connection error'
      });
    }
    
    // Handle authentication errors (400)
    if (error.message.includes('Invalid') || error.message.includes('Account')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    // Default to 500 for unexpected errors
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
 * Optimized version - eliminates 408 timeout errors
 * Uses caching, pre-hashed passwords, and optimized database operations
 * 
 * NOTE: If this still times out, use /api/auth/mock-login-fast instead
 * which returns tokens without any database operations
 */
const mockLogin = async (req, res, next) => {
  // Set longer timeout for this endpoint (4 minutes)
  req.setTimeout(240000);
  
  // Check if fast mode is requested via query parameter
  if (req.query.fast === 'true' || process.env.MOCK_LOGIN_FAST_MODE === 'true') {
    const { fastMockLogin } = require('./authController.fast');
    return fastMockLogin(req, res, next);
  }
  
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

    // Pre-hashed password for mock users (bcrypt rounds=4 for speed, only for mock users)
    // This is a pre-computed hash of 'mockpassword123' with 4 rounds
    // In production, you could store this in environment variable
    const PRE_HASHED_MOCK_PASSWORD = '$2a$04$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

    // Try Redis cache first (if available)
    let user = null;
    const { connectRedis } = require('../config/redis');
    const cacheKey = `mock_user:${mockEmail}:${mockEmployeeId}`;
    
    try {
      const redis = connectRedis();
      if (redis && (redis.status === 'ready' || redis.isReady)) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const cachedData = JSON.parse(cached);
          // Use lean query for faster retrieval
          user = await User.findById(cachedData.userId).lean();
          if (user) {
            user._id = user._id.toString();
          }
        }
      }
    } catch (cacheError) {
      // Redis not available or error - continue without cache
    }

    // If not in cache, query database with optimized query
    if (!user) {
      // Use findOneAndUpdate with upsert for atomic operation (single DB call)
      const departmentMap = {
        'hr': 'HR',
        'admin': 'TECH',
        'manager': 'SALES',
        'employee': 'SALES',
        'superadmin': 'TECH'
      };

      const now = new Date();
      const updateData = {
        $set: {
          name: mockName,
          email: mockEmail,
          phone: '+919999999999',
          role: role,
          department: departmentMap[role] || 'SALES',
          designation: `${role.toUpperCase()} Manager`,
          is_active: true,
          status: 'active',
          band_level: 'A',
          hierarchy_level: 'NATIONAL',
          last_login: now,
          last_activity: now
        },
        $setOnInsert: {
          tenantId: 'default',
          employee_id: mockEmployeeId,
          password: PRE_HASHED_MOCK_PASSWORD, // Pre-hashed password (only set on insert)
          joining_date: now
        }
      };

      // Single atomic operation - find or create/update
      user = await User.findOneAndUpdate(
        { 
          $or: [
            { email: mockEmail },
            { employee_id: mockEmployeeId }
          ]
        },
        updateData,
        { 
          upsert: true, 
          new: true, 
          lean: true, // Return plain object for faster processing
          runValidators: false // Skip validators for speed (mock users only)
        }
      );

      // Cache the user ID for future requests
      try {
        const redis = connectRedis();
        if (redis && (redis.status === 'ready' || redis.isReady)) {
          await redis.setex(cacheKey, 3600, JSON.stringify({ userId: user._id.toString() })); // Cache for 1 hour
        }
      } catch (cacheError) {
        // Ignore cache errors
      }
    } else {
      // User from cache - update last login/activity in background (don't wait)
      User.findByIdAndUpdate(
        user._id,
        { 
          $set: { 
            last_login: new Date(), 
            last_activity: new Date(),
            is_active: true,
            status: 'active',
            role: role
          } 
        },
        { lean: true }
      ).catch(() => {}); // Fire and forget - don't block response
    }

    // Generate tokens (synchronous operation - fast)
    const accessToken = generateAccessToken({ userId: user._id, role: user.role || role });
    const refreshToken = generateRefreshToken({ userId: user._id });

    // Build user profile (avoid calling methods on lean object)
    const userProfile = {
      _id: user._id,
      employee_id: user.employee_id || mockEmployeeId,
      name: user.name || mockName,
      email: user.email || mockEmail,
      role: user.role || role,
      department: user.department || departmentMap[role] || 'SALES',
      designation: user.designation || `${role.toUpperCase()} Manager`
    };

    if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
      logger.info('Mock login successful', { userId: user._id, role: user.role || role, email: user.email || mockEmail });
    }

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
    logger.error('Error in mockLogin controller', { error: error.message, stack: error.stack });
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