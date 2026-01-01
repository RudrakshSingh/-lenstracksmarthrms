const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const User = require('../models/User.model');
const logger = require('../../../shared/config/logger');

class AuthController {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.logger = logger(serviceName);
  }

  // Register new user
  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const {
        email,
        phone,
        password,
        first_name,
        last_name,
        tenant_id,
        org_id,
        roles = ['customer']
      } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({
        tenant_id,
        $or: [{ email }, { phone }]
      });

      if (existingUser) {
        return res.status(409).json({
          error: 'User already exists',
          message: 'User with this email or phone already exists'
        });
      }

      // Create new user
      const user = new User({
        tenant_id,
        org_id,
        email,
        phone,
        password,
        first_name,
        last_name,
        roles,
        status: 'pending'
      });

      await user.save();

      // Generate JWT token
      const token = this.generateToken(user);

      this.logger.info('User registered', {
        service: this.serviceName,
        user_id: user._id,
        tenant_id: user.tenant_id,
        email: user.email
      });

      res.status(201).json({
        message: 'User registered successfully',
        user: user.toJSON(),
        token
      });

    } catch (error) {
      this.logger.error('User registration failed', {
        service: this.serviceName,
        error: error.message
      });
      res.status(500).json({
        error: 'Registration failed',
        message: 'Failed to register user'
      });
    }
  }

  // Login user
  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email, password, tenant_id } = req.body;

      // Find user
      const user = await User.findOne({
        tenant_id,
        email: email.toLowerCase()
      });

      if (!user) {
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid credentials'
        });
      }

      // Check if account is locked
      if (user.isLocked()) {
        return res.status(423).json({
          error: 'Account locked',
          message: 'Account is temporarily locked due to too many failed login attempts'
        });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        await user.incLoginAttempts();
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid credentials'
        });
      }

      // Check user status
      if (user.status !== 'active') {
        return res.status(403).json({
          error: 'Account not active',
          message: 'Account is not active'
        });
      }

      // Reset login attempts and update last login
      await user.resetLoginAttempts();
      user.last_login = new Date();
      await user.save();

      // Generate JWT token
      const token = this.generateToken(user);

      this.logger.info('User logged in', {
        service: this.serviceName,
        user_id: user._id,
        tenant_id: user.tenant_id,
        email: user.email
      });

      res.json({
        message: 'Login successful',
        user: user.toJSON(),
        token
      });

    } catch (error) {
      this.logger.error('User login failed', {
        service: this.serviceName,
        error: error.message
      });
      res.status(500).json({
        error: 'Login failed',
        message: 'Failed to authenticate user'
      });
    }
  }

  // Refresh token
  async refreshToken(req, res) {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return res.status(400).json({
          error: 'Refresh token required',
          message: 'Refresh token is required'
        });
      }

      // Verify refresh token
      const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET || 'refresh-secret');
      
      // Find user
      const user = await User.findById(decoded.user_id);
      if (!user || user.status !== 'active') {
        return res.status(401).json({
          error: 'Invalid refresh token',
          message: 'User not found or inactive'
        });
      }

      // Generate new token
      const token = this.generateToken(user);

      res.json({
        message: 'Token refreshed successfully',
        token
      });

    } catch (error) {
      this.logger.error('Token refresh failed', {
        service: this.serviceName,
        error: error.message
      });
      res.status(401).json({
        error: 'Token refresh failed',
        message: 'Invalid refresh token'
      });
    }
  }

  // Logout user
  async logout(req, res) {
    try {
      // In a stateless JWT system, logout is handled client-side
      // For enhanced security, you could maintain a blacklist of tokens
      
      this.logger.info('User logged out', {
        service: this.serviceName,
        user_id: req.user?.user_id
      });

      res.json({
        message: 'Logout successful'
      });

    } catch (error) {
      this.logger.error('User logout failed', {
        service: this.serviceName,
        error: error.message
      });
      res.status(500).json({
        error: 'Logout failed',
        message: 'Failed to logout user'
      });
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.user_id);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User profile not found'
        });
      }

      res.json({
        user: user.toJSON()
      });

    } catch (error) {
      this.logger.error('Get profile failed', {
        service: this.serviceName,
        error: error.message
      });
      res.status(500).json({
        error: 'Profile fetch failed',
        message: 'Failed to fetch user profile'
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const { first_name, last_name, phone, avatar } = req.body;
      
      const user = await User.findById(req.user.user_id);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User profile not found'
        });
      }

      // Update fields
      if (first_name) user.first_name = first_name;
      if (last_name) user.last_name = last_name;
      if (phone) user.phone = phone;
      if (avatar) user.avatar = avatar;

      await user.save();

      this.logger.info('User profile updated', {
        service: this.serviceName,
        user_id: user._id,
        tenant_id: user.tenant_id
      });

      res.json({
        message: 'Profile updated successfully',
        user: user.toJSON()
      });

    } catch (error) {
      this.logger.error('Profile update failed', {
        service: this.serviceName,
        error: error.message
      });
      res.status(500).json({
        error: 'Profile update failed',
        message: 'Failed to update user profile'
      });
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      const { current_password, new_password } = req.body;

      const user = await User.findById(req.user.user_id);
      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User profile not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(current_password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          error: 'Invalid current password',
          message: 'Current password is incorrect'
        });
      }

      // Update password
      user.password = new_password;
      await user.save();

      this.logger.info('Password changed', {
        service: this.serviceName,
        user_id: user._id,
        tenant_id: user.tenant_id
      });

      res.json({
        message: 'Password changed successfully'
      });

    } catch (error) {
      this.logger.error('Password change failed', {
        service: this.serviceName,
        error: error.message
      });
      res.status(500).json({
        error: 'Password change failed',
        message: 'Failed to change password'
      });
    }
  }

  // Generate JWT token
  generateToken(user) {
    const payload = {
      user_id: user._id,
      tenant_id: user.tenant_id,
      org_id: user.org_id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
      store_ids: user.store_ids,
      channel_ids: user.channel_ids
    };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret', {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    });

    const refreshToken = jwt.sign(
      { user_id: user._id },
      process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: 3600
    };
  }
}

module.exports = AuthController;