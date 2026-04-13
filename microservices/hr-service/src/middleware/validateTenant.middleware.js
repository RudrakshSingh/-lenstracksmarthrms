const logger = require('../config/logger');

/**
 * SECURITY MIDDLEWARE: Validate tenant context
 * 
 * This middleware ensures:
 * 1. JWT carries tenantId (non–super-admin), or super-admin rules apply
 * 2. X-Tenant-Id is optional; if missing, tenant comes from the JWT
 * 3. If header and JWT disagree, JWT wins (warn). Set STRICT_TENANT_HEADER=true to reject.
 * 
 * Must be applied AFTER authentication middleware
 * 
 * @param {Object} options - Configuration options
 * @param {Array<string>} options.exemptPaths - Paths to skip validation
 * @param {boolean} options.allowSuperAdminWithoutTenant - Allow super admin without tenant
 * @returns {Function} Express middleware
 */
function validateTenantMiddleware(options = {}) {
  const {
    exemptPaths = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/refresh',
      '/api/auth/logout',
      '/api/auth/forgot-password',
      '/api/auth/reset-password',
      '/health',
      '/api/health'
    ],
    allowSuperAdminWithoutTenant = false,
  } = options;

  return (req, res, next) => {
    // Skip validation for exempt paths
    if (exemptPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Extract tenantId from JWT token (should be set by auth middleware)
    const tokenTenantId = req.user?.tenantId;

    // Check if user is super-admin
    const isSuperAdmin = 
      req.user?.role === 'superadmin' || 
      req.user?.role === 'super-admin' ||
      req.user?.role === 'platform-owner';

    // Super-admin exception (if allowed)
    if (isSuperAdmin && allowSuperAdminWithoutTenant) {
      // Super-admin can proceed without tenant validation
      // But still extract tenantId from header if provided
      const headerTenantId = 
        req.headers['x-tenant-id'] || 
        req.headers['X-Tenant-Id'] ||
        req.headers['X-TENANT-ID'];
      
      req.tenantId = headerTenantId ? headerTenantId.toLowerCase().trim() : null;
      req.isSuperAdmin = true;
      return next();
    }

    // Extract X-Tenant-Id header (case-insensitive)
    const headerTenantId = 
      req.headers['x-tenant-id'] || 
      req.headers['X-Tenant-Id'] ||
      req.headers['X-TENANT-ID'];

    const normalizedTokenTenantId = tokenTenantId
      ? String(tokenTenantId).toLowerCase().trim()
      : null;

    // CRITICAL: Token must have tenantId claim (for non-super-admin)
    if (!tokenTenantId && !isSuperAdmin) {
      logger.error('INVALID_TOKEN: Token missing tenantId claim', {
        userId: req.user?.id,
        email: req.user?.email,
        role: req.user?.role,
        path: req.path
      });

      return res.status(403).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Token missing tenantId claim. Please login again.',
        hint: 'Token was issued before multi-tenant security update. Logout and login again.',
      });
    }

    const strictHeader =
      process.env.STRICT_TENANT_HEADER === 'true' ||
      process.env.STRICT_TENANT_HEADER === '1';

    const headerTrimmed = headerTenantId != null ? String(headerTenantId).trim() : '';
    const normalizedHeaderTenantId = headerTrimmed ? headerTrimmed.toLowerCase() : null;

    if (!normalizedHeaderTenantId) {
      logger.debug('X-Tenant-Id missing; using tenant from access token', {
        method: req.method,
        path: req.path,
        userId: req.user?.id,
        tenantId: normalizedTokenTenantId
      });
    }

    logger.debug('Tenant validation comparison', {
      tokenTenantId: tokenTenantId,
      normalizedTokenTenantId: normalizedTokenTenantId,
      headerTenantId: headerTenantId,
      normalizedHeaderTenantId: normalizedHeaderTenantId,
      match: normalizedHeaderTenantId === normalizedTokenTenantId,
      reqUserTenantId: req.user?.tenantId
    });

    if (
      normalizedHeaderTenantId &&
      normalizedTokenTenantId &&
      normalizedHeaderTenantId !== normalizedTokenTenantId &&
      !isSuperAdmin
    ) {
      if (strictHeader) {
        logger.error('Tenant mismatch (STRICT_TENANT_HEADER)', {
          userId: req.user?.id,
          email: req.user?.email,
          role: req.user?.role,
          tokenTenant: normalizedTokenTenantId,
          headerTenant: normalizedHeaderTenantId,
          path: req.path
        });

        return res.status(403).json({
          success: false,
          error: 'TENANT_MISMATCH',
          message: 'X-Tenant-Id header does not match JWT token',
          hint: 'Send the same tenantId as in your JWT, or omit X-Tenant-Id. Logout and login again if unsure.',
        });
      }

      logger.warn('TENANT_HEADER_IGNORED: X-Tenant-Id did not match JWT; using token tenant', {
        userId: req.user?.id,
        email: req.user?.email,
        headerTenant: normalizedHeaderTenantId,
        tokenTenant: normalizedTokenTenantId,
        path: req.path
      });
    }

    // Super-admin JWT may omit tenant; optional header can select context
    req.tenantId =
      normalizedTokenTenantId ||
      (isSuperAdmin ? normalizedHeaderTenantId : null);
    req.userId = req.user?.id;
    req.isSuperAdmin = isSuperAdmin;

    if (process.env.NODE_ENV !== 'production' || process.env.LOG_TENANT_VALIDATION === 'true') {
      logger.debug('✅ Tenant validated', {
        userId: req.user?.id,
        email: req.user?.email,
        tenantId: req.tenantId,
        endpoint: req.path
      });
    }

    next();
  };
}

module.exports = { validateTenantMiddleware };
