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

  // Helper to get nested value with fallbacks
  const getNested = (obj, ...paths) => {
    for (const path of paths) {
      const keys = path.split('.');
      let value = obj;
      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          value = null;
          break;
        }
      }
      if (value !== null && value !== undefined) return value;
    }
    return null;
  };

  // Format work location with both camelCase and snake_case
  const workLocation = emp.workLocation || {};
  const storeObj = emp.store && typeof emp.store === 'object' ? emp.store : null;
  
  // Format address with both formats
  const currentAddress = emp.currentAddress || emp.address || {};
  
  // Format emergency contact
  const emergencyContact = emp.emergencyContact || {};
  
  // Format bank account
  const bankAccount = emp.bankAccount || {};
  
  // Format previous employment
  const previousEmployment = emp.previousEmployment || {};

  // Get department reference
  const departmentRefObj = emp.departmentRef && typeof emp.departmentRef === 'object' ? emp.departmentRef : null;
  
  // Get role reference (for roleName)
  const roleObj = emp.role && typeof emp.role === 'object' ? emp.role : null;
  
  // Get reporting manager reference
  const reportingManagerObj = emp.reporting_manager && typeof emp.reporting_manager === 'object' ? emp.reporting_manager : null;
  
  // Get salary breakdown for base_salary calculation (before default object is created)
  const originalSalaryBreakdown = emp.salary_breakdown || emp.salaryBreakdown;
  // CRITICAL: Check if basic exists (including 0 as valid value)
  const salaryBreakdownBasic = (originalSalaryBreakdown && typeof originalSalaryBreakdown === 'object' && 'basic' in originalSalaryBreakdown) 
    ? originalSalaryBreakdown.basic 
    : null;
  
  return {
    // ============================================
    // Basic Information (Full Name, Employee ID/Code, Email, Phone, DOB, Gender)
    // ============================================
    id: emp._id?.toString() || emp.id,
    _id: emp._id?.toString() || emp.id,
    employeeId: emp.employeeId || emp.employeeCode || emp.code || emp.employee_id,
    employee_id: emp.employeeId || emp.employeeCode || emp.code || emp.employee_id,
    code: emp.code || emp.employeeId,
    tenantId: emp.tenantId || '',
    name: emp.name || emp.fullName || emp.full_name || `${emp.firstName || emp.first_name || ''} ${emp.lastName || emp.last_name || ''}`.trim(),
    firstName: emp.firstName || emp.first_name,
    first_name: emp.firstName || emp.first_name,
    lastName: emp.lastName || emp.last_name,
    last_name: emp.lastName || emp.last_name,
    fullName: emp.fullName || emp.full_name || emp.name || `${emp.firstName || emp.first_name || ''} ${emp.lastName || emp.last_name || ''}`.trim(),
    full_name: emp.fullName || emp.full_name || emp.name || `${emp.firstName || emp.first_name || ''} ${emp.lastName || emp.last_name || ''}`.trim(),
    email: emp.email || '',
    phone: emp.phone || '',
    dob: emp.dob || emp.dateOfBirth || emp.date_of_birth || null,
    dateOfBirth: emp.dob || emp.dateOfBirth || emp.date_of_birth || null,
    date_of_birth: emp.dob || emp.dateOfBirth || emp.date_of_birth || null,
    gender: emp.gender || 'N/A', // Display N/A if not set
    avatar: emp.avatar || `/avatars/${emp.employeeId || emp._id}.jpg`,
    
    // ============================================
    // Work Details (Department, Designation, Role Family, Grade Band, Status, DOJ, Confirmation Date, Salary, Annual CTC, Salary breakdown)
    // ============================================
    department: emp.department || departmentRefObj?.name || '',
    departmentRef: departmentRefObj ? {
      id: departmentRefObj._id?.toString() || departmentRefObj.id || '',
      _id: departmentRefObj._id?.toString() || departmentRefObj.id || '',
      name: departmentRefObj.name || '',
      code: departmentRefObj.code || '',
      description: departmentRefObj.description || ''
    } : null,
    designation: emp.designation || emp.position || '',
    jobTitle: emp.jobTitle || emp.job_title || emp.designation,
    job_title: emp.jobTitle || emp.job_title || emp.designation,
    roleName: emp.roleName || emp.role_name || roleObj?.name || '',
    role_name: emp.roleName || emp.role_name || roleObj?.name || '',
    role: roleObj ? {
      id: roleObj._id?.toString() || roleObj.id || '',
      _id: roleObj._id?.toString() || roleObj.id || '',
      name: roleObj.name || '',
      code: roleObj.code || ''
    } : null,
    roleFamily: emp.roleFamily || emp.role_family || '',
    role_family: emp.roleFamily || emp.role_family || '',
    gradeBand: emp.gradeBand || emp.grade_band || '',
    grade_band: emp.gradeBand || emp.grade_band || '',
    status: emp.status ? emp.status.toLowerCase() : 'active',
    employee_status: emp.status ? emp.status.toLowerCase() : 'active',
    doj: emp.doj || emp.joinDate || emp.join_date,
    joinDate: formatDate(emp.joinDate || emp.doj || emp.join_date),
    join_date: formatDate(emp.joinDate || emp.doj || emp.join_date),
    confirmationDate: emp.confirmationDate || emp.confirmation_date || 'N/A', // Display N/A if not set
    confirmation_date: emp.confirmationDate || emp.confirmation_date || 'N/A', // Display N/A if not set
    // DEPRECATED: salary field (for view compatibility, calculated from annual_ctc)
    salary: emp.salary || (emp.annual_ctc || emp.annualCtc ? Math.round((emp.annual_ctc || emp.annualCtc) / 12) : 0),
    annual_ctc: emp.annual_ctc || emp.annualCtc || 0,
    annualCtc: emp.annual_ctc || emp.annualCtc || 0,
    // Monthly Gross Salary (calculated from annual CTC)
    monthlyGross: emp.monthlyGross || emp.monthly_gross || (emp.annual_ctc || emp.annualCtc ? Math.round((emp.annual_ctc || emp.annualCtc) / 12) : 0),
    monthly_gross: emp.monthlyGross || emp.monthly_gross || (emp.annual_ctc || emp.annualCtc ? Math.round((emp.annual_ctc || emp.annualCtc) / 12) : 0),
    base_salary: emp.base_salary !== undefined && emp.base_salary !== null ? emp.base_salary : (emp.baseSalary !== undefined && emp.baseSalary !== null ? emp.baseSalary : (salaryBreakdownBasic !== null ? salaryBreakdownBasic : (emp.annual_ctc || emp.annualCtc ? Math.round((emp.annual_ctc || emp.annualCtc) / 12) : 0))),
    baseSalary: emp.base_salary !== undefined && emp.base_salary !== null ? emp.base_salary : (emp.baseSalary !== undefined && emp.baseSalary !== null ? emp.baseSalary : (salaryBreakdownBasic !== null ? salaryBreakdownBasic : (emp.annual_ctc || emp.annualCtc ? Math.round((emp.annual_ctc || emp.annualCtc) / 12) : 0))),
    salary_breakdown: emp.salary_breakdown || emp.salaryBreakdown || {
      basic: 0,
      hra: 0,
      special_allowance: 0,
      pf_employer: 0,
      gratuity: 0,
      other_allowances: 0
    },
    salaryBreakdown: emp.salary_breakdown || emp.salaryBreakdown || {
      basic: 0,
      hra: 0,
      special_allowance: 0,
      pf_employer: 0,
      gratuity: 0,
      other_allowances: 0
    },
    
    // ============================================
    // Work Location (Store, City, State, Pincode)
    // ============================================
    workLocation: {
      storeId: workLocation.storeId || workLocation.store_id || storeObj?._id?.toString() || storeObj?.id || null,
      store_id: workLocation.storeId || workLocation.store_id || storeObj?._id?.toString() || storeObj?.id || null,
      storeName: workLocation.storeName || workLocation.store_name || storeObj?.name || null,
      store_name: workLocation.storeName || workLocation.store_name || storeObj?.name || null,
      city: workLocation.city || null,
      state: workLocation.state || null,
      pincode: workLocation.pincode || null
    },
    work_location: {
      storeId: workLocation.storeId || workLocation.store_id || storeObj?._id?.toString() || storeObj?.id || null,
      store_id: workLocation.storeId || workLocation.store_id || storeObj?._id?.toString() || storeObj?.id || null,
      storeName: workLocation.storeName || workLocation.store_name || storeObj?.name || null,
      store_name: workLocation.storeName || workLocation.store_name || storeObj?.name || null,
      city: workLocation.city || null,
      state: workLocation.state || null,
      pincode: workLocation.pincode || null
    },
    store: storeObj ? {
      id: storeObj._id?.toString() || storeObj.id || '',
      _id: storeObj._id?.toString() || storeObj.id || '',
      name: storeObj.name || 'Unknown Store',
      code: storeObj.code || '',
      address: storeObj.address || {}
    } : (emp.workLocation?.storeId ? {
      // If no populated store but workLocation has storeId, return workLocation data
      id: emp.workLocation.storeId || '',
      _id: emp.workLocation.storeId || '',
      name: emp.workLocation.storeName || 'Unknown Store',
      code: '',
      address: {}
    } : {
      id: '',
      _id: '',
      name: 'Unknown Store',
      code: '',
      address: {}
    }),
    
    // ============================================
    // Reporting (Reporting Manager ID + Name)
    // ============================================
    reportingManager: reportingManagerObj ? (reportingManagerObj._id?.toString() || reportingManagerObj.id || 'N/A') : (emp.reportingManager || emp.reporting_manager || 'N/A'), // Display N/A if not set
    reporting_manager: reportingManagerObj ? (reportingManagerObj._id?.toString() || reportingManagerObj.id || 'N/A') : (emp.reportingManager || emp.reporting_manager || 'N/A'), // Display N/A if not set
    reportingManagerName: reportingManagerObj?.name || emp.reportingManagerName || emp.reporting_manager_name || emp.reportingManagerDetails?.name || 'N/A', // Display N/A if not set
    reporting_manager_name: reportingManagerObj?.name || emp.reportingManagerName || emp.reporting_manager_name || emp.reportingManagerDetails?.name || 'N/A', // Display N/A if not set
    reportingManagerDetails: reportingManagerObj ? {
      id: reportingManagerObj._id?.toString() || reportingManagerObj.id || '',
      _id: reportingManagerObj._id?.toString() || reportingManagerObj.id || '',
      name: reportingManagerObj.name || '',
      employeeId: reportingManagerObj.employeeId || reportingManagerObj.employee_id || ''
    } : null,
    manager: emp.manager || '',
    
    // ============================================
    // Address (Address lines, City, State, Pincode, Country)
    // ============================================
    currentAddress: {
      lines: currentAddress.lines || currentAddress.address_line_1 ? [currentAddress.address_line_1, currentAddress.address_line_2 || currentAddress.line2].filter(Boolean) : currentAddress.line1 ? [currentAddress.line1, currentAddress.line2].filter(Boolean) : [],
      address_line_1: currentAddress.lines?.[0] || currentAddress.address_line_1 || currentAddress.line1 || null,
      line1: currentAddress.lines?.[0] || currentAddress.address_line_1 || currentAddress.line1 || null,
      address_line_2: currentAddress.lines?.[1] || currentAddress.address_line_2 || currentAddress.line2 || null,
      line2: currentAddress.lines?.[1] || currentAddress.address_line_2 || currentAddress.line2 || null,
      city: currentAddress.city || null,
      state: currentAddress.state || null,
      pincode: currentAddress.pincode || currentAddress.zip || null,
      country: currentAddress.country || 'India'
    },
    current_address: {
      lines: currentAddress.lines || currentAddress.address_line_1 ? [currentAddress.address_line_1, currentAddress.address_line_2 || currentAddress.line2].filter(Boolean) : currentAddress.line1 ? [currentAddress.line1, currentAddress.line2].filter(Boolean) : [],
      address_line_1: currentAddress.lines?.[0] || currentAddress.address_line_1 || currentAddress.line1 || null,
      line1: currentAddress.lines?.[0] || currentAddress.address_line_1 || currentAddress.line1 || null,
      address_line_2: currentAddress.lines?.[1] || currentAddress.address_line_2 || currentAddress.line2 || null,
      line2: currentAddress.lines?.[1] || currentAddress.address_line_2 || currentAddress.line2 || null,
      city: currentAddress.city || null,
      state: currentAddress.state || null,
      pincode: currentAddress.pincode || currentAddress.zip || null,
      country: currentAddress.country || 'India'
    },
    
    // ============================================
    // Emergency Contact (Name, Relationship, Phone)
    // ============================================
    emergencyContact: {
      name: emergencyContact.name || 'N/A', // Display N/A if not set
      relationship: emergencyContact.relationship || 'N/A', // Display N/A if not set
      phone: emergencyContact.phone || emergencyContact.contact_number || 'N/A', // Display N/A if not set
      contact_number: emergencyContact.phone || emergencyContact.contact_number || 'N/A' // Display N/A if not set
    },
    emergency_contact: {
      name: emergencyContact.name || 'N/A', // Display N/A if not set
      relationship: emergencyContact.relationship || 'N/A', // Display N/A if not set
      phone: emergencyContact.phone || emergencyContact.contact_number || 'N/A', // Display N/A if not set
      contact_number: emergencyContact.phone || emergencyContact.contact_number || 'N/A' // Display N/A if not set
    },
    
    // ============================================
    // Statutory (UAN, ESI No, PAN, Aadhar masked)
    // ============================================
    uan: emp.uan || null,
    esiNo: emp.esiNo || emp.esi_no || emp.esiNumber || emp.esi_number || null,
    esi_no: emp.esiNo || emp.esi_no || emp.esiNumber || emp.esi_number || null,
    esiNumber: emp.esiNo || emp.esi_no || emp.esiNumber || emp.esi_number || null,
    esi_number: emp.esiNo || emp.esi_no || emp.esiNumber || emp.esi_number || null,
    panNumber: emp.panNumber || emp.pan_number || emp.pan || null,
    pan_number: emp.panNumber || emp.pan_number || emp.pan || null,
    pan: emp.panNumber || emp.pan_number || emp.pan || null,
    aadharMasked: emp.aadharMasked || emp.aadhar_masked || emp.aadhar || null,
    aadhar_masked: emp.aadharMasked || emp.aadhar_masked || emp.aadhar || null,
    aadhar: emp.aadharMasked || emp.aadhar_masked || emp.aadhar || null,
    
    // ============================================
    // Bank Details (Account No, IFSC, Bank Name, Branch, Account Type)
    // ============================================
    bankAccount: {
      accountNumber: bankAccount.accountNumber || bankAccount.account_number || bankAccount.account_no || null,
      account_number: bankAccount.accountNumber || bankAccount.account_number || bankAccount.account_no || null,
      account_no: bankAccount.accountNumber || bankAccount.account_number || bankAccount.account_no || null,
      ifscCode: bankAccount.ifscCode || bankAccount.ifsc_code || bankAccount.ifsc || null,
      ifsc_code: bankAccount.ifscCode || bankAccount.ifsc_code || bankAccount.ifsc || null,
      ifsc: bankAccount.ifscCode || bankAccount.ifsc_code || bankAccount.ifsc || null,
      bankName: bankAccount.bankName || bankAccount.bank_name || null,
      bank_name: bankAccount.bankName || bankAccount.bank_name || null,
      branchName: bankAccount.branchName || bankAccount.branch_name || bankAccount.branch || null,
      branch_name: bankAccount.branchName || bankAccount.branch_name || bankAccount.branch || null,
      branch: bankAccount.branchName || bankAccount.branch_name || bankAccount.branch || null,
      accountType: bankAccount.accountType || bankAccount.account_type || null,
      account_type: bankAccount.accountType || bankAccount.account_type || null
    },
    bank_account: {
      accountNumber: bankAccount.accountNumber || bankAccount.account_number || bankAccount.account_no || null,
      account_number: bankAccount.accountNumber || bankAccount.account_number || bankAccount.account_no || null,
      account_no: bankAccount.accountNumber || bankAccount.account_number || bankAccount.account_no || null,
      ifscCode: bankAccount.ifscCode || bankAccount.ifsc_code || bankAccount.ifsc || null,
      ifsc_code: bankAccount.ifscCode || bankAccount.ifsc_code || bankAccount.ifsc || null,
      ifsc: bankAccount.ifscCode || bankAccount.ifsc_code || bankAccount.ifsc || null,
      bankName: bankAccount.bankName || bankAccount.bank_name || null,
      bank_name: bankAccount.bankName || bankAccount.bank_name || null,
      branchName: bankAccount.branchName || bankAccount.branch_name || bankAccount.branch || null,
      branch_name: bankAccount.branchName || bankAccount.branch_name || bankAccount.branch || null,
      branch: bankAccount.branchName || bankAccount.branch_name || bankAccount.branch || null,
      accountType: bankAccount.accountType || bankAccount.account_type || null,
      account_type: bankAccount.accountType || bankAccount.account_type || null
    },
    
    // ============================================
    // Previous Employment (Has previous, Employer name, From/To date, Form 16)
    // ============================================
    previousEmployment: {
      has_previous_employment: previousEmployment.has_previous_employment || previousEmployment.hasPreviousEmployment || false,
      hasPreviousEmployment: previousEmployment.has_previous_employment || previousEmployment.hasPreviousEmployment || false,
      employer_name: previousEmployment.employer_name || previousEmployment.employerName || '',
      employerName: previousEmployment.employer_name || previousEmployment.employerName || '',
      from_date: previousEmployment.from_date || previousEmployment.fromDate || '',
      fromDate: previousEmployment.from_date || previousEmployment.fromDate || '',
      to_date: previousEmployment.to_date || previousEmployment.toDate || '',
      toDate: previousEmployment.to_date || previousEmployment.toDate || '',
      form_16_available: previousEmployment.form_16_available || previousEmployment.form16Available || false,
      form16Available: previousEmployment.form_16_available || previousEmployment.form16Available || false
    },
    previous_employment: {
      has_previous_employment: previousEmployment.has_previous_employment || previousEmployment.hasPreviousEmployment || false,
      hasPreviousEmployment: previousEmployment.has_previous_employment || previousEmployment.hasPreviousEmployment || false,
      employer_name: previousEmployment.employer_name || previousEmployment.employerName || '',
      employerName: previousEmployment.employer_name || previousEmployment.employerName || '',
      from_date: previousEmployment.from_date || previousEmployment.fromDate || '',
      fromDate: previousEmployment.from_date || previousEmployment.fromDate || '',
      to_date: previousEmployment.to_date || previousEmployment.toDate || '',
      toDate: previousEmployment.to_date || previousEmployment.toDate || '',
      form_16_available: previousEmployment.form_16_available || previousEmployment.form16Available || false,
      form16Available: previousEmployment.form_16_available || previousEmployment.form16Available || false
    },
    
    // ============================================
    // Documents (Uploaded documents list)
    // ============================================
    documents: emp.documents || emp.onboardingDocuments || [],
    
    // ============================================
    // Benefits Tab (Benefits, Performance, Attendance, Leaves, Training)
    // ============================================
    benefits: emp.benefits || [],
    performance: emp.performance || 4.3, // Default performance rating
    attendance: emp.attendance || 94.2, // Default attendance percentage
    leaves: emp.leaves || 12, // Default leave balance
    training: emp.training || 8, // Default training count
    
    // Sales-Specific Fields (Only for Sales department)
    ...(emp.department === 'Sales' && {
      target_sales: emp.target_sales || 0,
      incentive_slabs: emp.incentive_slabs || [],
      pan_number: emp.pan_number || emp.panNumber,
      tax_state: emp.tax_state,
      leave_entitlements: emp.leave_entitlements || {
        casual_leave: 12,
        sick_leave: 12,
        privilege_leave: 21
      }
    }),
    
    // Timestamps
    createdAt: emp.createdAt || emp.created_at,
    created_at: emp.createdAt || emp.created_at,
    updatedAt: emp.updatedAt || emp.updated_at,
    updated_at: emp.updatedAt || emp.updated_at
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

  // Extract employee name from populated employee object or direct field
  // Priority: 1. Direct employeeName field (stored in attendance), 2. Populated employee object, 3. Construct from firstName/lastName
  let employeeName = attendance.employeeName; // First priority: stored employee name
  if (!employeeName && attendance.employee) {
    // Handle populated employee object
    if (typeof attendance.employee === 'object' && attendance.employee !== null) {
      // Try to construct fullName from firstName and lastName (since fullName is virtual and not in lean())
      const firstName = attendance.employee.firstName || '';
      const lastName = attendance.employee.lastName || '';
      const constructedName = (firstName && lastName) 
        ? `${firstName} ${lastName}`.trim()
        : firstName || lastName || null;
      
      employeeName = attendance.employee.fullName || 
                     attendance.employee.name || 
                     constructedName;
    } else if (typeof attendance.employee === 'string') {
      employeeName = attendance.employee;
    }
  }

  // Extract employee ID from populated employee object or direct field
  let employeeId = attendance.employee_id || attendance.employeeId;
  if (!employeeId && attendance.employee) {
    if (typeof attendance.employee === 'object') {
      employeeId = attendance.employee.employeeId || 
                   attendance.employee.employee_id || 
                   attendance.employee._id?.toString();
    }
  }

  // Extract store information - CRITICAL: Ensure store data is never null
  let storeData = null;
  if (attendance.store) {
    if (typeof attendance.store === 'object' && attendance.store !== null) {
      storeData = {
        id: attendance.store._id?.toString() || attendance.store.id || '',
        _id: attendance.store._id?.toString() || attendance.store.id || '',
        name: attendance.store.name || 'Unknown Store',
        code: attendance.store.code || attendance.store_code || attendance.store.store_code || '',
        address: attendance.store.address || {}
      };
    }
  }
  
  // If no store data, use store_code from attendance record
  if (!storeData && attendance.store_code) {
    storeData = {
      id: attendance.store?.toString() || '',
      _id: attendance.store?.toString() || '',
      name: 'Unknown Store',
      code: attendance.store_code,
      address: {}
    };
  }
  
  // Final fallback - ensure store is never null
  if (!storeData) {
    storeData = {
      id: attendance.store?.toString() || '',
      _id: attendance.store?.toString() || '',
      name: 'Unknown Store',
      code: attendance.store_code || 'UNKNOWN',
      address: {}
    };
  }

  // Determine if employee is currently clocked in
  // Employee is clocked in if check_in_time exists AND check_out_time is null/undefined
  const isClockedIn = !!(attendance.check_in_time && !attendance.check_out_time);
  
  return {
    id: attendance._id?.toString() || attendance.id,
    employeeId: employeeId || 'UNKNOWN',
    employeeName: employeeName || 'Unknown Employee',
    date: formatDate(attendance.date) || formatDate(new Date()),
    isClockedIn: isClockedIn, // Explicit field for frontend to check clock-in status
    store: storeData, // CRITICAL: Always return store object, never null
    storeCode: storeData.code || attendance.store_code || 'UNKNOWN',
    status: attendance.status || 'present',
    shift: attendance.shift || null,
    shiftStart: attendance.shiftStart || attendance.shift_start || null,
    shiftEnd: attendance.shiftEnd || attendance.shift_end || null,
    totalHours: attendance.total_hours || attendance.totalHours || 0,
    checkIn: attendance.check_in_time ? {
      time: attendance.check_in_time,
      location: attendance.check_in_location ? {
        latitude: attendance.check_in_location.latitude || 0,
        longitude: attendance.check_in_location.longitude || 0,
        address: attendance.check_in_location.address || ''
      } : {
        latitude: 0,
        longitude: 0,
        address: ''
      },
      selfie: attendance.check_in_selfie?.secure_url || 
              attendance.check_in_selfie?.url || 
              attendance.check_in_selfie?.blobUrl ||
              (attendance.check_in_selfie && typeof attendance.check_in_selfie === 'object' 
                ? attendance.check_in_selfie.secure_url || attendance.check_in_selfie.url || attendance.check_in_selfie.blobUrl || null
                : null) ||
              null
    } : (attendance.checkIn || null),
    checkOut: attendance.check_out_time ? {
      time: attendance.check_out_time,
      location: attendance.check_out_location ? {
        latitude: attendance.check_out_location.latitude || 0,
        longitude: attendance.check_out_location.longitude || 0,
        address: attendance.check_out_location.address || ''
      } : {
        latitude: 0,
        longitude: 0,
        address: ''
      },
      selfie: (() => {
        // Check multiple possible locations for selfie URL
        if (attendance.check_out_selfie) {
          if (typeof attendance.check_out_selfie === 'string') {
            return attendance.check_out_selfie;
          }
          if (typeof attendance.check_out_selfie === 'object' && attendance.check_out_selfie !== null) {
            return attendance.check_out_selfie.secure_url || 
                   attendance.check_out_selfie.url || 
                   attendance.check_out_selfie.blobUrl ||
                   attendance.check_out_selfie.public_url ||
                   null;
          }
        }
        // Also check if selfie is stored directly in attendance object
        if (attendance.selfie) {
          return attendance.selfie;
        }
        return null;
      })()
    } : attendance.checkOut,
    totalHours: attendance.total_hours || attendance.totalHours || 0,
    total_hours: attendance.total_hours || attendance.totalHours || 0,
    hours_worked: attendance.total_hours || attendance.totalHours || 0,
    // Additional fields for frontend compatibility
    clock_in_time: attendance.check_in_time || attendance.checkIn?.time || null,
    clockInTime: attendance.check_in_time || attendance.checkIn?.time || null,
    clock_out_time: attendance.check_out_time || attendance.checkOut?.time || null,
    clockOutTime: attendance.check_out_time || attendance.checkOut?.time || null,
    status: attendance.status,
    isGeofenceValid: attendance.is_geofence_valid,
    location: attendance.check_in_location || attendance.location,
    storeId: attendance.store?._id?.toString() || attendance.store || attendance.storeId,
    // Extract store code with multiple fallbacks
    storeCode: (() => {
      // Priority 1: Direct store_code field from attendance record (if not UNKNOWN or empty)
      if (attendance.store_code && attendance.store_code !== 'UNKNOWN' && attendance.store_code.trim() !== '') {
        return attendance.store_code;
      }
      
      // Priority 2: storeCode field (alternative naming)
      if (attendance.storeCode && attendance.storeCode !== 'UNKNOWN' && attendance.storeCode.trim() !== '') {
        return attendance.storeCode;
      }
      
      // Priority 3: From populated store object
      if (attendance.store && typeof attendance.store === 'object') {
        const populatedCode = attendance.store.code || 
                              attendance.store.storeCode || 
                              attendance.store.store_code;
        if (populatedCode && populatedCode !== 'UNKNOWN' && populatedCode.trim() !== '') {
          return populatedCode;
        }
        
        // If store._id exists but code is empty, try to extract from _id if it looks like a code
        if (attendance.store._id && typeof attendance.store._id === 'string') {
          try {
            const mongoose = require('mongoose');
            // If _id is not a valid ObjectId, it might be a code
            if (!mongoose.Types.ObjectId.isValid(attendance.store._id)) {
              return attendance.store._id;
            }
          } catch (e) {
            // mongoose not available, skip this check
          }
        }
      }
      
      // Priority 4: Check if storeId looks like a code (not ObjectId)
      if (attendance.storeId && typeof attendance.storeId === 'string') {
        try {
          const mongoose = require('mongoose');
          if (!mongoose.Types.ObjectId.isValid(attendance.storeId)) {
            return attendance.storeId;
          }
        } catch (e) {
          // mongoose not available, skip this check
        }
      }
      
      // Final fallback: return what we have or UNKNOWN
      return attendance.store_code || attendance.storeCode || 'UNKNOWN';
    })(),
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

