const User = require('../models/User.model');
const Role = require('../models/Role.model');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../config/jwt');
const { hashPassword, comparePassword } = require('../utils/hashUtils');
const { connectRedis } = require('../config/redis');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/email');
const { logAuthEvent } = require('../utils/audit');
const logger = require('../config/logger');
const { resolveEffectivePermissionsForUser } = require('../utils/effectivePermissions');

/** Microservices (e.g. attendance) use Redis keyed by permRev; JWT carries permissions as fallback when cache misses. Set JWT_SKIP_PERMISSIONS_CLAIM=1 to omit (smaller tokens). */
function jwtPermissionsPayloadEnabled() {
  return process.env.JWT_SKIP_PERMISSIONS_CLAIM !== 'true' && process.env.JWT_SKIP_PERMISSIONS_CLAIM !== '1';
}

class AuthService {
  constructor() {
    this.redis = connectRedis();
    // In-memory fallback for refresh tokens when Redis is unavailable
    this.refreshTokenMemoryStore = new Map();
    this.refreshTokenTtlMs = 7 * 24 * 60 * 60 * 1000; // 7 days
  }

  /**
   * In-memory fallback helpers for refresh tokens
   */
  saveRefreshTokenInMemory(userId, refreshToken) {
    this.refreshTokenMemoryStore.set(userId, {
      token: refreshToken,
      expiresAt: Date.now() + this.refreshTokenTtlMs,
    });
  }

  getRefreshTokenInMemory(userId) {
    const entry = this.refreshTokenMemoryStore.get(userId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.refreshTokenMemoryStore.delete(userId);
      return null;
    }
    return entry.token;
  }

  removeRefreshTokenInMemory(userId) {
    this.refreshTokenMemoryStore.delete(userId);
  }

