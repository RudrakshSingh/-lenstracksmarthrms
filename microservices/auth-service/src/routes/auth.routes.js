const express = require("express");
const Joi = require("joi");
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth.middleware");
const { validateRequest } = require("../middleware/validateRequest.wrapper");
const { verifyAccessToken } = require("../config/jwt");
const logger = require("../config/logger");

const router = express.Router();

// Optional authentication middleware - sets req.user if token is valid, but doesn't block if missing
// FIXED: Now uses verifyAccessToken() which uses correct JWT_SECRET and validates issuer/audience
const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      // Use verifyAccessToken() which:
      // 1. Uses correct JWT_SECRET from jwt.js config
      // 2. Validates issuer ('hrms-backend') and audience ('hrms-frontend')
      // 3. Throws proper errors if token is invalid/expired
      const decoded = verifyAccessToken(token);
      
      // Get user from database to set req.user
      const User = require("../models/User.model");
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user) {
        // Set req.user with _id and id for register controller compatibility
        req.user = {
          _id: user._id,
          id: user._id,
          userId: user._id,
          ...user.toObject ? user.toObject() : user
        };
      } else {
        logger.warn('Optional auth: User not found in database', { userId: decoded.userId });
      }
    }
  } catch (error) {
    // Token invalid or expired - continue without authentication (optional auth)
    // Log in debug mode only to avoid noise
    if (process.env.DEBUG === 'true' || process.env.LOG_OPTIONAL_AUTH === 'true') {
      logger.debug('Optional authentication failed (expected for unauthenticated requests)', {
        error: error.message,
        errorType: error.name
      });
    }
  }
  next();
};

// Validation schemas
const loginSchema = {
  body: Joi.object({
    emailOrEmployeeId: Joi.string().trim(),
    email: Joi.string().email().trim().lowercase(),
    tenantId: Joi.string().trim().min(1).max(100).optional(),
    password: Joi.string().required().min(6).max(128)
      .messages({
        'any.required': 'Password is required',
        'string.empty': 'Password cannot be empty',
        'string.min': 'Password must be at least 6 characters'
      })
  })
    .or('emailOrEmployeeId', 'email')
    .messages({
      'object.missing': 'Either emailOrEmployeeId or email is required'
    })
};

const registerSchema = {
  body: Joi.object({
    // Multi-tenant support (required by User model)
    // Optional for backward compatibility; auth.service will default to 'default'
    tenantId: Joi.string().optional().trim().min(1).max(100).default('default')
      .messages({
        'string.min': 'tenantId cannot be empty'
      }),
    employee_id: Joi.string().required().trim().min(3).max(50)
      .pattern(/^[A-Z0-9_-]+$/i, 'alphanumeric with hyphens/underscores')
      .messages({
        'string.pattern.name': 'Employee ID must contain only letters, numbers, hyphens, and underscores'
      }),
    name: Joi.string().required().trim().min(2).max(100),
    email: Joi.string()
      .email({ tlds: { allow: true } }) // Validate TLD
      .required()
      .trim()
      .lowercase()
      .max(254) // RFC 5321
      .messages({
        'string.email': 'Please provide a valid email address',
        'string.max': 'Email address is too long'
      }),
    phone: Joi.string()
      .optional()
      .trim()
      .pattern(/^\+?[\d\s-()]{7,20}$/, 'phone number')
      .messages({
        'string.pattern.name': 'Please provide a valid phone number'
      }),
    password: Joi.string()
      .required()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'password strength')
      .messages({
        'string.pattern.name': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        'string.min': 'Password must be at least 8 characters long'
      }),
    role: Joi.string().valid('admin', 'hr', 'manager', 'employee', 'superadmin').default('employee'),
    roleName: Joi.string().valid('Admin', 'HR', 'Manager', 'Employee', 'SuperAdmin', 'admin', 'hr', 'manager', 'employee', 'superadmin').optional(),
    department: Joi.string().optional().trim().max(100),
    designation: Joi.string().optional().trim().max(100),
    joining_date: Joi.date().optional(),
    status: Joi.string().valid('active', 'inactive', 'pending').default('active'),

    // Tenant creation / first-login flow (Azure-like)
    mustChangePassword: Joi.boolean().optional().default(false),
    passwordTemporary: Joi.boolean().optional().default(false)
  })
};

const changePasswordSchema = {
  body: Joi.object({
    currentPassword: Joi.string().required().min(6).max(128),
    newPassword: Joi.string()
      .required()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'password strength')
      .messages({
        'string.pattern.name': 'New password must contain at least one uppercase letter, one lowercase letter, and one number',
        'string.min': 'New password must be at least 8 characters long'
      })
  })
};

const refreshTokenSchema = {
  body: Joi.object({
    refreshToken: Joi.string().required()
  })
};

const updateProfileSchema = {
  body: Joi.object({
    name: Joi.string().trim().max(100).optional(),
    phone: Joi.string()
      .trim()
      .pattern(/^\+?[\d\s-()]+$/)
      .optional()
      .allow(''),
    address: Joi.object({
      street: Joi.string().trim().max(200).allow(''),
      city: Joi.string().trim().max(100).allow(''),
      state: Joi.string().trim().max(100).allow(''),
      country: Joi.string().trim().max(100).allow(''),
      pincode: Joi.string().trim().max(10).allow('')
    }).optional(),
    emergency_contact: Joi.object({
      name: Joi.string().trim().max(100).allow(''),
      relationship: Joi.string().trim().max(50).allow(''),
      phone: Joi.string()
        .trim()
        .pattern(/^\+?[\d\s-()]+$/)
        .allow('')
    }).optional(),
    date_of_birth: Joi.alternatives().try(Joi.date(), Joi.string().allow('')).optional()
  })
};

// Routes
router.post("/register",
  validateRequest(registerSchema),
  optionalAuthenticate,
  authController.register
);

router.post("/login",
  validateRequest(loginSchema),
  authController.login
);

// Admin reset password (requires authentication and admin role)
const { requireRole } = require('../middleware/rbac.middleware');

router.post("/admin/reset-password",
  authenticate,
  requireRole(['admin', 'superadmin']),
  authController.adminResetPassword
);

router.post("/refresh-token",
  validateRequest(refreshTokenSchema),
  authController.refreshToken
);

router.post("/refresh",
  validateRequest(refreshTokenSchema),
  authController.refreshToken
);

router.post("/logout",
  authenticate,
  authController.logout
);

router.get("/profile",
  authenticate,
  authController.getProfile
);

router.put("/profile",
  authenticate,
  validateRequest(updateProfileSchema),
  authController.updateProfile
);

// OPTIMIZED: Add simple caching for /me endpoint (user profile doesn't change frequently)
const cache = new Map();
const CACHE_TTL = 10000; // 10 seconds

router.get("/me",
  authenticate,
  (req, res, next) => {
    const cacheKey = `me:${req.user._id || req.user.id}:${req.tenantId || 'default'}`;
    const cached = cache.get(cacheKey);
    
    if (cached && cached.expiresAt > Date.now()) {
      return res.status(cached.status).json(cached.data);
    }
    
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, {
          data,
          status: res.statusCode,
          expiresAt: Date.now() + CACHE_TTL
        });
      }
      return originalJson(data);
    };
    
    next();
  },
  authController.getProfile
);

// Change password (used by tenant temporary password first-login flow)
router.post("/change-password",
  authenticate,
  validateRequest(changePasswordSchema),
  authController.changePassword
);

module.exports = router;
