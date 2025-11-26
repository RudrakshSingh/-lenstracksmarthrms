const Tenant = require('../models/Tenant.model');
const User = require('../models/User.model');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');
const httpStatus = require('http-status');
const crypto = require('crypto');

/**
 * Generate unique tenant ID
 */
const generateTenantId = () => {
  return `tenant-${crypto.randomBytes(4).toString('hex')}`;
};

/**
 * Create tenant
 */
const createTenant = async (tenantData, createdBy) => {
  try {
    // Generate tenant ID if not provided
    const tenantId = tenantData.tenantId || generateTenantId();

    // Check if tenant already exists
    const existingTenant = await Tenant.findOne({
      $or: [
        { tenantId },
        { email: tenantData.email.toLowerCase() },
        { domain: tenantData.domain }
      ]
    });

    if (existingTenant) {
      throw new ApiError(httpStatus.CONFLICT, 'DUPLICATE_RESOURCE', 'Tenant already exists');
    }

    // Create tenant
    const tenant = await Tenant.create({
      tenantId,
      name: tenantData.name,
      companyName: tenantData.companyName,
      domain: tenantData.domain,
      email: tenantData.email.toLowerCase(),
      phone: tenantData.phone,
      address: tenantData.address || {},
      subscription: {
        plan: tenantData.subscription?.plan || 'Basic',
        startDate: tenantData.subscription?.startDate || new Date(),
        endDate: tenantData.subscription?.endDate,
        status: 'Active'
      },
      settings: {
        maxUsers: tenantData.settings?.maxUsers || 10,
        maxStorage: tenantData.settings?.maxStorage || 1000,
        features: tenantData.settings?.features || ['HRMS']
      },
      status: 'Active',
      createdBy
    });

    logger.info('Tenant created successfully', { tenantId: tenant.tenantId, createdBy });

    return {
      id: tenant._id.toString(),
      tenantId: tenant.tenantId,
      name: tenant.name,
      companyName: tenant.companyName,
      email: tenant.email,
      subscription: tenant.subscription,
      settings: tenant.settings,
      status: tenant.status,
      createdAt: tenant.createdAt
    };
  } catch (error) {
    logger.error('Error creating tenant', { error: error.message, tenantData });
    throw error;
  }
};

/**
 * Get all tenants
 */
const getTenants = async (filters = {}, page = 1, limit = 25) => {
  try {
    const skip = (page - 1) * limit;
    const query = {};

    // Apply filters
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { companyName: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
        { tenantId: { $regex: filters.search, $options: 'i' } }
      ];
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.subscriptionPlan) {
      query['subscription.plan'] = filters.subscriptionPlan;
    }

    const [tenants, total] = await Promise.all([
      Tenant.find(query)
        .populate('createdBy', 'email name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Tenant.countDocuments(query)
    ]);

    return {
      data: tenants.map(tenant => ({
        id: tenant._id.toString(),
        tenantId: tenant.tenantId,
        name: tenant.name,
        companyName: tenant.companyName,
        email: tenant.email,
        subscription: tenant.subscription,
        status: tenant.status,
        createdAt: tenant.createdAt
      })),
      total,
      page,
      limit
    };
  } catch (error) {
    logger.error('Error getting tenants', { error: error.message });
    throw error;
  }
};

/**
 * Get tenant by ID
 */
const getTenantById = async (tenantId) => {
  try {
    const tenant = await Tenant.findOne({
      $or: [
        { _id: tenantId },
        { tenantId: tenantId }
      ]
    })
      .populate('createdBy', 'email name')
      .lean();

    if (!tenant) {
      throw new ApiError(httpStatus.NOT_FOUND, 'RESOURCE_NOT_FOUND', 'Tenant not found');
    }

    return {
      id: tenant._id.toString(),
      tenantId: tenant.tenantId,
      name: tenant.name,
      companyName: tenant.companyName,
      email: tenant.email,
      phone: tenant.phone,
      address: tenant.address,
      subscription: tenant.subscription,
      settings: tenant.settings,
      status: tenant.status,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt
    };
  } catch (error) {
    logger.error('Error getting tenant by ID', { error: error.message, tenantId });
    throw error;
  }
};

