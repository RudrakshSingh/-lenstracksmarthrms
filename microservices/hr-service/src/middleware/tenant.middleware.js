const logger = require('../config/logger');

/**
 * Tenant Isolation Middleware
 * Extracts tenant ID from request headers and adds to req.tenantId
 * CRITICAL: This ensures all queries are filtered by tenant
 */
const extractTenantId = (req, res, next) => {
  try {
    // Method 1: Extract from X-Tenant-Id header (primary method)
    let tenantId = req.get('X-Tenant-Id') || req.get('x-tenant-id') || req.get('X-TENANT-ID');
    
    // Method 2: Extract from X-Company-Id header (alternative)
    if (!tenantId) {
      tenantId = req.get('X-Company-Id') || req.get('x-company-id') || req.get('X-COMPANY-ID');
    }
    
    // Method 3: Extract from query parameter
    if (!tenantId) {
      tenantId = req.query.tenantId || req.query.tenant || req.query.companyId;
    }
    
    // Method 4: Extract from JWT token (if tenantId is in token)
    if (!tenantId && req.user && req.user.tenantId) {
      tenantId = req.user.tenantId;
    }
    
    // If still no tenantId, log warning but don't fail (for backward compatibility)
    if (!tenantId) {
      logger.warn('No tenantId found in request', {
        method: req.method,
        path: req.path,
        headers: {
          'X-Tenant-Id': req.get('X-Tenant-Id'),
          'X-Company-Id': req.get('X-Company-Id')
        },
        query: req.query
      });
      
      // For backward compatibility, use 'default' tenant
      // TODO: Remove this after migration - all requests MUST have tenantId
      tenantId = 'default';
      logger.warn('Using default tenantId for backward compatibility', { path: req.path });
    }
    
    // Normalize tenantId (lowercase, trim)
    tenantId = tenantId.toLowerCase().trim();
    
    // Add tenantId to request object
    req.tenantId = tenantId;
    
    // Log tenant access (only in development or for debugging)
    if (process.env.NODE_ENV !== 'production' || process.env.LOG_TENANT_ACCESS === 'true') {
      logger.debug('Tenant identified', {
        tenantId,
        method: req.method,
        path: req.path,
        user: req.user?.email || req.user?.employeeId
      });
    }
    
    next();
  } catch (error) {
    logger.error('Tenant extraction failed', {
      error: error.message,
      stack: error.stack,
      path: req.path
    });
    
    // Don't fail the request, but log the error
    req.tenantId = 'default';
    next();
  }
};

/**
 * Validate tenant ID is present (strict mode)
 * Use this middleware for routes that REQUIRE tenantId
 */
const requireTenantId = (req, res, next) => {
  if (!req.tenantId || req.tenantId === 'default') {
    return res.status(400).json({
      success: false,
      message: 'Tenant ID is required',
      error: 'TENANT_ID_REQUIRED',
      hint: 'Include X-Tenant-Id header in your request'
    });
  }
  next();
};

module.exports = {
  extractTenantId,
  requireTenantId
};
