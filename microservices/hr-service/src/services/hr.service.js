const User = require('../models/User.model');
const Employee = require('../models/Employee.model');
const Role = require('../models/Role.model');
const Store = require('../models/Store.model');
const mongoose = require('mongoose');
const { hashPassword } = require('../utils/hashUtils');
const logger = require('../config/logger');
const auditUtils = require('../utils/audit');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

/**
 * Creates a new employee
 * @param {Object} employeeData - Employee data
 * @param {string} createdBy - ID of the user creating the employee
 * @returns {Promise<Object>} Created employee
 */
const createEmployee = async (employeeData, createdBy) => {
  try {
    const { email, password, roleName, storeId, employeeId, ...rest } = employeeData;

    // Ensure employeeId is provided and uppercase
    if (!employeeId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Employee ID is required');
    }
    const normalizedEmployeeId = employeeId.toUpperCase().trim();

    // Check if employeeId already exists
    const existingEmployeeId = await User.findOne({ employeeId: normalizedEmployeeId });
    if (existingEmployeeId) {
      throw new ApiError(httpStatus.CONFLICT, 'Employee ID already exists');
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError(httpStatus.CONFLICT, 'User with this email already exists');
    }

    // Find role (case-insensitive)
    const role = await Role.findOne({ 
      $or: [
        { name: roleName },
        { name: roleName.toLowerCase() },
        { name: roleName.charAt(0).toUpperCase() + roleName.slice(1).toLowerCase() }
      ]
    });
    if (!role) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Specified role not found: ${roleName}`);
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

    let employee = new User({
      employeeId: normalizedEmployeeId, // Explicitly set employeeId
      email,
      password,
      role: role._id,
      store: store?._id,
      status: 'active',
      ...rest
    });

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
      
      logger.info('User saved and verified in database', {
        employeeId: savedEmployee.employeeId,
        mongoId: savedEmployee._id,
        email: savedEmployee.email,
        database: mongoose.connection.name
      });
      
      // Use saved employee for rest of function
      employee = savedEmployee;
    } catch (saveError) {
      logger.error('Error saving employee to database', {
        error: saveError.message,
        employeeId: normalizedEmployeeId,
        email,
        database: mongoose.connection.name,
        stack: saveError.stack
      });
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
          status: employee.status === 'active' ? 'ACTIVE' : 'INACTIVE'
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
const getEmployees = async (filters = {}, page = 1, limit = 10) => {
  try {
    // Skip caching for now - direct database query
    // const cacheKey = `employees:${JSON.stringify(filters)}:${page}:${limit}`;
    
    // Direct database query without caching
    const getData = async () => {
      const query = { isDeleted: false };

      // Apply filters
      if (filters.status) {
        query.status = filters.status;
      }
      if (filters.store) {
        query.store = filters.store;
      }
      if (filters.role) {
        query.role = filters.role;
      }
      if (filters.department) {
        query.department = new RegExp(filters.department, 'i');
      }
      if (filters.search) {
        query.$or = [
          { firstName: new RegExp(filters.search, 'i') },
          { lastName: new RegExp(filters.search, 'i') },
          { email: new RegExp(filters.search, 'i') },
          { employeeId: new RegExp(filters.search, 'i') }
        ];
      }

      const skip = (page - 1) * limit;

      const [employees, total] = await Promise.all([
        User.find(query)
          .populate('role', 'name permissions')
          .populate('store', 'name address')
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
const getEmployeeById = async (employeeId) => {
  try {
    const mongoose = require('mongoose');
    let employee;
    
    // Normalize the employeeId input
    const normalizedId = employeeId ? employeeId.toString().trim() : '';
    
    if (mongoose.Types.ObjectId.isValid(normalizedId)) {
      // If it's a valid ObjectId, search by _id
      employee = await User.findById(normalizedId)
        .populate('role', 'name permissions')
        .populate('store', 'name address')
        .lean();
    } else {
      // If it's not a valid ObjectId (e.g., employeeId like "EMP-2025-153599"), search by employeeId (camelCase)
      // Try both uppercase and original case
      employee = await User.findOne({ 
        $or: [
          { employeeId: normalizedId.toUpperCase() },
          { employeeId: normalizedId }
        ]
      })
        .populate('role', 'name permissions')
        .populate('store', 'name address')
        .lean();
    }

    if (!employee) {
      // Log for debugging
      logger.warn('Employee not found', { 
        searchedId: normalizedId,
        isObjectId: mongoose.Types.ObjectId.isValid(normalizedId)
      });
      throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
    }

    if (employee.isDeleted) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
    }

    return employee;
  } catch (error) {
    logger.error('Error in getEmployeeById service', { error: error.message, employeeId });
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
const updateEmployee = async (employeeId, updateData, updatedBy) => {
  try {
    const { roleName, storeId, uan, esiNo, panNumber, bankAccount, aadharMasked, previousEmployment, ...rest } = updateData;

    // Check if employeeId is a valid MongoDB ObjectId
    const mongoose = require('mongoose');
    let employee;
    let query;
    
    if (mongoose.Types.ObjectId.isValid(employeeId)) {
      // If it's a valid ObjectId, search by _id
      query = { _id: employeeId };
      employee = await User.findById(employeeId);
    } else {
      // If it's not a valid ObjectId (e.g., employeeId like "EMP-2025-153599"), search by employeeId (camelCase)
      query = { employeeId: employeeId.toUpperCase() };
      employee = await User.findOne({ employeeId: employeeId.toUpperCase() });
    }
    
    if (!employee) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Employee not found');
    }

    // Update role if provided
    if (roleName) {
      const role = await Role.findOne({ name: roleName });
      if (!role) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Specified role not found');
      }
      rest.role = role._id;
    }

    // Update store if provided
    if (storeId) {
      const store = await Store.findById(storeId);
      if (!store) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Specified store not found');
      }
      rest.store = store._id;
    }

    // Update User model
    const updatedEmployee = await User.findOneAndUpdate(
      query,
      rest,
      { new: true, runValidators: true }
    ).populate('role', 'name permissions').populate('store', 'name address');

    // Handle statutory information updates (UAN, ESI, PAN, Bank Account)
    // These are stored in CompensationProfile, not User model
    if (uan || esiNo || panNumber || bankAccount || previousEmployment) {
      const CompensationProfile = require('../models/CompensationProfile.model');
      const employeeIdStr = employee.employeeId || employeeId.toUpperCase();
      
      // Find or create CompensationProfile
      let compensationProfile = await CompensationProfile.findOne({ 
        $or: [
          { employee: employee._id },
          { employeeId: employeeIdStr }
        ]
      });
      
      if (!compensationProfile) {
        compensationProfile = new CompensationProfile({
          employee: employee._id,
          employeeId: employeeIdStr,
          updatedBy: updatedBy
        });
      }
      
      // Update statutory fields
      if (uan) compensationProfile.uan = uan;
      if (esiNo) compensationProfile.esiNo = esiNo;
      if (panNumber) compensationProfile.panNumber = panNumber.toUpperCase();
      if (aadharMasked) compensationProfile.aadharMasked = aadharMasked;
      
      if (bankAccount) {
        compensationProfile.bankAccount = {
          accountNumber: bankAccount.account_number || bankAccount.accountNumber,
          ifscCode: (bankAccount.ifsc_code || bankAccount.ifscCode)?.toUpperCase(),
          bankName: bankAccount.bank_name || bankAccount.bankName,
          accountType: bankAccount.account_type || bankAccount.accountType
        };
      }
      
      if (previousEmployment) {
        compensationProfile.previousEmployment = {
          hasPreviousEmployment: previousEmployment.has_previous_employment || previousEmployment.hasPreviousEmployment,
          employerName: previousEmployment.employer_name || previousEmployment.employerName,
          fromDate: previousEmployment.from_date ? new Date(previousEmployment.from_date) : (previousEmployment.fromDate ? new Date(previousEmployment.fromDate) : undefined),
          toDate: previousEmployment.to_date ? new Date(previousEmployment.to_date) : (previousEmployment.toDate ? new Date(previousEmployment.toDate) : undefined)
        };
      }
      
      compensationProfile.updatedBy = updatedBy;
      await compensationProfile.save();
      
      logger.info('Statutory information updated in CompensationProfile', {
        employeeId: employeeIdStr,
        hasUAN: !!uan,
        hasESI: !!esiNo,
        hasPAN: !!panNumber,
        hasBankAccount: !!bankAccount
      });
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
const deleteEmployee = async (employeeId, deletedBy) => {
  try {
    const employee = await User.findById(employeeId);
    if (!employee) {
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
const updateEmployeeStatus = async (employeeId, status, updatedBy) => {
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
const getStores = async (filters = {}, page = 1, limit = 10) => {
  try {
    const query = { isDeleted: false };

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
 * @returns {Promise<Object>} Created store
 */
const createStore = async (storeData, createdBy) => {
  try {
    const { code } = storeData;

    // Check if store code already exists
    const existingStore = await Store.findOne({ code });
    if (existingStore) {
      throw new ApiError(httpStatus.CONFLICT, 'Store with this code already exists');
    }

    const store = new Store({
      ...storeData,
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
const getStoreById = async (storeId) => {
  try {
    const store = await Store.findOne({ _id: storeId, isDeleted: false })
      .populate('manager', 'name email employee_id');

    if (!store) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Store not found');
    }

    return store;
  } catch (error) {
    logger.error('Error in getStoreById service', { error: error.message, storeId });
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
const updateStore = async (storeId, updateData, updatedBy) => {
  try {
    const store = await Store.findOne({ _id: storeId, isDeleted: false });

    if (!store) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Store not found');
    }

    // Check if code is being updated and if it already exists
    if (updateData.code && updateData.code !== store.code) {
      const existingStore = await Store.findOne({ code: updateData.code, _id: { $ne: storeId } });
      if (existingStore) {
        throw new ApiError(httpStatus.CONFLICT, 'Store with this code already exists');
      }
    }

    const previousData = { ...store.toObject() };
    
    Object.assign(store, updateData, { updatedBy, updatedAt: new Date() });
    await store.save();

    // Record audit log
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
const deleteStore = async (storeId, deletedBy) => {
  try {
    const store = await Store.findOne({ _id: storeId, isDeleted: false });

    if (!store) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Store not found');
    }

    // Check if store has employees
    const employeeCount = await User.countDocuments({ store: storeId, isDeleted: false });
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
  deleteStore
};