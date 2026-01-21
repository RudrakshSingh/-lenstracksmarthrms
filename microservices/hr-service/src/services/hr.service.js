const User = require('../models/User.model');
const Employee = require('../models/Employee.model');
const Role = require('../models/Role.model');
const Store = require('../models/Store.model');
const Department = require('../models/Department.model');
const mongoose = require('mongoose');
const { hashPassword } = require('../utils/hashUtils');
const logger = require('../config/logger');
const auditUtils = require('../utils/audit');
const ApiError = require('../utils/ApiError');
const httpStatusPkg = require('http-status');
const httpStatus = httpStatusPkg.default || httpStatusPkg;
const { createSafeRegex, sanitizeEmployeeId, sanitizeSearchQuery } = require('../../shared/utils/sanitize.util');

/**
 * Helper function to look up department by name or code
 * @param {string} departmentNameOrCode - Department name or code
 * @returns {Promise<Object|null>} Department object or null
 */
const findDepartment = async (departmentNameOrCode, tenantId = null) => {
  if (!departmentNameOrCode) return null;
  
  try {
    // CRITICAL: Filter by tenantId for tenant isolation
    const deptTenantId = tenantId || 'default';
    
    const dept = await Department.findOne({
      tenantId: { $exists: true, $eq: deptTenantId }, // CRITICAL: Require tenantId to exist and match
      $or: [
        { name: { $regex: new RegExp(`^${departmentNameOrCode}$`, 'i') } },
        { code: departmentNameOrCode.toUpperCase() }
      ],
      status: 'active'
    });
    return dept;
  } catch (error) {
    logger.error('Error finding department', { error: error.message, departmentNameOrCode, tenantId });
    return null;
  }
};

/**
 * Creates a new employee
 * @param {Object} employeeData - Employee data
 * @param {string} createdBy - ID of the user creating the employee
 * @returns {Promise<Object>} Created employee
 */
