const HRService = require('../services/hr.service');
const logger = require('../config/logger');
const Department = require('../models/Department.model');
const { 
  sendSuccess, 
  sendError, 
  sendNotFound, 
  sendServiceUnavailable,
  createPagination,
  parsePagination,
  parseFilters,
  formatEmployee,
  validateRequired
} = require('../../shared/utils/response.util.js');

/**
 * Get all employees
 * GET /api/employees
 * Query Parameters: page, limit, search, department, status, store, role, manager
 */
const getEmployees = async (req, res, next) => {
  try {
    // Normalize status to lowercase if provided
    if (req.query.status) {
      req.query.status = req.query.status.toLowerCase();
    }
    
    // Parse pagination
    const { page, limit, skip } = parsePagination(req.query);
    
    // Parse filters
    const allowedFilters = ['department', 'status', 'store', 'role', 'manager'];
    const filters = parseFilters(req.query, allowedFilters);

    // Get employees from service
    const result = await HRService.getEmployees(filters, page, limit);

    // Format employees
    const employees = Array.isArray(result.data) 
      ? result.data.map(emp => formatEmployee(emp))
      : (result.employees || []).map(emp => formatEmployee(emp));

    // Create pagination object
    const total = result.total || result.count || employees.length;
    const pagination = createPagination(page, limit, total);

    // Send standardized response
    return sendSuccess(res, employees, 'Employees retrieved successfully', pagination, 200);
  } catch (error) {
    logger.error('Error in getEmployees controller', { error: error.message, userId: req.user?._id });
    
    // Handle validation errors - return 400 instead of 500
    if (error.statusCode === 400 || error.name === 'ValidationError' || (error.message && error.message.includes('Validation failed'))) {
      return sendError(res, error.message || 'Validation failed', 'Validation failed', 400);
    }
    
    // Check if it's a service unavailable error
    if (error.message && error.message.includes('unavailable')) {
      return sendServiceUnavailable(res, 'fetch employees');
    }
    
    next(error);
  }
};

/**
 * Create new employee
 * POST /api/employees
 * Required fields: fullName, email, department
 */
const createEmployee = async (req, res, next) => {
  try {
    const employeeData = req.body;
    const createdBy = req.user?._id || req.user?.id;

    // Validate authentication
    if (!createdBy) {
      return sendError(res, 'Authentication required', 'Authentication required', 401);
    }

    // Validate required fields
    const requiredFields = ['fullName', 'email', 'department'];
    const validationError = validateRequired(employeeData, requiredFields);
    if (validationError) {
      return sendError(res, validationError.error, validationError.message, 400);
    }

    // Create employee
    const employee = await HRService.createEmployee(employeeData, createdBy);

    // Format response
    const formattedEmployee = formatEmployee(employee);

    // Send standardized response
    return sendSuccess(res, formattedEmployee, 'Employee created successfully', null, 201);
  } catch (error) {
    logger.error('Error in createEmployee controller', { error: error.message, userId: req.user?._id || req.user?.id });
    
    // Check if it's a service unavailable error
    if (error.message && error.message.includes('unavailable')) {
      return sendServiceUnavailable(res, 'create employee');
    }
    
    // Check if it's a validation error
    if (error.name === 'ValidationError' || error.statusCode === 400) {
      return sendError(res, error.message || 'Validation failed', 'Validation failed', 400);
    }
    
    next(error);
  }
};

/**
 * Get employee by ID
 * GET /api/employees/[id]
 */
const getEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const employee = await HRService.getEmployeeById(id);

    if (!employee) {
      return sendNotFound(res, 'Employee', id);
    }

    // Format response
    const formattedEmployee = formatEmployee(employee);

    return sendSuccess(res, formattedEmployee, 'Employee retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getEmployeeById controller', { error: error.message, userId: req.user?._id });
    
    if (error.name === 'CastError' || error.statusCode === 404 || error.message.includes('not found')) {
      return sendNotFound(res, 'Employee', req.params.id);
    }
    
    if (error.message && error.message.includes('unavailable')) {
      return sendServiceUnavailable(res, 'fetch employee');
    }
    
    next(error);
  }
};

