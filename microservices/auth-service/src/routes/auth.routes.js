const express = require("express");
const Joi = require("joi");
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth.middleware");
const { validateRequest } = require("../middleware/validateRequest.wrapper");

const router = express.Router();

// Validation schemas
const loginSchema = {
  body: Joi.object({
    emailOrEmployeeId: Joi.string().optional().trim(),
    email: Joi.string().email().optional().trim().lowercase(),
    password: Joi.string().required()
  }).or("emailOrEmployeeId", "email")
};

const refreshTokenSchema = {
  body: Joi.object({
    refreshToken: Joi.string().required()
  })
};

// Routes
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
