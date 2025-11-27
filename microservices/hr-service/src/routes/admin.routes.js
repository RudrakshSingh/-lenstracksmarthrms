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

const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  suspendUser,
  resetPassword
} = require('../controllers/adminUserController');

const {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole
} = require('../controllers/adminRoleController');

const {
  getSettings,
  updateSettings
} = require('../controllers/systemSettingsController');

const {
  getAdminHealth,
  getAdminMetrics
} = require('../controllers/adminHealthController');

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

// User Management Routes
// All routes require admin or superadmin role
const createUserSchema = {
  body: Joi.object({
    employeeId: Joi.string().required().trim().min(3).max(20),
    firstName: Joi.string().required().trim().min(2).max(100),
    lastName: Joi.string().required().trim().min(2).max(100),
    email: Joi.string().email().required().trim().lowercase(),
    phone: Joi.string().required().trim(),
    password: Joi.string().required().min(8),
    role: Joi.string().required(),
    department: Joi.string().optional().trim(),
    jobTitle: Joi.string().optional().trim(),
    store: Joi.string().optional(),
    status: Joi.string().valid('active', 'on_leave', 'terminated', 'pending').default('active')
  })
};

const updateUserSchema = {
  body: Joi.object({
    firstName: Joi.string().optional().trim().min(2).max(100),
    lastName: Joi.string().optional().trim().min(2).max(100),
    email: Joi.string().email().optional().trim().lowercase(),
    phone: Joi.string().optional().trim(),
    password: Joi.string().optional().min(8),
    role: Joi.string().optional(),
    department: Joi.string().optional().trim(),
    jobTitle: Joi.string().optional().trim(),
    store: Joi.string().optional(),
    status: Joi.string().valid('active', 'on_leave', 'terminated', 'pending').optional()
  })
};

const suspendUserSchema = {
  body: Joi.object({
    reason: Joi.string().optional().max(500)
  })
};

const resetPasswordSchema = {
  body: Joi.object({
    newPassword: Joi.string().required().min(8)
  })
};

const getUsersSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(25),
    search: Joi.string().optional(),
    status: Joi.string().valid('active', 'on_leave', 'terminated', 'pending').optional(),
    role: Joi.string().optional(),
    department: Joi.string().optional()
  })
};

router.get(
  '/users',
  authenticate,
  requireRole(['admin', 'superadmin', 'super-admin'], []),
  validateRequest(getUsersSchema),
  asyncHandler(getUsers)
);

router.get(
  '/users/:id',
  authenticate,
  requireRole(['admin', 'superadmin', 'super-admin'], []),
  asyncHandler(getUserById)
);

router.post(
  '/users',
  authenticate,
  requireRole(['admin', 'superadmin', 'super-admin'], []),
  validateRequest(createUserSchema),
  asyncHandler(createUser)
);

router.put(
  '/users/:id',
  authenticate,
  requireRole(['admin', 'superadmin', 'super-admin'], []),
  validateRequest(updateUserSchema),
  asyncHandler(updateUser)
);

router.post(
  '/users/:id/suspend',
  authenticate,
  requireRole(['admin', 'superadmin', 'super-admin'], []),
  validateRequest(suspendUserSchema),
  asyncHandler(suspendUser)
);

router.post(
  '/users/:id/reset-password',
  authenticate,
  requireRole(['admin', 'superadmin', 'super-admin'], []),
  validateRequest(resetPasswordSchema),
  asyncHandler(resetPassword)
);

// Role Management Routes
// All routes require admin or superadmin role
const createRoleSchema = {
  body: Joi.object({
    name: Joi.string().required().trim().lowercase().valid('superadmin', 'admin', 'hr', 'manager', 'employee'),
    display_name: Joi.string().required().trim(),
    description: Joi.string().optional().trim().max(500),
    permissions: Joi.array().items(Joi.string()).optional()
  })
};

const updateRoleSchema = {
  body: Joi.object({
    name: Joi.string().optional().trim().lowercase().valid('superadmin', 'admin', 'hr', 'manager', 'employee'),
    display_name: Joi.string().optional().trim(),
    description: Joi.string().optional().trim().max(500),
    permissions: Joi.array().items(Joi.string()).optional()
  })
};

const getRolesSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(25),
    search: Joi.string().optional()
  })
};

router.get(
  '/roles',
  authenticate,
  requireRole(['admin', 'superadmin', 'super-admin'], []),
  validateRequest(getRolesSchema),
  asyncHandler(getRoles)
);

router.get(
  '/roles/:id',
  authenticate,
  requireRole(['admin', 'superadmin', 'super-admin'], []),
  asyncHandler(getRoleById)
);

router.post(
  '/roles',
  authenticate,
  requireRole(['admin', 'superadmin', 'super-admin'], []),
  validateRequest(createRoleSchema),
  asyncHandler(createRole)
);

router.put(
  '/roles/:id',
  authenticate,
  requireRole(['admin', 'superadmin', 'super-admin'], []),
  validateRequest(updateRoleSchema),
  asyncHandler(updateRole)
);

router.delete(
  '/roles/:id',
  authenticate,
  requireRole(['admin', 'superadmin', 'super-admin'], []),
  asyncHandler(deleteRole)
);

// System Settings Routes
// All routes require admin or superadmin role
const updateSettingsSchema = {
  body: Joi.object().pattern(
    Joi.string(),
    Joi.object({
      value: Joi.any().required(),
      type: Joi.string().valid('string', 'number', 'boolean', 'object', 'array').optional(),
      category: Joi.string().valid('general', 'email', 'sms', 'notification', 'security', 'integration', 'feature', 'other').optional(),
      description: Joi.string().optional().max(500),
      isPublic: Joi.boolean().optional()
    })
  )
};

router.get(
  '/settings',
  authenticate,
  requireRole(['admin', 'superadmin', 'super-admin'], []),
  asyncHandler(getSettings)
);

router.put(
  '/settings',
  authenticate,
  requireRole(['admin', 'superadmin', 'super-admin'], []),
  validateRequest(updateSettingsSchema),
  asyncHandler(updateSettings)
);

// Admin Health & Monitoring Routes
// All routes require admin or superadmin role
router.get(
  '/health',
  authenticate,
  requireRole(['admin', 'superadmin', 'super-admin'], []),
  asyncHandler(getAdminHealth)
);

router.get(
  '/metrics',
  authenticate,
  requireRole(['admin', 'superadmin', 'super-admin'], []),
  asyncHandler(getAdminMetrics)
);

module.exports = router;

