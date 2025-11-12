const User = require('../models/User.model');
const Role = require('../models/Role.model');
const Store = require('../models/Store.model');
const CompensationProfile = require('../models/CompensationProfile.model');
const OnboardingDraft = require('../models/OnboardingDraft.model');
const { hashPassword } = require('../utils/hashUtils');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');

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

    // Get role (Role model automatically converts to lowercase)
    const roleDoc = await Role.findByName(role.toLowerCase()) || await Role.findOne({ name: role.toLowerCase() });
    if (!roleDoc) {
      // Try to seed roles if they don't exist
      try {
        const { seedRoles } = require('../utils/seedRoles');
        await seedRoles();
        const retryRole = await Role.findByName(role.toLowerCase());
        if (!retryRole) {
          throw new ApiError(httpStatus.BAD_REQUEST, `Invalid role specified: ${role}. Available roles: employee, hr, manager, admin, superadmin`);
        }
        return retryRole;
      } catch (seedError) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Invalid role specified: ${role}. Available roles: employee, hr, manager, admin, superadmin`);
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
      joining_date,
      reporting_manager_id,
      employee_status = 'ACTIVE',
      base_salary,
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

    // Validate store (optional)
    if (storeId) {
      const mongoose = require('mongoose');
      // Validate ObjectId format
      if (mongoose.Types.ObjectId.isValid(storeId)) {
        const store = await Store.findById(storeId);
        if (store) {
          user.store = store._id;
        } else {
          logger.warn('Store not found, proceeding without store assignment', { storeId });
        }
      } else {
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

    // Save additional work details in a separate field or create compensation profile
    if (base_salary || target_sales || pf_applicable !== undefined || esic_applicable !== undefined || joining_date) {
      // Ensure employeeId is always set - use employeeId from user or fallback to _id
      const employeeIdStr = user.employeeId || user._id.toString();
      
      if (!employeeIdStr) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'EMPLOYEE_ID_REQUIRED', 'Employee ID is required');
      }
      
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
      
      // Delete ALL existing profiles for this employee to avoid duplicate key errors
      // This ensures we start fresh and don't have conflicts with null employeeId values
      const deleteResult = await CompensationProfile.deleteMany({ 
        $or: [
          { employee: user._id },
          { employeeId: employeeIdStr }
        ]
      });
      
      logger.info('Deleted existing compensation profiles', {
        employeeId: employeeIdStr,
        deletedCount: deleteResult.deletedCount
      });
      
      // Also delete any profiles with null employeeId for this employee (cleanup)
      await CompensationProfile.deleteMany({ 
        employee: user._id,
        employeeId: null 
      });
      
      // Create new profile with all the data - employeeId is guaranteed to be set
      // IMPORTANT: Set employeeId explicitly AFTER spreading updateData to ensure it's never null
      const existingProfile = new CompensationProfile({
        ...updateData,
        employee: user._id,
        employeeId: employeeIdStr, // Explicitly set AFTER spread to ensure it's never null
        createdBy: createdBy
      });
      
      // Double-check that employeeId is set
      if (!existingProfile.employeeId) {
        existingProfile.employeeId = employeeIdStr;
      }
      
      try {
        await existingProfile.save();
      } catch (saveError) {
        // If still getting duplicate key error, try to find and update existing
        if (saveError.code === 11000) {
          logger.warn('Duplicate key error on save, attempting to find and update existing profile', {
            employeeId: employeeIdStr,
            error: saveError.message
          });
          
          const existing = await CompensationProfile.findOne({ 
            $or: [
              { employee: user._id },
              { employeeId: employeeIdStr }
            ]
          });
          
          if (existing) {
            Object.keys(updateData).forEach(key => {
              existing[key] = updateData[key];
            });
            existing.employee = user._id;
            existing.employeeId = employeeIdStr;
            await existing.save();
          } else {
            throw saveError;
          }
        } else {
          throw saveError;
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
      esiNo,
      panNumber,
      previousEmployment
    } = statutoryData;

    // Validate bank account
    if (bankAccount) {
      // Validate IFSC (11 characters: 4 letters + 0 + 6 alphanumeric)
      if (bankAccount.ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankAccount.ifsc_code.toUpperCase())) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'INVALID_IFSC', 'IFSC must be 11 characters (4 letters + 0 + 6 alphanumeric)');
      }

      // Validate PAN (10 characters: 5 letters + 4 digits + 1 letter)
      if (panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber.toUpperCase())) {
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
    const employeeIdStr = user.employeeId || user._id.toString();
    
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
    if (panNumber) updateData.panNumber = panNumber.toUpperCase();
    
    if (previousEmployment) {
      updateData.previousEmployment = {
        hasPreviousEmployment: previousEmployment.has_previous_employment,
        employerName: previousEmployment.employer_name,
        fromDate: previousEmployment.from_date ? new Date(previousEmployment.from_date) : undefined,
        toDate: previousEmployment.to_date ? new Date(previousEmployment.to_date) : undefined
      };
    }
    
    // Try to find existing profile first
    let existingProfile = await CompensationProfile.findOne({ employee: user._id });
    
    if (!existingProfile) {
      // Check by employeeId as well
      existingProfile = await CompensationProfile.findOne({ employeeId: employeeIdStr });
    }
    
    if (existingProfile) {
      // Update existing profile - merge with existing data
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          existingProfile[key] = updateData[key];
        }
      });
      existingProfile.employee = user._id; // Ensure employee reference is set
      existingProfile.employeeId = employeeIdStr; // Ensure employeeId is set
      existingProfile.updatedBy = updatedBy;
      
      // If profile doesn't have createdBy, set it
      if (!existingProfile.createdBy) {
        existingProfile.createdBy = updatedBy;
      }
      
      await existingProfile.save();
    } else {
      // Delete any profiles with null employeeId for this employee to avoid conflicts
      await CompensationProfile.deleteMany({ 
        employee: user._id,
        employeeId: null 
      });
      
      // Create new profile
      existingProfile = new CompensationProfile({
        employee: user._id,
        ...updateData,
        createdBy: updatedBy
      });
      await existingProfile.save();
    }

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
    const user = await User.findOne({ employeeId: employeeId.toUpperCase() });
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'EMPLOYEE_NOT_FOUND', 'Employee not found');
    }

    const { system_access } = onboardingData;

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

    await user.save();

    logger.info('Onboarding completed', {
      employeeId: user.employeeId,
      completedBy
    });

    return {
      employee_id: user.employeeId,
      status: 'active',
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
    const drafts = await OnboardingDraft.find({ employee_id: employeeId.toUpperCase() })
      .sort({ step: 1 })
      .populate('created_by', 'firstName lastName email')
      .populate('updated_by', 'firstName lastName email');

    return {
      employee_id: employeeId.toUpperCase(),
      drafts: drafts.map(d => ({
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

module.exports = {
  registerBasicInfo,
  addWorkDetails,
  addStatutoryInfo,
  completeOnboarding,
  saveDraft,
  getDraft
};

