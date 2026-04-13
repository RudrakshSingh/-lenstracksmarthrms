const User = require('../models/User.model');
const Role = require('../models/Role.model');
const Store = require('../models/Store.model');
const CompensationProfile = require('../models/CompensationProfile.model');
const OnboardingDraft = require('../models/OnboardingDraft.model');
const { hashPassword } = require('../utils/hashUtils');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');
const httpStatusPkg = require('http-status');
const httpStatus = httpStatusPkg.default || httpStatusPkg;

const resolveAttendanceConfig = (workData = {}) => {
  const rawWorkMode = String(workData.workMode || '').toUpperCase().trim();
  const rawAttendancePolicy = String(workData.attendancePolicy || '').toUpperCase().trim();
  const rawStoreId = String(workData.storeId || '').toLowerCase().trim();

  let workMode = ['STORE_BOUND', 'BACKOFFICE', 'ROAMING'].includes(rawWorkMode)
    ? rawWorkMode
    : 'STORE_BOUND';
  let attendancePolicy = ['STRICT_GEOFENCE', 'NO_GEOFENCE', 'FLEXI_SHIFT'].includes(rawAttendancePolicy)
    ? rawAttendancePolicy
    : 'STRICT_GEOFENCE';

  // If onboarding selected special location types, default to non-store-bound behavior.
  if (rawStoreId === 'backoffice' || rawStoreId === 'office') {
    if (!rawWorkMode) workMode = 'BACKOFFICE';
    if (!rawAttendancePolicy) attendancePolicy = 'NO_GEOFENCE';
  }

  return { workMode, attendancePolicy };
};

/**
 * Step 1: Register basic information
 */
