const authService = require('../services/auth.service');
const logger = require('../config/logger');
const realtimeClient = require('../utils/realtime.client');
const { resolveEffectivePermissionsForUser } = require('../utils/effectivePermissions');

/**
 * Register a new user
 * Allows public registration if no users exist in the database (first admin user)
 * Otherwise requires authentication
 */
const register = async (req, res, next) => {
  try {
    const userData = req.body;
    const createdBy = req.user?._id || req.user?.id;
    
    // Check if this is the first user registration
    // Allow public registration ONLY for the first admin user
    const User = require('../models/User.model');
    const userCount = await User.countDocuments();
    
    if (userCount === 0) {
      // First user - allow public registration
      // Must be admin or superadmin role
      if (!['admin', 'superadmin'].includes(userData.role)) {
        return res.status(403).json({
          success: false,
          message: 'First user must be admin or superadmin'
        });
      }
      logger.info('First user registration (no authentication required)', { 
        email: userData.email,
        role: userData.role 
      });
      
      // Use a system user ID for createdBy
      const result = await authService.register(userData, 'system');

      // Send realtime notification
      if (result.user && result.user._id) {
        realtimeClient.sendNotification(result.user._id, {
          id: `reg-${Date.now()}`,
          title: 'Welcome to Etelios HRMS!',
          message: 'Your admin account has been created successfully',
          type: 'success'
        }).catch(err => logger.warn('Failed to send realtime notification', { error: err.message }));
      }

      return res.status(201).json({
        success: true,
        message: 'Admin user registered successfully',
        data: result
      });
    }
    
    // Not first user - require authentication
    if (!createdBy) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to register users'
      });
    }

    const result = await authService.register(userData, createdBy);

    // Send realtime notification
    if (result.user && result.user._id) {
      realtimeClient.sendNotification(result.user._id, {
        id: `reg-${Date.now()}`,
        title: 'Account Created',
        message: `Welcome ${result.user.firstName || result.user.email}! Your account has been created successfully`,
        type: 'success'
      }).catch(err => logger.warn('Failed to send realtime notification', { error: err.message }));
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error in register controller', { 
      error: error.message, 
      stack: error.stack,
      statusCode: error.statusCode,
      errors: error.errors
    });
    
    // Handle validation errors
    if (error.statusCode === 400 && error.errors) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: error.errors
      });
    }
    
    // Handle specific error cases
    if (error.message && error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    if (error.message && (error.message.includes('Invalid role') || error.message.includes('Role validation failed') || error.message.includes('Failed to create role'))) {
      logger.error('Role validation error', { 
        error: error.message, 
        stack: error.stack,
        requestBody: req.body 
      });
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    next(error);
  }
};

/**
 * Login user
 * Supports both 'email' (frontend format) and 'emailOrEmployeeId' (backend format)
 */
