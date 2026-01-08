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
    emailOrEmployeeId: Joi.string().optional().trim(),
    email: Joi.string().email().optional().trim().lowercase(),
    password: Joi.string().required()
  }).or("emailOrEmployeeId", "email")
};

const registerSchema = {
  body: Joi.object({
    employee_id: Joi.string().required().trim().min(3).max(50),
    name: Joi.string().required().trim().min(2).max(100),
    email: Joi.string().email().required().trim().lowercase(),
    phone: Joi.string().optional().trim(),
    password: Joi.string().required().min(8),
    role: Joi.string().valid('admin', 'hr', 'manager', 'employee', 'superadmin').default('employee'),
    department: Joi.string().optional().trim(),
    designation: Joi.string().optional().trim(),
    joining_date: Joi.date().optional(),
    status: Joi.string().valid('active', 'inactive', 'pending').default('active')
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

module.exports = router;