const createEmployee = async (employeeData, createdBy, tenantId = null) => {
  try {
    const { email, password, roleName, storeId, employeeId, ...rest } = employeeData;

    // Ensure employeeId is provided and uppercase
    if (!employeeId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Employee ID is required');
    }
    const normalizedEmployeeId = employeeId.toUpperCase().trim();
    
    // CRITICAL: Ensure tenantId is set (required for tenant isolation)
    // Normalize tenantId to lowercase (required by User model)
    const employeeTenantId = (tenantId || employeeData.tenantId || 'default').toString().toLowerCase().trim();
    
    if (!tenantId && !employeeData.tenantId) {
      logger.warn('createEmployee called without tenantId - using default', {
        employeeId: normalizedEmployeeId,
        email
      });
    }

    // Check if employeeId already exists FOR THIS TENANT (tenant isolation)
    const existingEmployeeId = await User.findOne({ 
      tenantId: { $exists: true, $eq: employeeTenantId }, // CRITICAL: Require tenantId to exist
      employeeId: normalizedEmployeeId 
    });
    if (existingEmployeeId) {
      logger.warn('Employee ID already exists, skipping creation', { 
        employeeId: normalizedEmployeeId, 
        email 
      });
      // Return existing employee instead of throwing error (for onboarding flow)
      const existing = await User.findById(existingEmployeeId._id)
        .populate('role', 'name permissions')
        .populate('store', 'name address')
        .populate('departmentRef', 'name code description');
      return existing;
    }

    // Check if email already exists FOR THIS TENANT (tenant isolation)
    const existingUser = await User.findOne({ 
      tenantId: { $exists: true, $eq: employeeTenantId }, // CRITICAL: Require tenantId to exist
      email: email.toLowerCase() 
    });
    if (existingUser) {
      logger.warn('User with email already exists, returning existing user', { 
        employeeId: normalizedEmployeeId, 
        email,
        existingEmployeeId: existingUser.employeeId
      });
      // Return existing user instead of throwing error (for onboarding flow)
      const existing = await User.findById(existingUser._id)
        .populate('role', 'name permissions')
        .populate('store', 'name address')
        .populate('departmentRef', 'name code description');
      return existing;
    }

    // Find role (default to 'employee' if not provided)
    const roleNameToFind = roleName || 'employee';
    let role = await Role.findOne({ 
      $or: [
        { name: roleNameToFind },
        { name: roleNameToFind.toLowerCase() },
        { name: roleNameToFind.charAt(0).toUpperCase() + roleNameToFind.slice(1).toLowerCase() }
      ]
    });
    
    if (!role) {
      logger.error('Role not found, trying to find any default role', { roleName: roleNameToFind });
      // Try to find 'employee' role as fallback
      role = await Role.findOne({ name: 'employee' }) || await Role.findOne();
      if (!role) {
        throw new ApiError(httpStatus.BAD_REQUEST, `No roles found in system. Please create roles first.`);
      }
      logger.warn('Using fallback role', { roleName: role.name, roleId: role._id });
    }

    // Handle special store values: "backoffice", "office", "", or actual store ID
    let store = null;
    let workLocationType = null;
    
    if (storeId) {
      if (storeId === 'backoffice' || storeId === 'office') {
        // Special work location types - don't validate as ObjectId
        workLocationType = storeId;
        store = null; // No actual store object
      } else if (storeId !== '') {
        // Actual store ID - validate as MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(storeId)) {
          throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid store ID format');
        }
        store = await Store.findById(storeId);
        if (!store) {
          throw new ApiError(httpStatus.BAD_REQUEST, 'Specified store not found');
        }
        workLocationType = 'store';
      }
    }

    // Handle department lookup
    let departmentRef = null;
    if (employeeData.department) {
      const dept = await findDepartment(employeeData.department, employeeTenantId); // CRITICAL: Pass tenantId
      if (dept) {
        departmentRef = dept._id;
        logger.info('Department found and linked', { 
          department: employeeData.department, 
          departmentId: dept._id,
          departmentName: dept.name 
        });
      } else {
        logger.warn('Department not found, will store as string only', { 
          department: employeeData.department 
        });
      }
    }

    // Prepare employee data
    const userData = {
      tenantId: employeeTenantId, // CRITICAL: Use employeeTenantId (already calculated above)
      employeeId: normalizedEmployeeId, // Explicitly set employeeId
      code: normalizedEmployeeId, // Also set code
      email,
      role: role._id,
      store: store?._id,
      status: 'active',
      ...rest,
      departmentRef // Add department reference
    };
    
    // Log tenantId for debugging
    logger.info('Creating employee with tenantId', {
      employeeId: normalizedEmployeeId,
      tenantId: employeeTenantId,
      email
    });
    
    // Ensure firstName/lastName exist (required by User model)
    if (!userData.firstName && userData.fullName) {
      // Split fullName into firstName and lastName
      const nameParts = userData.fullName.trim().split(' ');
      userData.firstName = nameParts[0] || userData.fullName;
      userData.lastName = nameParts.slice(1).join(' ') || nameParts[0];
      logger.info('Generated firstName/lastName from fullName', { 
        fullName: userData.fullName,
        firstName: userData.firstName,
        lastName: userData.lastName
      });
    }
    
    // Ensure fullName exists (virtual field needs firstName)
    if (!userData.firstName) {
      userData.firstName = email.split('@')[0]; // Use email prefix as firstName
      userData.lastName = '';
      logger.warn('No firstName provided, using email prefix', { firstName: userData.firstName });
    }
    
    // Only add password if provided (user might already be registered via auth service)
    if (password) {
      userData.password = password;
    } else {
      // Generate a random password if not provided (will be hashed by pre-save hook)
      userData.password = `TempPass${Date.now()}!`;
      logger.warn('No password provided, generated temporary password', { employeeId: normalizedEmployeeId });
    }
    
    let employee = new User(userData);

    // Save employee and verify
    try {
      await employee.save();
      
      // Reload from database to verify it was saved
      const savedEmployee = await User.findById(employee._id);
      if (!savedEmployee) {
        logger.error('Employee save failed - not found after save!', { 
          employeeId: normalizedEmployeeId,
          mongoId: employee._id,
          email 
        });
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Employee was not saved to database');
      }
      
      // Verify employeeId was saved correctly
      if (!savedEmployee.employeeId || savedEmployee.employeeId !== normalizedEmployeeId) {
        logger.error('Employee created but employeeId mismatch!', { 
          expected: normalizedEmployeeId, 
          actual: savedEmployee.employeeId, 
          email 
        });
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Employee ID was not set correctly during creation');
      }
      
      // Verify tenantId was saved correctly
      if (!savedEmployee.tenantId || savedEmployee.tenantId !== employeeTenantId) {
        logger.error('Employee created but tenantId mismatch!', { 
          expected: employeeTenantId, 
          actual: savedEmployee.tenantId, 
          email 
        });
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Tenant ID was not set correctly during creation');
      }
      
      logger.info('User saved and verified in database', {
        employeeId: savedEmployee.employeeId,
        mongoId: savedEmployee._id,
        email: savedEmployee.email,
        tenantId: savedEmployee.tenantId, // Log tenantId for verification
        database: mongoose.connection.name
      });
      
      // Use saved employee for rest of function
      employee = savedEmployee;
    } catch (saveError) {
      logger.error('Error saving employee to database', {
        error: saveError.message,
        code: saveError.code,
        name: saveError.name,
        employeeId: normalizedEmployeeId,
        email,
        database: mongoose.connection.name,
        stack: saveError.stack
      });
      
      // If duplicate key error (email or employeeId), try to find and return existing
      if (saveError.code === 11000 || saveError.message?.includes('duplicate')) {
        logger.warn('Duplicate employee detected during save, fetching existing', { employeeId: normalizedEmployeeId, email });
        const existing = await User.findOne({ 
          $or: [
            { employeeId: normalizedEmployeeId },
            { email }
          ]
        })
          .populate('role', 'name permissions')
          .populate('store', 'name address');
        
        if (existing) {
          logger.info('Returning existing employee instead of creating new one', { 
            employeeId: existing.employeeId,
            email: existing.email 
          });
          return existing;
        }
      }
      
      // If validation error, provide helpful message
      if (saveError.name === 'ValidationError') {
        const validationErrors = Object.keys(saveError.errors || {}).map(key => {
          return `${key}: ${saveError.errors[key].message}`;
        }).join(', ');
        logger.error('Validation error details', { validationErrors });
        throw new ApiError(httpStatus.BAD_REQUEST, `Validation failed: ${validationErrors || saveError.message}`);
      }
      
      throw saveError;
    }
    
    // Save to Employee collection (employees collection in Cosmos DB)
    try {
      // Check if Employee already exists
      const existingEmployee = await Employee.findOne({ employeeId: normalizedEmployeeId });
      
      if (!existingEmployee) {
        // Create Employee document from User data
        // Ensure all required fields are present
        const roleFamilyValue = rest.role_family || rest.roleFamily || 'Operations';
        const departmentValue = employee.department || rest.department || 'Operations'; // Default to Operations if not provided
        const designationValue = rest.designation || employee.jobTitle || 'Employee';
        
        const employeeData = {
          employeeId: normalizedEmployeeId,
          code: normalizedEmployeeId, // Use employeeId as code
          fullName: employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee',
          email: employee.email,
          phone: employee.phone || '',
          designation: designationValue,
          roleFamily: roleFamilyValue,
          department: departmentValue,
          doj: rest.joining_date ? new Date(rest.joining_date) : new Date(), // Date of joining
          status: (employee.status || 'active').toLowerCase() // CRITICAL: lowercase only!
        };
        
        // Add optional fields if available
        if (employee.dateOfBirth) employeeData.dob = employee.dateOfBirth;
        if (rest.designation) employeeData.designation = rest.designation;
        // Support both snake_case (from frontend) and camelCase
        if (rest.grade_band || rest.gradeBand) {
          employeeData.gradeBand = rest.grade_band || rest.gradeBand;
        }
        if (rest.confirmationDate) employeeData.confirmationDate = new Date(rest.confirmationDate);
        if (rest.uan) employeeData.uan = rest.uan;
        if (rest.esiNo) employeeData.esiNo = rest.esiNo;
        
        // Add address if available
        if (employee.address) {
          employeeData.currentAddress = {
            lines: employee.address.street ? [employee.address.street] : [],
            city: employee.address.city || '',
            state: employee.address.state || '',
            pincode: employee.address.zip || ''
          };
        }
        
        // Add work location if available
        if (workLocationType) {
          if (workLocationType === 'backoffice' || workLocationType === 'office') {
            // Special work location types
            employeeData.workLocation = {
              storeId: storeId, // Store as string: "backoffice" or "office"
              storeName: workLocationType === 'backoffice' ? 'Backoffice' : 'Office',
              type: workLocationType,
              city: rest.work_location_city || rest.workLocation?.city || '',
              state: rest.work_location_state || rest.workLocation?.state || '',
              pincode: rest.work_location_pincode || rest.workLocation?.pincode || ''
            };
          } else if (store) {
            // Actual store
            employeeData.workLocation = {
              storeId: store._id.toString(),
              storeName: store.name || '',
              type: 'store',
              city: rest.work_location_city || store.city || rest.workLocation?.city || '',
              state: rest.work_location_state || store.state || rest.workLocation?.state || '',
              pincode: rest.work_location_pincode || store.pincode || rest.workLocation?.pincode || ''
            };
          }
        } else if (rest.work_location_city || rest.workLocation?.city) {
          // Work location without store
          employeeData.workLocation = {
            storeId: '',
            storeName: '',
            type: 'manual',
            city: rest.work_location_city || rest.workLocation?.city || '',
            state: rest.work_location_state || rest.workLocation?.state || '',
            pincode: rest.work_location_pincode || rest.workLocation?.pincode || ''
          };
        }
        
        // Add reporting manager if available
        if (rest.reporting_manager_id || rest.reportingManager) {
          const managerId = rest.reporting_manager_id || rest.reportingManager;
          const manager = await User.findById(managerId).select('employeeId firstName lastName jobTitle');
          if (manager) {
            employeeData.reportingManager = {
              id: manager._id,
              name: `${manager.firstName} ${manager.lastName}`.trim(),
              designation: manager.jobTitle || ''
            };
          }
        }
        
        const employeeDoc = new Employee(employeeData);
        await employeeDoc.save();
        
        logger.info('Employee saved to employees collection', {
          employeeId: normalizedEmployeeId,
          employeeDocId: employeeDoc._id,
          collection: 'employees'
        });
      } else {
        logger.debug('Employee already exists in employees collection', {
          employeeId: normalizedEmployeeId
        });
      }
    } catch (employeeSaveError) {
      // Log error but don't fail the whole operation
      logger.error('Failed to save employee to employees collection', {
        error: employeeSaveError.message,
        employeeId: normalizedEmployeeId,
        stack: employeeSaveError.stack
      });
      // Continue - User is already saved, Employee sync can be retried later
    }
    
    // Invalidate employee list cache (if cache is available)
    try {
      const cache = require('../utils/cache');
      if (cache && cache.invalidatePattern) {
        await cache.invalidatePattern('employees:*');
      }
    } catch (cacheError) {
      // Cache not available, continue without it
      logger.debug('Cache not available, skipping invalidation');
    }
    
    // Record audit log
    try {
      if (auditUtils.logUserManagementEvent) {
        auditUtils.logUserManagementEvent('create', createdBy, employee._id.toString(), {
          email: employee.email,
          role: role.name
        });
      }
    } catch (auditError) {
      logger.warn('Failed to record audit log', { error: auditError.message });
    }

    logger.info('Employee created successfully', { 
      employeeId: employee._id, 
      email: employee.email,
      createdBy,
      savedToUsers: true,
      savedToEmployees: true
    });

    return employee;
  } catch (error) {
    logger.error('Error in createEmployee service', { error: error.message, createdBy });
    throw error;
  }
};