const login = async (req, res, next) => {
  try {
    // Support both 'email' (frontend) and 'emailOrEmployeeId' (backend) field names
    const emailOrEmployeeId = req.body.emailOrEmployeeId || req.body.email;
    const tenantId = (
      req.body.tenantId ||
      req.headers['x-tenant-id'] ||
      req.headers['x-tenant'] ||
      req.query.tenantId ||
      ''
    ).toString().trim().toLowerCase();
    const password = req.body.password;
    
    // Validate required fields
    if (!emailOrEmployeeId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/Employee ID and password are required'
      });
    }
    
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    const result = await authService.login(emailOrEmployeeId, password, ip, userAgent, tenantId || null);

    // Send realtime notification
    if (result.user && result.user._id) {
      realtimeClient.sendNotification(result.user._id, {
        id: `login-${Date.now()}`,
        title: 'Login Successful',
        message: `Welcome back, ${result.user.firstName || result.user.email}!`,
        type: 'info'
      }).catch(err => logger.warn('Failed to send realtime notification', { error: err.message }));
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result
    });
  } catch (error) {
    // Enhanced error logging
    logger.error('Error in login controller', { 
      error: error.message,
      errorName: error.name,
      stack: error.stack,
      emailOrEmployeeId: req.body?.emailOrEmployeeId,
      body: req.body,
      statusCode: error.statusCode || error.status
    });
    
    // Handle validation errors (400)
    if (error.name === 'ValidationError' || error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Validation failed',
        errors: error.errors,
        service: 'auth-service'
      });
    }
    
    // Handle specific error types
    if (error.message && (
        error.message.includes('Database connection unavailable') || 
        error.message.includes('Database connection error') ||
        error.message.includes('Database connection timeout'))) {
      return res.status(503).json({
        success: false,
        message: 'Service temporarily unavailable. Please try again later.',
        error: 'Database connection error',
        service: 'auth-service'
      });
    }
    
    // Handle authentication errors (400)
    if (error.message && (
        error.message.includes('Invalid') || 
        error.message.includes('Account') ||
        error.message.includes('password') ||
        error.message.includes('inactive') ||
        error.message.includes('suspended'))) {
      return res.status(400).json({
        success: false,
        message: error.message,
        service: 'auth-service'
      });
    }
    
    // Default to 500 for unexpected errors - but provide more details
    const isProduction = process.env.NODE_ENV === 'production';
    return res.status(500).json({
      success: false,
      message: isProduction ? 'Internal server error' : error.message,
      service: 'auth-service',
      ...(isProduction ? {} : { 
        error: error.message,
        errorName: error.name,
        stack: error.stack 
      })
    });
  }
};

