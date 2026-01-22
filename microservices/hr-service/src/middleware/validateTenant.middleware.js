const logger = require('../config/logger');

/**
 * SECURITY MIDDLEWARE: Validate tenant context
 * 
 * This middleware ensures:
 * 1. X-Tenant-Id header is present
 * 2. X-Tenant-Id matches JWT token's tenantId claim
 * 3. Tenant cannot be spoofed via header manipulation
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

    // CRITICAL: Header must be present
    if (!headerTenantId) {
      logger.warn('TENANT_REQUIRED: X-Tenant-Id header missing', {
        method: req.method,
        path: req.path,
        userId: req.user?.id,
        email: req.user?.email,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(400).json({
        success: false,
        error: 'TENANT_REQUIRED',
        message: 'X-Tenant-Id header is required for this endpoint',
        hint: 'This is a security requirement. Frontend should always send this header.',
      });
    }

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

    // SECURITY: Validate header matches token
    const normalizedHeaderTenantId = headerTenantId.toLowerCase().trim();
    const normalizedTokenTenantId = tokenTenantId ? tokenTenantId.toLowerCase().trim() : null;

    if (normalizedHeaderTenantId !== normalizedTokenTenantId && !isSuperAdmin) {
      // SECURITY ALERT: Log this as potential attack
      logger.error('🚨 SECURITY ALERT: Tenant mismatch detected', {
        userId: req.user?.id,
        email: req.user?.email,
        role: req.user?.role,
        tokenTenantId: normalizedTokenTenantId,
        headerTenantId: normalizedHeaderTenantId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        path: req.path,
        method: req.method
      });

      return res.status(403).json({
        success: false,
        error: 'TENANT_MISMATCH',
        message: 'X-Tenant-Id header does not match JWT token',
        hint: 'Possible security violation. Logout and login again.',
      });
    }

    // SUCCESS: Store validated tenantId in request
    req.tenantId = normalizedHeaderTenantId;
    req.userId = req.user?.id;
    req.isSuperAdmin = isSuperAdmin;

    // Log successful validation (only in development or for debugging)
    if (process.env.NODE_ENV !== 'production' || process.env.LOG_TENANT_VALIDATION === 'true') {
      logger.debug('✅ Tenant validated', {
        userId: req.user?.id,
        email: req.user?.email,
        tenantId: normalizedHeaderTenantId,
        endpoint: req.path,
      });
    }

    next();
  };
}

module.exports = { validateTenantMiddleware };