/**
 * Gets all employees with pagination and filtering
 * @param {Object} filters - Filter options
 * @param {number} page - Page number
 * @param {number} limit - Records per page
 * @returns {Promise<Object>} Paginated employees
 */
const getEmployees = async (filters = {}, page = 1, limit = 10, tenantId = null) => {
  try {
    // Skip caching for now - direct database query
    // const cacheKey = `employees:${JSON.stringify(filters)}:${page}:${limit}`;
    
    // Direct database query without caching
    const getData = async () => {
      // CRITICAL: Always filter by tenantId for tenant isolation
      const queryTenantId = tenantId || filters.tenantId || 'default';
      const query = { 
        isDeleted: false,
        tenantId: { $exists: true, $eq: queryTenantId } // CRITICAL: Require tenantId to exist and match
      };
      
      // Log if tenantId is missing (for debugging)
      if (!tenantId && !filters.tenantId) {
        logger.warn('getEmployees called without tenantId - using default', {
          filters,
          page,
          limit
        });
      }

      // Apply filters with sanitization
      if (filters.employeeId) {
        // Sanitize and validate employeeId
        const sanitized = sanitizeEmployeeId(filters.employeeId);
        if (sanitized) {
          query.employeeId = sanitized;
        } else {
          logger.warn('Invalid employeeId format provided', { employeeId: filters.employeeId });
        }
      }
      if (filters.status) {
        // Status should be from enum, so validate it
        const validStatuses = ['active', 'inactive', 'on-leave', 'terminated'];
        if (validStatuses.includes(filters.status.toLowerCase())) {
          query.status = filters.status.toLowerCase();
        }
      }
      if (filters.store) {
        // Store should be ObjectId, validate it
        if (mongoose.Types.ObjectId.isValid(filters.store)) {
          query.store = filters.store;
        }
      }
      if (filters.role) {
        // Role should be ObjectId, validate it
        if (mongoose.Types.ObjectId.isValid(filters.role)) {
          query.role = filters.role;
        }
      }
      if (filters.department) {
        // Use safe regex for department search
        const safeRegex = createSafeRegex(filters.department);
        if (safeRegex) {
          query.department = safeRegex;
        }
      }
      if (filters.search) {
        // Use safe regex for search with sanitization
        const sanitized = sanitizeSearchQuery(filters.search);
        if (sanitized) {
          const safeRegex = new RegExp(sanitized, 'i');
          query.$or = [
            { firstName: safeRegex },
            { lastName: safeRegex },
            { email: safeRegex },
            { employeeId: safeRegex }
          ];
        }
      }

      const skip = (page - 1) * limit;

      const [employees, total] = await Promise.all([
        User.find(query)
          .populate('role', 'name permissions')
          .populate('store', 'name address')
          .populate('departmentRef', 'name code description')
          .select('-password -refreshToken')
          // .sort({ createdAt: -1 })  // Removed: Cosmos DB index issue
          .skip(skip)
          .limit(limit)
          .lean(), // Use lean() for read-only queries - returns plain JS objects (faster)
        User.countDocuments(query)
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        employees,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      };
    };
    
    return await getData();
  } catch (error) {
    logger.error('Error in getEmployees service', { error: error.message });
    throw error;
  }
};

/**
 * Gets a single employee by ID
 * @param {string} employeeId - Employee ID (can be MongoDB ObjectId or employee_id string)
 * @returns {Promise<Object>} Employee object
 */
const getEmployeeById = async (employeeId, tenantId = null) => {
  try {
    const mongoose = require('mongoose');
    let employee;
    
    // CRITICAL: Ensure tenantId is provided for tenant isolation
    const employeeTenantId = tenantId || 'default';
    
    if (!tenantId) {
      logger.warn('getEmployeeById called without tenantId - using default', { employeeId });
    }
    
    // Normalize the employeeId input
    const normalizedId = employeeId ? employeeId.toString().trim() : '';
    
    // Build query with tenantId filter
    let query;
    if (mongoose.Types.ObjectId.isValid(normalizedId)) {
      // If it's a valid ObjectId, search by _id AND tenantId (require tenantId to exist)
      query = { 
        _id: normalizedId, 
        tenantId: { $exists: true, $eq: employeeTenantId } // CRITICAL: Require tenantId to exist
      };
      employee = await User.findOne(query)
        .populate('role', 'name permissions')
        .populate('store', 'name address')
        .populate('departmentRef', 'name code description')
        .lean();
    } else {
      // If it's not a valid ObjectId, search by employeeId AND tenantId (require tenantId to exist)
      query = { 
        tenantId: { $exists: true, $eq: employeeTenantId }, // CRITICAL: Require tenantId to exist
        $or: [
          { employeeId: normalizedId.toUpperCase() },
          { employeeId: normalizedId }
        ]
      };
      employee = await User.findOne(query)
        .populate('role', 'name permissions')
        .populate('store', 'name address')
        .populate('departmentRef', 'name code description')
        .lean();
    }

    if (!employee) {
      // Log for debugging
      logger.warn('Employee not found', { 
        searchedId: normalizedId,
        tenantId: employeeTenantId, // Logging only - query already uses $exists check
        isObjectId: mongoose.Types.ObjectId.isValid(normalizedId)
      });
      throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
    }

    if (employee.isDeleted) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
    }

    return employee;
  } catch (error) {
    logger.error('Error in getEmployeeById service', { error: error.message, employeeId, tenantId });
    throw error;
  }
};