/**
 * Refresh access token
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
        error: 'MISSING_REFRESH_TOKEN'
      });
    }
    
    const result = await authService.refreshAccessToken(refreshToken);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: result
    });
  } catch (error) {
    // Handle invalid token errors with proper status code
    if (error.message && (error.message.includes('Invalid refresh token') || error.message.includes('Token expired') || error.message.includes('invalid'))) {
      return res.status(401).json({
        success: false,
        message: error.message || 'Invalid or expired refresh token',
        error: 'INVALID_REFRESH_TOKEN'
      });
    }
    
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
    const token = req.headers.authorization?.split(' ')[1] || null; // Get token for attendance service call
    const result = await authService.logout(userId, ip, userAgent, token);

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

    // mock-login-fast: JWT userId is not a Mongo ObjectId — skip DB and mirror GET /me shape
    if (user.isMock) {
      const profile = {
        _id: user._id || user.id,
        id: user._id || user.id,
        employeeId: user.employee_id || '',
        employee_id: user.employee_id || '',
        name: user.name || '',
        firstName: '',
        lastName: '',
        email: user.email || '',
        phone: user.phone || '',
        tenantId: user.tenantId || 'default',
        role: user.role || '',
        status: user.status || 'active',
        department: '',
        designation: '',
        jobTitle: '',
        store: null,
        departmentRef: null,
        reporting_manager: user.reporting_manager || null,
        storeId: null,
        store_id: null,
        permissions: user.permissions || [],
        stores: user.stores || [],
        avatar: '',
        gender: '',
        dob: null,
        doj: null
      };
      return res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: profile
      });
    }

    const User = require('../models/User.model');
    
    // OPTIMIZED: Select only needed fields, reduce populate fields for faster response
    const fullUser = await User.findById(user._id || user.id)
      .select(
        'employeeId employee_id email firstName lastName fullName name phone role status tenantId primary_store stores reporting_manager department designation jobTitle permissions custom_permissions permission_denials avatar gender dob doj'
      )
      .populate('primary_store', 'name code')
      .populate('stores', 'name code')
      .populate('reporting_manager', 'name employee_id')
      .lean()
      .maxTimeMS(2000);
    
    if (!fullUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    let effectivePermissions = fullUser.permissions || [];
    try {
      const resolved = await resolveEffectivePermissionsForUser(fullUser);
      effectivePermissions = resolved.effectivePermissions || effectivePermissions;
    } catch (permErr) {
      logger.warn('getProfile: effective permissions failed', { error: permErr.message });
    }

    // Get primary store (prefer primary_store, fallback to first store in stores array)
    const primaryStore = fullUser.primary_store || (fullUser.stores && fullUser.stores.length > 0 ? fullUser.stores[0] : null);
    
    // Build complete user profile with ALL available fields
    const profile = {
      _id: fullUser._id?.toString() || user._id || user.id,
      id: fullUser._id?.toString() || user._id || user.id,
      employeeId: fullUser.employeeId || fullUser.employee_id || user.employee_id || '',
      employee_id: fullUser.employeeId || fullUser.employee_id || user.employee_id || '',
      name: fullUser.name || fullUser.fullName || `${fullUser.firstName || ''} ${fullUser.lastName || ''}`.trim() || '',
      firstName: fullUser.firstName || fullUser.first_name || '',
      lastName: fullUser.lastName || fullUser.last_name || '',
      email: fullUser.email || user.email || '',
      phone: fullUser.phone || fullUser.phoneNumber || fullUser.phone_number || '',
      tenantId: fullUser.tenantId || user.tenantId || 'default',
      role: fullUser.role || user.role || '',
      status: fullUser.status || (fullUser.is_active ? 'active' : 'inactive') || 'active',
      department: fullUser.department || '',
      designation: fullUser.designation || fullUser.position || '',
      jobTitle: fullUser.jobTitle || fullUser.job_title || fullUser.designation || '',
      store: primaryStore ? {
        id: primaryStore._id?.toString() || primaryStore.id || '',
        _id: primaryStore._id?.toString() || primaryStore.id || '',
        name: primaryStore.name || '',
        code: primaryStore.code || '',
        address: primaryStore.address || {}
      } : (fullUser.store ? {
        id: fullUser.store._id?.toString() || fullUser.store.id || '',
        _id: fullUser.store._id?.toString() || fullUser.store.id || '',
        name: fullUser.store.name || '',
        code: fullUser.store.code || '',
        address: fullUser.store.address || {}
      } : null),
      departmentRef: fullUser.departmentRef ? {
        id: fullUser.departmentRef._id?.toString() || fullUser.departmentRef.id || '',
        _id: fullUser.departmentRef._id?.toString() || fullUser.departmentRef.id || '',
        name: fullUser.departmentRef.name || fullUser.department || '',
        code: fullUser.departmentRef.code || '',
        description: fullUser.departmentRef.description || ''
      } : (fullUser.department ? {
        name: fullUser.department,
        code: fullUser.department,
        description: ''
      } : null),
      reporting_manager: fullUser.reporting_manager ? {
        id: fullUser.reporting_manager._id?.toString() || fullUser.reporting_manager.id || '',
        _id: fullUser.reporting_manager._id?.toString() || fullUser.reporting_manager.id || '',
        name: fullUser.reporting_manager.name || fullUser.reporting_manager.fullName || '',
        employee_id: fullUser.reporting_manager.employee_id || fullUser.reporting_manager.employeeId || '',
        email: fullUser.reporting_manager.email || ''
      } : (fullUser.reportingManager ? {
        name: fullUser.reportingManagerName || fullUser.reportingManager || '',
        employee_id: fullUser.reportingManager || ''
      } : null),
      // CRITICAL: Add storeId and store_id at root level for frontend compatibility (for Add Sales Entry modal)
      storeId: primaryStore ? (primaryStore._id?.toString() || primaryStore.id || '') : (fullUser.store ? (fullUser.store._id?.toString() || fullUser.store.id || '') : (fullUser.stores && fullUser.stores.length > 0 ? (fullUser.stores[0]._id?.toString() || fullUser.stores[0].id || '') : null)),
      store_id: primaryStore ? (primaryStore._id?.toString() || primaryStore.id || '') : (fullUser.store ? (fullUser.store._id?.toString() || fullUser.store.id || '') : (fullUser.stores && fullUser.stores.length > 0 ? (fullUser.stores[0]._id?.toString() || fullUser.stores[0].id || '') : null)),
      permissions: effectivePermissions,
      permissionOverrides: {
        custom_permissions: fullUser.custom_permissions || [],
        permission_denials: fullUser.permission_denials || []
      },
      stores: fullUser.stores || [],
      avatar: fullUser.avatar || '',
      gender: fullUser.gender || '',
      dob: fullUser.dob || fullUser.dateOfBirth || fullUser.date_of_birth || null,
      doj: fullUser.doj || fullUser.joinDate || fullUser.join_date || null
    };
    
    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: profile
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
    if (req.user.isMock) {
      return res.status(400).json({
        success: false,
        message: 'Profile update is not available for mock sessions',
        code: 'MOCK_PROFILE_READ_ONLY'
      });
    }

    const userId = req.user._id || req.user.id;
    const updateData = req.body;
    
    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updateData.password;
    delete updateData.role;
    delete updateData.status;
    delete updateData.isDeleted;

    const user = await authService.updateUserProfile(userId, updateData);

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
    const userId = req.user?._id || req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session',
        code: 'INVALID_SESSION'
      });
    }

    await authService.changePassword(userId, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Error in changePassword controller', { error: error.message });
    if (error.message === 'Current password is incorrect') {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
        code: 'USER_NOT_FOUND'
      });
    }
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
 * Admin reset password (without current password)
 * POST /api/auth/admin/reset-password
 */