  /**
   * Register a new user
   * @param {object} userData - User registration data
   * @param {string} createdBy - ID of user creating this account
   * @returns {Promise<object>} Created user and tokens
   */
  async register(userData, createdBy) {
    try {
      const {
        employee_id,
        name,
        email,
        phone,
        password,
        role,
        department,
        designation,
        joining_date,
        stores,
        reporting_manager
      } = userData;
      const mustChangePassword = userData.mustChangePassword === true;
      const passwordTemporary = userData.passwordTemporary === true;

      // Validate required fields
      if (!employee_id) {
        throw new Error('Employee ID is required');
      }
      if (!name) {
        throw new Error('Name is required');
      }
      if (!email) {
        throw new Error('Email is required');
      }
      if (!password) {
        throw new Error('Password is required');
      }

      // Check if user already exists
      const normalizedEmployeeId = employee_id.toUpperCase();
      const existingUser = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { employee_id: normalizedEmployeeId }]
      });

      if (existingUser) {
        throw new Error('User with this email or employee ID already exists');
      }

      // Validate and normalize role
      const normalizedRole = role ? role.toLowerCase().trim() : 'employee';
      
      // Validate role exists, create if it doesn't
      let roleExists = await Role.findOne({ name: normalizedRole, is_active: true });
      if (!roleExists) {
        // Check if role exists but is inactive
        roleExists = await Role.findOne({ name: normalizedRole });
        if (roleExists) {
          // Reactivate the role
          roleExists.is_active = true;
          await roleExists.save();
          logger.info('Reactivated existing role', { role: normalizedRole });
        } else {
          // Create the role if it doesn't exist (for standard roles)
          const validRoles = ['admin', 'hr', 'manager', 'employee', 'superadmin', 'accountant', 'store_manager', 'sales', 'optometrist'];
          
          if (validRoles.includes(normalizedRole)) {
            try {
              roleExists = new Role({
                name: normalizedRole,
                display_name: normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1),
                description: `${normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1)} role`,
                is_active: true
              });
              await roleExists.save();
              logger.info('Created new role', { role: normalizedRole });
            } catch (saveError) {
              // If save fails (e.g., duplicate key), try to find the role again
              logger.warn('Failed to create role, trying to find existing role', { 
                error: saveError.message, 
                role: normalizedRole 
              });
              roleExists = await Role.findOne({ name: normalizedRole });
              if (!roleExists) {
                logger.error('Role creation failed and role not found', { 
                  error: saveError.message, 
                  role: normalizedRole,
                  stack: saveError.stack
                });
                throw new Error(`Failed to create role: ${normalizedRole}. ${saveError.message}`);
              }
            }
          } else {
            logger.error('Invalid role specified', { 
              role: role, 
              normalizedRole: normalizedRole,
              validRoles: validRoles 
            });
            throw new Error(`Invalid role specified: ${role}. Valid roles are: ${validRoles.join(', ')}`);
          }
        }
      }

      // Ensure we have a valid role (use normalizedRole from above)
      if (!roleExists) {
        logger.error('Role not found after validation', { role: normalizedRole });
        throw new Error(`Role validation failed: ${normalizedRole}`);
      }

      // Create user
      // Handle required fields for User model
      const userDepartment = department ? department.toUpperCase() : 'HR'; // Default to HR if not provided
      const validDepartments = ['SALES', 'TECH', 'ACCOUNTS', 'ECOMMERCE', 'FRANCHISE', 'LAB', 'DELIVERY', 'HR'];
      const finalDepartment = validDepartments.includes(userDepartment) ? userDepartment : 'HR';
      
      const user = new User({
        tenantId: (userData.tenantId || 'default').toLowerCase().trim(), // Default tenant for now
        employee_id: normalizedEmployeeId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone ? phone.trim() : undefined,
        password,
        role: normalizedRole, // Use normalized role
        department: finalDepartment, // Required field with valid enum value
        band_level: userData.band_level || 'F', // Required field with default
        hierarchy_level: userData.hierarchy_level || 'STORE', // Required field with default
        designation: designation ? designation.trim() : (normalizedRole === 'employee' ? 'Employee' : normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1)), // Required field - must be provided or defaults based on role
        joining_date: joining_date || new Date(), // Default to current date if not provided
        stores: stores || [],
        reporting_manager: reporting_manager || undefined,
        mustChangePassword,
        passwordTemporary,
        created_by: createdBy
      });

      // Save user with detailed error handling
      try {
        await user.save();
      } catch (saveError) {
        logger.error('Failed to save user to database', {
          error: saveError.message,
          stack: saveError.stack,
          employeeId: normalizedEmployeeId,
          email: email.toLowerCase(),
          errors: saveError.errors,
          code: saveError.code
        });
        
        // Handle duplicate key error (MongoDB)
        if (saveError.code === 11000 || saveError.code === 11001) {
          const duplicateField = saveError.keyPattern ? Object.keys(saveError.keyPattern)[0] : 'unknown';
          throw new Error(`User with this ${duplicateField} already exists`);
        }
        
        // Handle validation errors
        if (saveError.name === 'ValidationError') {
          const validationErrors = Object.values(saveError.errors || {}).map(err => err.message).join(', ');
          throw new Error(`Validation failed: ${validationErrors}`);
        }
        
        // Re-throw with more context
        throw new Error(`Failed to create user: ${saveError.message}`);
      }

      const permRevForToken = user.permissionsRevision != null ? user.permissionsRevision : 0;
      let effectiveForJwt = [];
      try {
        const resolved = await resolveEffectivePermissionsForUser(user);
        effectiveForJwt = resolved.effectivePermissions || [];
      } catch (permErr) {
        logger.warn('Register: could not compute effective permissions for JWT', {
          error: permErr.message,
          userId: user._id
        });
      }

      // Generate tokens (employee_id + permRev + permissions for downstream Redis/JWT alignment)
      const accessToken = generateAccessToken({
        userId: user._id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        employee_id: user.employee_id,
        permRev: permRevForToken,
        ...(jwtPermissionsPayloadEnabled() && { permissions: effectiveForJwt })
      });
      const refreshToken = generateRefreshToken({ userId: user._id });

      // Store refresh token in Redis
      await this.storeRefreshToken(user._id, refreshToken);

      // Send welcome email
      try {
        await sendWelcomeEmail({
          name: user.name,
          email: user.email,
          employee_id: user.employee_id,
          password: password // In production, generate a temporary password
        });
      } catch (emailError) {
        logger.warn('Failed to send welcome email', { error: emailError.message, userId: user._id });
      }

      logger.info('User registered successfully', { userId: user._id, employeeId: user.employee_id });

      // Sync employee to HR service (non-blocking)
      try {
        const { syncEmployeeToHR } = require('../utils/hrServiceClient');
        syncEmployeeToHR(userData, accessToken).catch(syncError => {
          logger.warn('Employee sync to HR service failed (non-blocking)', {
            error: syncError.message,
            employeeId: user.employee_id
          });
        });
      } catch (syncError) {
        logger.warn('Could not initiate HR sync', { error: syncError.message });
      }

      // Get public profile safely
      let publicProfile;
      try {
        publicProfile = user.getPublicProfile ? user.getPublicProfile() : {
          id: user._id,
          employee_id: user.employee_id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId
        };
      } catch (profileError) {
        logger.warn('Failed to get public profile, using basic fields', { error: profileError.message });
        publicProfile = {
          id: user._id,
          employee_id: user.employee_id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId
        };
      }

      return {
        user: publicProfile,
        accessToken,
        refreshToken
      };

    } catch (error) {
      logger.error('User registration failed', { error: error.message, userData });
      throw error;
    }
  }

  /**
   * Login user (supports both email and employee ID)
   * @param {string} emailOrEmployeeId - User email or employee ID
   * @param {string} password - User password
   * @param {string} ip - User IP address
   * @param {string} userAgent - User agent
   * @returns {Promise<object>} User and tokens
   */
  async login(emailOrEmployeeId, password, ip, userAgent, tenantId = null) {
    try {
      const normalizedTenantId = tenantId ? String(tenantId).trim().toLowerCase() : null;
      logger.info('Login attempt', { emailOrEmployeeId, ip, tenantId: normalizedTenantId || 'not-provided' });
      
      // Ensure database connection - use the global mongoose connection
      const mongoose = require('mongoose');
      
      // If not connected, wait a bit and check again (connection might be establishing)
      if (mongoose.connection.readyState !== 1) {
        logger.warn('Database not connected, waiting...', { readyState: mongoose.connection.readyState });
        
        // Wait up to 2 seconds for connection
        for (let i = 0; i < 20; i++) {
          await new Promise(resolve => setTimeout(resolve, 100));
          if (mongoose.connection.readyState === 1) {
            logger.info('Database connection established after wait');
            break;
          }
        }
        
        // If still not connected, try to connect
        if (mongoose.connection.readyState !== 1) {
          const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://admin:etelios123@mongodb.etelios-prod.svc.cluster.local:27017/etelios?authSource=admin';
          try {
            await mongoose.connect(MONGODB_URI, {
              serverSelectionTimeoutMS: 5000,
              socketTimeoutMS: 45000,
            });
            logger.info('Database connection established', { readyState: mongoose.connection.readyState });
          } catch (connectError) {
            logger.error('Failed to connect to database', { error: connectError.message });
            throw new Error('Database connection unavailable. Please try again later.');
          }
        }
      }
      
      const dbName = mongoose.connection.db?.databaseName || mongoose.connection.name;
      logger.debug('Database connected', { readyState: mongoose.connection.readyState, dbName });
      
      // Ensure User model is loaded
      if (!User) {
        User = require('../models/User.model');
      }
      
      // Find user by email or employee ID - use simple, direct query
      let user;
      const queryEmail = emailOrEmployeeId.toLowerCase();
      
      if (emailOrEmployeeId.includes('@')) {
        // Login with email - simple direct query
        logger.debug('Querying user by email', { email: queryEmail, dbName });
        
        // CRITICAL: Use lean() to get plain object, avoid Mongoose document validation
        // Then fix missing fields before creating document instance
        try {
          const emailQuery = { email: queryEmail };
          let userDoc = null;

          if (normalizedTenantId) {
            emailQuery.tenantId = normalizedTenantId;
            userDoc = await User.findOne(emailQuery)
              .select('+password')
              .lean()
              .maxTimeMS(10000);
          } else {
            // Backward compatibility: when tenant is not supplied, disambiguate
            // duplicate-email users by checking which tenant account matches password.
            const emailCandidates = await User.find(emailQuery)
              .select('+password')
              .lean()
              .limit(20)
              .maxTimeMS(10000);

            if (emailCandidates.length === 1) {
              userDoc = emailCandidates[0];
            } else if (emailCandidates.length > 1) {
              const bcrypt = require('bcryptjs');
              const matches = [];
              for (const candidate of emailCandidates) {
                if (!candidate.password) continue;
                const passwordMatches = await bcrypt.compare(password, candidate.password);
                if (passwordMatches) matches.push(candidate);
              }
              if (matches.length === 1) {
                userDoc = matches[0];
              } else if (matches.length > 1) {
                // Prefer real tenant over legacy "default" when the same password exists on duplicates
                const preferred = matches.find(
                  (m) => String(m.tenantId || '').toLowerCase() !== 'default'
                );
                userDoc = preferred || matches[0];
              } else {
                userDoc = emailCandidates[0];
              }
            }
          }
          
          if (userDoc) {
            // Fix missing auth-service required fields in plain object
            if (!userDoc.employee_id && userDoc.employeeId) {
              userDoc.employee_id = userDoc.employeeId;
            }
            if (!userDoc.name && (userDoc.firstName || userDoc.fullName)) {
              userDoc.name = userDoc.fullName || (userDoc.lastName ? `${userDoc.firstName} ${userDoc.lastName}`.trim() : userDoc.firstName);
            }
            if (!userDoc.joining_date && userDoc.doj) {
              userDoc.joining_date = userDoc.doj;
            } else if (!userDoc.joining_date && !userDoc.doj) {
              userDoc.joining_date = new Date();
            }
            
            // Update database with missing fields (non-blocking)
            const updateFields = {};
            if (userDoc.employee_id && !userDoc.employeeId) updateFields.employee_id = userDoc.employee_id;
            if (userDoc.name && !userDoc.firstName) updateFields.name = userDoc.name;
            if (userDoc.joining_date && !userDoc.doj) updateFields.joining_date = userDoc.joining_date;
            
            if (Object.keys(updateFields).length > 0) {
              User.updateOne({ _id: userDoc._id }, { $set: updateFields }).catch(err => 
                logger.warn('Failed to update user fields (non-critical)', { error: err.message })
              );
            }
            
            // CRITICAL: Fix role - convert ObjectId to string enum value
            let roleString = 'employee'; // Default
            if (userDoc.role) {
              if (typeof userDoc.role === 'object' && userDoc.role.name) {
                roleString = userDoc.role.name.toLowerCase();
              } else if (typeof userDoc.role === 'string') {
                roleString = userDoc.role.toLowerCase();
              } else {
                // Role is ObjectId - need to fetch role name
                try {
                  const Role = require('../models/Role.model');
                  const roleDoc = await Role.findById(userDoc.role).maxTimeMS(3000);
                  if (roleDoc && roleDoc.name) {
                    roleString = roleDoc.name.toLowerCase();
                  }
                } catch (roleError) {
                  logger.warn('Failed to fetch role name, using default', { error: roleError.message });
                }
              }
            }
            userDoc.role = roleString; // Set as string for auth-service enum
            
            // Don't create User instance - work with plain object to avoid validation
            user = userDoc;
          }
          
          logger.debug('User query completed', { 
            found: !!user, 
            email: queryEmail, 
            userId: user?._id?.toString(),
            hasPassword: !!user?.password
          });
        } catch (queryError) {
          logger.error('User query error', { error: queryError.message, stack: queryError.stack });
          throw queryError;
        }
      } else {
        // Login with employee ID - removed populate to avoid Store model registration issues
        logger.debug('Querying user by employee ID', { employeeId: emailOrEmployeeId.toUpperCase() });
        
        // CRITICAL: Use lean() to get plain object, avoid Mongoose document validation
        const employeeQuery = {
          $or: [
            { employee_id: emailOrEmployeeId.toUpperCase() },
            { employeeId: emailOrEmployeeId.toUpperCase() }
          ]
        };
        if (normalizedTenantId) {
          employeeQuery.tenantId = normalizedTenantId;
        }

        let userDoc = null;
        if (normalizedTenantId) {
          userDoc = await User.findOne(employeeQuery)
            .select('+password')
            .lean()
            .maxTimeMS(5000);
        } else {
          const employeeCandidates = await User.find({
            $or: [
              { employee_id: emailOrEmployeeId.toUpperCase() },
              { employeeId: emailOrEmployeeId.toUpperCase() }
            ]
          })
            .select('+password')
            .lean()
            .limit(20)
            .maxTimeMS(10000);

          if (employeeCandidates.length === 1) {
            userDoc = employeeCandidates[0];
          } else if (employeeCandidates.length > 1) {
            const bcrypt = require('bcryptjs');
            const matches = [];
            for (const candidate of employeeCandidates) {
              if (!candidate.password) continue;
              const passwordMatches = await bcrypt.compare(password, candidate.password);
              if (passwordMatches) matches.push(candidate);
            }
            if (matches.length === 1) {
              userDoc = matches[0];
            } else if (matches.length > 1) {
              const preferred = matches.find(
                (m) => String(m.tenantId || '').toLowerCase() !== 'default'
              );
              userDoc = preferred || matches[0];
            } else {
              userDoc = employeeCandidates[0];
            }
          }
        }

        if (userDoc) {
          // Fix missing auth-service required fields
          if (!userDoc.employee_id && userDoc.employeeId) {
            userDoc.employee_id = userDoc.employeeId;
          }
          if (!userDoc.name && (userDoc.firstName || userDoc.fullName)) {
            userDoc.name = userDoc.fullName || (userDoc.lastName ? `${userDoc.firstName} ${userDoc.lastName}`.trim() : userDoc.firstName);
          }
          if (!userDoc.joining_date && userDoc.doj) {
            userDoc.joining_date = userDoc.doj;
          } else if (!userDoc.joining_date && !userDoc.doj) {
            userDoc.joining_date = new Date();
          }
          
          // CRITICAL: Fix role - convert ObjectId to string enum value
          let roleString = 'employee'; // Default
          if (userDoc.role) {
            if (typeof userDoc.role === 'object' && userDoc.role.name) {
              roleString = userDoc.role.name.toLowerCase();
            } else if (typeof userDoc.role === 'string') {
              roleString = userDoc.role.toLowerCase();
            } else {
              // Role is ObjectId - need to fetch role name
              try {
                const Role = require('../models/Role.model');
                const roleDoc = await Role.findById(userDoc.role).maxTimeMS(3000);
                if (roleDoc && roleDoc.name) {
                  roleString = roleDoc.name.toLowerCase();
                }
              } catch (roleError) {
                logger.warn('Failed to fetch role name, using default', { error: roleError.message });
              }
            }
          }
          userDoc.role = roleString; // Set as string for auth-service enum
          
          // Update database with missing fields (non-blocking)
          const updateFields = {};
          if (userDoc.employee_id && !userDoc.employeeId) updateFields.employee_id = userDoc.employee_id;
          if (userDoc.name && !userDoc.firstName) updateFields.name = userDoc.name;
          if (userDoc.joining_date && !userDoc.doj) updateFields.joining_date = userDoc.joining_date;
          
          if (Object.keys(updateFields).length > 0) {
            User.updateOne({ _id: userDoc._id }, { $set: updateFields }).catch(err => 
              logger.warn('Failed to update user fields (non-critical)', { error: err.message })
            );
          }
          
          // Don't create User instance - work with plain object to avoid validation
          user = userDoc;
        }
        
        logger.debug('User query completed', { found: !!user, employeeId: emailOrEmployeeId.toUpperCase() });
      }

      if (!user) {
        logger.error('User not found during login', { 
          emailOrEmployeeId, 
          emailLowercase: queryEmail,
          query: emailOrEmployeeId.includes('@') ? { email: queryEmail } : { employee_id: emailOrEmployeeId.toUpperCase() }
        });
        logAuthEvent('failed_login', null, { emailOrEmployeeId, reason: 'user_not_found' }, ip, userAgent);
        throw new Error('Invalid email or password');
      }
      
      logger.info('User found during login', { 
        userId: user._id?.toString() || user.id, 
        email: user.email,
        hasPassword: !!user.password,
        isActive: user.is_active,
        status: user.status
      });

      // Check if user is active
      if (!user.is_active || user.status === 'inactive') {
        logAuthEvent('failed_login', user._id || user.id, { emailOrEmployeeId, reason: 'account_inactive' }, ip, userAgent);
        throw new Error('Account is inactive');
      }

      // Check if user is suspended
      if (user.status === 'suspended') {
        logAuthEvent('failed_login', user._id || user.id, { emailOrEmployeeId, reason: 'account_suspended' }, ip, userAgent);
        throw new Error('Account is suspended');
      }

      // Verify password - ensure password field is available
      if (!user.password) {
        logger.error('Password field not available for user', { userId: user._id || user.id, emailOrEmployeeId });
        throw new Error('Authentication error. Please contact support.');
      }
      
      // CRITICAL: Compare password using bcrypt directly (avoid document method validation)
      const bcrypt = require('bcryptjs');
      const isPasswordValid = user.password ? await bcrypt.compare(password, user.password) : false;
      if (!isPasswordValid) {
        logAuthEvent('failed_login', user._id || user.id, { emailOrEmployeeId, reason: 'invalid_password' }, ip, userAgent);
        throw new Error('Invalid email or password');
      }

      // CRITICAL: Fix missing auth-service required fields in user object (for token generation)
      // Also prepare update fields for database
      const updateFields = {
        last_login: new Date(),
        last_activity: new Date()
      };
      
      // Fix employee_id (auth-service requires this)
      if (!user.employee_id && user.employeeId) {
        updateFields.employee_id = user.employeeId;
        user.employee_id = user.employeeId;
      } else if (!user.employee_id) {
        updateFields.employee_id = user.employeeId || user.code || 'UNKNOWN';
        user.employee_id = updateFields.employee_id;
      }
      
      // Fix name (auth-service requires this)
      if (!user.name) {
        if (user.fullName) {
          updateFields.name = user.fullName;
          user.name = user.fullName;
        } else if (user.firstName) {
          updateFields.name = user.lastName ? `${user.firstName} ${user.lastName}`.trim() : user.firstName;
          user.name = updateFields.name;
        } else {
          updateFields.name = user.email.split('@')[0];
          user.name = updateFields.name;
        }
      }
      
      // Fix joining_date (auth-service requires this)
      if (!user.joining_date) {
        if (user.doj) {
          updateFields.joining_date = user.doj;
          user.joining_date = user.doj;
        } else {
          updateFields.joining_date = new Date();
          user.joining_date = new Date();
        }
      }
      
      // Update user document directly (bypasses validation)
      const userId = user._id || user.id;
      try {
        await User.updateOne(
          { _id: userId },
          { $set: updateFields }
        );
        logger.debug('Updated user last_login and fixed missing fields', { 
          userId,
          email: user.email,
          fieldsUpdated: Object.keys(updateFields)
        });
      } catch (updateError) {
        logger.warn('Failed to update user during login (non-critical)', { 
          error: updateError.message,
          userId 
        });
      }

      // CRITICAL: Validate tenantId for non-super-admin users
      const userRole = typeof user.role === 'object' ? (user.role.name || 'employee') : (user.role || 'employee');
      if (userRole !== 'superadmin' && userRole !== 'super-admin') {
        if (!user.tenantId) {
          logger.error('User missing tenantId during login', {
            userId: user._id || user.id,
            email: user.email,
            role: userRole
          });
          throw new Error('User account is not associated with a tenant. Contact administrator.');
        }
      }

      // Use role name if role is ObjectId, otherwise use role string
      const roleForToken = typeof user.role === 'object' ? (user.role.name || 'employee') : (user.role || 'employee');

      const permUser = await User.findById(userId).select(
        'role custom_permissions permission_denials permissions permissionsRevision'
      );
      const permRev = permUser && permUser.permissionsRevision != null ? permUser.permissionsRevision : 0;

      let effectiveForJwt = [];
      try {
        if (permUser) {
          const resolved = await resolveEffectivePermissionsForUser(permUser);
          effectiveForJwt = resolved.effectivePermissions || [];
        }
      } catch (permErr) {
        logger.warn('Login: could not compute effective permissions for JWT', {
          error: permErr.message,
          userId
        });
      }

      const accessToken = generateAccessToken({
        userId: user._id || user.id,
        email: user.email,
        role: roleForToken,
        tenantId: user.tenantId,
        employee_id: user.employee_id || user.employeeId,
        permRev,
        ...(jwtPermissionsPayloadEnabled() && { permissions: effectiveForJwt })
      });
      const refreshToken = generateRefreshToken({ userId: user._id });

      // Store refresh token in Redis (non-blocking - has fallback)
      this.storeRefreshToken(user._id, refreshToken).catch(err => {
        logger.warn('Failed to store refresh token in Redis, using in-memory fallback', { error: err.message, userId: user._id });
      });

      // Log successful login
      logAuthEvent('login', user._id, { emailOrEmployeeId, role: user.role }, ip, userAgent);

      // Check if password change is required (for first login / temporary password flow)
      const mustChangePassword = !!user.mustChangePassword || !!user.passwordTemporary;
      
      if (mustChangePassword) {
        logger.info('User logged in with temporary password - password change required', { 
          userId: user._id, 
          employeeId: user.employee_id,
          mustChangePassword: !!user.mustChangePassword,
          passwordTemporary: !!user.passwordTemporary
        });
      } else {
        logger.info('User logged in successfully', { userId: user._id, employeeId: user.employee_id });
      }

      // Get public profile safely
      let userProfile;
      try {
        userProfile = user.getPublicProfile ? user.getPublicProfile() : user.toObject ? user.toObject() : user;
        // Remove sensitive fields
        if (userProfile.password) delete userProfile.password;
        if (userProfile.__v !== undefined) delete userProfile.__v;
      } catch (profileError) {
        logger.warn('Error getting public profile, using basic user data', { error: profileError.message, userId: user._id });
        userProfile = {
          _id: user._id,
          email: user.email,
          employee_id: user.employee_id,
          name: user.name || user.fullName,
          role: user.role,
          tenantId: user.tenantId
        };
      }

      if (permUser) {
        userProfile.permissions = effectiveForJwt;
      }

      // CRITICAL: Return 200 (not 401) even when password is temporary
      // Frontend will check mustChangePassword flag and redirect to change-password page
      return {
        user: userProfile,
        accessToken,
        refreshToken,
        // Tenant creation flow support: frontend can use this to show "change password" screen
        // If true, frontend should redirect to /auth/change-password?reason=first_login
        mustChangePassword: mustChangePassword,
        passwordTemporary: !!user.passwordTemporary
      };

    } catch (error) {
      // Check if it's a database connection error
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState !== 1) {
        logger.error('Database connection lost during login', {
          readyState: mongoose.connection.readyState,
          error: error.message,
          emailOrEmployeeId
        });
        throw new Error('Database connection unavailable. Please try again later.');
      }

      // Check if it's a timeout error
      if (error.name === 'MongoServerError' && error.message && error.message.includes('operation timed out')) {
        logger.error('Database query timeout during login', {
          error: error.message,
          emailOrEmployeeId
        });
        throw new Error('Database connection timeout. Please try again later.');
      }

      // Check if it's a network error
      if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
        logger.error('Database network error during login', {
          error: error.message,
          errorName: error.name,
          emailOrEmployeeId
        });
        throw new Error('Database connection error. Please try again later.');
      }

      // For other errors (authentication errors, etc.), log and re-throw
      logger.error('User login failed', { 
        error: error.message, 
        errorName: error.name,
        stack: error.stack,
        emailOrEmployeeId 
      });
      throw error;
    }
  }

  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<object>} New access token
   */
  async refreshAccessToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);

      // Check if refresh token exists in Redis
      const storedToken = await this.getRefreshToken(decoded.userId);
      if (!storedToken || storedToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Get user (fields needed for effective permissions in JWT)
      const user = await User.findById(decoded.userId).select(
        'role email tenantId employee_id is_active status custom_permissions permission_denials permissions permissionsRevision'
      );
      if (!user || !user.is_active || user.status === 'inactive') {
        throw new Error('User not found or inactive');
      }

      const permRev = user.permissionsRevision != null ? user.permissionsRevision : 0;
      let effectiveForJwt = [];
      try {
        const resolved = await resolveEffectivePermissionsForUser(user);
        effectiveForJwt = resolved.effectivePermissions || [];
      } catch (permErr) {
        logger.warn('Refresh: could not compute effective permissions for JWT', {
          error: permErr.message,
          userId: user._id
        });
      }

      const accessToken = generateAccessToken({
        userId: user._id,
        email: user.email,
        role: user.role || 'employee',
        tenantId: user.tenantId,
        employee_id: user.employee_id,
        permRev,
        ...(jwtPermissionsPayloadEnabled() && { permissions: effectiveForJwt })
      });

      logger.info('Access token refreshed', { userId: user._id });

      return { accessToken };

    } catch (error) {
      logger.error('Token refresh failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Logout user
   * @param {string} userId - User ID
   * @param {string} ip - User IP address
   * @param {string} userAgent - User agent
   * @returns {Promise<void>}
   */
  async logout(userId, ip, userAgent, token = null) {
    try {
      // Auto clock-out from attendance service if employee is clocked in
      try {
        const axios = require('axios');
        const ATTENDANCE_SERVICE_URL = process.env.ATTENDANCE_SERVICE_URL || 'http://attendance-service:80';
        
        // Get user details to find employee
        const User = require('../models/User.model');
        const user = await User.findById(userId);
        
        if (user && (user.employee_id || user.employeeId)) {
          // Try to auto clock-out
          const clockOutData = {
            latitude: 0, // Default coordinates (will be updated by attendance service if needed)
            longitude: 0,
            notes: 'Auto clock-out on logout'
          };

          await axios.post(`${ATTENDANCE_SERVICE_URL}/api/attendance/clock-out`, clockOutData, {
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json'
            },
            timeout: 3000 // 3 second timeout - don't block logout if attendance service is slow
          }).catch(clockOutError => {
            // Log but don't fail logout if clock-out fails
            logger.warn('Auto clock-out on logout failed (non-blocking)', {
              error: clockOutError.message,
              userId,
              employeeId: user.employee_id || user.employeeId
            });
          });

          logger.info('Auto clock-out attempted on logout', { userId, employeeId: user.employee_id || user.employeeId });
        }
      } catch (autoClockOutError) {
        // Don't fail logout if auto clock-out fails
        logger.warn('Auto clock-out on logout error (non-blocking)', {
          error: autoClockOutError.message,
          userId
        });
      }

      // Remove refresh token from Redis
      await this.removeRefreshToken(userId);

      // Log logout
      logAuthEvent('logout', userId, {}, ip, userAgent);

      logger.info('User logged out successfully', { userId });

    } catch (error) {
      logger.error('User logout failed', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash and persist via updateOne so legacy/HR-synced users are not blocked by
      // full-document validation errors on save().
      const hashed = await hashPassword(newPassword);
      await User.updateOne(
        { _id: userId },
        {
          $set: {
            password: hashed,
            mustChangePassword: false,
            passwordTemporary: false,
            passwordChangedAt: new Date()
          }
        }
      );

      // Remove all refresh tokens to force re-login
      await this.removeRefreshToken(userId);

      logger.info('Password changed successfully', { userId });

    } catch (error) {
      logger.error('Password change failed', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Admin reset password (without current password)
   * @param {string} userId - User ID
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  async adminResetPassword(userId, newPassword) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const hashed = await hashPassword(newPassword);
      await User.updateOne(
        { _id: userId },
        {
          $set: {
            password: hashed,
            mustChangePassword: false,
            passwordTemporary: false,
            passwordChangedAt: new Date()
          }
        }
      );

      // Remove all refresh tokens to force re-login
      await this.removeRefreshToken(userId);

      logger.info('Admin password reset successfully', { userId });
    } catch (error) {
      logger.error('Admin password reset failed', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<void>}
   */
  async requestPasswordReset(email) {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        // Don't reveal if user exists or not
        return;
      }

      // Generate reset token
      const resetToken = require('crypto').randomBytes(32).toString('hex');
      
      // Store reset token in Redis with expiry (1 hour)
      await this.redis.set(
        `password_reset:${resetToken}`,
        user._id.toString(),
        'EX',
        3600
      );

      // Send password reset email
      await sendPasswordResetEmail(user, resetToken);

      logger.info('Password reset requested', { userId: user._id, email });

    } catch (error) {
      logger.error('Password reset request failed', { error: error.message, email });
      throw error;
    }
  }

  /**
   * Reset password with token
   * @param {string} resetToken - Password reset token
   * @param {string} newPassword - New password
   * @returns {Promise<void>}
   */
  async resetPassword(resetToken, newPassword) {
    try {
      // Get user ID from reset token
      const userId = await this.redis.get(`password_reset:${resetToken}`);
      if (!userId) {
        throw new Error('Invalid or expired reset token');
      }

      // Get user
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Remove reset token
      await this.redis.del(`password_reset:${resetToken}`);

      // Remove all refresh tokens to force re-login
      await this.removeRefreshToken(userId);

      logger.info('Password reset successfully', { userId });

    } catch (error) {
      logger.error('Password reset failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Store refresh token in Redis
   * @param {string} userId - User ID
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<void>}
   */
  async storeRefreshToken(userId, refreshToken) {
    try {
      const key = `refresh_token:${userId}`;
      await this.redis.set(key, refreshToken, 'EX', 7 * 24 * 60 * 60); // 7 days
      // Cache in memory as a fallback in case Redis disconnects between requests
      this.saveRefreshTokenInMemory(userId.toString(), refreshToken);
    } catch (error) {
      logger.error('Failed to store refresh token', { error: error.message, userId });
      // Fallback to in-memory store so refresh still works during Redis outages
      this.saveRefreshTokenInMemory(userId.toString(), refreshToken);
    }
  }

  /**
   * Get refresh token from Redis
   * @param {string} userId - User ID
   * @returns {Promise<string|null>} Refresh token or null
   */
  async getRefreshToken(userId) {
    try {
      const key = `refresh_token:${userId}`;
      const token = await this.redis.get(key);
      if (token) return token;
    } catch (error) {
      logger.error('Failed to get refresh token', { error: error.message, userId });
    }

    // Fallback to in-memory store
    return this.getRefreshTokenInMemory(userId.toString());
  }

  /**
   * Remove refresh token from Redis
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async removeRefreshToken(userId) {
    try {
      const key = `refresh_token:${userId}`;
      await this.redis.del(key);
    } catch (error) {
      logger.error('Failed to remove refresh token', { error: error.message, userId });
    }

    // Always attempt to remove from in-memory fallback
    this.removeRefreshTokenInMemory(userId.toString());
  }

  /**
   * Get user profile
   * @param {string} userId - User ID
   * @returns {Promise<object>} User profile
   */
  async getUserProfile(userId) {
    try {
      const user = await User.findById(userId)
        .populate('stores', 'name code store_id')
        .populate('reporting_manager', 'name employee_id')
        .populate('created_by', 'name employee_id');

      if (!user) {
        throw new Error('User not found');
      }

      return user.getPublicProfile();

    } catch (error) {
      logger.error('Failed to get user profile', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Update user profile
   * @param {string} userId - User ID
   * @param {object} updateData - Profile update data
   * @returns {Promise<object>} Updated user profile
   */
  async updateUserProfile(userId, updateData) {
    try {
      const allowedFields = [
        'name', 'phone', 'address', 'emergency_contact', 'date_of_birth'
      ];

      const updateFields = {};
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          updateFields[key] = updateData[key];
        }
      });

      const user = await User.findByIdAndUpdate(
        userId,
        { ...updateFields, updated_by: userId },
        { new: true, runValidators: true }
      ).populate('stores', 'name code store_id')
       .populate('reporting_manager', 'name employee_id');

      if (!user) {
        throw new Error('User not found');
      }

      logger.info('User profile updated', { userId });

      return user.getPublicProfile();

    } catch (error) {
      logger.error('Failed to update user profile', { error: error.message, userId });
      throw error;
    }
  }

  /**
   * Update user (alias for updateUserProfile)
   * @param {string} userId - User ID
   * @param {object} updateData - Update data
   * @returns {Promise<object>} Updated user
   */
  async updateUser(userId, updateData) {
    return this.updateUserProfile(userId, updateData);
  }
}

module.exports = new AuthService();