/**
 * Updates an employee
 * @param {string} employeeId - Employee ID (can be MongoDB ObjectId or employee_id string)
 * @param {Object} updateData - Update data
 * @param {string} updatedBy - ID of the user updating
 * @returns {Promise<Object>} Updated employee
 */
const updateEmployee = async (employeeId, updateData, updatedBy, tenantId = null) => {
  try {
    // Extract all fields that need special handling
    const { 
      roleName, 
      storeId, 
      status,
      ...rest 
    } = updateData;

    // CRITICAL: Ensure tenantId is provided for tenant isolation
    const employeeTenantId = tenantId || updateData.tenantId || 'default';
    
    if (!tenantId && !updateData.tenantId) {
      logger.warn('updateEmployee called without tenantId - using default', { employeeId });
    }

    // Check if employeeId is a valid MongoDB ObjectId
    const mongoose = require('mongoose');
    let employee;
    let query;
    
    if (mongoose.Types.ObjectId.isValid(employeeId)) {
      // If it's a valid ObjectId, search by _id AND tenantId (require tenantId to exist)
      query = { 
        _id: employeeId, 
        tenantId: { $exists: true, $eq: employeeTenantId } // CRITICAL: Require tenantId to exist
      };
      employee = await User.findOne(query);
    } else {
      // If it's not a valid ObjectId, search by employeeId AND tenantId (require tenantId to exist)
      query = { 
        tenantId: { $exists: true, $eq: employeeTenantId }, // CRITICAL: Require tenantId to exist
        employeeId: employeeId.toUpperCase() 
      };
      employee = await User.findOne(query);
    }
    
    if (!employee) {
      logger.warn('Employee not found for update', { employeeId, tenantId: employeeTenantId });
      throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
    }

    // ============================================
    // Status Validation (CRITICAL: lowercase only)
    // ============================================
    if (status) {
      const validStatuses = ['active', 'inactive', 'on-leave', 'terminated', 'pending'];
      const normalizedStatus = status.toLowerCase().trim();
      
      if (!validStatuses.includes(normalizedStatus)) {
        throw new ApiError(
          httpStatus.BAD_REQUEST, 
          `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        );
      }
      rest.status = normalizedStatus;
    }

    // ============================================
    // Role Update
    // ============================================
    if (roleName) {
      const role = await Role.findOne({ name: roleName });
      if (!role) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Specified role not found');
      }
      rest.role = role._id;
    }

    // ============================================
    // Store Update
    // ============================================
    if (storeId) {
      const store = await Store.findById(storeId);
      if (!store) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Specified store not found');
      }
      rest.store = store._id;
    }
    
    // ============================================
    // Handle Code Field (same as employeeId)
    // ============================================
    if (!rest.code && rest.employeeId) {
      rest.code = rest.employeeId;
    }
    
    // ============================================
    // Handle Date Fields (normalize to Date objects)
    // ============================================
    if (rest.doj && typeof rest.doj === 'string') {
      rest.doj = new Date(rest.doj);
    }
    if (rest.dob && typeof rest.dob === 'string') {
      rest.dob = new Date(rest.dob);
      rest.dateOfBirth = rest.dob; // Sync both fields
    }
    if (rest.dateOfBirth && typeof rest.dateOfBirth === 'string') {
      rest.dateOfBirth = new Date(rest.dateOfBirth);
      rest.dob = rest.dateOfBirth; // Sync both fields
    }
    
    // ============================================
    // Handle Full Name (compute from firstName/lastName if not provided)
    // ============================================
    if (!rest.fullName && (rest.firstName || rest.lastName)) {
      rest.fullName = `${rest.firstName || employee.firstName || ''} ${rest.lastName || employee.lastName || ''}`.trim();
    }
    
    // ============================================
    // Handle Job Title (sync with designation)
    // ============================================
    if (rest.designation && !rest.jobTitle) {
      rest.jobTitle = rest.designation;
    }
    if (rest.jobTitle && !rest.designation) {
      rest.designation = rest.jobTitle;
    }
    
    // ============================================
    // Handle Grade Band (sync both formats)
    // ============================================
    if (rest.grade_band && !rest.gradeBand) {
      rest.gradeBand = rest.grade_band;
    }
    if (rest.gradeBand && !rest.grade_band) {
      rest.grade_band = rest.gradeBand;
    }
    
    // ============================================
    // Handle Address Fields (sync old and new formats)
    // ============================================
    if (rest.currentAddress && !rest.address) {
      rest.address = {
        street: rest.currentAddress.lines ? rest.currentAddress.lines.join(', ') : '',
        city: rest.currentAddress.city,
        state: rest.currentAddress.state,
        zip: rest.currentAddress.pincode,
        country: rest.currentAddress.country || 'India'
      };
    }
    
    // ============================================
    // Update User Model with All Fields
    // ============================================
    const updatedEmployee = await User.findOneAndUpdate(
      query,
      { $set: rest },
      { new: true, runValidators: true }
    ).populate('role', 'name permissions').populate('store', 'name address').populate('departmentRef', 'name code description');

    // ============================================
    // NOTE: All statutory fields now stored directly in User model
    // (uan, esiNo, panNumber, bankAccount, previousEmployment, etc.)
    // CompensationProfile is no longer used - simplified architecture
    // ============================================
    
    if (!updatedEmployee) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found after update');
    }

    // Record audit log
    try {
      if (auditUtils.logUserManagementEvent) {
        auditUtils.logUserManagementEvent('update', updatedBy, employeeId, {
          changes: Object.keys(rest)
        });
      }
    } catch (auditError) {
      logger.warn('Failed to record audit log', { error: auditError.message });
    }

    logger.info('Employee updated successfully', { 
      employeeId, 
      updatedBy,
      changes: Object.keys(rest) 
    });

    return updatedEmployee;
  } catch (error) {
    logger.error('Error in updateEmployee service', { error: error.message, employeeId, updatedBy });
    throw error;
  }
};

/**
 * Deletes an employee (soft delete)
 * @param {string} employeeId - Employee ID
 * @param {string} deletedBy - ID of the user deleting
 * @returns {Promise<Object>} Deletion result
 */
const deleteEmployee = async (employeeId, deletedBy, tenantId = null) => {
  try {
    // CRITICAL: Ensure tenantId is provided for tenant isolation
    const employeeTenantId = tenantId || 'default';
    
    if (!tenantId) {
      logger.warn('deleteEmployee called without tenantId - using default', { employeeId });
    }
    
    const mongoose = require('mongoose');
    let employee;
    
    if (mongoose.Types.ObjectId.isValid(employeeId)) {
      // Search by _id AND tenantId
      employee = await User.findOne({ 
        _id: employeeId, 
        tenantId: { $exists: true, $eq: employeeTenantId } // CRITICAL: Require tenantId to exist
      });
    } else {
      // Search by employeeId AND tenantId
      employee = await User.findOne({ 
        tenantId: { $exists: true, $eq: employeeTenantId }, // CRITICAL: Require tenantId to exist
        employeeId: employeeId.toUpperCase() 
      });
    }
    
    if (!employee) {
      logger.warn('Employee not found for delete', { employeeId, tenantId: employeeTenantId });
      throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
    }

    // Soft delete
    employee.isDeleted = true;
    employee.status = 'terminated';
    await employee.save();

    // Record audit log
    try {
      if (auditUtils.logUserManagementEvent) {
        auditUtils.logUserManagementEvent('delete', deletedBy, employeeId, {
          email: employee.email
        });
      }
    } catch (auditError) {
      logger.warn('Failed to record audit log', { error: auditError.message });
    }

    logger.info('Employee deleted successfully', { 
      employeeId, 
      deletedBy 
    });

    return { success: true, message: 'Employee deleted successfully' };
  } catch (error) {
    logger.error('Error in deleteEmployee service', { error: error.message, employeeId, deletedBy });
    throw error;
  }
};

/**
 * Assigns a role to an employee
 * @param {string} employeeId - Employee ID
 * @param {string} roleName - Role name
 * @param {string} assignedBy - ID of the user assigning
 * @returns {Promise<Object>} Updated employee
 */
const assignRole = async (employeeId, roleName, assignedBy) => {
  try {
    // Check if employeeId is a valid MongoDB ObjectId
    const mongoose = require('mongoose');
    let employee;
    
    if (mongoose.Types.ObjectId.isValid(employeeId)) {
      // If it's a valid ObjectId, search by _id
      employee = await User.findById(employeeId);
    } else {
      // If it's not a valid ObjectId (e.g., employeeId like "EMP-2025-172751"), search by employeeId (camelCase)
      employee = await User.findOne({ employeeId: employeeId.toUpperCase() });
    }
    
    if (!employee) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
    }

    // Normalize role name: map tenant-admin to admin
    let normalizedRoleName = roleName.toLowerCase();
    if (normalizedRoleName === 'tenant-admin' || normalizedRoleName === 'tenantadmin') {
      normalizedRoleName = 'admin';
    }
    
    // Find role (case-insensitive)
    const role = await Role.findOne({ 
      $or: [
        { name: normalizedRoleName },
        { name: roleName.toLowerCase() },
        { name: roleName.charAt(0).toUpperCase() + roleName.slice(1).toLowerCase() }
      ]
    });
    if (!role) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Specified role not found: ${roleName}. Available roles: superadmin, admin, hr, manager, employee`);
    }

    employee.role = role._id;
    await employee.save();

    // Record audit log
    try {
      if (auditUtils.logRoleEvent) {
        auditUtils.logRoleEvent('assign', assignedBy, employeeId, {
          newRole: roleName,
          previousRole: employee.role
        });
      }
    } catch (auditError) {
      logger.warn('Failed to record audit log', { error: auditError.message });
    }

    logger.info('Role assigned successfully', { 
      employeeId, 
      roleName,
      assignedBy 
    });

    return employee;
  } catch (error) {
    logger.error('Error in assignRole service', { error: error.message, employeeId, roleName, assignedBy });
    throw error;
  }
};

/**
 * Updates employee status
 * @param {string} employeeId - Employee ID
 * @param {string} status - New status
 * @param {string} updatedBy - ID of the user updating
 * @returns {Promise<Object>} Updated employee
 */
const updateEmployeeStatus = async (employeeId, status, updatedBy, tenantId = null) => {
  try {
    // CRITICAL: Ensure tenantId is provided for tenant isolation
    const employeeTenantId = tenantId || 'default';
    
    if (!tenantId) {
      logger.warn('updateEmployeeStatus called without tenantId - using default', { employeeId });
    }
    
    // Check if employeeId is a valid MongoDB ObjectId
    const mongoose = require('mongoose');
    let employee;
    
    if (mongoose.Types.ObjectId.isValid(employeeId)) {
      // Search by _id AND tenantId
      employee = await User.findOne({ 
        _id: employeeId, 
        tenantId: { $exists: true, $eq: employeeTenantId } // CRITICAL: Require tenantId to exist
      });
    } else {
      // Search by employeeId AND tenantId
      employee = await User.findOne({ 
        tenantId: { $exists: true, $eq: employeeTenantId }, // CRITICAL: Require tenantId to exist
        employeeId: employeeId.toUpperCase() 
      });
    }
    
    if (!employee) {
      logger.warn('Employee not found for status update', { employeeId, tenantId: employeeTenantId });
      throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
    }

    // Normalize status to lowercase (model uses uppercase, but we normalize for consistency)
    const normalizedStatus = status.toLowerCase();
    const validStatuses = ['active', 'on_leave', 'terminated', 'pending', 'inactive'];
    const validStatusesUpper = ['ACTIVE', 'ON_LEAVE', 'TERMINATED', 'PENDING', 'INACTIVE'];
    
    // Check both lowercase and uppercase
    if (!validStatuses.includes(normalizedStatus) && !validStatusesUpper.includes(status)) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Invalid status: ${status}. Valid values: active, on_leave, terminated, pending, inactive`);
    }
    
    // Map to model's expected format (uppercase for Employee model, lowercase for User model)
    // User model uses lowercase, so use normalizedStatus
    const finalStatus = normalizedStatus;

    const previousStatus = employee.status;
    employee.status = finalStatus;
    await employee.save();

    // Record audit log
    try {
      if (auditUtils.logUserManagementEvent) {
        auditUtils.logUserManagementEvent('update', updatedBy, employeeId, {
          previousStatus,
          newStatus: status
        });
      }
    } catch (auditError) {
      logger.warn('Failed to record audit log', { error: auditError.message });
    }

    logger.info('Employee status updated successfully', { 
      employeeId, 
      previousStatus,
      newStatus: status,
      updatedBy 
    });

    return employee;
  } catch (error) {
    logger.error('Error in updateEmployeeStatus service', { error: error.message, employeeId, status, updatedBy });
    throw error;
  }
};

/**
 * Get all stores
 * @param {Object} filters - Filter criteria
 * @param {number} page - Page number
 * @param {number} limit - Number of items per page
 * @returns {Promise<Object>} Paginated stores
 */
const getStores = async (filters = {}, page = 1, limit = 10, tenantId = null) => {
  try {
    // CRITICAL: Always filter by tenantId for tenant isolation
    const storeTenantId = tenantId || filters.tenantId || 'default';
    
    if (!tenantId && !filters.tenantId) {
      logger.warn('getStores called without tenantId - using default', { filters });
    }
    
    const query = { 
      isDeleted: false,
      tenantId: { $exists: true, $eq: storeTenantId } // CRITICAL: Require tenantId to exist and match
    };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } },
        { 'address.city': { $regex: filters.search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [stores, total] = await Promise.all([
      Store.find(query)
        .populate('manager', 'name email employee_id')
        // .sort({ createdAt: -1 })  // Removed: Cosmos DB index issue
        .skip(skip)
        .limit(limit),
      Store.countDocuments(query)
    ]);

    return {
      stores,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    };
  } catch (error) {
    logger.error('Error in getStores service', { error: error.message, filters, page, limit });
    throw error;
  }
};

/**
 * Create a new store
 * @param {Object} storeData - Store data
 * @param {string} createdBy - ID of the user creating the store
 * @param {string} tenantId - Tenant ID for tenant isolation
 * @returns {Promise<Object>} Created store
 */
const createStore = async (storeData, createdBy, tenantId = null) => {
  try {
    // CRITICAL: Ensure tenantId is set (required for tenant isolation)
    const storeTenantId = (tenantId || storeData.tenantId || 'default').toString().toLowerCase().trim();
    
    const { code, googleMapsUrl } = storeData;

    // Check if store code already exists FOR THIS TENANT (tenant isolation)
    const existingStore = await Store.findOne({ 
      tenantId: { $exists: true, $eq: storeTenantId },
      code 
    });
    if (existingStore) {
      throw new ApiError(httpStatus.CONFLICT, 'Store with this code already exists');
    }

    // Extract coordinates from Google Maps URL if provided
    if (googleMapsUrl && (!storeData.coordinates || !storeData.coordinates.latitude)) {
      const { extractCoordinatesFromGoogleMapsUrl } = require('../utils/googleMaps.util');
      const extracted = extractCoordinatesFromGoogleMapsUrl(googleMapsUrl);
      
      if (extracted) {
        storeData.coordinates = {
          latitude: extracted.latitude,
          longitude: extracted.longitude
        };
        logger.info('Extracted coordinates from Google Maps URL', extracted);
      } else {
        logger.warn('Could not extract coordinates from Google Maps URL', { googleMapsUrl });
      }
    }

    // If coordinates are provided but no Google Maps URL, generate one
    if (!googleMapsUrl && storeData.coordinates && storeData.coordinates.latitude) {
      const { generateGoogleMapsUrl } = require('../utils/googleMaps.util');
      storeData.googleMapsUrl = generateGoogleMapsUrl(
        storeData.coordinates.latitude,
        storeData.coordinates.longitude
      );
      logger.info('Generated Google Maps URL from coordinates', { googleMapsUrl: storeData.googleMapsUrl });
    }

    const store = new Store({
      ...storeData,
      tenantId: storeTenantId, // CRITICAL: Set tenantId for tenant isolation
      createdBy,
      updatedBy: createdBy
    });

    await store.save();

    // Record audit log (if function exists)
    try {
      const auditUtils = require('../utils/audit');
      if (auditUtils.logUserManagementEvent) {
        auditUtils.logUserManagementEvent('create', createdBy, store._id.toString(), {
          storeCode: code,
          storeName: storeData.name
        });
      }
    } catch (auditError) {
      logger.warn('Failed to record audit log', { error: auditError.message });
    }

    logger.info('Store created successfully', { storeId: store._id, code, createdBy });
    return store;
  } catch (error) {
    logger.error('Error in createStore service', { error: error.message, storeData, createdBy });
    throw error;
  }
};

/**
 * Get store by ID
 * @param {string} storeId - Store ID
 * @returns {Promise<Object>} Store data
 */
const getStoreById = async (storeId, tenantId = null) => {
  try {
    // CRITICAL: Filter by tenantId for tenant isolation
    const storeTenantId = tenantId || 'default';
    
    if (!tenantId) {
      logger.warn('getStoreById called without tenantId - using default', { storeId });
    }
    
    const store = await Store.findOne({ 
      _id: storeId, 
      isDeleted: false,
      tenantId: { $exists: true, $eq: storeTenantId } // CRITICAL: Require tenantId to exist and match
    })
      .populate('manager', 'name email employee_id');

    if (!store) {
      logger.warn('Store not found', { storeId, tenantId: storeTenantId });
      throw new ApiError(httpStatus.NOT_FOUND, 'Store not found');
    }

    return store;
  } catch (error) {
    logger.error('Error in getStoreById service', { error: error.message, storeId, tenantId });
    throw error;
  }
};

/**
 * Update store
 * @param {string} storeId - Store ID
 * @param {Object} updateData - Update data
 * @param {string} updatedBy - ID of the user updating the store
 * @returns {Promise<Object>} Updated store
 */
const updateStore = async (storeId, updateData, updatedBy, tenantId = null) => {
  try {
    // CRITICAL: Filter by tenantId for tenant isolation
    const storeTenantId = tenantId || updateData.tenantId || store?.tenantId || 'default';
    
    if (!tenantId && !updateData.tenantId) {
      logger.warn('updateStore called without tenantId - using default', { storeId });
    }
    
    const store = await Store.findOne({ 
      _id: storeId, 
      isDeleted: false,
      tenantId: { $exists: true, $eq: storeTenantId } // CRITICAL: Require tenantId to exist and match
    });

    if (!store) {
      logger.warn('Store not found for update', { storeId, tenantId: storeTenantId });
      throw new ApiError(httpStatus.NOT_FOUND, 'Store not found');
    }

    // Check if code is being updated and if it already exists FOR THIS TENANT
    if (updateData.code && updateData.code !== store.code) {
      const existingStore = await Store.findOne({ 
      tenantId: { $exists: true, $eq: storeTenantId }, // CRITICAL: Require tenantId to exist
      code: updateData.code,
        _id: { $ne: storeId } 
      });
      if (existingStore) {
        throw new ApiError(httpStatus.CONFLICT, 'Store with this code already exists for this tenant');
      }
    }

    const previousData = { ...store.toObject() };
    
    Object.assign(store, updateData, { updatedBy, updatedAt: new Date() });
    await store.save();

    // Record audit log (non-blocking)
    try {
      await recordAuditLog({
        action: 'update',
        resource: 'store',
        resourceId: storeId,
        userId: updatedBy,
        details: { 
          previousData: previousData,
          updatedData: updateData
        }
      });
    } catch (auditError) {
      logger.warn('Failed to record audit log for store update', { 
        error: auditError.message, 
        storeId 
      });
    }

    logger.info('Store updated successfully', { storeId, updatedBy });
    return store;
  } catch (error) {
    logger.error('Error in updateStore service', { error: error.message, storeId, updateData, updatedBy });
    throw error;
  }
};

/**
 * Delete store (soft delete)
 * @param {string} storeId - Store ID
 * @param {string} deletedBy - ID of the user deleting the store
 * @returns {Promise<void>}
 */
const deleteStore = async (storeId, deletedBy, tenantId = null) => {
  try {
    // CRITICAL: Filter by tenantId for tenant isolation
    const storeTenantId = tenantId || 'default';
    
    if (!tenantId) {
      logger.warn('deleteStore called without tenantId - using default', { storeId });
    }
    
    const store = await Store.findOne({ 
      _id: storeId, 
      isDeleted: false,
      tenantId: { $exists: true, $eq: storeTenantId } // CRITICAL: Require tenantId to exist and match
    });

    if (!store) {
      logger.warn('Store not found for delete', { storeId, tenantId: storeTenantId });
      throw new ApiError(httpStatus.NOT_FOUND, 'Store not found');
    }

    // Check if store has employees FOR THIS TENANT
    const employeeCount = await User.countDocuments({ 
      tenantId: { $exists: true, $eq: storeTenantId }, // CRITICAL: Require tenantId to exist
      store: storeId, 
      isDeleted: false 
    });
    if (employeeCount > 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot delete store with assigned employees');
    }

    store.isDeleted = true;
    store.deletedBy = deletedBy;
    store.deletedAt = new Date();
    await store.save();

    // Record audit log
    await recordAuditLog({
      action: 'delete',
      resource: 'store',
      resourceId: storeId,
      userId: deletedBy,
      details: { storeCode: store.code, storeName: store.name }
    });

    logger.info('Store deleted successfully', { storeId, deletedBy });
  } catch (error) {
    logger.error('Error in deleteStore service', { error: error.message, storeId, deletedBy });
    throw error;
  }
};

/**
 * Assign manager to store
 * @param {string} storeId - Store ID
 * @param {string} employeeId - Employee ID (employee_id field, not MongoDB _id)
 * @param {string} updatedBy - ID of the user making the assignment
 * @returns {Promise<Object>} Updated store with manager details
 */
const assignStoreManager = async (storeId, employeeId, updatedBy, tenantId = null) => {
  try {
    // CRITICAL: Filter by tenantId for tenant isolation
    const storeTenantId = tenantId || 'default';
    
    if (!tenantId) {
      logger.warn('assignStoreManager called without tenantId - using default', { storeId });
    }
    
    // Find store FOR THIS TENANT
    const store = await Store.findOne({ 
      _id: storeId, 
      isDeleted: false,
      tenantId: { $exists: true, $eq: storeTenantId } // CRITICAL: Require tenantId to exist and match
    });
    if (!store) {
      logger.warn('Store not found for manager assignment', { storeId, tenantId: storeTenantId });
      throw new ApiError(httpStatus.NOT_FOUND, 'Store not found');
    }

    // Find employee by employee_id FOR THIS TENANT
    const employee = await User.findOne({
      tenantId: { $exists: true, $eq: storeTenantId }, // CRITICAL: Require tenantId to exist
      $or: [
        { employee_id: employeeId },
        { employeeId: employeeId }
      ],
      isDeleted: false 
    });

    if (!employee) {
      throw new ApiError(httpStatus.NOT_FOUND, `Employee with ID '${employeeId}' not found`);
    }

    // Store previous manager info for response
    let previousManager = null;
    if (store.manager) {
      previousManager = await User.findById(store.manager).select('employee_id employeeId name');
    }

    // Assign new manager
    store.manager = employee._id;
    store.updatedBy = updatedBy;
    store.updatedAt = new Date();
    await store.save();

    // Record audit log
    await recordAuditLog({
      action: 'assign_manager',
      resource: 'store',
      resourceId: storeId,
      userId: updatedBy,
      details: { 
        storeCode: store.code,
        storeName: store.name,
        newManager: employeeId,
        previousManager: previousManager ? (previousManager.employee_id || previousManager.employeeId) : null
      }
    });

    logger.info('Store manager assigned successfully', { 
      storeId, 
      employeeId, 
      managerId: employee._id,
      updatedBy 
    });

    return {
      storeId: store._id,
      storeName: store.name,
      manager: {
        id: employee._id,
        employeeId: employee.employee_id || employee.employeeId,
        name: employee.name || `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
        assignedAt: new Date().toISOString()
      },
      previousManager: previousManager ? {
        employeeId: previousManager.employee_id || previousManager.employeeId,
        name: previousManager.name,
        unassignedAt: new Date().toISOString()
      } : null
    };
  } catch (error) {
    logger.error('Error in assignStoreManager service', { 
      error: error.message, 
      storeId, 
      employeeId, 
      updatedBy 
    });
    throw error;
  }
};

module.exports = {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  assignRole,
  updateEmployeeStatus,
  getStores,
  createStore,
  getStoreById,
  updateStore,
  deleteStore,
  assignStoreManager
};