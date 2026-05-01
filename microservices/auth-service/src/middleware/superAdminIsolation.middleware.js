const SupportAccessGrant = require('../models/SupportAccessGrant.model');
const SuperAdminActionLog = require('../models/SuperAdminActionLog.model');

function resolveTenant(req) {
  return String(req.tenantId || req.get('X-Tenant-Id') || req.user?.tenantId || '').trim().toLowerCase();
}

function isSuperAdmin(req) {
  return String(req.user?.role || '').toLowerCase() === 'superadmin';
}

async function logSuperAdminAction(req, statusCode, metadata = {}) {
  try {
    const tenantId = resolveTenant(req);
    if (!tenantId || !isSuperAdmin(req)) return;
    await SuperAdminActionLog.create({
      tenantId,
      actorUserId: req.user?._id || req.user?.id,
      actorEmail: req.user?.email || '',
      action: `${req.method} ${req.originalUrl || req.url}`,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode,
      requestId: req.get('X-Request-ID') || '',
      ip: req.ip,
      userAgent: req.get('User-Agent') || '',
      metadata
    });
  } catch (_) {
    // audit logging must never break main flow
  }
}

function superAdminDataIsolation(req, res, next) {
  if (!isSuperAdmin(req)) return next();
  const tenantId = resolveTenant(req);
  if (!tenantId) return next();

  const blockedPrefixes = [
    '/api/sales',
    '/api/inventory',
    '/api/financial',
    '/api/payroll',
    '/api/hr',
    '/api/crm'
  ];
  const path = req.originalUrl || req.url || '';
  if (blockedPrefixes.some((p) => path.startsWith(p))) {
    return res.status(403).json({
      success: false,
      message: 'Super admin tenant business-data access is blocked without support grant',
      code: 'SUPERADMIN_ISOLATION_BLOCKED'
    });
  }
  return next();
}

function requireSupportAccess(scope = 'general') {
  return async (req, res, next) => {
    if (!isSuperAdmin(req)) return next();
    const tenantId = resolveTenant(req);
    if (!tenantId) return res.status(400).json({ success: false, message: 'Tenant context required' });

    const now = new Date();
    const grant = await SupportAccessGrant.findOne({
      tenantId,
      grantedTo: req.user?._id || req.user?.id,
      revokedAt: null,
      expiresAt: { $gt: now },
      scope
    }).lean();

    if (!grant) {
      await logSuperAdminAction(req, 403, { scope, denied: true, reason: 'NO_ACTIVE_SUPPORT_GRANT' });
      return res.status(403).json({
        success: false,
        message: `Support access grant required for scope: ${scope}`,
        code: 'SUPPORT_ACCESS_REQUIRED'
      });
    }

    if (grant.requireExtraApproval && ['finance', 'payroll', 'gst', 'customer'].includes(scope)) {
      await logSuperAdminAction(req, 403, { scope, denied: true, reason: 'EXTRA_APPROVAL_REQUIRED' });
      return res.status(403).json({
        success: false,
        message: `Extra approval required for scope: ${scope}`,
        code: 'SUPPORT_ACCESS_EXTRA_APPROVAL_REQUIRED'
      });
    }

    req.supportAccessGrant = grant;
    await logSuperAdminAction(req, 200, { scope, grantId: String(grant._id) });
    return next();
  };
}

module.exports = {
  superAdminDataIsolation,
  requireSupportAccess,
  logSuperAdminAction
};