/**
 * Update employee
 * PUT /api/employees/[id]
 */
const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updatedBy = req.user._id;

    const employee = await HRService.updateEmployee(id, updateData, updatedBy);

    if (!employee) {
      return sendNotFound(res, 'Employee', id);
    }

    // Format response
    const formattedEmployee = formatEmployee(employee);

    return sendSuccess(res, formattedEmployee, 'Employee updated successfully', null, 200);
  } catch (error) {
    logger.error('Error in updateEmployee controller', { error: error.message, userId: req.user?._id });
    
    if (error.name === 'CastError' || error.statusCode === 404 || error.message.includes('not found')) {
      return sendNotFound(res, 'Employee', req.params.id);
    }
    
    if (error.name === 'ValidationError' || error.statusCode === 400) {
      return sendError(res, error.message || 'Validation failed', 'Validation failed', 400);
    }
    
    if (error.message && error.message.includes('unavailable')) {
      return sendServiceUnavailable(res, 'update employee');
    }
    
    next(error);
  }
};

/**
 * Delete employee
 * DELETE /api/employees/[id]
 */
const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedBy = req.user._id;

    const result = await HRService.deleteEmployee(id, deletedBy);

    if (!result || (result.deletedCount !== undefined && result.deletedCount === 0)) {
      return sendNotFound(res, 'Employee', id);
    }

    return sendSuccess(res, null, result.message || 'Employee deleted successfully', null, 200);
  } catch (error) {
    logger.error('Error in deleteEmployee controller', { error: error.message, userId: req.user?._id });
    
    if (error.name === 'CastError' || error.statusCode === 404 || error.message.includes('not found')) {
      return sendNotFound(res, 'Employee', req.params.id);
    }
    
    if (error.message && error.message.includes('unavailable')) {
      return sendServiceUnavailable(res, 'delete employee');
    }
    
    next(error);
  }
};

/**
 * Assign role to employee
 * POST /api/employees/[id]/assign-role
 */
const assignRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { roleName } = req.body;
    const assignedBy = req.user._id;

    // Validate required fields
    const validationError = validateRequired({ roleName }, ['roleName']);
    if (validationError) {
      return sendError(res, validationError.error, validationError.message, 400);
    }

    const employee = await HRService.assignRole(id, roleName, assignedBy);

    if (!employee) {
      return sendNotFound(res, 'Employee', id);
    }

    // Format response
    const formattedEmployee = formatEmployee(employee);

    return sendSuccess(res, formattedEmployee, 'Role assigned successfully', null, 200);
  } catch (error) {
    logger.error('Error in assignRole controller', { error: error.message, userId: req.user?._id });
    
    if (error.name === 'CastError' || error.statusCode === 404 || error.message.includes('not found')) {
      return sendNotFound(res, 'Employee', req.params.id);
    }
    
    if (error.name === 'ValidationError' || error.statusCode === 400) {
      return sendError(res, error.message || 'Validation failed', 'Validation failed', 400);
    }
    
    next(error);
  }
};

/**
 * Update employee status
 * POST /api/employees/[id]/status
 */
const updateEmployeeStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    let { status } = req.body;
    const updatedBy = req.user._id;

    // Normalize status to lowercase
    if (status) {
      status = status.toLowerCase();
      req.body.status = status; // Update req.body for validation
    }

    // Validate required fields
    const validationError = validateRequired({ status }, ['status']);
    if (validationError) {
      return sendError(res, validationError.error, validationError.message, 400);
    }

    const employee = await HRService.updateEmployeeStatus(id, status, updatedBy);

    if (!employee) {
      return sendNotFound(res, 'Employee', id);
    }

    // Format response
    const formattedEmployee = formatEmployee(employee);

    return sendSuccess(res, formattedEmployee, 'Employee status updated successfully', null, 200);
  } catch (error) {
    logger.error('Error in updateEmployeeStatus controller', { error: error.message, userId: req.user?._id });
    
    // Handle validation errors - return 400 instead of 500
    if (error.statusCode === 400 || error.name === 'ValidationError' || (error.message && error.message.includes('Validation failed'))) {
      return sendError(res, error.message || 'Validation failed', 'Validation failed', 400);
    }
    
    if (error.name === 'CastError' || error.statusCode === 404 || error.message.includes('not found')) {
      return sendNotFound(res, 'Employee', req.params.id);
    }
    
    next(error);
  }
};

