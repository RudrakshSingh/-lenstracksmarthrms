const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenant.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');

// Platform metrics
router.get(
  '/metrics',
  authenticate,
  requireRole('super_admin'),
  asyncHandler(tenantController.getPlatformMetrics)
);

module.exports = router;

