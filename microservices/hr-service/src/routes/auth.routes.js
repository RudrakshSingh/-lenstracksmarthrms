const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const asyncHandler = require('../utils/asyncHandler');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');

// Rate limiting for auth endpoints (stricter)
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per window
  message: 'Too many login attempts, please try again later',
  skipSuccessfulRequests: true
});

// Validation schemas
const loginSchema = {
  body: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Password must be at least 6 characters',
      'any.required': 'Password is required'
    }),
    rememberMe: Joi.boolean().optional().default(false)
  })
};

const refreshTokenSchema = {
  body: Joi.object({
    refreshToken: Joi.string().required().messages({
      'any.required': 'Refresh token is required'
    })
  })
};

const logoutSchema = {
  body: Joi.object({
    refreshToken: Joi.string().allow(null, '').optional()
  })
};

// Routes
/**
 * @route POST /api/auth/login
 * @desc Login user and get JWT token with RBAC
 * @access Public
 */
router.post(
  '/login',
  authRateLimit,
  validateRequest(loginSchema),
  asyncHandler(authController.login)
);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post(
  '/refresh',
  validateRequest(refreshTokenSchema),
  asyncHandler(authController.refreshToken)
);

/**
 * @route POST /api/auth/logout
 * @desc Logout user
 * @access Private (can also accept refreshToken in body)
 */
router.post(
  '/logout',
  validateRequest(logoutSchema),
  asyncHandler(authController.logout)
);

/**
 * @route GET /api/auth/me
 * @desc Get current user info with RBAC
 * @access Private
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(authController.getCurrentUser)
);

/**
 * @route POST /api/auth/mock-login
 * @desc Mock login for HR users (development/testing only)
 * @access Public (disabled in production unless MOCK_LOGIN_ENABLED=true)
 */
const mockLoginSchema = {
  body: Joi.object({
    email: Joi.string().email().optional().messages({
      'string.email': 'Please provide a valid email address'
    }),
    role: Joi.string().valid('hr', 'admin', 'manager', 'employee').optional().default('hr')
  })
};

router.post(
  '/mock-login',
  validateRequest(mockLoginSchema),
  asyncHandler(authController.mockLogin)
);

module.exports = router;

