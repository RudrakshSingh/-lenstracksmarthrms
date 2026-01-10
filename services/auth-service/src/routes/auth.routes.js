const express = require('express');
const Joi = require('joi');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');

const router = express.Router();

// Validation schemas
const registerSchema = {
  body: Joi.object({
    employee_id: Joi.string().required().trim().max(20),
    name: Joi.string().required().trim().max(100),
    email: Joi.string().email().required().trim().lowercase(),
    phone: Joi.string().required().trim().pattern(/^\+?[\d\s-()]+$/),
    password: Joi.string().required().min(6).max(100),
    role: Joi.string().valid('admin', 'hr', 'manager', 'employee').required(),
    department: Joi.string().required().trim().max(100),
    designation: Joi.string().required().trim().max(100),
    joining_date: Joi.date().required(),
    stores: Joi.array().items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/)).optional(),
    reporting_manager: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
    date_of_birth: Joi.date().optional(),
    address: Joi.object({
      street: Joi.string().trim().max(200),
      city: Joi.string().trim().max(100),
      state: Joi.string().trim().max(100),
      country: Joi.string().trim().max(100),
      pincode: Joi.string().trim().max(10)
    }).optional(),
    emergency_contact: Joi.object({
      name: Joi.string().trim().max(100),
      relationship: Joi.string().trim().max(50),
      phone: Joi.string().trim().pattern(/^\+?[\d\s-()]+$/)
    }).optional()
  })
};

const loginSchema = {
  body: Joi.object({
    emailOrEmployeeId: Joi.string().required().trim(),
    password: Joi.string().required()
  })
};

const mockLoginSchema = {
  body: Joi.object({
    role: Joi.string().valid('admin', 'hr', 'manager', 'employee', 'superadmin').optional(),
    email: Joi.string().email().optional(),
    employeeId: Joi.string().optional(),
    name: Joi.string().optional()
  })
};

const changePasswordSchema = {
  body: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().required().min(6).max(100)
  })
};

const requestPasswordResetSchema = {
  body: Joi.object({
    email: Joi.string().email().required().trim().lowercase()
  })
};

const resetPasswordSchema = {
  body: Joi.object({
    resetToken: Joi.string().required(),
    newPassword: Joi.string().required().min(6).max(100)
  })
};

const updateProfileSchema = {
  body: Joi.object({
    name: Joi.string().trim().max(100).optional(),
    phone: Joi.string().trim().pattern(/^\+?[\d\s-()]+$/).optional(),
    address: Joi.object({
      street: Joi.string().trim().max(200),
      city: Joi.string().trim().max(100),
      state: Joi.string().trim().max(100),
      country: Joi.string().trim().max(100),
      pincode: Joi.string().trim().max(10)
    }).optional(),
    emergency_contact: Joi.object({
      name: Joi.string().trim().max(100),
      relationship: Joi.string().trim().max(50),
      phone: Joi.string().trim().pattern(/^\+?[\d\s-()]+$/)
    }).optional(),
    date_of_birth: Joi.date().optional()
  })
};

// Routes
router.post('/register', 
  authenticate,
  requireRole(['admin', 'hr']),
  validateRequest(registerSchema),
  authController.register
);

router.post('/login', 
  validateRequest(loginSchema),
  authController.login
);

// Mock login endpoint for frontend testing
// Try fast mode first (no DB), fallback to regular mode
const { fastMockLogin } = require('../controllers/authController.fast');

// Fast mock login (no database - instant response)
router.post('/mock-login-fast', 
  validateRequest(mockLoginSchema),
  fastMockLogin
);

// Regular mock login (with database - may timeout)
router.post('/mock-login', 
  validateRequest(mockLoginSchema),
  authController.mockLogin
);

router.post('/refresh-token', 
  authController.refreshToken
);

router.post('/logout', 
  authenticate,
  authController.logout
);

router.post('/change-password', 
  authenticate,
  validateRequest(changePasswordSchema),
  authController.changePassword
);

router.post('/request-password-reset', 
  validateRequest(requestPasswordResetSchema),
  authController.requestPasswordReset
);

router.post('/reset-password', 
  validateRequest(resetPasswordSchema),
  authController.resetPassword
);

router.get('/profile', 
  authenticate,
  authController.getProfile
);

router.put('/profile', 
  authenticate,
  validateRequest(updateProfileSchema),
  authController.updateProfile
);

module.exports = router;