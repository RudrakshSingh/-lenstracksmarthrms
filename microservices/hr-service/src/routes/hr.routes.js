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

// OPTIMIZED: Add caching middleware for frequently accessed endpoints
// Note: cacheMiddleware is already declared above, don't redeclare

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
    // Basic Information
    firstName: Joi.string().allow('', null).optional(),
    lastName: Joi.string().allow('', null).optional(),
    fullName: Joi.string().allow('', null).optional(),
    email: Joi.string().email().allow('', null).optional(),
    phone: Joi.string().allow('', null).optional(),
    gender: Joi.string().valid('Male', 'Female', 'Other').allow('', null).optional(),
    dateOfBirth: Joi.date().allow(null).optional(),
    dob: Joi.date().allow(null).optional(),
    
    // Work Details
    jobTitle: Joi.string().allow('', null).optional(),
    department: Joi.string().allow('', null).optional(),
    designation: Joi.string().allow('', null).optional(), // Frontend compatibility
    roleName: Joi.string().valid('SuperAdmin', 'Admin', 'HR', 'Manager', 'Employee').allow('', null).optional(),
    roleFamily: Joi.string().allow('', null).optional(),
    role_family: Joi.string().allow('', null).optional(),
    gradeBand: Joi.string().allow('', null).optional(),
    grade_band: Joi.string().allow('', null).optional(),
    storeId: Joi.string().allow(null, '').optional(),
    status: Joi.string().valid('active', 'inactive', 'on-leave', 'terminated', 'pending').allow('', null).optional(),
    doj: Joi.date().allow(null).optional(), // Date of joining
    joining_date: Joi.date().allow(null).optional(),
    confirmationDate: Joi.date().allow(null).optional(),
    confirmation_date: Joi.date().allow(null).optional(),
    reportingManager: Joi.string().allow('', null).optional(),
    reporting_manager: Joi.string().allow('', null).optional(),
    
    // Salary & Compensation
    annual_ctc: Joi.number().min(0).allow(null).optional(),
    annualCtc: Joi.number().min(0).allow(null).optional(),
    salary_breakdown: Joi.object({
      basic: Joi.number().min(0).allow(null).optional(),
      hra: Joi.number().min(0).allow(null).optional(),
      special_allowance: Joi.number().min(0).allow(null).optional(),
      pf_employer: Joi.number().min(0).allow(null).optional(),
      gratuity: Joi.number().min(0).allow(null).optional(),
      other_allowances: Joi.alternatives().try(
        Joi.number().min(0),
        Joi.string().allow('').empty('').default(0)
      ).optional().default(0)
    }).optional(),
    salaryBreakdown: Joi.object({
      basic: Joi.number().min(0).allow(null).optional(),
      hra: Joi.number().min(0).allow(null).optional(),
      special_allowance: Joi.number().min(0).allow(null).optional(),
      pf_employer: Joi.number().min(0).allow(null).optional(),
      gratuity: Joi.number().min(0).allow(null).optional(),
      other_allowances: Joi.alternatives().try(
        Joi.number().min(0),
        Joi.string().allow('').empty('').default(0)
      ).optional().default(0)
    }).optional(),
    
    // Statutory Information
    uan: Joi.string().pattern(/^\d{12}$/).allow('', null).optional().empty('').default(null),
    esiNo: Joi.string().pattern(/^\d{15}$/).allow('', null).optional().empty('').default(null),
    esi_number: Joi.string().pattern(/^\d{15}$/).allow('', null).optional().empty('').default(null),
    panNumber: Joi.string().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).allow('', null).optional().empty('').default(null),
    pan_number: Joi.string().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).allow('', null).optional().empty('').default(null),
    aadharMasked: Joi.string().allow('', null).optional().empty('').default(null),
    aadhar_masked: Joi.string().allow('', null).optional().empty('').default(null),
    
    // Bank Account
    bankAccount: Joi.object({
      accountNumber: Joi.string().allow('', null).optional().empty('').default(null),
      account_number: Joi.string().allow('', null).optional().empty('').default(null),
      ifscCode: Joi.string().pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/).allow('', null).optional().empty('').default(null),
      ifsc_code: Joi.string().pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/).allow('', null).optional().empty('').default(null),
      bankName: Joi.string().allow('', null).optional().empty('').default(null),
      bank_name: Joi.string().allow('', null).optional().empty('').default(null),
      branchName: Joi.string().allow('', null).optional().empty('').default(null),
      branch_name: Joi.string().allow('', null).optional().empty('').default(null),
      accountType: Joi.string().valid('Savings', 'Current', 'Salary').allow('', null).optional().empty('').default(null),
      account_type: Joi.string().valid('Savings', 'Current', 'Salary').allow('', null).optional().empty('').default(null)
    }).optional().allow(null),
    bank_account: Joi.object({
      accountNumber: Joi.string().allow('', null).optional().empty('').default(null),
      account_number: Joi.string().allow('', null).optional().empty('').default(null),
      ifscCode: Joi.string().pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/).allow('', null).optional().empty('').default(null),
      ifsc_code: Joi.string().pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/).allow('', null).optional().empty('').default(null),
      bankName: Joi.string().allow('', null).optional().empty('').default(null),
      bank_name: Joi.string().allow('', null).optional().empty('').default(null),
      branchName: Joi.string().allow('', null).optional().empty('').default(null),
      branch_name: Joi.string().allow('', null).optional().empty('').default(null),
      accountType: Joi.string().valid('Savings', 'Current', 'Salary').allow('', null).optional().empty('').default(null),
      account_type: Joi.string().valid('Savings', 'Current', 'Salary').allow('', null).optional().empty('').default(null)
    }).optional().allow(null),
    
    // Emergency Contact
    emergencyContact: Joi.object({
      name: Joi.string().allow('', null).optional().empty('').default(null),
      relationship: Joi.string().valid('Father', 'Mother', 'Spouse', 'Sibling', 'Child', 'Friend', 'Other').allow('', null).optional().empty('').default(null),
      phone: Joi.string().allow('', null).optional().empty('').default(null),
      contact_number: Joi.string().allow('', null).optional().empty('').default(null)
    }).optional().allow(null),
    emergency_contact: Joi.object({
      name: Joi.string().allow('', null).optional().empty('').default(null),
      relationship: Joi.string().valid('Father', 'Mother', 'Spouse', 'Sibling', 'Child', 'Friend', 'Other').allow('', null).optional().empty('').default(null),
      phone: Joi.string().allow('', null).optional().empty('').default(null),
      contact_number: Joi.string().allow('', null).optional().empty('').default(null)
    }).optional().allow(null),
    
    // Address
    address: Joi.object({
      street: Joi.string().optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      zip: Joi.string().optional(),
      country: Joi.string().optional()
    }).optional(),
    currentAddress: Joi.object({
      lines: Joi.array().items(Joi.string()).optional(),
      address_line_1: Joi.string().optional(),
      line1: Joi.string().optional(),
      address_line_2: Joi.string().optional(),
      line2: Joi.string().optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      pincode: Joi.string().optional(),
      zip: Joi.string().optional(),
      country: Joi.string().optional()
    }).optional(),
    current_address: Joi.object({
      lines: Joi.array().items(Joi.string()).optional(),
      address_line_1: Joi.string().optional(),
      line1: Joi.string().optional(),
      address_line_2: Joi.string().optional(),
      line2: Joi.string().optional(),
      city: Joi.string().optional(),
      state: Joi.string().optional(),
      pincode: Joi.string().optional(),
      zip: Joi.string().optional(),
      country: Joi.string().optional()
    }).optional(),
    
    // Work Location
    workLocation: Joi.object({
      storeId: Joi.string().optional().allow(null, ''),
      storeName: Joi.string().optional().allow(null, ''),
      city: Joi.string().optional().allow(null, ''),
      state: Joi.string().optional().allow(null, ''),
      pincode: Joi.string().optional().allow(null, '')
    }).optional().allow(null),
    work_location: Joi.object({
      storeId: Joi.string().optional().allow(null, ''),
      storeName: Joi.string().optional().allow(null, ''),
      city: Joi.string().optional().allow(null, ''),
      state: Joi.string().optional().allow(null, ''),
      pincode: Joi.string().optional().allow(null, '')
    }).optional().allow(null),
    
    // Previous Employment
    previousEmployment: Joi.object().optional().allow(null),
    previous_employment: Joi.object().optional().allow(null),
    
    // Other fields
    tenantId: Joi.string().optional()
  }).min(1) // At least one field must be provided
};

const getEmployeesSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(1000).default(10), // Increased max to 1000
    status: Joi.string().valid('active', 'on_leave', 'terminated', 'pending', 'ACTIVE', 'ON_LEAVE', 'TERMINATED', 'PENDING').optional(), // Allow both cases
    store: Joi.string().optional(),
    role: Joi.string().optional(),
    department: Joi.string().optional(),
    search: Joi.string().optional(),
    employeeId: Joi.string().optional() // CRITICAL: Allow employeeId query parameter for attendance service lookup
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
    code: Joi.string().optional(),
    storeCode: Joi.string().optional(), // Frontend compatibility
    description: Joi.string().optional(),
    address: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().optional(),
      country: Joi.string().optional().default('India'),
      zipCode: Joi.string().optional(),
      zip: Joi.string().optional()
    }).optional(),
    // Flat address fields for frontend compatibility
    street: Joi.string().optional(),
    city: Joi.string().optional(),
    state: Joi.string().optional(),
    pincode: Joi.string().optional(),
    country: Joi.string().optional(),
    // Flat coordinates for frontend compatibility
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    // Frontend-generated fields (ignored by backend service)
    id: Joi.string().optional(),
    full_address: Joi.string().optional(),
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
    .or('code', 'storeCode')
    .custom((value, helpers) => {
      // Accept either nested address or flat address; require street and city either way.
      const hasNestedAddress = !!value.address;
      const hasFlatAddress = !!(value.street || value.city);
      const nestedStreet = value.address?.street;
      const nestedCity = value.address?.city;

      if (!hasNestedAddress && !hasFlatAddress) {
        return helpers.error('any.invalid', { message: 'Either address object or flat street/city fields are required' });
      }

      if (hasNestedAddress && (!nestedStreet || !nestedCity)) {
        return helpers.error('any.invalid', { message: 'address.street and address.city are required' });
      }

      if (!hasNestedAddress && (!value.street || !value.city)) {
        return helpers.error('any.invalid', { message: 'street and city are required when address object is not provided' });
      }

      return value;
    }, 'store payload compatibility validation')
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

