const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenant.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const Joi = require('joi');
const asyncHandler = require('../utils/asyncHandler');

// Validation schemas
const createTenantSchema = {
  body: Joi.object({
    name: Joi.string().required().trim().max(200),
    domain: Joi.string().required().trim().lowercase().pattern(/^[a-z0-9-]+$/),
    email: Joi.string().email().required().trim().lowercase(),
    plan: Joi.string().valid('basic', 'professional', 'enterprise', 'custom').default('basic'),
    features: Joi.array().items(Joi.string().valid('hrms', 'crm', 'inventory', 'financial', 'sales', 'purchase', 'analytics', 'reports')).optional(),
    adminUser: Joi.object({
      firstName: Joi.string().required(),
      lastName: Joi.string().required(),
      email: Joi.string().email().required(),
      phone: Joi.string().optional()
    }).optional(),
    billing: Joi.object({
      plan: Joi.string().valid('basic', 'professional', 'enterprise', 'custom'),
      cycle: Joi.string().valid('monthly', 'quarterly', 'yearly').default('monthly'),
      currency: Joi.string().default('USD')
    }).optional(),
    settings: Joi.object().optional()
  })
};

const updateTenantSchema = {
  body: Joi.object({
    name: Joi.string().trim().max(200).optional(),
    status: Joi.string().valid('active', 'suspended', 'inactive', 'pending', 'deleted').optional(),
    plan: Joi.string().valid('basic', 'professional', 'enterprise', 'custom').optional(),
    features: Joi.array().items(Joi.string()).optional(),
    customDomain: Joi.string().trim().lowercase().optional(),
    settings: Joi.object().optional()
  })
};

const getTenantsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('active', 'suspended', 'inactive', 'pending', 'deleted').optional(),
    plan: Joi.string().valid('basic', 'professional', 'enterprise', 'custom').optional(),
    search: Joi.string().optional(),
    sortBy: Joi.string().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

// Routes
router.post(
  '/',
  authenticate,
  requireRole('super_admin'),
  validateRequest(createTenantSchema),
  asyncHandler(tenantController.createTenant)
);

router.get(
  '/',
  authenticate,
  requireRole('super_admin', 'tenant_admin'),
  validateRequest(getTenantsSchema),
  asyncHandler(tenantController.getTenants)
);

router.get(
  '/:tenantId',
  authenticate,
  requireRole('super_admin', 'tenant_admin'),
  asyncHandler(tenantController.getTenantById)
);

router.put(
  '/:tenantId',
  authenticate,
  requireRole('super_admin'),
  validateRequest(updateTenantSchema),
  asyncHandler(tenantController.updateTenant)
);

router.delete(
  '/:tenantId',
  authenticate,
  requireRole('super_admin'),
  asyncHandler(tenantController.deleteTenant)
);

module.exports = router;

