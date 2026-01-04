const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenant.controller');
const { tenantRateLimit } = require('../middleware/tenant.middleware');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

// Apply rate limiting
router.use(tenantRateLimit(1000, 60000)); // 1000 requests per minute

// Tenant routes
// Create tenant - requires superadmin
router.post('/', authenticate, requireRole(['superadmin', 'super-admin', 'admin']), tenantController.createTenant);

// List tenants - requires superadmin
router.get('/', authenticate, requireRole(['superadmin', 'super-admin', 'admin']), tenantController.listTenants);

// Get tenant by ID - requires superadmin
router.get('/:tenantId', authenticate, requireRole(['superadmin', 'super-admin', 'admin']), tenantController.getTenant);

// Update tenant - requires superadmin
router.put('/:tenantId', authenticate, requireRole(['superadmin', 'super-admin', 'admin']), tenantController.updateTenant);

// Delete tenant - requires superadmin
router.delete('/:tenantId', authenticate, requireRole(['superadmin', 'super-admin', 'admin']), tenantController.deleteTenant);

// Get tenant analytics - requires superadmin
router.get('/:tenantId/analytics', authenticate, requireRole(['superadmin', 'super-admin', 'admin']), tenantController.getTenantAnalytics);

// Update tenant usage - requires superadmin
router.put('/:tenantId/usage', authenticate, requireRole(['superadmin', 'super-admin', 'admin']), tenantController.updateTenantUsage);

// Module assignment endpoint
router.post('/:tenantId/modules', authenticate, requireRole(['superadmin', 'super-admin', 'admin']), tenantController.assignModule);

// Remove module endpoint
router.delete('/:tenantId/modules/:moduleId', authenticate, requireRole(['superadmin', 'super-admin', 'admin']), tenantController.removeModule);

module.exports = router;