/**
 * Get all stores
 * GET /api/stores
 */
const getStores = async (req, res, next) => {
  try {
    // Parse pagination
    const { page, limit, skip } = parsePagination(req.query);

    // Parse filters
    const allowedFilters = ['status', 'nature'];
    const filters = parseFilters(req.query, allowedFilters);

    const result = await HRService.getStores(filters, page, limit);

    // Ensure result has stores array
    const stores = Array.isArray(result.data) 
      ? result.data 
      : (result.stores || (Array.isArray(result) ? result : []));

    // Create pagination object
    const total = result.total || result.count || stores.length;
    const pagination = createPagination(page, limit, total);

    return sendSuccess(res, stores, 'Stores retrieved successfully', pagination, 200);
  } catch (error) {
    logger.error('Error in getStores controller', { error: error.message, userId: req.user?._id });
    
    if (error.message && error.message.includes('unavailable')) {
      return sendServiceUnavailable(res, 'fetch stores');
    }
    
    next(error);
  }
};

/**
 * Create a new store
 * POST /api/stores
 */
const createStore = async (req, res, next) => {
  try {
    const storeData = req.body;
    const createdBy = req.user?._id || req.user?.id;

    // Validate authentication
    if (!createdBy) {
      return sendError(res, 'Authentication required', 'Authentication required', 401);
    }

    // Validate required fields
    const requiredFields = ['name', 'code', 'address', 'gst'];
    const validationError = validateRequired(storeData, requiredFields);
    if (validationError) {
      return sendError(res, validationError.error, validationError.message, 400);
    }

    const store = await HRService.createStore(storeData, createdBy);

    return sendSuccess(res, store, 'Store created successfully', null, 201);
  } catch (error) {
    logger.error('Error in createStore controller', { error: error.message, userId: req.user?._id || req.user?.id });
    
    if (error.message && error.message.includes('unavailable')) {
      return sendServiceUnavailable(res, 'create store');
    }
    
    if (error.name === 'ValidationError' || error.statusCode === 400) {
      return sendError(res, error.message || 'Validation failed', 'Validation failed', 400);
    }
    
    next(error);
  }
};

/**
 * Get store by ID
 * GET /api/stores/[id]
 */
const getStoreById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const store = await HRService.getStoreById(id);

    if (!store) {
      return sendNotFound(res, 'Store', id);
    }

    return sendSuccess(res, store, 'Store retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getStoreById controller', { error: error.message, userId: req.user?._id });
    
    // Check if it's a not found error
    if (error.name === 'CastError' || error.statusCode === 404 || error.message.includes('not found')) {
      return sendNotFound(res, 'Store', req.params.id);
    }
    
    next(error);
  }
};

/**
 * Update store
 * PUT /api/stores/[id]
 */
const updateStore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updatedBy = req.user._id;

    const store = await HRService.updateStore(id, updateData, updatedBy);

    if (!store) {
      return sendNotFound(res, 'Store', id);
    }

    return sendSuccess(res, store, 'Store updated successfully', null, 200);
  } catch (error) {
    logger.error('Error in updateStore controller', { error: error.message, userId: req.user?._id });
    
    if (error.name === 'CastError' || error.statusCode === 404 || error.message.includes('not found')) {
      return sendNotFound(res, 'Store', req.params.id);
    }
    
    if (error.name === 'ValidationError' || error.statusCode === 400) {
      return sendError(res, error.message || 'Validation failed', 'Validation failed', 400);
    }
    
    next(error);
  }
};

/**
 * Delete store
 * DELETE /api/stores/[id]
 */
