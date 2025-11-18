const tenantService = require('../services/tenant.service');
const httpStatus = require('http-status');
const asyncHandler = require('../utils/asyncHandler');

class TenantController {
  /**
   * Create tenant
   * POST /admin/v1/tenants
   */
  createTenant = asyncHandler(async (req, res) => {
    const tenant = await tenantService.createTenant(req.body, {
      id: req.user?.id,
      email: req.user?.email,
      role: req.user?.role
    });

    res.status(httpStatus.CREATED).json({
      success: true,
      data: tenant,
      message: 'Tenant created successfully'
    });
  });

  /**
   * Get all tenants
   * GET /admin/v1/tenants
   */
  getTenants = asyncHandler(async (req, res) => {
    const result = await tenantService.getTenants(req.query);

    res.status(httpStatus.OK).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  });

  /**
   * Get tenant by ID
   * GET /admin/v1/tenants/:tenantId
   */
  getTenantById = asyncHandler(async (req, res) => {
    const tenant = await tenantService.getTenantById(req.params.tenantId);

    res.status(httpStatus.OK).json({
      success: true,
      data: tenant
    });
  });

  /**
   * Update tenant
   * PUT /admin/v1/tenants/:tenantId
   */
  updateTenant = asyncHandler(async (req, res) => {
    const tenant = await tenantService.updateTenant(
      req.params.tenantId,
      req.body,
      {
        id: req.user?.id,
        email: req.user?.email,
        role: req.user?.role
      }
    );

    res.status(httpStatus.OK).json({
      success: true,
      data: tenant,
      message: 'Tenant updated successfully'
    });
  });

  /**
   * Delete tenant
   * DELETE /admin/v1/tenants/:tenantId
   */
  deleteTenant = asyncHandler(async (req, res) => {
    const permanent = req.query.permanent === 'true';
    const result = await tenantService.deleteTenant(
      req.params.tenantId,
      permanent,
      {
        id: req.user?.id,
        email: req.user?.email,
        role: req.user?.role
      }
    );

    res.status(httpStatus.OK).json({
      success: true,
      message: permanent ? 'Tenant permanently deleted' : 'Tenant deactivated successfully',
      data: result
    });
  });

  /**
   * Get platform metrics
   * GET /admin/v1/platform/metrics
   */
  getPlatformMetrics = asyncHandler(async (req, res) => {
    const metrics = await tenantService.getPlatformMetrics();

    res.status(httpStatus.OK).json({
      success: true,
      data: metrics
    });
  });
}

module.exports = new TenantController();

