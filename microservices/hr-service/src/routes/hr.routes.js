const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const asyncHandler = require('../utils/asyncHandler');
const Joi = require('joi');

const {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  assignRole,
  updateEmployeeStatus,
  getStores,
  createStore,
  getStoreById,
  updateStore,
  deleteStore
} = require('../controllers/hrController');

// Validation schemas
const createEmployeeSchema = {
  body: Joi.object({
    employeeId: Joi.string().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    roleName: Joi.string().valid('SuperAdmin', 'Admin', 'HR', 'Manager', 'Employee', 'hr', 'admin', 'superadmin', 'manager', 'employee').required(),
    phone: Joi.string().optional(),
    jobTitle: Joi.string().optional(),
    department: Joi.string().optional(),
    storeId: Joi.string().optional(),
    dateOfBirth: Joi.date().optional(),
    address: Joi.object({
      street: Joi.string().optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      zip: Joi.string().optional(),
      country: Joi.string().optional()
    }).optional()
  })
};

const updateEmployeeSchema = {
  body: Joi.object({
    firstName: Joi.string().optional(),
    lastName: Joi.string().optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().optional(),
    jobTitle: Joi.string().optional(),
    department: Joi.string().optional(),
    roleName: Joi.string().valid('SuperAdmin', 'Admin', 'HR', 'Manager', 'Employee').optional(),
    storeId: Joi.string().optional(),
    status: Joi.string().valid('active', 'on_leave', 'terminated', 'pending').optional(),
    dateOfBirth: Joi.date().optional(),
    address: Joi.object({
      street: Joi.string().optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      zip: Joi.string().optional(),
      country: Joi.string().optional()
    }).optional()
  })
};

const getEmployeesSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid('active', 'on_leave', 'terminated', 'pending').optional(),
    store: Joi.string().optional(),
    role: Joi.string().optional(),
    department: Joi.string().optional(),
    search: Joi.string().optional()
  })
};

const assignRoleSchema = {
  body: Joi.object({
    roleName: Joi.string().valid('SuperAdmin', 'Admin', 'HR', 'Manager', 'Employee', 'superadmin', 'admin', 'hr', 'manager', 'employee').required()
  })
};

const updateStatusSchema = {
  body: Joi.object({
    status: Joi.string().valid('active', 'on_leave', 'terminated', 'pending').required()
  })
};

const createStoreSchema = {
  body: Joi.object({
    name: Joi.string().required(),
    code: Joi.string().required(),
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      country: Joi.string().required(),
      zipCode: Joi.string().required()
    }).required(),
    coordinates: Joi.object({
      latitude: Joi.number().required(),
      longitude: Joi.number().required()
    }).required(),
    geofenceRadius: Joi.number().required(),
    contact: Joi.object({
      phone: Joi.string().required(),
      email: Joi.string().email().required()
    }).required(),
    operatingHours: Joi.object().optional()
  })
};

const updateStoreSchema = {
  body: Joi.object({
    name: Joi.string().optional(),
    code: Joi.string().optional(),
    address: Joi.object({
      street: Joi.string().optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      country: Joi.string().optional(),
      zipCode: Joi.string().optional()
    }).optional(),
    coordinates: Joi.object({
      latitude: Joi.number().optional(),
      longitude: Joi.number().optional()
    }).optional(),
    geofenceRadius: Joi.number().optional(),
    contact: Joi.object({
      phone: Joi.string().optional(),
      email: Joi.string().email().optional()
    }).optional(),
    operatingHours: Joi.object().optional()
  })
};

// Routes
router.get('/employees',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['user:read']),
  validateRequest(getEmployeesSchema),
  asyncHandler(getEmployees)
);

router.post('/employees',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['user:create']),
  validateRequest(createEmployeeSchema),
  asyncHandler(createEmployee)
);

router.put('/employees/:id',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['user:update']),
  validateRequest(updateEmployeeSchema),
  asyncHandler(updateEmployee)
);

router.delete('/employees/:id',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['user:delete']),
  asyncHandler(deleteEmployee)
);

router.post('/employees/:id/assign-role',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['role:assign']),
  validateRequest(assignRoleSchema),
  asyncHandler(assignRole)
);

router.patch('/employees/:id/status',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['user:update']),
  validateRequest(updateStatusSchema),
  asyncHandler(updateEmployeeStatus)
);

// Store routes
router.get('/stores',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], ['store:read']),
  asyncHandler(getStores)
);

router.post('/stores',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['store:create']),
  validateRequest(createStoreSchema),
  asyncHandler(createStore)
);

router.get('/stores/:id',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], ['store:read']),
  asyncHandler(getStoreById)
);

router.put('/stores/:id',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['store:update']),
  validateRequest(updateStoreSchema),
  asyncHandler(updateStore)
);

router.delete('/stores/:id',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['store:delete']),
  asyncHandler(deleteStore)
);

module.exports = router;