/**
 * Update tenant
 */
const updateTenant = async (tenantId, updateData) => {
  try {
    const tenant = await Tenant.findOne({
      $or: [
        { _id: tenantId },
        { tenantId: tenantId }
      ]
    });

    if (!tenant) {
      throw new ApiError(httpStatus.NOT_FOUND, 'RESOURCE_NOT_FOUND', 'Tenant not found');
    }

    // Update fields
    if (updateData.name) tenant.name = updateData.name;
    if (updateData.companyName) tenant.companyName = updateData.companyName;
    if (updateData.email) tenant.email = updateData.email.toLowerCase();
    if (updateData.phone) tenant.phone = updateData.phone;
    if (updateData.address) tenant.address = { ...tenant.address, ...updateData.address };
    if (updateData.subscription) {
      tenant.subscription = { ...tenant.subscription, ...updateData.subscription };
    }
    if (updateData.settings) {
      tenant.settings = { ...tenant.settings, ...updateData.settings };
    }
    if (updateData.status) tenant.status = updateData.status;

    await tenant.save();

    logger.info('Tenant updated successfully', { tenantId: tenant.tenantId });

    return {
      id: tenant._id.toString(),
      tenantId: tenant.tenantId,
      name: tenant.name,
      companyName: tenant.companyName,
      subscription: tenant.subscription,
      settings: tenant.settings,
      status: tenant.status,
      updatedAt: tenant.updatedAt
    };
  } catch (error) {
    logger.error('Error updating tenant', { error: error.message, tenantId });
    throw error;
  }
};

/**
 * Suspend tenant
 */
const suspendTenant = async (tenantId, reason, suspensionDate) => {
  try {
    const tenant = await Tenant.findOne({
      $or: [
        { _id: tenantId },
        { tenantId: tenantId }
      ]
    });

    if (!tenant) {
      throw new ApiError(httpStatus.NOT_FOUND, 'RESOURCE_NOT_FOUND', 'Tenant not found');
    }

    tenant.status = 'Suspended';
    tenant.subscription.status = 'Suspended';
    if (suspensionDate) {
      tenant.subscription.endDate = new Date(suspensionDate);
    }

    await tenant.save();

    logger.info('Tenant suspended', { tenantId: tenant.tenantId, reason });

    return {
      id: tenant._id.toString(),
      tenantId: tenant.tenantId,
      status: tenant.status,
      updatedAt: tenant.updatedAt
    };
  } catch (error) {
    logger.error('Error suspending tenant', { error: error.message, tenantId });
    throw error;
  }
};

/**
 * Get tenant statistics
 */
const getTenantStats = async () => {
  try {
    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      inactiveTenants,
      tenantsByPlan
    ] = await Promise.all([
      Tenant.countDocuments(),
      Tenant.countDocuments({ status: 'Active' }),
      Tenant.countDocuments({ status: 'Suspended' }),
      Tenant.countDocuments({ status: 'Inactive' }),
      Tenant.aggregate([
        {
          $group: {
            _id: '$subscription.plan',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Get total users across all tenants
    const totalUsers = await User.countDocuments({ isDeleted: { $ne: true } });

    // Calculate total storage (simplified - would need actual storage tracking)
    const totalStorage = totalTenants * 1000; // Placeholder

    const byPlan = {};
    tenantsByPlan.forEach(item => {
      byPlan[item._id || 'Free'] = item.count;
    });

    return {
      totalTenants,
      activeTenants,
      suspendedTenants,
      inactiveTenants,
      byPlan,
      totalUsers,
      totalStorage
    };
  } catch (error) {
    logger.error('Error getting tenant stats', { error: error.message });
    throw error;
  }
};

module.exports = {
  createTenant,
  getTenants,
  getTenantById,
  updateTenant,
  suspendTenant,
  getTenantStats
};

