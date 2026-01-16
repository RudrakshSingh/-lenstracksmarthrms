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
      const database = 'tenant-db';

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

      // Persist plan in a format that matches the Tenant model enum (lowercase keys)
      // Controller accepts "Basic/Professional/Enterprise/Trial/Enterprise Plus" for UX, but DB stores normalized keys.
      let planKey = (planName || 'Basic').toLowerCase();
      if (planKey === 'trial') planKey = 'basic';
      if (planKey === 'enterprise plus' || planKey === 'enterprise-plus') planKey = 'enterprise';

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
        plan: planKey,
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

      // Create admin and super admin users if email provided
      // Similar to Microsoft Azure tenant creation - creates default admin users with temporary passwords
      let adminUsers = null;
      if (value.email) {
        try {
          adminUsers = await adminUserService.createAdminUsers({
            name: contact.primaryContact,
            email: contact.primaryEmail,
            phone: contact.primaryPhone
          }, tenantId, value.name, {
            // Forward platform token (required by auth-service /register unless it's the first user)
            authorization: req.headers.authorization || req.headers.Authorization
          });
          
          if (adminUsers) {
            // Store admin user info (use admin as primary, super admin as secondary)
            if (adminUsers.admin) {
              tenant.adminUser = {
                userId: adminUsers.admin.userId,
                email: adminUsers.admin.email,
                name: adminUsers.admin.name,
                role: 'admin'
              };
            }
            
            // Store super admin user info
            if (adminUsers.superAdmin) {
              tenant.superAdminUser = {
                userId: adminUsers.superAdmin.userId,
                email: adminUsers.superAdmin.email,
                name: adminUsers.superAdmin.name,
                role: 'superadmin'
              };
            }
            
            await tenant.save();
            
            logger.info('Admin users created for tenant', {
              tenantId,
              adminEmail: adminUsers.admin?.email,
              superAdminEmail: adminUsers.superAdmin?.email
            });
          }
        } catch (error) {
          logger.warn('Admin users creation failed, continuing without admin users', {
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

      // Add admin and super admin users info if created
      // Similar to Microsoft Azure tenant creation response
      if (adminUsers) {
        // Admin user (primary contact)
        if (adminUsers.admin) {
          response.data.adminUser = {
            id: adminUsers.admin.userId,
            email: adminUsers.admin.email,
            name: adminUsers.admin.name,
            employeeId: adminUsers.admin.employeeId,
            role: 'admin',
            temporaryPassword: adminUsers.admin.temporaryPassword,
            mustChangePassword: true
          };
        }
        
        // Super Admin user (highest privilege)
        if (adminUsers.superAdmin) {
          response.data.superAdminUser = {
            id: adminUsers.superAdmin.userId,
            email: adminUsers.superAdmin.email,
            name: adminUsers.superAdmin.name,
            employeeId: adminUsers.superAdmin.employeeId,
            role: 'superadmin',
            temporaryPassword: adminUsers.superAdmin.temporaryPassword,
            mustChangePassword: true
          };
        }
        
        // Important: Temporary passwords must be changed on first login
        response.data.passwordChangeRequired = true;
        response.data.passwordChangeMessage = 'Please change your temporary password on first login. Admin and Super Admin can change passwords from their profile settings.';
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

      // Admin MFE documented shape (read-only company overview)
      const adminMfeData = {
        id: tenant._id?.toString(),
        name: tenant.name,
        domain: tenant.domain,
        email: tenant.email,
        phone: tenant.phone || tenant.contact?.primaryPhone || null,
        status: tenant.status,
        plan: tenant.plan,
        users: tenant.usage?.currentUsers || 0,
        createdAt: tenant.createdAt?.toISOString?.() || tenant.createdAt,
        lastActive: tenant.analytics?.lastLogin || null,
        revenue: tenant.analytics?.totalRevenue || 0,
        address: tenant.address?.street || null,
        city: tenant.address?.city || null,
        country: tenant.address?.country || null
      };

      // Backward compatible payload includes both:
      // - `data` in Admin MFE shape
      // - `legacy` for older consumers
      res.json({
        success: true,
        data: adminMfeData,
        message: 'Company retrieved successfully',
        legacy: {
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
      // Admin MFE contract: Platform Admin cannot update company details
      // Allow override for internal tooling if explicitly enabled.
      if (process.env.ALLOW_PLATFORM_TENANT_UPDATE !== 'true') {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN',
          message: 'Platform Admin cannot update company details. This endpoint is disabled by policy.'
        });
      }

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
   * Suspend tenant (Admin MFE)
   * POST /api/tenants/:tenantId/suspend
   */
  async suspendTenant(req, res) {
    try {
      const { tenantId } = req.params;
      const { reason } = req.body || {};

      const tenant = await Tenant.findOne({ tenantId });
      if (!tenant) {
        return res.status(404).json({
          success: false,
          message: `Company with ID ${tenantId} not found`,
          error: 'TENANT_NOT_FOUND'
        });
      }

      tenant.status = 'suspended';
      // Best-effort: store reason in analytics/details (schema tolerates mixed objects)
      tenant.analytics = tenant.analytics || {};
      tenant.analytics.lastSuspendedAt = new Date();
      tenant.analytics.lastSuspensionReason = reason || null;
      await tenant.save();

      logger.info('Tenant suspended', { tenantId, reason: reason || null });

      return res.json({
        success: true,
        message: 'Company suspended successfully',
        data: {
          id: tenant._id?.toString(),
          tenantId: tenant.tenantId,
          status: tenant.status,
          suspendedAt: tenant.analytics.lastSuspendedAt
        }
      });
    } catch (error) {
      logger.error('Suspend tenant failed:', error);
      return res.status(500).json({
        success: false,
        error: 'SUSPEND_TENANT_ERROR',
        message: 'Failed to suspend company'
      });
    }
  }

  /**
   * Tenant statistics (Admin MFE)
   * GET /api/tenants/stats
   */
  async getTenantStats(req, res) {
    try {
      const [total, active, inactive, suspended] = await Promise.all([
        Tenant.countDocuments({}),
        Tenant.countDocuments({ status: 'active' }),
        Tenant.countDocuments({ status: 'inactive' }),
        Tenant.countDocuments({ status: 'suspended' })
      ]);

      const byPlanAgg = await Tenant.aggregate([
        { $group: { _id: '$plan', count: { $sum: 1 } } }
      ]);
      const byPlan = {};
      byPlanAgg.forEach((p) => {
        byPlan[p._id || 'unknown'] = p.count;
      });

      return res.json({
        success: true,
        data: {
          total,
          active,
          inactive,
          suspended,
          byPlan
        }
      });
    } catch (error) {
      logger.error('Tenant stats failed:', error);
      return res.status(500).json({
        success: false,
        error: 'TENANT_STATS_ERROR',
        message: 'Failed to get tenant statistics'
      });
    }
  }

  /**
   * List all tenants
   */
  async listTenants(req, res) {
    try {
      const page = parseInt(req.query.page || '1', 10) || 1;
      const limit = Math.min(parseInt(req.query.limit || '10', 10) || 10, 100);
      const skip = (page - 1) * limit;

      const status = req.query.status;
      const plan = req.query.plan;
      const search = (req.query.search || '').toString().trim();

      const filter = {};
      if (status && status !== 'all') filter.status = status;
      if (plan) filter.plan = plan;
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { tenantName: { $regex: search, $options: 'i' } },
          { domain: { $regex: search, $options: 'i' } },
          { subdomain: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ];
      }

      const tenants = await Tenant.find(filter)
        .select('-__v')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await Tenant.countDocuments(filter);
      const totalPages = Math.ceil(total / limit);

      // Admin MFE documented response shape (top-level array + pagination fields)
      const mfeTenants = tenants.map((t) => ({
        id: t._id?.toString(),
        name: t.name,
        domain: t.domain,
        status: t.status,
        plan: t.plan,
        users: t.usage?.currentUsers || 0,
        createdAt: t.createdAt?.toISOString?.() || t.createdAt,
        lastActive: t.analytics?.lastLogin || null,
        revenue: t.analytics?.totalRevenue || 0
      }));

      // Backward compatible payload includes BOTH formats:
      // - `data` as array (Admin MFE doc)
      // - `legacy` for older consumers expecting {tenants,pagination}
      res.json({
        success: true,
        data: mfeTenants,
        total,
        page,
        limit,
        totalPages,
        message: 'Companies retrieved successfully',
        legacy: {
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
            page,
            limit,
            total,
            pages: totalPages
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
