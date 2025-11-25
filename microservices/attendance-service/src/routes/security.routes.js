const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const asyncHandler = require('../utils/asyncHandler');
const {
  validateLocation,
  getIPGeolocation,
  validateFace,
  getViolations,
  getViolationById,
  resolveViolation
} = require('../controllers/securityController');

// Security validation routes
router.post('/validate-location',
  authenticate,
  asyncHandler(validateLocation)
);

router.get('/ip-geolocation',
  authenticate,
  asyncHandler(getIPGeolocation)
);

router.post('/validate-face',
  authenticate,
  asyncHandler(validateFace)
);

// Violation management routes
router.get('/violations',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['security:read']),
  asyncHandler(getViolations)
);

router.get('/violations/:id',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['security:read']),
  asyncHandler(getViolationById)
);

router.post('/violations/:id/resolve',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['security:update']),
  asyncHandler(resolveViolation)
);

module.exports = router;