const registerBasicInfo = async (registerData) => {
  try {
    const {
      employee_id,
      name,
      email,
      phone,
      password,
      role = 'employee',
      date_of_birth,
      gender,
      address
    } = registerData;

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'INVALID_EMAIL', 'Invalid email format');
    }

    // Validate phone (10 digits for Indian format)
    const phoneRegex = /^[6-9]\d{9}$/;
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10 || !phoneRegex.test(cleanPhone)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'INVALID_PHONE', 'Phone must be 10 digits (Indian format)');
    }

    // Validate pincode (6 digits)
    if (address?.pincode && !/^\d{6}$/.test(address.pincode)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'INVALID_PINCODE', 'Pincode must be exactly 6 digits');
    }

    // Validate date of birth (18+ years)
    if (date_of_birth) {
      const dob = new Date(date_of_birth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      if (age < 18) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'INVALID_DOB', 'Date of birth must be 18+ years');
      }
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ApiError(httpStatus.CONFLICT, 'Email already exists');
    }

    // Check if employee_id already exists
    const existingEmployee = await User.findOne({ employeeId: employee_id.toUpperCase() });
    if (existingEmployee) {
      throw new ApiError(httpStatus.CONFLICT, 'Employee ID already exists');
    }

    // Validate role against valid roles enum FIRST (before database lookup)
    const validRoles = ['employee', 'hr', 'manager', 'admin', 'superadmin'];
    const normalizedRole = role.toLowerCase();
    
    if (!validRoles.includes(normalizedRole)) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Invalid role specified: ${role}. Available roles: ${validRoles.join(', ')}`);
    }

    // Get role (Role model automatically converts to lowercase)
    let roleDoc = await Role.findByName(normalizedRole) || await Role.findOne({ name: normalizedRole });
    
    if (!roleDoc) {
      // Try to seed roles if they don't exist
      try {
        logger.info('Role not found, attempting to seed roles', { role: normalizedRole });
        const { seedRoles } = require('../utils/seedRoles');
        await seedRoles();
        // Retry finding the role after seeding
        roleDoc = await Role.findByName(normalizedRole) || await Role.findOne({ name: normalizedRole });
      } catch (seedError) {
        logger.warn('Error seeding roles, will create role directly', { 
          error: seedError.message, 
          role: normalizedRole 
        });
      }
      
      // If still not found, check for inactive role
      if (!roleDoc) {
        const inactiveRole = await Role.findOne({ name: normalizedRole, is_active: false });
        if (inactiveRole) {
          inactiveRole.is_active = true;
          await inactiveRole.save();
          roleDoc = inactiveRole;
          logger.info('Reactivated inactive role', { role: normalizedRole });
        }
      }
      
      // If still not found and role is valid, auto-create it (similar to auth-service)
      if (!roleDoc && validRoles.includes(normalizedRole)) {
        try {
          roleDoc = new Role({
            name: normalizedRole,
            display_name: normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1),
            description: `${normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1)} role`,
            is_active: true,
            permissions: [] // Basic permissions, can be updated later via admin panel
          });
          await roleDoc.save();
          logger.info('Auto-created role', { role: normalizedRole });
        } catch (createError) {
          logger.error('Failed to auto-create role', { 
            error: createError.message, 
            role: normalizedRole,
            stack: createError.stack
          });
          // Last attempt: try to find role one more time (might have been created by another request)
          roleDoc = await Role.findByName(normalizedRole) || await Role.findOne({ name: normalizedRole });
          if (!roleDoc) {
            // Check if it's a validation error (enum mismatch)
            if (createError.message && createError.message.includes('enum')) {
              logger.error('Role enum validation failed', { 
                role: normalizedRole,
                validRoles: validRoles,
                error: createError.message
              });
              throw new ApiError(httpStatus.BAD_REQUEST, 
                `Invalid role: ${role}. Role must be one of: ${validRoles.join(', ')}`);
            }
            throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 
              `Failed to create role: ${role}. ${createError.message}`);
          }
        }
      } else if (!roleDoc) {
        // This should never happen since we validated above, but just in case
        logger.error('Role not found and could not be created', { 
          role: normalizedRole,
          validRoles 
        });
        throw new ApiError(httpStatus.BAD_REQUEST, 
          `Invalid role specified: ${role}. Available roles: ${validRoles.join(', ')}`);
      }
    } else {
      // Role found, ensure it's active
      if (!roleDoc.is_active) {
        roleDoc.is_active = true;
        await roleDoc.save();
        logger.info('Reactivated role', { role: normalizedRole });
      }
    }

    // Split name into first and last
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Create user with basic info
    const user = new User({
      employeeId: employee_id.toUpperCase(),
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone: cleanPhone,
      password,
      role: roleDoc._id,
      dateOfBirth: date_of_birth ? new Date(date_of_birth) : undefined,
      dob: date_of_birth ? new Date(date_of_birth) : undefined,
      gender: gender,
      address: address ? {
        street: address.address_line_1 || address.street,
        city: address.city,
        state: address.state,
        zip: address.pincode || address.zip,
        country: address.country || 'India'
      } : undefined,
      status: 'pending', // Pending until onboarding is complete
      is_active: false
    });

    await user.save();

    logger.info('Basic info registered', {
      employeeId: user.employeeId,
      email: user.email
    });

    return {
      employee_id: user.employeeId,
      user_id: user._id,
      email: user.email,
      status: 'pending'
    };
  } catch (error) {
    logger.error('Error in registerBasicInfo', { error: error.message });
    throw error;
  }
};

/**
 * Step 2: Add work details
 */
const addWorkDetails = async (employeeId, workData, createdBy) => {
  try {
    const user = await User.findOne({ employeeId: employeeId.toUpperCase() });
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'EMPLOYEE_NOT_FOUND', 'Employee not found');
    }

    const {
      jobTitle,
      department,
      storeId,
      designation,
      role_family,
      workMode,
      attendancePolicy,
      joining_date,
      reporting_manager_id,
      employee_status = 'ACTIVE',
      base_salary,
      annual_ctc,
      salary_breakdown,
      target_sales,
      pf_applicable,
      esic_applicable,
      pt_applicable,
      tds_applicable,
      pan_number,
      tax_state,
      leave_entitlements,
      incentive_slabs
    } = workData;
    const attendanceConfig = resolveAttendanceConfig({ workMode, attendancePolicy, storeId });

    // Handle special store values: "backoffice", "office", "", or actual store ID
    if (storeId) {
      const mongoose = require('mongoose');
      
      if (storeId === 'backoffice' || storeId === 'office') {
        // Special work location types - don't validate as ObjectId
        // Store will be null, but workLocation will be set in Employee model
        logger.info('Special work location type selected', { storeId, type: storeId });
      } else if (storeId !== '' && mongoose.Types.ObjectId.isValid(storeId)) {
        // Actual store ID - validate
        const store = await Store.findById(storeId);
        if (store) {
          user.store = store._id;
        } else {
          logger.warn('Store not found, proceeding without store assignment', { storeId });
        }
      } else if (storeId !== '') {
        logger.warn('Invalid store ID format, proceeding without store assignment', { storeId });
      }
    }

    // Validate reporting manager (optional - can be employeeId or ObjectId)
    if (reporting_manager_id) {
      const mongoose = require('mongoose');
      let manager = null;
      
      // Try to find by ObjectId first
      if (mongoose.Types.ObjectId.isValid(reporting_manager_id)) {
        manager = await User.findById(reporting_manager_id);
      }
      
      // If not found, try by employeeId
      if (!manager) {
        manager = await User.findOne({ employeeId: reporting_manager_id });
      }
      
      // If still not found, log warning but don't fail (manager might be added later)
      if (!manager) {
        logger.warn('Reporting manager not found, proceeding without manager assignment', { reporting_manager_id });
      }
    }

    // Calculate confirmation date (6 months from joining)
    let confirmation_date = null;
    if (joining_date) {
      const joining = new Date(joining_date);
      confirmation_date = new Date(joining);
      confirmation_date.setMonth(confirmation_date.getMonth() + 6);
    }

    // Update user with work details
    user.jobTitle = jobTitle || user.jobTitle;
    user.department = department || user.department;
    user.status = employee_status.toLowerCase() || user.status;
    user.workMode = attendanceConfig.workMode;
    user.attendancePolicy = attendanceConfig.attendancePolicy;
    
    // Validate and reject old salary fields
    if (base_salary !== undefined || workData.salary !== undefined) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'DEPRECATED_FIELD', 'salary/base_salary field is deprecated, use annual_ctc instead');
    }
    
    // Update new salary structure (required)
    if (annual_ctc === undefined || annual_ctc === null) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'ANNUAL_CTC_REQUIRED', 'annual_ctc is required');
    }
    if (annual_ctc <= 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'INVALID_ANNUAL_CTC', 'annual_ctc must be greater than 0');
    }
    if (annual_ctc > 99999999.99) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'INVALID_ANNUAL_CTC', 'annual_ctc cannot exceed 99,999,999.99');
    }
    
    user.annual_ctc = annual_ctc;
    if (salary_breakdown !== undefined) {
      user.salary_breakdown = salary_breakdown;
    }
    
    // Validate sales-specific fields only for Sales department
    const isSales = department === 'Sales';
    const salesFields = ['target_sales', 'incentive_slabs', 'pan_number', 'tax_state', 'leave_entitlements'];
    const hasSalesFields = salesFields.some(field => workData[field] !== undefined && workData[field] !== null);
    
    if (!isSales && hasSalesFields) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'SALES_FIELDS_ONLY', 'Incentive slabs and sales-specific fields are only applicable for Sales department employees');
    }
    
    // Update sales-specific fields (only for Sales department)
    if (isSales) {
      if (target_sales !== undefined) {
        user.target_sales = target_sales;
      }
      if (incentive_slabs !== undefined && Array.isArray(incentive_slabs)) {
        // Validate incentive slabs
        for (const slab of incentive_slabs) {
          if (slab.max_sales < slab.min_sales) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'INVALID_INCENTIVE_SLAB', `Incentive slab "${slab.name}": max_sales must be >= min_sales`);
          }
          if (slab.incentive_percentage < 0 || slab.incentive_percentage > 100) {
            throw new ApiError(httpStatus.BAD_REQUEST, 'INVALID_INCENTIVE_PERCENTAGE', `Incentive slab "${slab.name}": incentive_percentage must be between 0 and 100`);
          }
        }
        user.incentive_slabs = incentive_slabs;
      }
      if (pan_number !== undefined) {
        // Validate PAN format
        if (pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan_number.toUpperCase())) {
          throw new ApiError(httpStatus.BAD_REQUEST, 'INVALID_PAN', 'PAN must be in format ABCDE1234F');
        }
        user.pan_number = pan_number ? pan_number.toUpperCase() : pan_number;
      }
      if (tax_state !== undefined) {
        user.tax_state = tax_state;
      }
      if (leave_entitlements !== undefined) {
        user.leave_entitlements = leave_entitlements;
      }
    }

    // Save additional work details in a separate field or create compensation profile
    if (base_salary || target_sales || pf_applicable !== undefined || esic_applicable !== undefined || joining_date) {
      // Ensure employeeId is always set - use employeeId from user or fallback to _id
      // Check for null, undefined, empty string, or invalid values
      let employeeIdStr = user.employeeId;
      if (!employeeIdStr || employeeIdStr === null || employeeIdStr === 'null' || employeeIdStr === 'undefined' || employeeIdStr === '' || typeof employeeIdStr !== 'string') {
        employeeIdStr = user._id.toString();
      }
      
      // Ensure it's a valid string
      employeeIdStr = String(employeeIdStr).trim();
      if (!employeeIdStr || employeeIdStr === 'null' || employeeIdStr === 'undefined') {
        throw new ApiError(httpStatus.BAD_REQUEST, 'EMPLOYEE_ID_REQUIRED', 'Employee ID is required');
      }
      
      logger.info('Creating CompensationProfile with employeeId', {
        employeeId: employeeIdStr,
        userEmployeeId: user.employeeId,
        userId: user._id
      });
      
      // Build update data - ensure employeeId is always set
      const updateData = {
        employeeId: employeeIdStr,
        updatedBy: createdBy
      };
      
      if (base_salary !== undefined) updateData.baseSalary = base_salary;
      if (target_sales !== undefined) updateData.targetSales = target_sales;
      if (pf_applicable !== undefined) updateData.pfApplicable = pf_applicable;
      if (esic_applicable !== undefined) updateData.esicApplicable = esic_applicable;
      if (pt_applicable !== undefined) updateData.ptApplicable = pt_applicable;
      if (tds_applicable !== undefined) updateData.tdsApplicable = tds_applicable;
      if (pan_number) updateData.panNumber = pan_number;
      if (tax_state) updateData.taxState = tax_state;
      if (role_family) updateData.roleFamily = role_family;
      if (leave_entitlements) updateData.leaveEntitlements = leave_entitlements;
      if (incentive_slabs) updateData.incentiveSlabs = incentive_slabs;
      if (joining_date) updateData.joiningDate = new Date(joining_date);
      if (confirmation_date) updateData.confirmationDate = confirmation_date;
      
      // Aggressively delete ALL existing profiles for this employee (multiple queries to catch all cases)
      const deleteQueries = [
        { employee: user._id },
        { employeeId: employeeIdStr },
        { employee: user._id, employeeId: null },
        { employee: user._id, employeeId: { $exists: false } },
        { employeeId: null, employee: user._id }
      ];
      
      let totalDeleted = 0;
      for (const query of deleteQueries) {
        const result = await CompensationProfile.deleteMany(query);
        totalDeleted += result.deletedCount;
      }
      
      if (totalDeleted > 0) {
        logger.info('Deleted existing compensation profiles', {
          employeeId: employeeIdStr,
          deletedCount: totalDeleted
        });
      }
      
      // Build profile data with employeeId set FIRST
      const profileData = {
        employee: user._id,
        employeeId: employeeIdStr, // Set FIRST - must never be null
        ...updateData,
        createdBy: createdBy
      };
      
      // Triple-check employeeId is never null or undefined
      if (!profileData.employeeId || profileData.employeeId === 'null' || profileData.employeeId === 'undefined' || profileData.employeeId === null) {
        profileData.employeeId = employeeIdStr;
      }
      
      // Verify employeeId is a valid string
      if (typeof profileData.employeeId !== 'string' || profileData.employeeId.trim() === '') {
        profileData.employeeId = employeeIdStr;
      }
      
      // Use findOneAndUpdate with upsert - but handle errors gracefully
      // IMPORTANT: Set employeeId explicitly in the query filter AND in $set to ensure it's never null
      try {
        // First, try to find existing profile
        let existingProfile = await CompensationProfile.findOne({ employee: user._id });
        
        if (existingProfile) {
          // Update existing - explicitly set employeeId
          Object.keys(profileData).forEach(key => {
            if (profileData[key] !== undefined && key !== '_id') {
              existingProfile[key] = profileData[key];
            }
          });
          existingProfile.employeeId = employeeIdStr; // Force set
          existingProfile.updatedBy = createdBy;
          await existingProfile.save();
        } else {
          // Create new - ensure employeeId is set AFTER spread to override any null values
          existingProfile = new CompensationProfile({
            employee: user._id,
            ...profileData,
            employeeId: employeeIdStr, // Set AFTER spread to ensure it's never null
            createdBy: createdBy
          });
          
          // Triple-check employeeId before saving
          if (!existingProfile.employeeId || existingProfile.employeeId === null || existingProfile.employeeId === 'null' || existingProfile.employeeId === 'undefined') {
            existingProfile.employeeId = employeeIdStr;
          }
          
          // Final validation
          if (typeof existingProfile.employeeId !== 'string' || existingProfile.employeeId.trim() === '') {
            existingProfile.employeeId = employeeIdStr;
          }
          
          await existingProfile.save();
        }
      } catch (upsertError) {
        // If upsert fails, try to find and update existing
        if (upsertError.code === 11000) {
          logger.warn('Upsert failed with duplicate key, finding and updating existing profile', {
            employeeId: employeeIdStr,
            error: upsertError.message
          });
          
          // Try to find existing profile
          const existing = await CompensationProfile.findOne({ employee: user._id });
          if (existing) {
            // Update existing
            Object.keys(profileData).forEach(key => {
              if (profileData[key] !== undefined && key !== '_id') {
                existing[key] = profileData[key];
              }
            });
            existing.employeeId = employeeIdStr; // Force set
            existing.updatedBy = createdBy;
            await existing.save();
          } else {
            // If no existing found, delete all and try again
            await CompensationProfile.deleteMany({ employee: user._id });
            const newProfile = new CompensationProfile({
              ...profileData,
              employeeId: employeeIdStr // Explicitly set
            });
            await newProfile.save();
          }
        } else {
          throw upsertError;
        }
      }
    }

    await user.save();

    logger.info('Work details added', {
      employeeId: user.employeeId,
      department,
      jobTitle
    });

    return {
      employee_id: user.employeeId,
      confirmation_date,
      status: user.status
    };
  } catch (error) {
    logger.error('Error in addWorkDetails', { error: error.message, employeeId });
    throw error;
  }
};

/**
 * Step 3: Add statutory information
 */
const addStatutoryInfo = async (employeeId, statutoryData, updatedBy) => {
  try {
    const user = await User.findOne({ employeeId: employeeId.toUpperCase() });
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'EMPLOYEE_NOT_FOUND', 'Employee not found');
    }

    const {
      bankAccount,
      uan,
      esiNo: esiNoFromData,
      esi_number, // Support frontend field name
      panNumber,
      pan_number, // Support frontend field name
      previousEmployment
    } = statutoryData;
    
    // Support both field names (esiNo and esi_number)
    const esiNo = esiNoFromData || esi_number;
    
    // Support both field names (panNumber and pan_number)
    const panNumberFinal = panNumber || pan_number;

    // Validate bank account
    if (bankAccount) {
      // Validate IFSC (11 characters: 4 letters + 0 + 6 alphanumeric)
      if (bankAccount.ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankAccount.ifsc_code.toUpperCase())) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'INVALID_IFSC', 'IFSC must be 11 characters (4 letters + 0 + 6 alphanumeric)');
      }

      // Validate PAN (10 characters: 5 letters + 4 digits + 1 letter)
      if (panNumberFinal && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumberFinal.toUpperCase())) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'INVALID_PAN', 'PAN must be 10 characters (5 letters + 4 digits + 1 letter)');
      }

      // Validate UAN (12 digits)
      if (uan && !/^\d{12}$/.test(uan)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'INVALID_UAN', 'UAN must be 12 digits');
      }

      // Validate ESI (15 digits)
      if (esiNo && !/^\d{15}$/.test(esiNo)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'INVALID_ESI', 'ESI number must be 15 digits');
      }
    }

    // Get or create compensation profile - handle duplicates properly
    // Check for null, undefined, empty string, or invalid values
    let employeeIdStr = user.employeeId;
    if (!employeeIdStr || employeeIdStr === null || employeeIdStr === 'null' || employeeIdStr === 'undefined' || employeeIdStr === '' || typeof employeeIdStr !== 'string') {
      employeeIdStr = user._id.toString();
    }
    
    // Ensure it's a valid string
    employeeIdStr = String(employeeIdStr).trim();
    if (!employeeIdStr || employeeIdStr === 'null' || employeeIdStr === 'undefined') {
      throw new ApiError(httpStatus.BAD_REQUEST, 'EMPLOYEE_ID_REQUIRED', 'Employee ID is required');
    }
    
    logger.info('Adding statutory info with employeeId', {
      employeeId: employeeIdStr,
      userEmployeeId: user.employeeId,
      userId: user._id
    });
    
    // Build update data
    const updateData = {
      employeeId: employeeIdStr,
      updatedBy: updatedBy
    };
    
    if (bankAccount) {
      updateData.bankAccount = {
        accountNumber: bankAccount.account_number,
        ifscCode: bankAccount.ifsc_code?.toUpperCase(),
        bankName: bankAccount.bank_name,
        accountType: bankAccount.account_type
      };
    }
    
    if (uan) updateData.uan = uan;
    if (esiNo) updateData.esiNo = esiNo;
    if (panNumberFinal) updateData.panNumber = panNumberFinal.toUpperCase();
    
    if (previousEmployment) {
      updateData.previousEmployment = {
        hasPreviousEmployment: previousEmployment.has_previous_employment,
        employerName: previousEmployment.employer_name,
        fromDate: previousEmployment.from_date ? new Date(previousEmployment.from_date) : undefined,
        toDate: previousEmployment.to_date ? new Date(previousEmployment.to_date) : undefined
      };
    }

    // CRITICAL: Also save to User model directly for immediate availability
    if (bankAccount) {
      user.bankAccount = {
        accountNumber: bankAccount.account_number,
        account_number: bankAccount.account_number,
        account_no: bankAccount.account_number,
        ifscCode: bankAccount.ifsc_code?.toUpperCase(),
        ifsc_code: bankAccount.ifsc_code?.toUpperCase(),
        ifsc: bankAccount.ifsc_code?.toUpperCase(),
        bankName: bankAccount.bank_name,
        bank_name: bankAccount.bank_name,
        accountType: bankAccount.account_type,
        account_type: bankAccount.account_type
      };
    }
    if (uan) {
      user.uan = uan;
    }
    if (esiNo) {
      user.esiNo = esiNo;
      user.esi_no = esiNo;
      user.esiNumber = esiNo;
      user.esi_number = esiNo;
    }
    if (panNumberFinal) {
      user.panNumber = panNumberFinal.toUpperCase();
      user.pan_number = panNumberFinal.toUpperCase();
      user.pan = panNumberFinal.toUpperCase();
    }
    if (previousEmployment) {
      user.previousEmployment = {
        hasPreviousEmployment: previousEmployment.has_previous_employment,
        employerName: previousEmployment.employer_name,
        fromDate: previousEmployment.from_date ? new Date(previousEmployment.from_date) : undefined,
        toDate: previousEmployment.to_date ? new Date(previousEmployment.to_date) : undefined
      };
      user.previous_employment = user.previousEmployment;
    }
    
    // Aggressively delete ALL existing profiles for this employee (multiple queries to catch all cases)
    const deleteQueries = [
      { employee: user._id },
      { employeeId: employeeIdStr },
      { employee: user._id, employeeId: null },
      { employee: user._id, employeeId: { $exists: false } },
      { employeeId: null, employee: user._id }
    ];
    
    let totalDeleted = 0;
    for (const query of deleteQueries) {
      const result = await CompensationProfile.deleteMany(query);
      totalDeleted += result.deletedCount;
    }
    
    if (totalDeleted > 0) {
      logger.info('Deleted existing compensation profiles for statutory update', {
        employeeId: employeeIdStr,
        deletedCount: totalDeleted
      });
    }
    
    // Build profile data with employeeId set FIRST
    const profileData = {
      employee: user._id,
      employeeId: employeeIdStr, // Set FIRST - must never be null
      ...updateData,
      updatedBy: updatedBy
    };
    
    // Set createdBy if not already set
    if (!profileData.createdBy) {
      profileData.createdBy = updatedBy;
    }
    
    // Triple-check employeeId is never null or undefined
    if (!profileData.employeeId || profileData.employeeId === 'null' || profileData.employeeId === 'undefined' || profileData.employeeId === null) {
      profileData.employeeId = employeeIdStr;
    }
    
    // Verify employeeId is a valid string
    if (typeof profileData.employeeId !== 'string' || profileData.employeeId.trim() === '') {
      profileData.employeeId = employeeIdStr;
    }
    
    // Use findOneAndUpdate with upsert - but handle errors gracefully
      // IMPORTANT: Set employeeId explicitly to ensure it's never null
      try {
        // First, try to find existing profile
        let existingProfile = await CompensationProfile.findOne({ employee: user._id });
        
        if (existingProfile) {
          // Update existing - explicitly set employeeId
          Object.keys(profileData).forEach(key => {
            if (profileData[key] !== undefined && key !== '_id') {
              existingProfile[key] = profileData[key];
            }
          });
          existingProfile.employeeId = employeeIdStr; // Force set
          existingProfile.updatedBy = updatedBy;
          await existingProfile.save();
        } else {
          // Create new - ensure employeeId is set AFTER spread to override any null values
          existingProfile = new CompensationProfile({
            employee: user._id,
            ...profileData,
            employeeId: employeeIdStr, // Set AFTER spread to ensure it's never null
            createdBy: updatedBy
          });
          
          // Triple-check employeeId before saving
          if (!existingProfile.employeeId || existingProfile.employeeId === null || existingProfile.employeeId === 'null' || existingProfile.employeeId === 'undefined') {
            existingProfile.employeeId = employeeIdStr;
          }
          
          // Final validation
          if (typeof existingProfile.employeeId !== 'string' || existingProfile.employeeId.trim() === '') {
            existingProfile.employeeId = employeeIdStr;
          }
          
          await existingProfile.save();
        }
      } catch (upsertError) {
      // If upsert fails, try to find and update existing
      if (upsertError.code === 11000) {
        logger.warn('Upsert failed with duplicate key in statutory info, finding and updating existing profile', {
          employeeId: employeeIdStr,
          error: upsertError.message
        });
        
        // Try to find existing profile
        const existing = await CompensationProfile.findOne({ employee: user._id });
        if (existing) {
          // Update existing
          Object.keys(profileData).forEach(key => {
            if (profileData[key] !== undefined && key !== '_id') {
              existing[key] = profileData[key];
            }
          });
          existing.employeeId = employeeIdStr; // Force set
          existing.updatedBy = updatedBy;
          await existing.save();
        } else {
          // If no existing found, delete all and try again
          await CompensationProfile.deleteMany({ employee: user._id });
          const newProfile = new CompensationProfile({
            ...profileData,
            employeeId: employeeIdStr // Explicitly set
          });
          await newProfile.save();
        }
      } else {
        throw upsertError;
      }
    }

    // CRITICAL: Save user with updated statutory info
    await user.save();

    logger.info('Statutory info added', {
      employeeId: user.employeeId
    });

    return {
      employee_id: user.employeeId,
      status: 'statutory_info_added'
    };
  } catch (error) {
    logger.error('Error in addStatutoryInfo', { error: error.message, employeeId });
    throw error;
  }
};

/**
 * Step 5: Complete onboarding
 */
const completeOnboarding = async (employeeId, onboardingData, completedBy) => {
  try {
    // Support both employeeId (string) and MongoDB _id (ObjectId)
    let user = null;
    const mongoose = require('mongoose');
    
    // Try to find by MongoDB _id first (if it's a valid ObjectId)
    if (mongoose.Types.ObjectId.isValid(employeeId)) {
      user = await User.findById(employeeId);
    }
    
    // If not found by _id, try by employeeId
    if (!user) {
      user = await User.findOne({ employeeId: employeeId.toUpperCase() });
    }
    
    // If still not found, try case-insensitive search
    if (!user) {
      user = await User.findOne({ 
        $or: [
          { employeeId: employeeId.toUpperCase() },
          { employeeId: employeeId.toLowerCase() },
          { employeeId: employeeId }
        ]
      });
    }
    
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'EMPLOYEE_NOT_FOUND', 'Employee not found');
    }

    const { system_access } = onboardingData || {};

    // Update user status to active
    user.status = 'active';
    user.is_active = true;

    // Handle system access if provided
    if (system_access?.create_system_account) {
      // User account is already created, just activate it
      // If password needs to be changed, handle it here
      if (system_access.password_options?.force_change_on_first_login) {
        // Set flag for password change on first login
        user.forcePasswordChange = true;
      }

      // Send notifications if configured
      if (system_access.notifications) {
        // TODO: Implement email/SMS notifications
        logger.info('System access notifications', {
          employeeId: user.employeeId,
          notifications: system_access.notifications
        });
      }
    }

    // Save user with error handling
    try {
      await user.save();
    } catch (saveError) {
      logger.error('Error saving user during onboarding completion', {
        error: saveError.message,
        employeeId: user.employeeId,
        userId: user._id
      });
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'USER_SAVE_FAILED', `Failed to save user: ${saveError.message}`);
    }

    logger.info('Onboarding completed', {
      employeeId: user.employeeId,
      userId: user._id,
      completedBy
    });

    return {
      employee_id: user.employeeId,
      user_id: user._id,
      status: user.status,
      is_active: user.is_active,
      message: 'Onboarding completed successfully'
    };
  } catch (error) {
    logger.error('Error in completeOnboarding', { error: error.message, employeeId });
    throw error;
  }
};

/**
 * Save onboarding draft
 */
const saveDraft = async (employeeId, step, data, userId) => {
  try {
    let draft = await OnboardingDraft.findOne({ employee_id: employeeId.toUpperCase(), step });
    
    if (draft) {
      draft.data = data;
      draft.updated_by = userId;
      draft.updatedAt = new Date();
    } else {
      draft = new OnboardingDraft({
        employee_id: employeeId.toUpperCase(),
        step,
        data,
        created_by: userId,
        updated_by: userId
      });
    }

    await draft.save();

    return {
      employee_id: draft.employee_id,
      step: draft.step,
      saved_at: draft.updatedAt
    };
  } catch (error) {
    logger.error('Error in saveDraft', { error: error.message, employeeId, step });
    throw error;
  }
};

/**
 * Get onboarding draft
 */
const getDraft = async (employeeId) => {
  try {
    // Fetch drafts without sort (Cosmos DB index issue)
    // Sort in memory instead
    const drafts = await OnboardingDraft.find({ employee_id: employeeId.toUpperCase() })
      .populate('created_by', 'firstName lastName email')
      .populate('updated_by', 'firstName lastName email');

    // Sort in memory by step
    const sortedDrafts = drafts.sort((a, b) => {
      const stepOrder = { 'personal-details': 1, 'work-details': 2, 'statutory-info': 3, 'documents': 4 };
      const aOrder = stepOrder[a.step] || 99;
      const bOrder = stepOrder[b.step] || 99;
      return aOrder - bOrder;
    });

    return {
      employee_id: employeeId.toUpperCase(),
      drafts: sortedDrafts.map(d => ({
        step: d.step,
        data: d.data,
        created_at: d.createdAt,
        updated_at: d.updatedAt
      }))
    };
  } catch (error) {
    logger.error('Error in getDraft', { error: error.message, employeeId });
    throw error;
  }
};

/**
 * Step 1: Add personal details (onboarding-specific endpoint)
 * This updates an existing employee's personal details
 */
const addPersonalDetails = async (personalData, createdBy) => {
  try {
    const { employee_id, name, email, phone, date_of_birth, address } = personalData;

    if (!employee_id) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Employee ID is required');
    }

    // Find existing employee
    const user = await User.findOne({ employeeId: employee_id.toUpperCase() });
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'EMPLOYEE_NOT_FOUND', 'Employee not found');
    }

    // Update personal details
    if (name) {
      const nameParts = name.trim().split(' ');
      user.firstName = nameParts[0] || user.firstName;
      user.lastName = nameParts.slice(1).join(' ') || user.lastName;
      user.fullName = name.trim();
    }

    if (email) {
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(email)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'INVALID_EMAIL', 'Invalid email format');
      }
      // Check if email is already used by another user
      const existingUser = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
      if (existingUser) {
        throw new ApiError(httpStatus.CONFLICT, 'Email already exists');
      }
      user.email = email.toLowerCase();
    }

    if (phone) {
      const cleanPhone = phone.replace(/\D/g, ''); // Remove all non-digits
      const phoneRegex = /^[6-9]\d{9}$/;
      if (cleanPhone.length === 10 && phoneRegex.test(cleanPhone)) {
        user.phone = cleanPhone;
      } else {
        // If not Indian format, just store the cleaned phone (for international numbers)
        if (cleanPhone.length > 0) {
          user.phone = cleanPhone;
        } else {
          throw new ApiError(httpStatus.BAD_REQUEST, 'INVALID_PHONE', 'Phone number is required');
        }
      }
    }

    if (date_of_birth) {
      const dob = new Date(date_of_birth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      const actualAge = (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) ? age - 1 : age;
      if (actualAge < 18) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'INVALID_DOB', 'Date of birth must be 18+ years');
      }
      user.dateOfBirth = dob;
    }

    if (address) {
      if (address.pincode && !/^\d{6}$/.test(address.pincode)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'INVALID_PINCODE', 'Pincode must be exactly 6 digits');
      }
      user.address = {
        street: address.address_line_1 || address.street || user.address?.street,
        city: address.city || user.address?.city,
        state: address.state || user.address?.state,
        zip: address.pincode || address.zip || user.address?.zip,
        country: address.country || user.address?.country || 'India'
      };
    }

    await user.save();

    logger.info('Personal details updated', {
      employeeId: user.employeeId,
      email: user.email
    });

    return {
      employee_id: user.employeeId,
      user_id: user._id,
      email: user.email,
      status: user.status
    };
  } catch (error) {
    logger.error('Error in addPersonalDetails', { error: error.message });
    throw error;
  }
};

/**
 * Step 4: Add onboarding documents
 */
const addDocuments = async (employeeId, documentsData, uploadedBy) => {
  try {
    const user = await User.findOne({ employeeId: employeeId.toUpperCase() });
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'EMPLOYEE_NOT_FOUND', 'Employee not found');
    }

    const { documents } = documentsData;

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'DOCUMENTS_REQUIRED', 'At least one document is required');
    }

    // Validate document structure
    const validDocumentTypes = [
      'AADHAR',
      'PAN',
      'PASSPORT',
      'DRIVING_LICENSE',
      'EDUCATION_CERTIFICATE',
      'EXPERIENCE_CERTIFICATE',
      'BANK_STATEMENT',
      'PHOTO',
      'SIGNATURE',
      'OTHER'
    ];

    const processedDocuments = documents.map((doc, index) => {
      if (!doc.type || !validDocumentTypes.includes(doc.type)) {
        throw new ApiError(httpStatus.BAD_REQUEST, `INVALID_DOCUMENT_TYPE_${index}`, `Invalid document type at index ${index}. Valid types: ${validDocumentTypes.join(', ')}`);
      }

      if (!doc.url && !doc.file_url) {
        throw new ApiError(httpStatus.BAD_REQUEST, `MISSING_DOCUMENT_URL_${index}`, `Document URL is required at index ${index}`);
      }

      return {
        type: doc.type,
        name: doc.name || doc.file_name || `${doc.type}_${Date.now()}`,
        url: doc.url || doc.file_url,
        uploadedAt: doc.uploaded_at ? new Date(doc.uploaded_at) : new Date(),
        uploadedBy: uploadedBy,
        verified: doc.verified || false,
        verifiedBy: doc.verified_by || null,
        verifiedAt: doc.verified_at ? new Date(doc.verified_at) : null,
        metadata: doc.metadata || {}
      };
    });

    // Store documents in user model or create a separate document collection
    // For now, we'll store in user's onboardingDocuments field
    if (!user.onboardingDocuments) {
      user.onboardingDocuments = [];
    }

    // Add new documents (avoid duplicates by type)
    processedDocuments.forEach(newDoc => {
      const existingIndex = user.onboardingDocuments.findIndex(
        d => d.type === newDoc.type && d.url === newDoc.url
      );
      
      if (existingIndex >= 0) {
        // Update existing document
        user.onboardingDocuments[existingIndex] = {
          ...user.onboardingDocuments[existingIndex],
          ...newDoc,
          uploadedAt: new Date() // Update upload time
        };
      } else {
        // Add new document
        user.onboardingDocuments.push(newDoc);
      }

      // If PHOTO is uploaded during onboarding, keep avatar in sync
      if (newDoc.type === 'PHOTO' && newDoc.url) {
        user.avatar = newDoc.url;
      }
    });

    await user.save();

    logger.info('Documents added to onboarding', {
      employeeId: user.employeeId,
      documentCount: processedDocuments.length
    });

    return {
      employee_id: user.employeeId,
      documents: user.onboardingDocuments,
      status: 'documents_added'
    };
  } catch (error) {
    logger.error('Error in addDocuments', { error: error.message, employeeId });
    throw error;
  }
};

module.exports = {
  registerBasicInfo,
  addPersonalDetails,
  addWorkDetails,
  addStatutoryInfo,
  addDocuments,
  completeOnboarding,
  saveDraft,
  getDraft
};

