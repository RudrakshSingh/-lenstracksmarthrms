/**
 * Standardized Response Utility
 * Ensures all API responses follow the documented format
 */

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {Object} pagination - Pagination info (optional)
 * @param {number} statusCode - HTTP status code (default: 200)
 */
function sendSuccess(res, data, message = 'Operation successful', pagination = null, statusCode = 200) {
  const response = {
    success: true,
    data: data,
    message: message
  };

  if (pagination) {
    response.pagination = pagination;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} error - Error message
 * @param {string} message - User-friendly message
 * @param {number} statusCode - HTTP status code (default: 400)
 */
function sendError(res, error, message = null, statusCode = 400) {
  const response = {
    success: false,
    error: error,
    message: message || error
  };

  return res.status(statusCode).json(response);
}

/**
 * Send 404 Not Found response
 * @param {Object} res - Express response object
 * @param {string} resourceType - Type of resource (e.g., "Employee", "Department")
 * @param {string} resourceId - ID of the resource
 */
function sendNotFound(res, resourceType = 'Resource', resourceId = null) {
  const error = resourceId 
    ? `${resourceType} with ID ${resourceId} not found`
    : `${resourceType} not found`;
  
  const message = resourceId
    ? `${resourceType} not found in backend`
    : `${resourceType} not found`;

  return sendError(res, error, message, 404);
}

/**
 * Send 503 Service Unavailable response
 * @param {Object} res - Express response object
 * @param {string} operation - Operation that failed (e.g., "fetch employees", "create employee")
 */
function sendServiceUnavailable(res, operation = 'operation') {
  const error = `Failed to ${operation} from backend`;
  const message = 'Backend API is unavailable. Please try again later.';
  
  return sendError(res, error, message, 503);
}

/**
 * Send 500 Internal Server Error response
 * @param {Object} res - Express response object
 * @param {string} error - Error message
 */
function sendInternalError(res, error = 'Failed to process request') {
  const message = 'Internal server error';
  return sendError(res, error, message, 500);
}

/**
 * Create pagination object
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} Pagination object
 */
function createPagination(page, limit, total) {
  const pages = Math.ceil(total / limit);
  
  return {
    page: page,
    limit: limit,
    total: total,
    pages: pages,
    hasNext: page < pages,
    hasPrev: page > 1
  };
}

/**
 * Validate required fields
 * @param {Object} data - Data to validate
 * @param {Array<string>} requiredFields - Array of required field names
 * @returns {Object|null} Error object if validation fails, null if valid
 */
function validateRequired(data, requiredFields) {
  const missing = requiredFields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });

  if (missing.length > 0) {
    return {
      error: `Missing required fields: ${missing.join(', ')}`,
      message: 'Validation failed'
    };
  }

  return null;
}

/**
 * Parse pagination query parameters
 * @param {Object} query - Express request query object
 * @returns {Object} Parsed pagination parameters
 */
function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 25));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Parse filter query parameters
 * @param {Object} query - Express request query object
 * @param {Array<string>} allowedFilters - Array of allowed filter field names
 * @returns {Object} Filter object
 */
function parseFilters(query, allowedFilters = []) {
  const filters = {};

  allowedFilters.forEach(field => {
    if (query[field] !== undefined && query[field] !== null && query[field] !== '') {
      filters[field] = query[field];
    }
  });

  // Always include search if present
  if (query.search) {
    filters.search = query.search;
  }

  return filters;
}

/**
 * Format date for response
 * @param {Date|string} date - Date to format
 * @returns {string} ISO formatted date string
 */
function formatDate(date) {
  if (!date) return null;
  if (date instanceof Date) {
    return date.toISOString();
  }
  return new Date(date).toISOString();
}

/**
 * Format employee response
 * @param {Object} employee - Employee document
 * @returns {Object} Formatted employee object
 */
