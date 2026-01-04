const Tenant = require('../models/Tenant.model');
const databaseRouter = require('../utils/database.router');
const logger = require('../utils/logger');
const Joi = require('joi');
const adminUserService = require('../services/adminUser.service');

/**
 * Tenant Controller
 * Handles all tenant-related operations
 */
class TenantController {
  /**
   * Create new tenant
   * POST /api/tenants or /api/admin/tenants
   */
  async createTenant(req, res) {
    try {
      const { getPlanDetails, calculateSubscriptionDates, getPaymentStatus } = require('../utils/planDetails');
      
      // Validate input - match documentation format
      const schema = Joi.object({
        // Required fields
        name: Joi.string().required().trim().min(2).max(200),
        email: Joi.string().email().required().trim().lowercase(),
        
        // Optional but commonly provided
        domain: Joi.string().optional().trim().lowercase(),
        subdomain: Joi.string().optional().trim().lowercase().alphanum(),
        phone: Joi.string().optional().trim(),
        
        // Address
        address: Joi.alternatives().try(
          Joi.string(), // String format: "street, city"
          Joi.object({ // Object format
            street: Joi.string().optional(),
            city: Joi.string().optional(),
            state: Joi.string().optional(),
            country: Joi.string().optional(),
            pincode: Joi.string().optional()
          })
        ).optional(),
        city: Joi.string().optional().trim(),
        state: Joi.string().optional().trim(),
        country: Joi.string().optional().trim().default('India'),
        
        // Plan
        plan: Joi.string().valid('Trial', 'Basic', 'Professional', 'Enterprise', 'Enterprise Plus', 'trial', 'basic', 'professional', 'enterprise', 'enterprise-plus').optional().default('Basic'),
        
        // Contact info
        primaryContact: Joi.string().optional().trim(),
        primaryEmail: Joi.string().email().optional().trim().lowercase(),
        primaryPhone: Joi.string().optional().trim(),
        
        // Modules
        modules: Joi.array().items(Joi.string().valid('hr', 'crm', 'inventory', 'financial', 'sales', 'purchase', 'analytics', 'reports')).optional().default([]),
        
        // Configuration
        timezone: Joi.string().optional().default('Asia/Kolkata'),
        currency: Joi.string().optional().default('INR'),
        language: Joi.string().optional().default('en'),
        dateFormat: Joi.string().optional().default('DD/MM/YYYY'),
        
        // Legacy fields (for backward compatibility)
        tenantName: Joi.string().optional().trim(),
        features: Joi.array().optional(),
        branding: Joi.object().optional(),
        configuration: Joi.object().optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          error: 'VALIDATION_ERROR',
          errors: error.details.map(detail => detail.message)
        });
      }

      // Normalize plan name
      let planName = value.plan;
      if (planName) {
        planName = planName.charAt(0).toUpperCase() + planName.slice(1).toLowerCase();
        if (planName === 'Enterprise-plus') planName = 'Enterprise Plus';
      } else {
        planName = 'Basic';
      }

      // Generate subdomain and domain if not provided
      let subdomain = value.subdomain;
      let domain = value.domain;
      
      if (!subdomain && value.name) {
        // Generate subdomain from name
        subdomain = value.name.toLowerCase()
          .replace(/[^a-z0-9]/g, '')
          .substring(0, 50);
      }
      
      if (!domain && subdomain) {
        domain = `${subdomain}.etelios.com`;
      }

      if (!subdomain || !domain) {
        return res.status(400).json({
          success: false,
          message: 'Subdomain and domain are required',
          error: 'MISSING_DOMAIN'
        });
      }

      // Generate tenant ID
      const tenantId = subdomain.toLowerCase();
      const database = `etelios_${tenantId}`;

      // Check if tenant already exists
      const existingTenant = await Tenant.findOne({
        $or: [
          { tenantId },
          { domain: domain.toLowerCase() },
          { subdomain: subdomain.toLowerCase() },
          { email: value.email.toLowerCase() }
        ]
      });

      if (existingTenant) {
        return res.status(409).json({
          success: false,
          message: 'Tenant already exists',
          error: 'TENANT_EXISTS',
          details: 'A tenant with this email, domain, or subdomain already exists'
        });
      }

      // Get plan details
      const planDetails = getPlanDetails(planName);
      const subscriptionDates = calculateSubscriptionDates(planName);
      const paymentStatus = getPaymentStatus(planName);

      // Parse address
      let addressObj = {};
      if (value.address) {
        if (typeof value.address === 'string') {
          // String format: "street, city"
          const parts = value.address.split(',').map(s => s.trim());
          addressObj.street = parts[0] || '';
          addressObj.city = parts[1] || value.city || '';
        } else {
          // Object format
          addressObj = value.address;
        }
      }
      if (value.city) addressObj.city = value.city;
      if (value.state) addressObj.state = value.state;
      if (value.country) addressObj.country = value.country;

      // Prepare contact info
      const contact = {
        primaryContact: value.primaryContact || value.name || 'System Administrator',
        primaryEmail: value.primaryEmail || value.email,
        primaryPhone: value.primaryPhone || value.phone || '',
        billingContact: value.primaryContact || value.name || 'System Administrator',
        billingEmail: value.primaryEmail || value.email,
        technicalContact: value.primaryContact || value.name || 'System Administrator',
        technicalEmail: value.primaryEmail || value.email
      };

      // Create tenant data
      const tenantData = {
        tenantId,
        tenantName: value.name,
        name: value.name,
        email: value.email.toLowerCase(),
        phone: value.phone || '',
        domain: domain.toLowerCase(),
        subdomain: subdomain.toLowerCase(),
        database,
        address: addressObj,
        contact,
        plan: planName,
        modules: value.modules || [],
        planDetails: {
          name: planDetails.name,
          price: planDetails.price,
          currency: value.currency || planDetails.currency,
          billing: planDetails.billing,
          features: planDetails.features
        },
        subscription: {
          startDate: subscriptionDates.startDate,
          endDate: subscriptionDates.endDate,
          renewalDate: subscriptionDates.renewalDate,
          autoRenewal: planName !== 'Trial',
          paymentStatus: paymentStatus
        },
        limits: {
          maxUsers: planDetails.maxUsers,
          maxStorage: planDetails.maxStorage,
          maxApiCalls: planDetails.maxApiCalls,
          maxIntegrations: 5
        },
        usage: {
          currentUsers: 0,
          currentStorage: 0,
          currentApiCalls: 0,
          currentIntegrations: 0
        },
        configuration: {
          timezone: value.timezone || 'Asia/Kolkata',
          currency: value.currency || 'INR',
          language: value.language || 'en',
          dateFormat: value.dateFormat || 'DD/MM/YYYY',
          timeFormat: '24h'
        },
        status: planName === 'Trial' ? 'trial' : 'active',
        features: value.features || [],
        branding: value.branding || {},
        settings: {
          allowSelfRegistration: true,
          requireEmailVerification: true,
          allowPasswordReset: true,
          sessionTimeout: 60,
          maxLoginAttempts: 5
        }
      };

      // Create tenant
      const tenant = new Tenant(tenantData);
      await tenant.save();

      // Create tenant database
      await databaseRouter.createTenantDatabase(tenantId);

      // Create admin user if email provided
      let adminUser = null;
      if (value.email) {
        try {
          adminUser = await adminUserService.createAdminUser({
            name: contact.primaryContact,
            email: contact.primaryEmail,
            phone: contact.primaryPhone
          }, tenantId, value.name);
          
          if (adminUser) {
            tenant.adminUser = {
              userId: adminUser.userId,
              email: adminUser.email,
              name: adminUser.name
            };
            await tenant.save();
          }
        } catch (error) {
          logger.warn('Admin user creation failed, continuing without admin user', {
            error: error.message,
            tenantId
          });
        }
      }

      logger.info(`Tenant created: ${tenantId}`, {
        tenantId,
        name: tenant.name,
        plan: tenant.plan,
        email: tenant.email
      });

      // Format response to match documentation
      const response = {
        success: true,
        data: {
          id: tenant._id.toString(),
          tenantId: tenant.tenantId,
          name: tenant.name,
          domain: tenant.domain,
          subdomain: tenant.subdomain,
          email: tenant.email,
          phone: tenant.phone,
          status: tenant.status === 'trial' ? 'Trial' : 'active',
          plan: tenant.plan,
          planDetails: tenant.planDetails,
          subscription: {
            startDate: tenant.subscription.startDate.toISOString().split('T')[0],
            endDate: tenant.subscription.endDate ? tenant.subscription.endDate.toISOString().split('T')[0] : null,
            renewalDate: tenant.subscription.renewalDate ? tenant.subscription.renewalDate.toISOString().split('T')[0] : null,
            autoRenewal: tenant.subscription.autoRenewal,
            paymentStatus: tenant.subscription.paymentStatus
          },
          usage: {
            users: tenant.usage.currentUsers,
            maxUsers: tenant.limits.maxUsers,
            storage: tenant.usage.currentStorage,
            maxStorage: tenant.limits.maxStorage,
            apiCalls: tenant.usage.currentApiCalls,
            maxApiCalls: tenant.limits.maxApiCalls
          },
          settings: {
            timezone: tenant.configuration.timezone,
            currency: tenant.configuration.currency,
            language: tenant.configuration.language,
            dateFormat: tenant.configuration.dateFormat,
            customDomain: false,
            ssoEnabled: false,
            backupEnabled: true
          },
          contact: tenant.contact,
          modules: tenant.modules,
          createdAt: tenant.createdAt.toISOString(),
          updatedAt: tenant.updatedAt.toISOString()
        },
        message: 'Tenant created successfully'
      };

      // Add admin user info if created
      if (adminUser) {
        response.data.adminUser = {
          id: adminUser.userId,
          email: adminUser.email,
          name: adminUser.name,
          employeeId: adminUser.employeeId,
          temporaryPassword: adminUser.temporaryPassword
        };
      }

      res.status(201).json(response);

    } catch (error) {
      logger.error('Tenant creation failed:', error);
      res.status(500).json({
        success: false,
        message: 'Tenant creation failed',
        error: 'TENANT_CREATION_ERROR',
        details: error.message
      });
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenant(req, res) {
    try {
      const { tenantId } = req.params;

      const tenant = await Tenant.findOne({ tenantId });
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found',
          error: 'TENANT_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: {
          tenantId: tenant.tenantId,
          tenantName: tenant.tenantName,
          domain: tenant.domain,
          subdomain: tenant.subdomain,
          status: tenant.status,
          plan: tenant.plan,
          tenantUrl: tenant.tenantUrl,
          features: tenant.features,
          branding: tenant.branding,
          configuration: tenant.configuration,
          limits: tenant.limits,
          usage: tenant.usage,
          settings: tenant.settings,
          analytics: tenant.analytics,
          createdAt: tenant.createdAt,
          updatedAt: tenant.updatedAt
        }
      });

    } catch (error) {
      logger.error('Get tenant failed:', error);
      res.status(500).json({
        success: false,
        message: 'Get tenant failed',
        error: 'GET_TENANT_ERROR'
      });
    }
  }

  /**
   * Update tenant
   */
  async updateTenant(req, res) {
    try {
      const { tenantId } = req.params;

      // Validate input
      const schema = Joi.object({
        tenantName: Joi.string().trim().min(2).max(100).optional(),
        plan: Joi.string().valid('basic', 'professional', 'enterprise', 'custom').optional(),
        features: Joi.array().items(Joi.object({
          name: Joi.string().required(),
          enabled: Joi.boolean().default(true),
          limits: Joi.object({
            maxUsers: Joi.number().min(1),
            maxStorage: Joi.number().min(100),
            maxApiCalls: Joi.number().min(1000)
          })
        })).optional(),
        branding: Joi.object({
          logo: Joi.string().uri().optional(),
          primaryColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
          secondaryColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
          favicon: Joi.string().uri().optional(),
          customCss: Joi.string().optional()
        }).optional(),
        configuration: Joi.object({
          timezone: Joi.string().optional(),
          currency: Joi.string().length(3).optional(),
          language: Joi.string().length(2).optional(),
          dateFormat: Joi.string().optional(),
          timeFormat: Joi.string().valid('12h', '24h').optional()
        }).optional(),
        settings: Joi.object({
          allowSelfRegistration: Joi.boolean().optional(),
          requireEmailVerification: Joi.boolean().optional(),
          allowPasswordReset: Joi.boolean().optional(),
          sessionTimeout: Joi.number().min(5).max(480).optional(),
          maxLoginAttempts: Joi.number().min(3).max(10).optional()
        }).optional()
      });

      const { error, value } = schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.details.map(detail => detail.message)
        });
      }

      const tenant = await Tenant.findOneAndUpdate(
        { tenantId },
        { $set: value },
        { new: true, runValidators: true }
      );

      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found',
          error: 'TENANT_NOT_FOUND'
        });
      }

      logger.info(`Tenant updated: ${tenantId}`, {
        tenantId,
        updates: Object.keys(value)
      });

      res.json({
        success: true,
        message: 'Tenant updated successfully',
        data: {
          tenantId: tenant.tenantId,
          tenantName: tenant.tenantName,
          status: tenant.status,
          plan: tenant.plan,
          features: tenant.features,
          branding: tenant.branding,
          configuration: tenant.configuration,
          settings: tenant.settings,
          updatedAt: tenant.updatedAt
        }
      });

    } catch (error) {
      logger.error('Update tenant failed:', error);
      res.status(500).json({
        success: false,
        message: 'Update tenant failed',
        error: 'UPDATE_TENANT_ERROR'
      });
    }
  }

  /**
   * Delete tenant
   */
  async deleteTenant(req, res) {
    try {
      const { tenantId } = req.params;

      const tenant = await Tenant.findOneAndDelete({ tenantId });
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found',
          error: 'TENANT_NOT_FOUND'
        });
      }

      // Close tenant database connection
      await databaseRouter.closeTenantConnection(tenantId);

      logger.info(`Tenant deleted: ${tenantId}`, {
        tenantId,
        tenantName: tenant.tenantName
      });

      res.json({
        success: true,
        message: 'Tenant deleted successfully'
      });

    } catch (error) {
      logger.error('Delete tenant failed:', error);
      res.status(500).json({
        success: false,
        message: 'Delete tenant failed',
        error: 'DELETE_TENANT_ERROR'
      });
    }
  }

  /**
   * List all tenants
   */
  async listTenants(req, res) {
    try {
      const { page = 1, limit = 10, status, plan } = req.query;
      const skip = (page - 1) * limit;

      const filter = {};
      if (status) filter.status = status;
      if (plan) filter.plan = plan;

      const tenants = await Tenant.find(filter)
        .select('-__v')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      const total = await Tenant.countDocuments(filter);

      res.json({
        success: true,
        data: {
          tenants: tenants.map(tenant => ({
            tenantId: tenant.tenantId,
            tenantName: tenant.tenantName,
            domain: tenant.domain,
            subdomain: tenant.subdomain,
            status: tenant.status,
            plan: tenant.plan,
            tenantUrl: tenant.tenantUrl,
            usage: tenant.usage,
            limits: tenant.limits,
            createdAt: tenant.createdAt
          })),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit)
          }
        }
      });

    } catch (error) {
      logger.error('List tenants failed:', error);
      res.status(500).json({
        success: false,
        message: 'List tenants failed',
        error: 'LIST_TENANTS_ERROR'
      });
    }
  }

  /**
   * Get tenant analytics
   */
  async getTenantAnalytics(req, res) {
    try {
      const { tenantId } = req.params;

      const tenant = await Tenant.findOne({ tenantId });
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found',
          error: 'TENANT_NOT_FOUND'
        });
      }

      // Get database connection status
      const connectionStatus = databaseRouter.getConnectionStatus();
      const healthCheck = await databaseRouter.healthCheck();

      res.json({
        success: true,
        data: {
          tenantId: tenant.tenantId,
          analytics: tenant.analytics,
          usage: tenant.usage,
          limits: tenant.limits,
          connectionStatus: connectionStatus.tenants[tenantId] || 0,
          healthCheck: healthCheck.tenants[tenantId] || false,
          isWithinLimits: tenant.isWithinLimits(),
          lastLogin: tenant.analytics.lastLogin,
          totalLogins: tenant.analytics.totalLogins,
          totalApiCalls: tenant.analytics.totalApiCalls,
          totalStorageUsed: tenant.analytics.totalStorageUsed
        }
      });

    } catch (error) {
      logger.error('Get tenant analytics failed:', error);
      res.status(500).json({
        success: false,
        message: 'Get tenant analytics failed',
        error: 'GET_TENANT_ANALYTICS_ERROR'
      });
    }
  }

  /**
   * Update tenant usage
   */
  async updateTenantUsage(req, res) {
    try {
      const { tenantId } = req.params;
      const { usage } = req.body;

      const tenant = await Tenant.findOneAndUpdate(
        { tenantId },
        { 
          $set: { 
            'usage.currentUsers': usage.currentUsers || 0,
            'usage.currentStorage': usage.currentStorage || 0,
            'usage.currentApiCalls': usage.currentApiCalls || 0,
            'usage.currentIntegrations': usage.currentIntegrations || 0
          }
        },
        { new: true }
      );

      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found',
          error: 'TENANT_NOT_FOUND'
        });
      }

      logger.info(`Tenant usage updated: ${tenantId}`, {
        tenantId,
        usage: tenant.usage
      });

      res.json({
        success: true,
        message: 'Tenant usage updated successfully',
        data: {
          usage: tenant.usage,
          isWithinLimits: tenant.isWithinLimits()
        }
      });

    } catch (error) {
      logger.error('Update tenant usage failed:', error);
      res.status(500).json({
        success: false,
        message: 'Update tenant usage failed',
        error: 'UPDATE_TENANT_USAGE_ERROR'
      });
    }
  }

  /**
   * Assign module to tenant
   * POST /api/tenants/:tenantId/modules
   */
  async assignModule(req, res) {
    try {
      const { tenantId } = req.params;
      const { moduleId, module } = req.body;

      const moduleName = moduleId || module;
      if (!moduleName) {
        return res.status(400).json({
          success: false,
          message: 'Module ID is required',
          error: 'MISSING_MODULE_ID'
        });
      }

      const tenant = await Tenant.findOne({ tenantId });
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found',
          error: 'TENANT_NOT_FOUND'
        });
      }

      // Add module if not already present
      if (!tenant.modules.includes(moduleName)) {
        tenant.modules.push(moduleName);
        await tenant.save();
      }

      logger.info(`Module assigned to tenant: ${tenantId}`, {
        tenantId,
        module: moduleName
      });

      res.status(200).json({
        success: true,
        data: {
          tenantId: tenant.tenantId,
          moduleId: moduleName,
          assignedAt: new Date().toISOString()
        },
        message: 'Module assigned successfully'
      });

    } catch (error) {
      logger.error('Module assignment failed:', error);
      res.status(500).json({
        success: false,
        message: 'Module assignment failed',
        error: 'MODULE_ASSIGNMENT_ERROR'
      });
    }
  }

  /**
   * Remove module from tenant
   * DELETE /api/tenants/:tenantId/modules/:moduleId
   */
  async removeModule(req, res) {
    try {
      const { tenantId, moduleId } = req.params;

      const tenant = await Tenant.findOne({ tenantId });
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: 'Tenant not found',
          error: 'TENANT_NOT_FOUND'
        });
      }

      // Remove module
      tenant.modules = tenant.modules.filter(m => m !== moduleId);
      await tenant.save();

      logger.info(`Module removed from tenant: ${tenantId}`, {
        tenantId,
        module: moduleId
      });

      res.status(200).json({
        success: true,
        message: 'Module removed successfully'
      });

    } catch (error) {
      logger.error('Module removal failed:', error);
      res.status(500).json({
        success: false,
        message: 'Module removal failed',
        error: 'MODULE_REMOVAL_ERROR'
      });
    }
  }
}

module.exports = new TenantController();
