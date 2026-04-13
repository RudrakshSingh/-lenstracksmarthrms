const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Admin User Service
 * Creates admin and super admin users for tenant via auth service
 * Similar to Microsoft Azure tenant creation - creates default admin users with temporary passwords
 */
class AdminUserService {
  /**
   * Create both admin and super admin users for tenant
   * @param {object} adminUserData - Admin user data
   * @param {string} tenantId - Tenant ID
   * @param {string} tenantName - Tenant name
   * @param {object} options - Optional settings (e.g., forwarding Authorization token)
   * @returns {Promise<object>} Created admin and super admin users with temporary passwords
   */
  async createAdminUsers(adminUserData, tenantId, tenantName, options = {}) {
    try {
      // Use Kubernetes service URL for auth-service
      // Service exposes port 80 which routes to pod port 3000
      const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service.etelios-prod.svc.cluster.local';
      
      logger.info('Creating admin users via auth service', { authServiceUrl, tenantId });
      const baseEmail = adminUserData.email || adminUserData.primaryEmail;
      const baseName = adminUserData.name || adminUserData.primaryContact || tenantName;
      const basePhone = adminUserData.phone || adminUserData.primaryPhone || '+919999999999';
      
      // Validate email is provided
      if (!baseEmail || !baseEmail.includes('@')) {
        logger.warn('Invalid or missing email for admin user creation', {
          tenantId,
          email: baseEmail
        });
        return null;
      }
      
      // Extract email domain for super admin email
      // If baseEmail is "admin@company.com", super admin will be "superadmin@company.com"
      let superAdminEmail;
      if (baseEmail && baseEmail.includes('@')) {
        const emailParts = baseEmail.split('@');
        superAdminEmail = `superadmin@${emailParts[1]}`;
      } else {
        // Fallback if email format is unexpected
        superAdminEmail = `superadmin.${baseEmail || 'admin'}`;
      }
      
      // Generate temporary passwords for both users
      const adminPassword = this.generateTemporaryPassword();
      const superAdminPassword = this.generateTemporaryPassword();
      
      const results = {
        admin: null,
        superAdmin: null
      };
      
      const headers = {
        'Content-Type': 'application/json'
      };
      // Forward the caller's platform Authorization token so auth-service allows /register (not-first-user case)
      if (options.authorization && typeof options.authorization === 'string') {
        headers.Authorization = options.authorization;
      }

      // 1. Create Super Admin User (highest privilege)
      try {
        const superAdminData = {
          employee_id: `SUPERADMIN-${tenantId.toUpperCase()}-001`,
          name: `${baseName} (Super Admin)`,
          email: superAdminEmail,
          phone: basePhone,
          password: superAdminPassword,
          role: 'superadmin',
          tenantId: tenantId,
          department: 'TECH',
          designation: 'Super Administrator',
          is_active: true,
          status: 'active',
          band_level: 'A',
          hierarchy_level: 'NATIONAL',
          passwordTemporary: true, // Mark as temporary password
          mustChangePassword: true // Force password change on first login
        };

        logger.info('Creating super admin user via auth service', {
          tenantId,
          email: superAdminData.email,
          authServiceUrl
        });

        const superAdminResponse = await axios.post(`${authServiceUrl}/api/auth/register`, superAdminData, {
          timeout: 10000,
          headers
        });

        if (superAdminResponse.data && superAdminResponse.data.success) {
          const superAdminUser = superAdminResponse.data.data || superAdminResponse.data.user;
          
          logger.info('Super admin user created successfully', {
            tenantId,
            userId: superAdminUser.id || superAdminUser._id,
            email: superAdminUser.email
          });

          results.superAdmin = {
            userId: superAdminUser.id || superAdminUser._id?.toString(),
            email: superAdminUser.email,
            name: superAdminUser.name || superAdminData.name,
            temporaryPassword: superAdminPassword,
            employeeId: superAdminUser.employee_id || superAdminData.employee_id,
            role: 'superadmin'
          };
        }
      } catch (error) {
        logger.error('Failed to create super admin user', {
          error: error.message,
          tenantId,
          response: error.response?.data
        });
        // Continue to create admin user even if super admin fails
      }

      // 2. Create Admin User
      try {
        const adminData = {
          employee_id: `ADMIN-${tenantId.toUpperCase()}-001`,
          name: `${baseName} (Admin)`,
          email: baseEmail, // Use primary email for admin
          phone: basePhone,
          password: adminPassword,
          role: 'admin',
          tenantId: tenantId,
          department: 'TECH',
          designation: 'System Administrator',
          is_active: true,
          status: 'active',
          band_level: 'A',
          hierarchy_level: 'NATIONAL',
          passwordTemporary: true, // Mark as temporary password
          mustChangePassword: true // Force password change on first login
        };

        logger.info('Creating admin user via auth service', {
          tenantId,
          email: adminData.email,
          authServiceUrl
        });

        const adminResponse = await axios.post(`${authServiceUrl}/api/auth/register`, adminData, {
          timeout: 10000,
          headers
        });

        if (adminResponse.data && adminResponse.data.success) {
          const adminUser = adminResponse.data.data || adminResponse.data.user;
          
          logger.info('Admin user created successfully', {
            tenantId,
            userId: adminUser.id || adminUser._id,
            email: adminUser.email
          });

          results.admin = {
            userId: adminUser.id || adminUser._id?.toString(),
            email: adminUser.email,
            name: adminUser.name || adminData.name,
            temporaryPassword: adminPassword,
            employeeId: adminUser.employee_id || adminData.employee_id,
            role: 'admin'
          };
        }
      } catch (error) {
        logger.error('Failed to create admin user', {
          error: error.message,
          tenantId,
          response: error.response?.data
        });
      }

      // Return results even if one fails
      if (results.admin || results.superAdmin) {
        return results;
      } else {
        throw new Error('Failed to create both admin and super admin users');
      }
    } catch (error) {
      logger.error('Failed to create admin users', {
        error: error.message,
        tenantId
      });
      
      // Don't throw - allow tenant creation to continue
      // Admin users can be created later
      return null;
    }
  }

  /**
   * Create admin user for tenant (backward compatibility)
   * @deprecated Use createAdminUsers instead
   */
  async createAdminUser(adminUserData, tenantId, tenantName) {
    const result = await this.createAdminUsers(adminUserData, tenantId, tenantName);
    if (result && result.admin) {
      return result.admin;
    }
    return null;
  }

  /**
   * Generate temporary password for admin users
   * Similar to Microsoft Azure - secure random password that must be changed
   * @returns {string} Temporary password (12 characters, mixed case, numbers, special chars)
   */
  generateTemporaryPassword() {
    // Generate a secure random password
    // Format: At least 1 uppercase, 1 lowercase, 1 number, 1 special char
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    const allChars = uppercase + lowercase + numbers + special;
    
    let password = '';
    
    // Ensure at least one of each type
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += special.charAt(Math.floor(Math.random() * special.length));
    
    // Fill remaining 8 characters randomly
    for (let i = 4; i < 12; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}

module.exports = new AdminUserService();