const deleteStore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedBy = req.user._id;

    const result = await HRService.deleteStore(id, deletedBy);

    if (!result || (result.deletedCount !== undefined && result.deletedCount === 0)) {
      return sendNotFound(res, 'Store', id);
    }

    return sendSuccess(res, null, 'Store deleted successfully', null, 200);
  } catch (error) {
    logger.error('Error in deleteStore controller', { error: error.message, userId: req.user?._id });
    
    if (error.name === 'CastError' || error.statusCode === 404 || error.message.includes('not found')) {
      return sendNotFound(res, 'Store', req.params.id);
    }
    
    next(error);
  }
};

/**
 * Get all departments
 * GET /api/hr/departments
 */
const getDepartments = async (req, res, next) => {
  try {
    // Try to get from database first
    // Removed .sort({ name: 1 }) - Cosmos DB index issue
    let departments = await Department.find({ is_active: true })
      .select('name code description')
      .lean();

    // If no departments in DB, return default list
    if (!departments || departments.length === 0) {
      departments = [
        { id: 'dept-1', name: 'Sales', code: 'SALES', description: 'Sales Department' },
        { id: 'dept-2', name: 'IT', code: 'TECH', description: 'Technology Department' },
        { id: 'dept-3', name: 'HR', code: 'HR', description: 'Human Resources' },
        { id: 'dept-4', name: 'Accounts', code: 'ACCOUNTS', description: 'Accounts Department' },
        { id: 'dept-5', name: 'Operations', code: 'ECOMMERCE', description: 'Operations' },
        { id: 'dept-6', name: 'Lab', code: 'LAB', description: 'Laboratory' },
        { id: 'dept-7', name: 'Delivery', code: 'DELIVERY', description: 'Delivery Department' },
        { id: 'dept-8', name: 'Franchise', code: 'FRANCHISE', description: 'Franchise Department' }
      ];
    }

    return sendSuccess(res, departments, 'Departments retrieved successfully', null, 200);
  } catch (error) {
    logger.error('Error in getDepartments controller', { error: error.message });
    
    // Return default departments even on error
    const defaultDepartments = [
      { id: 'dept-1', name: 'Sales', code: 'SALES', description: 'Sales Department' },
      { id: 'dept-2', name: 'IT', code: 'TECH', description: 'Technology Department' },
      { id: 'dept-3', name: 'HR', code: 'HR', description: 'Human Resources' },
      { id: 'dept-4', name: 'Accounts', code: 'ACCOUNTS', description: 'Accounts Department' },
      { id: 'dept-5', name: 'Operations', code: 'ECOMMERCE', description: 'Operations' },
      { id: 'dept-6', name: 'Lab', code: 'LAB', description: 'Laboratory' },
      { id: 'dept-7', name: 'Delivery', code: 'DELIVERY', description: 'Delivery Department' },
      { id: 'dept-8', name: 'Franchise', code: 'FRANCHISE', description: 'Franchise Department' }
    ];
    return sendSuccess(res, defaultDepartments, 'Departments retrieved (default list)', null, 200);
  }
};

/**
 * Create new department
 * POST /api/hr/departments
 */
const createDepartment = async (req, res, next) => {
  try {
    const { name, code, description } = req.body;

    // Validate required fields
    if (!name || !code) {
      return sendError(res, 'Validation failed', 'Name and code are required', 400);
    }

    // Create department
    const department = new Department({
      name,
      code: code.toUpperCase(),
      description
    });

    await department.save();

    return sendSuccess(res, department, 'Department created successfully', null, 201);
  } catch (error) {
    logger.error('Error in createDepartment controller', { error: error.message });
    
    if (error.code === 11000) {
      return sendError(res, 'Duplicate department', 'Department with this name or code already exists', 400);
    }
    
    next(error);
  }
};

module.exports = {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  assignRole,
  updateEmployeeStatus,
  getDepartments,
  createDepartment,
  getStores,
  createStore,
  getStoreById,
  updateStore,
  deleteStore
};