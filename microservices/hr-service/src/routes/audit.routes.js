const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const asyncHandler = require('../utils/asyncHandler');

// All routes require authentication
router.use(authenticate);

// Routes
router.get(
  '/audit-logs',
  requireRole(['hr', 'admin']),
  requirePermission('hr.audit.read'),
  asyncHandler(auditController.getAuditLogs)
);

router.get(
  '/audit/verify-consistency',
  requireRole(['hr', 'admin']),
  requirePermission('hr.audit.verify'),
  asyncHandler(auditController.verifyConsistency)
);

module.exports = router;

