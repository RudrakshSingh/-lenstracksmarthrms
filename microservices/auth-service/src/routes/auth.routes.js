const express = require("express");
const Joi = require("joi");
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth.middleware");
const { validateRequest } = require("../middleware/validateRequest.wrapper");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Optional authentication middleware - sets req.user if token is valid, but doesn't block if missing
const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
      // Get user from database to set req.user
      const User = require("../models/User.model");
      req.user = await User.findById(decoded.userId).select('-password');
    }
  } catch (error) {
    // Token invalid or expired - continue without authentication
  }
  next();
};

// Validation schemas
const loginSchema = {
  body: Joi.object({
    emailOrEmployeeId: Joi.string().trim(),
    email: Joi.string().email().trim().lowercase(),
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

router.get("/me",
  authenticate,
  authController.getProfile
);

// Change password (used by tenant temporary password first-login flow)
router.post("/change-password",
  authenticate,
  validateRequest(changePasswordSchema),
  authController.changePassword
);

module.exports = router;
