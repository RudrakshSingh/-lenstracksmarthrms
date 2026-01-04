const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Admin User Service
 * Creates admin user for tenant via auth service
 */
class AdminUserService {
  /**
   * Create admin user for tenant
   * @param {object} adminUserData - Admin user data
   * @param {string} tenantId - Tenant ID
   * @param {string} tenantName - Tenant name
   * @returns {Promise<object>} Created admin user
   */
  async createAdminUser(adminUserData, tenantId, tenantName) {
    try {
      const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
      
      // Prepare user data for auth service
      const userData = {
        employee_id: `ADMIN-${tenantId.toUpperCase()}-001`,
        name: adminUserData.name || adminUserData.primaryContact || 'System Administrator',
        email: adminUserData.email || adminUserData.primaryEmail,
        phone: adminUserData.phone || adminUserData.primaryPhone || '+919999999999',
        password: adminUserData.password || this.generateDefaultPassword(),
        role: 'admin',
        tenantId: tenantId,
        department: 'TECH',
        designation: 'System Administrator',
        is_active: true,
        status: 'active',
        band_level: 'A',
        hierarchy_level: 'NATIONAL'
      };

      logger.info('Creating admin user via auth service', {
        tenantId,
        email: userData.email,
        authServiceUrl
      });

      // Call auth service to create user
      const response = await axios.post(`${authServiceUrl}/api/auth/register`, userData, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.success) {
        const adminUser = response.data.data || response.data.user;
        
        logger.info('Admin user created successfully', {
          tenantId,
          userId: adminUser.id || adminUser._id,
          email: adminUser.email
        });

        return {
          userId: adminUser.id || adminUser._id?.toString(),
          email: adminUser.email,
          name: adminUser.name,
          temporaryPassword: userData.password,
          employeeId: adminUser.employee_id
        };
      } else {
        throw new Error('Failed to create admin user: Invalid response from auth service');
      }
    } catch (error) {
      logger.error('Failed to create admin user', {
        error: error.message,
        tenantId,
        response: error.response?.data
      });
      
      // Don't throw - allow tenant creation to continue without admin user
      // Admin user can be created later
      return null;
    }
  }

  /**
   * Generate default password for admin user
   * @returns {string} Default password
   */
  generateDefaultPassword() {
    // Generate a secure random password
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}

module.exports = new AdminUserService();