// Alias route for /api/hr/employee/:id (singular) - frontend compatibility
router.get('/employee/:id',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  // Allow all roles to view employee details (for attendance, profile, etc)
  // Authorization check inside controller to ensure employees can only view their own data
  asyncHandler(getEmployeeById)
);

router.put('/employees/:id',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware({ allowSuperAdminWithoutTenant: true }), // 2. Validate tenant (allows superadmin to bypass for tenant migration)
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

// Role assignment - Support both POST and PUT for frontend compatibility
router.post('/employees/:id/assign-role',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['role:assign']),
  validateRequest(assignRoleSchema),
  asyncHandler(assignRole)
);

// Frontend sends PUT requests - add PUT route for compatibility
router.put('/employees/:id/assign-role',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['role:assign']),
  validateRequest(assignRoleSchema),
  asyncHandler(assignRole)
);

// Employee status update - Support both PATCH and PUT for frontend compatibility
router.patch('/employees/:id/status',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['user:update']),
  validateRequest(updateStatusSchema),
  asyncHandler(updateEmployeeStatus)
);

// Frontend sends PUT requests - add PUT route for status updates
router.put('/employees/:id/status',
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
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['department:create']), // Added HR role
  asyncHandler(createDepartment)
);

router.put('/departments/:id',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['department:update']), // Added HR role
  asyncHandler(updateDepartment)
);

router.delete('/departments/:id',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['department:delete']), // Added HR role
  asyncHandler(deleteDepartment)
);

// Store routes
router.get('/stores',
  authenticate, // 1. Authenticate first (sets req.user with tenantId from token)
  validateTenantMiddleware(), // 2. Validate tenant (compares header with token)
  extractTenantId, // 3. Extract tenantId (already validated, just normalize)
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager', 'Employee'], []),
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

// Roster: nested under /api/hr/roster (same router as employees/stores).
// Standalone app.use('/api/hr/roster', ...) in server.js can fail to run if that block errors;
// mounting here guarantees registration whenever hr.routes loads.
const rosterRoutes = require('./roster.routes');
router.use('/roster', rosterRoutes);

module.exports = router;