function formatEmployee(employee) {
  if (!employee) return null;

  // Convert Mongoose document to plain object if needed
  const emp = employee.toObject ? employee.toObject() : employee;

  return {
    // Basic Info
    id: emp._id?.toString() || emp.id,
    employeeId: emp.employeeId || emp.employeeCode || emp.code,
    code: emp.code || emp.employeeId,
    firstName: emp.firstName,
    lastName: emp.lastName,
    fullName: emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
    email: emp.email,
    phone: emp.phone,
    avatar: emp.avatar || `/avatars/${emp.employeeId || emp._id}.jpg`,
    
    // Work Details
    department: emp.department,
    designation: emp.designation || emp.position,
    jobTitle: emp.jobTitle || emp.designation,
    roleFamily: emp.roleFamily,
    grade_band: emp.grade_band || emp.gradeBand,
    gradeBand: emp.gradeBand || emp.grade_band,
    status: emp.status ? emp.status.toLowerCase() : 'active',
    salary: emp.salary,
    
    // Dates
    doj: emp.doj,
    dob: emp.dob,
    joinDate: formatDate(emp.joinDate || emp.doj),
    confirmationDate: emp.confirmationDate,
    
    // Reporting Manager
    reportingManager: emp.reportingManager,
    reportingManagerName: emp.reportingManagerName || emp.reportingManagerDetails?.name,
    manager: emp.manager,
    
    // Work Location
    workLocation: emp.workLocation,
    store: emp.store,
    
    // Address
    currentAddress: emp.currentAddress,
    
    // Emergency Contact
    emergencyContact: emp.emergencyContact,
    
    // Statutory Information
    uan: emp.uan,
    esiNo: emp.esiNo,
    aadharMasked: emp.aadharMasked,
    panNumber: emp.panNumber,
    bankAccount: emp.bankAccount,
    
    // Previous Employment
    previousEmployment: emp.previousEmployment,
    
    // Documents
    documents: emp.documents,
    
    // Timestamps
    createdAt: emp.createdAt || emp.created_at,
    updatedAt: emp.updatedAt || emp.updated_at
  };
}

/**
 * Format department response
 * @param {Object} department - Department document
 * @returns {Object} Formatted department object
 */
function formatDepartment(department) {
  if (!department) return null;

  return {
    id: department._id?.toString() || department.id,
    name: department.name,
    code: department.code,
    manager: department.manager,
    employees: department.employees || department.employeeCount || 0,
    budget: department.budget,
    status: department.status,
    location: department.location,
    phone: department.phone,
    email: department.email,
    established: formatDate(department.established),
    description: department.description
  };
}

/**
 * Format attendance response
 * @param {Object} attendance - Attendance document
 * @returns {Object} Formatted attendance object
 */
function formatAttendance(attendance) {
  if (!attendance) return null;

  return {
    id: attendance._id?.toString() || attendance.id,
    employeeId: attendance.employee_id || attendance.employeeId,
    employeeName: attendance.employeeName,
    date: formatDate(attendance.date),
    checkIn: attendance.check_in_time ? {
      time: attendance.check_in_time,
      location: attendance.check_in_location ? {
        latitude: attendance.check_in_location.latitude,
        longitude: attendance.check_in_location.longitude,
        address: attendance.check_in_location.address
      } : null,
      selfie: attendance.check_in_selfie?.secure_url || attendance.check_in_selfie?.url || null
    } : attendance.checkIn,
    checkOut: attendance.check_out_time ? {
      time: attendance.check_out_time,
      location: attendance.check_out_location ? {
        latitude: attendance.check_out_location.latitude,
        longitude: attendance.check_out_location.longitude,
        address: attendance.check_out_location.address
      } : null,
      selfie: attendance.check_out_selfie?.secure_url || attendance.check_out_selfie?.url || null
    } : attendance.checkOut,
    totalHours: attendance.total_hours || attendance.totalHours,
    status: attendance.status,
    isGeofenceValid: attendance.is_geofence_valid,
    location: attendance.check_in_location || attendance.location,
    storeId: attendance.store?._id?.toString() || attendance.store || attendance.storeId,
    storeCode: attendance.store_code || attendance.storeCode,
    remarks: attendance.remarks || attendance.notes,
    createdAt: attendance.createdAt,
    updatedAt: attendance.updatedAt
  };
}

module.exports = {
  sendSuccess,
  sendError,
  sendNotFound,
  sendServiceUnavailable,
  sendInternalError,
  createPagination,
  validateRequired,
  parsePagination,
  parseFilters,
  formatDate,
  formatEmployee,
  formatDepartment,
  formatAttendance
};

