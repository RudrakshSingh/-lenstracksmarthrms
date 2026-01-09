const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const asyncHandler = require('../utils/asyncHandler');
const Joi = require('joi');

const {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  assignRole,
  updateEmployeeStatus,
  getStores,
  createStore,
  getStoreById,
  updateStore,
  deleteStore,
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getWorkforce
} = require('../controllers/hrController');

// Validation schemas
const createEmployeeSchema = {
  body: Joi.object({
    employeeId: Joi.string().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().allow('').optional(), // Allow empty lastName (fullName will be created from firstName if lastName is empty)
    fullName: Joi.string().allow('').optional(), // Allow fullName (will be created from firstName + lastName if not provided)
    email: Joi.string().email().required(),
    password: Joi.string().min(8).optional(), // Optional - auth service handles password
    roleName: Joi.string().valid('SuperAdmin', 'Admin', 'HR', 'Manager', 'Employee', 'hr', 'admin', 'superadmin', 'manager', 'employee').optional(), // Optional - defaults to 'employee'
    phone: Joi.string().optional(),
    jobTitle: Joi.string().optional(),
    department: Joi.string().optional(),
    designation: Joi.string().optional(), // Frontend compatibility
    doj: Joi.date().optional(), // Date of joining
    joining_date: Joi.date().optional(), // Frontend compatibility
    status: Joi.string().valid('active', 'inactive', 'on-leave', 'terminated').optional(),
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
    designation: Joi.string().optional(), // Frontend compatibility
    roleName: Joi.string().valid('SuperAdmin', 'Admin', 'HR', 'Manager', 'Employee').optional(),
    storeId: Joi.string().optional(),
    status: Joi.string().valid('active', 'inactive', 'on-leave', 'terminated', 'pending').optional(),
    dateOfBirth: Joi.date().optional(),
    doj: Joi.date().optional(), // Date of joining
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
    limit: Joi.number().integer().min(1).max(1000).default(10), // Increased max to 1000
    status: Joi.string().valid('active', 'on_leave', 'terminated', 'pending', 'ACTIVE', 'ON_LEAVE', 'TERMINATED', 'PENDING').optional(), // Allow both cases
    store: Joi.string().optional(),
    role: Joi.string().optional(),
    department: Joi.string().optional(),
    search: Joi.string().optional()
  })
};

const assignRoleSchema = {
  body: Joi.object({
    roleName: Joi.string().valid(
      'SuperAdmin', 'Admin', 'HR', 'Manager', 'Employee',
      'superadmin', 'admin', 'hr', 'manager', 'employee',
      'tenant-admin', 'Tenant-Admin', 'TENANT-ADMIN'  // Map tenant-admin to admin
    ).required()
  })
};

const updateStatusSchema = {
  body: Joi.object({
    status: Joi.string().valid(
      'active', 'on_leave', 'terminated', 'pending',
      'ACTIVE', 'ON_LEAVE', 'TERMINATED', 'PENDING',
      'inactive', 'INACTIVE'
    ).required()
  })
};

const createStoreSchema = {
  body: Joi.object({
    name: Joi.string().required(),
    code: Joi.string().required(),
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().optional(), // Optional
      country: Joi.string().optional().default('India'), // Optional with default
      zipCode: Joi.string().optional(), // Optional
      zip: Joi.string().optional() // Alternative field name
    }).required(),
    coordinates: Joi.object({
      latitude: Joi.number().optional(), // Optional - can be added later
      longitude: Joi.number().optional() // Optional - can be added later
    }).optional(), // Entire coordinates object optional
    geofenceRadius: Joi.number().optional().default(100), // Optional with default
    contact: Joi.object({
      phone: Joi.string().optional(), // Optional
      email: Joi.string().email().optional() // Optional
    }).optional(), // Entire contact object optional
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

// Cache middleware for GET requests
const { cacheMiddleware } = require('../middleware/cache.middleware');

// Routes
router.get('/employees',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'hr', 'admin', 'superadmin'], ['user:read', 'read_users']),
  validateRequest(getEmployeesSchema),
  asyncHandler(getEmployees)
);

router.post('/employees',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['user:create']),
  validateRequest(createEmployeeSchema),
  asyncHandler(createEmployee)
);

router.get('/employees/:id',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'hr', 'admin', 'superadmin'], ['user:read', 'read_users']),
  asyncHandler(getEmployeeById)
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

// Department routes
router.get('/departments',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], ['department:read']),
  asyncHandler(getDepartments)
);

router.get('/departments/:id',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], ['department:read']),
  asyncHandler(getDepartmentById)
);

router.post('/departments',
  authenticate,
  requireRole(['Admin', 'SuperAdmin'], ['department:create']),
  asyncHandler(createDepartment)
);

router.put('/departments/:id',
  authenticate,
  requireRole(['Admin', 'SuperAdmin'], ['department:update']),
  asyncHandler(updateDepartment)
);

router.delete('/departments/:id',
  authenticate,
  requireRole(['Admin', 'SuperAdmin'], ['department:delete']),
  asyncHandler(deleteDepartment)
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

// Workforce route
router.get('/workforce',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager', 'hr', 'admin', 'superadmin', 'manager'], ['user:read', 'read_users']),
  asyncHandler(getWorkforce)
);

// Alias routes for letters (forward to hr-letter service)
router.get('/letters',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], []),
  asyncHandler(async (req, res, next) => {
    // Forward to hr-letter service
    const hrLetterController = require('../controllers/hrLetterController');
    return hrLetterController.getLetters(req, res, next);
  })
);

router.post('/letters',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], []),
  asyncHandler(async (req, res, next) => {
    const hrLetterController = require('../controllers/hrLetterController');
    return hrLetterController.createLetter(req, res, next);
  })
);

router.post('/letters/:id/approve',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], []),
  asyncHandler(async (req, res, next) => {
    const hrLetterController = require('../controllers/hrLetterController');
    req.params.letterId = req.params.id; // Map id to letterId
    return hrLetterController.approveLetter(req, res, next);
  })
);

module.exports = router;