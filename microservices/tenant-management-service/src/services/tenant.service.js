const Tenant = require('../models/Tenant.model');
const Subscription = require('../models/Subscription.model');
const Invoice = require('../models/Billing.model');
const AuditLog = require('../models/AuditLog.model');
const logger = require('../config/logger');
const axios = require('axios');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

class TenantService {
  /**
   * Create a new tenant
   */
  async createTenant(tenantData, createdBy) {
    try {
      // Check if domain already exists
      const existingTenant = await Tenant.findOne({ domain: tenantData.domain });
      if (existingTenant) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Domain already exists');
      }

      // Calculate next billing date
      const nextBilling = this.calculateNextBilling(tenantData.billing?.cycle || 'monthly');

      // Create tenant
      const tenant = new Tenant({
        name: tenantData.name,
        domain: tenantData.domain,
        email: tenantData.email,
        plan: tenantData.plan || 'basic',
        features: tenantData.features || [],
        limits: this.getPlanLimits(tenantData.plan || 'basic'),
        billing: {
          amount: this.getPlanAmount(tenantData.plan || 'basic', tenantData.billing?.cycle || 'monthly'),
          currency: tenantData.billing?.currency || 'USD',
          cycle: tenantData.billing?.cycle || 'monthly',
          nextBilling: nextBilling
        },
        status: 'active',
        settings: tenantData.settings || {}
      });

      await tenant.save();

      // Create subscription
      const subscription = new Subscription({
        tenantId: tenant.tenantId,
        plan: tenant.plan,
        amount: tenant.billing.amount,
        currency: tenant.billing.currency,
        cycle: tenant.billing.cycle,
        startDate: new Date(),
        nextBilling: nextBilling,
        features: tenant.features,
        limits: tenant.limits,
        status: 'active'
      });

      await subscription.save();

      // Update tenant with subscription ID
      tenant.billing.subscriptionId = subscription.subscriptionId;
      await tenant.save();

      // Create admin user if provided
      let adminUser = null;
      if (tenantData.adminUser) {
        try {
          // Call auth service to create admin user
          const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
          const response = await axios.post(`${authServiceUrl}/api/auth/register`, {
            ...tenantData.adminUser,
            tenantId: tenant.tenantId,
            role: 'tenant_admin',
            tenantName: tenant.name
          });

          adminUser = response.data.data;
          tenant.adminUser = {
            userId: adminUser.id,
            email: adminUser.email
          };
          await tenant.save();
        } catch (error) {
          logger.error('Failed to create admin user:', error.message);
          // Continue without admin user - can be created later
        }
      }

      // Log audit
      await this.logAudit({
        action: 'tenant_created',
        actor: createdBy,
        target: {
          type: 'tenant',
          id: tenant.tenantId,
          name: tenant.name
        },
        tenantId: tenant.tenantId,
        details: {
          plan: tenant.plan,
          features: tenant.features
        }
      });

      return {
        id: tenant.tenantId,
        name: tenant.name,
        domain: tenant.fullDomain,
        status: tenant.status,
        createdAt: tenant.createdAt,
        adminUser: adminUser ? {
          id: adminUser.id,
          email: adminUser.email,
          temporaryPassword: adminUser.temporaryPassword
        } : null
      };
    } catch (error) {
      logger.error('Error creating tenant:', error);
      throw error;
    }
  }

  /**
   * Get all tenants with filtering and pagination
   */
  async getTenants(query) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        plan,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = query;

      const filter = {};

      if (status) filter.status = status;
      if (plan) filter.plan = plan;
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { domain: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [tenants, total] = await Promise.all([
        Tenant.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Tenant.countDocuments(filter)
      ]);

      const formattedTenants = tenants.map(tenant => ({
        id: tenant.tenantId,
        name: tenant.name,
        domain: tenant.domain,
        customDomain: tenant.customDomain,
        email: tenant.email,
        status: tenant.status,
        plan: tenant.plan,
        users: tenant.usage?.users || 0,
        storage: tenant.usage?.storage || '0GB',
        bandwidth: tenant.usage?.bandwidth || '0GB',
        createdAt: tenant.createdAt,
        lastLogin: tenant.lastLogin,
        billing: tenant.billing,
        features: tenant.features,
        limits: tenant.limits
      }));

      return {
        data: formattedTenants,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit))
        }
      };
    } catch (error) {
      logger.error('Error getting tenants:', error);
      throw error;
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(tenantId) {
    try {
      const tenant = await Tenant.findOne({ tenantId });
      if (!tenant) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Tenant not found');
      }

      return {
        id: tenant.tenantId,
        name: tenant.name,
        domain: tenant.domain,
        customDomain: tenant.customDomain,
        email: tenant.email,
        status: tenant.status,
        plan: tenant.plan,
        users: tenant.usage?.users || 0,
        storage: tenant.usage?.storage || '0GB',
        bandwidth: tenant.usage?.bandwidth || '0GB',
        createdAt: tenant.createdAt,
        lastLogin: tenant.lastLogin,
        billing: tenant.billing,
        features: tenant.features,
        limits: tenant.limits,
        settings: tenant.settings
      };
    } catch (error) {
      logger.error('Error getting tenant:', error);
      throw error;
    }
  }

  /**
   * Update tenant
   */
  async updateTenant(tenantId, updateData, updatedBy) {
    try {
      const tenant = await Tenant.findOne({ tenantId });
      if (!tenant) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Tenant not found');
      }

      // Update allowed fields
      if (updateData.name) tenant.name = updateData.name;
      if (updateData.status) tenant.status = updateData.status;
      if (updateData.plan) {
        tenant.plan = updateData.plan;
        tenant.limits = this.getPlanLimits(updateData.plan);
      }
      if (updateData.features) tenant.features = updateData.features;
      if (updateData.customDomain) tenant.customDomain = updateData.customDomain;
      if (updateData.settings) tenant.settings = { ...tenant.settings, ...updateData.settings };

      await tenant.save();

      // Log audit
      await this.logAudit({
        action: 'tenant_updated',
        actor: updatedBy,
        target: {
          type: 'tenant',
          id: tenant.tenantId,
          name: tenant.name
        },
        tenantId: tenant.tenantId,
        details: updateData
      });

      return {
        id: tenant.tenantId,
        name: tenant.name,
        status: tenant.status,
        updatedAt: tenant.updatedAt
      };
    } catch (error) {
      logger.error('Error updating tenant:', error);
      throw error;
    }
  }

  /**
   * Delete/Deactivate tenant
   */
  async deleteTenant(tenantId, permanent = false, deletedBy) {
    try {
      const tenant = await Tenant.findOne({ tenantId });
      if (!tenant) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Tenant not found');
      }

      if (permanent) {
        await Tenant.deleteOne({ tenantId });
      } else {
        tenant.status = 'deleted';
        tenant.deletedAt = new Date();
        tenant.dataRetentionUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        await tenant.save();
      }

      // Log audit
      await this.logAudit({
        action: 'tenant_deleted',
        actor: deletedBy,
        target: {
          type: 'tenant',
          id: tenant.tenantId,
          name: tenant.name
        },
        tenantId: tenant.tenantId,
        details: { permanent }
      });

      return {
        id: tenant.tenantId,
        status: permanent ? 'permanently_deleted' : 'deleted',
        deletedAt: tenant.deletedAt,
        dataRetentionUntil: tenant.dataRetentionUntil
      };
    } catch (error) {
      logger.error('Error deleting tenant:', error);
      throw error;
    }
  }

  /**
   * Get platform metrics
   */
  async getPlatformMetrics() {
    try {
      const [totalTenants, activeTenants, totalUsers, activeUsers] = await Promise.all([
        Tenant.countDocuments(),
        Tenant.countDocuments({ status: 'active' }),
        // These would come from auth service
        Promise.resolve(0),
        Promise.resolve(0)
      ]);

      // Calculate revenue (from subscriptions)
      const activeSubscriptions = await Subscription.find({ status: 'active' });
      const totalRevenue = activeSubscriptions.reduce((sum, sub) => sum + sub.amount, 0);
      const monthlyRevenue = activeSubscriptions
        .filter(sub => sub.cycle === 'monthly')
        .reduce((sum, sub) => sum + sub.amount, 0);

      // Calculate storage and bandwidth (would come from storage service)
      const storageUsed = '2.4TB'; // Placeholder
      const bandwidthUsed = '890GB'; // Placeholder

      return {
        totalTenants,
        activeTenants,
        totalUsers,
        activeUsers,
        totalRevenue,
        monthlyRevenue,
        systemUptime: '99.9%',
        apiCalls: 8934567, // Placeholder
        storageUsed,
        bandwidthUsed,
        growthRate: {
          tenants: 12.5, // Placeholder
          users: 18.3,
          revenue: 15.7
        },
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting platform metrics:', error);
      throw error;
    }
  }

  // Helper methods
  calculateNextBilling(cycle) {
    const now = new Date();
    switch (cycle) {
      case 'monthly':
        return new Date(now.setMonth(now.getMonth() + 1));
      case 'quarterly':
        return new Date(now.setMonth(now.getMonth() + 3));
      case 'yearly':
        return new Date(now.setFullYear(now.getFullYear() + 1));
      default:
        return new Date(now.setMonth(now.getMonth() + 1));
    }
  }

  getPlanLimits(plan) {
    const limits = {
      basic: { users: 10, storage: '5GB', apiCalls: 10000, bandwidth: '10GB' },
      professional: { users: 100, storage: '50GB', apiCalls: 100000, bandwidth: '100GB' },
      enterprise: { users: 500, storage: '500GB', apiCalls: 1000000, bandwidth: '1TB' },
      custom: { users: 1000, storage: '1TB', apiCalls: 10000000, bandwidth: '10TB' }
    };
    return limits[plan] || limits.basic;
  }

  getPlanAmount(plan, cycle) {
    const amounts = {
      basic: { monthly: 29.99, quarterly: 79.99, yearly: 299.99 },
      professional: { monthly: 99.99, quarterly: 269.99, yearly: 999.99 },
      enterprise: { monthly: 249.99, quarterly: 699.99, yearly: 2499.99 },
      custom: { monthly: 0, quarterly: 0, yearly: 0 }
    };
    return amounts[plan]?.[cycle] || amounts.basic[cycle];
  }

  async logAudit(auditData) {
    try {
      const auditLog = new AuditLog(auditData);
      await auditLog.save();
    } catch (error) {
      logger.error('Error logging audit:', error);
      // Don't throw - audit logging should not break the main flow
    }
  }
}

module.exports = new TenantService();