/**
 * Admin reset password (without current password)
 * POST /api/auth/admin/reset-password
 */
const adminResetPassword = async (req, res, next) => {
  try {
    const User = require('../models/User.model');
    const { userId, email, newPassword } = req.body;
    const requestedTenantId = (
      req.headers['x-tenant-id'] ||
      req.headers['x-tenant'] ||
      req.user?.tenantId ||
      ''
    ).toString().trim().toLowerCase();
    
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'newPassword is required'
      });
    }

    let targetUserId = userId;
    
    // If email provided instead of userId, find user by email
    if (!targetUserId && email) {
      const normalizedEmail = email.toLowerCase().trim();
      const query = { email: normalizedEmail };

      // Scope reset lookup to tenant so duplicate emails across tenants do not collide.
      if (requestedTenantId && req.user?.role !== 'superadmin') {
        query.tenantId = requestedTenantId;
      }

      const user = await User.findOne(query);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      targetUserId = user._id;
    }

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Either userId or email is required'
      });
    }

    await authService.adminResetPassword(targetUserId, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    logger.error('Error in adminResetPassword controller', { error: error.message });
    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
        code: 'USER_NOT_FOUND'
      });
    }
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

    const resolvedTenantId = (user.tenantId && String(user.tenantId).toLowerCase().trim()) || 'default';

    // Generate tokens (synchronous operation - fast) — tenantId required for HR validateTenant / multi-tenant APIs
    const accessToken = generateAccessToken({
      userId: user._id,
      role: user.role || role,
      tenantId: resolvedTenantId,
      employee_id: user.employee_id || mockEmployeeId
    });
    const refreshToken = generateRefreshToken({ userId: user._id });

    // Build user profile (avoid calling methods on lean object)
    const userProfile = {
      _id: user._id,
      employee_id: user.employee_id || mockEmployeeId,
      name: user.name || mockName,
      email: user.email || mockEmail,
      role: user.role || role,
      department: user.department || departmentMap[role] || 'SALES',
      designation: user.designation || `${role.toUpperCase()} Manager`,
      tenantId: resolvedTenantId
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
  adminResetPassword,
  mockLogin,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword
};