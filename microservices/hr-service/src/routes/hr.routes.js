const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const { extractTenantId } = require('../middleware/tenant.middleware'); // CRITICAL: Tenant isolation middleware
const { validateTenantMiddleware } = require('../middleware/validateTenant.middleware'); // CRITICAL: Tenant validation middleware
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
    tenantId: Joi.string().optional().default('default'),
    name: Joi.string().required(),
    code: Joi.string().required(),
    description: Joi.string().optional(),
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().optional(),
      country: Joi.string().optional().default('India'),
      zipCode: Joi.string().optional(),
      zip: Joi.string().optional()
    }).required(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).optional(),
      longitude: Joi.number().min(-180).max(180).optional()
    }).optional(),
    googleMapsUrl: Joi.string()
      .uri()
      .optional()
      .custom((value, helpers) => {
        if (!value) return value;
        
        try {
          const url = new URL(value);
          const validDomains = ['maps.google.com', 'www.google.com', 'google.com', 'goo.gl'];
          const isValid = validDomains.some(domain => url.hostname.toLowerCase().endsWith(domain));
          
          if (!isValid) {
            return helpers.error('any.invalid', { 
              message: 'Must be a valid Google Maps URL (maps.google.com, google.com/maps, or goo.gl)' 
            });
          }
          
          return value;
        } catch {
          return helpers.error('string.uri');
        }
      }, 'Google Maps URL validation')
      .messages({
        'string.uri': 'Must be a valid URL',
        'any.invalid': 'Must be a valid Google Maps URL'
      }), // Google Maps URL with custom validation
    geofenceRadius: Joi.number().min(10).max(1000).optional().default(100),
    contact: Joi.object({
      phone: Joi.string().optional(),
      email: Joi.string().email().optional()
    }).optional(),
    phone: Joi.string().optional(), // Flat field for compatibility
    email: Joi.string().email().optional(), // Flat field for compatibility
    manager: Joi.object({
      employeeId: Joi.string().optional()
    }).optional(),
    operatingHours: Joi.object().optional(),
    store_type: Joi.string().valid('retail', 'warehouse', 'office', 'field', 'other').optional().default('retail'),
    status: Joi.string().valid('active', 'inactive', 'maintenance', 'closed', 'ACTIVE', 'INACTIVE', 'MAINTENANCE', 'CLOSED').optional().default('active')
  })
};

const updateStoreSchema = {
  body: Joi.object({
    id: Joi.string().optional(), // Frontend sends id, we ignore it but don't error
    name: Joi.string().optional(),
    code: Joi.string().optional(),
    description: Joi.string().optional(),
    address: Joi.object({
      street: Joi.string().optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      country: Joi.string().optional(),
      zipCode: Joi.string().optional(),
      zip: Joi.string().optional()
    }).optional(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).optional(),
      longitude: Joi.number().min(-180).max(180).optional()
    }).optional(),
    googleMapsUrl: Joi.string().uri().optional(),
    geofenceRadius: Joi.number().min(10).max(1000).optional(),
    contact: Joi.object({
      phone: Joi.string().optional(),
      email: Joi.string().email().optional()
    }).optional(),
    phone: Joi.string().optional(),
    email: Joi.string().email().optional(),
    manager: Joi.object({
      employeeId: Joi.string().optional()
    }).optional(),
    operatingHours: Joi.object().optional(),
    store_type: Joi.string().valid('retail', 'warehouse', 'office', 'field', 'other').optional(),
    status: Joi.string().valid('active', 'inactive', 'maintenance', 'closed', 'ACTIVE', 'INACTIVE', 'MAINTENANCE', 'CLOSED').optional()
  }).min(1) // At least one field must be provided
};

const getStoresSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(1000).default(100), // Default to 100 per frontend spec
    status: Joi.string().valid('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'CLOSED', 'active', 'inactive', 'maintenance', 'closed').optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    search: Joi.string().optional()
  })
};

const verifyGeofenceSchema = {
  body: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required()
  })
};

const assignManagerSchema = {
  body: Joi.object({
    employeeId: Joi.string().required()
  })
};

// Cache middleware for GET requests
const { cacheMiddleware } = require('../middleware/cache.middleware');

// Routes
router.get('/employees',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  // Removed requireRole to allow all authenticated users to query employees
  validateRequest(getEmployeesSchema),
  asyncHandler(getEmployees)
);

router.post('/employees',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['user:create']),
  validateRequest(createEmployeeSchema),
  asyncHandler(createEmployee)
);

router.get('/employees/:id',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  // Allow all roles to view employee details (for attendance, profile, etc)
  // Authorization check inside controller to ensure employees can only view their own data
  asyncHandler(getEmployeeById)
);

router.put('/employees/:id',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['user:update']),
  validateRequest(updateEmployeeSchema),
  asyncHandler(updateEmployee)
);

router.delete('/employees/:id',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['user:delete']),
  asyncHandler(deleteEmployee)
);

router.post('/employees/:id/assign-role',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['role:assign']),
  validateRequest(assignRoleSchema),
  asyncHandler(assignRole)
);

router.patch('/employees/:id/status',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['user:update']),
  validateRequest(updateStatusSchema),
  asyncHandler(updateEmployeeStatus)
);

// Department routes
router.get('/departments',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], ['department:read']),
  asyncHandler(getDepartments)
);

router.get('/departments/:id',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], ['department:read']),
  asyncHandler(getDepartmentById)
);

router.post('/departments',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  requireRole(['Admin', 'SuperAdmin'], ['department:create']),
  asyncHandler(createDepartment)
);

router.put('/departments/:id',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  requireRole(['Admin', 'SuperAdmin'], ['department:update']),
  asyncHandler(updateDepartment)
);

router.delete('/departments/:id',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  requireRole(['Admin', 'SuperAdmin'], ['department:delete']),
  asyncHandler(deleteDepartment)
);

// Store routes
router.get('/stores',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], ['store:read']),
  validateRequest(getStoresSchema),
  asyncHandler(getStores)
);

router.post('/stores',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['store:create']),
  validateRequest(createStoreSchema),
  asyncHandler(createStore)
);

router.get('/stores/:id',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  // Allow all authenticated users to view store details (needed for attendance geofencing)
  asyncHandler(getStoreById)
);

router.put('/stores/:id',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['store:update']),
  validateRequest(updateStoreSchema),
  asyncHandler(updateStore)
);

router.delete('/stores/:id',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['store:delete']),
  asyncHandler(deleteStore)
);

// NEW: Verify geofence for store
router.post('/stores/:id/verify-geofence',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  // Allow all authenticated users (employees need this for attendance)
  validateRequest(verifyGeofenceSchema),
  asyncHandler(async (req, res, next) => {
    const { verifyStoreGeofence } = require('../controllers/hrController');
    return verifyStoreGeofence(req, res, next);
  })
);

// NEW: Assign manager to store
router.post('/stores/:id/manager',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['store:update']),
  validateRequest(assignManagerSchema),
  asyncHandler(async (req, res, next) => {
    const { assignStoreManager } = require('../controllers/hrController');
    return assignStoreManager(req, res, next);
  })
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