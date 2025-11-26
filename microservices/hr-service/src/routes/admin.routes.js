const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const asyncHandler = require('../utils/asyncHandler');
const Joi = require('joi');

const {
  getTenants,
  getTenantById,
  createTenant,
  updateTenant,
  suspendTenant,
  getTenantStats
} = require('../controllers/tenantController');

// Validation schemas
const createTenantSchema = {
  body: Joi.object({
    name: Joi.string().required().trim().max(200),
    companyName: Joi.string().required().trim(),
    domain: Joi.string().optional().trim().lowercase(),
    email: Joi.string().email().required().trim().lowercase(),
    phone: Joi.string().optional().trim(),
    address: Joi.object({
      street: Joi.string().optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      country: Joi.string().optional(),
      pincode: Joi.string().optional()
    }).optional(),
    subscription: Joi.object({
      plan: Joi.string().valid('Free', 'Basic', 'Professional', 'Enterprise').default('Basic'),
      startDate: Joi.date().optional(),
      endDate: Joi.date().optional()
    }).optional(),
    settings: Joi.object({
      maxUsers: Joi.number().optional(),
      maxStorage: Joi.number().optional(),
      features: Joi.array().items(Joi.string().valid('HRMS', 'CRM', 'Inventory', 'Financial', 'Sales', 'Admin')).optional()
    }).optional()
  })
};

const updateTenantSchema = {
  body: Joi.object({
    name: Joi.string().optional().trim(),
    companyName: Joi.string().optional().trim(),
    email: Joi.string().email().optional().trim().lowercase(),
    phone: Joi.string().optional().trim(),
    address: Joi.object({
      street: Joi.string().optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      country: Joi.string().optional(),
      pincode: Joi.string().optional()
    }).optional(),
    subscription: Joi.object({
      plan: Joi.string().valid('Free', 'Basic', 'Professional', 'Enterprise').optional(),
      startDate: Joi.date().optional(),
      endDate: Joi.date().optional(),
      status: Joi.string().valid('Active', 'Suspended', 'Cancelled', 'Expired').optional()
    }).optional(),
    settings: Joi.object({
      maxUsers: Joi.number().optional(),
      maxStorage: Joi.number().optional(),
      features: Joi.array().items(Joi.string()).optional()
    }).optional(),
    status: Joi.string().valid('Active', 'Inactive', 'Suspended').optional()
  })
};

const suspendTenantSchema = {
  body: Joi.object({
    reason: Joi.string().optional(),
    suspensionDate: Joi.date().optional()
  })
};

const getTenantsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(25),
    search: Joi.string().optional(),
    status: Joi.string().valid('Active', 'Inactive', 'Suspended').optional(),
    subscriptionPlan: Joi.string().valid('Free', 'Basic', 'Professional', 'Enterprise').optional()
  })
};

// Tenant Management Routes
// All routes require super-admin role
router.get(
  '/tenants',
  authenticate,
  requireRole(['superadmin', 'super-admin'], []),
  validateRequest(getTenantsSchema),
  asyncHandler(getTenants)
);

router.get(
  '/tenants/stats',
  authenticate,
  requireRole(['superadmin', 'super-admin'], []),
  asyncHandler(getTenantStats)
);

router.get(
  '/tenants/:id',
  authenticate,
  requireRole(['superadmin', 'super-admin'], []),
  asyncHandler(getTenantById)
);

router.post(
  '/tenants',
  authenticate,
  requireRole(['superadmin', 'super-admin'], []),
  validateRequest(createTenantSchema),
  asyncHandler(createTenant)
);

router.put(
  '/tenants/:id',
  authenticate,
  requireRole(['superadmin', 'super-admin'], []),
  validateRequest(updateTenantSchema),
  asyncHandler(updateTenant)
);

router.post(
  '/tenants/:id/suspend',
  authenticate,
  requireRole(['superadmin', 'super-admin'], []),
  validateRequest(suspendTenantSchema),
  asyncHandler(suspendTenant)
);

module.exports = router;

