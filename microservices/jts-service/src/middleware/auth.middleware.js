const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { JWT_SECRET } = require('../config/jwt');
const logger = require('../config/logger');
const { buildErrorBody } = require('../utils/apiError.util');
const Tenant = require('../models/Tenant.model');

function tokenFromCookieHeader(cookieHeader) {
  const raw = String(cookieHeader || '');
  if (!raw) return null;
  const m = raw.match(/(?:^|;\s*)(?:accessToken|access_token|token|jwt|authToken)=([^;]+)/i);
  return m && m[1] ? decodeURIComponent(m[1]) : null;
}

function toTenantSlug(value) {
  const raw = String(value || '').trim().toLowerCase();
  const slug = raw.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return slug || 'default';
}

/** @returns {boolean} true if response was sent (stop handler chain) */
async function enforceTenantIsolation(req, res) {
  if (process.env.TEST_MODE === 'true') {
    return false;
  }
  let tid = req.user?.tenant_id;
  const headerRaw = req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'];
  const headerVal = headerRaw != null ? String(headerRaw).trim() : '';

  // Transitional compatibility: auth token may carry tenant slug (e.g. "lenstrack")
  // while JTS persistence uses ObjectId tenant ids. If caller supplies ObjectId header,
  // adopt it as tenant context after JWT verification.
  if (tid && !mongoose.Types.ObjectId.isValid(String(tid)) && mongoose.Types.ObjectId.isValid(headerVal)) {
    req.user.tenant_key = String(tid).trim();
    req.user.tenant_id = headerVal;
    tid = req.user.tenant_id;
    // Keep JTS tenant catalog in sync when auth token carries a slug.
    const existingTenant = await Tenant.findById(tid).select('_id');
    if (!existingTenant) {
      const tenantKey = (req.user.tenant_key || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
      const fallbackKey = tenantKey || `tenant-${String(tid).slice(-6)}`;
      try {
        await Tenant.create({
          _id: tid,
          code: fallbackKey,
          subdomain: fallbackKey,
          name: req.user.tenant_key || fallbackKey
        });
      } catch (e) {
        if (!(e && e.code === 11000)) throw e;
      }
    }
  }

  if (tid && !mongoose.Types.ObjectId.isValid(String(tid))) {
    const tenantKey = String(tid).trim();
    const escapedTenantKey = tenantKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tenantKeyRegex = new RegExp(`^${escapedTenantKey}$`, 'i');
    let tenant = await Tenant.findOne({
      $or: [{ code: tenantKeyRegex }, { subdomain: tenantKeyRegex }, { name: tenantKeyRegex }]
    }).select('_id');

    // Compatibility bridge: auth token may carry a tenant slug (e.g. "upcapto")
    // before JTS has a corresponding Tenant document. Auto-provision once so
    // requests can be tenant-scoped by ObjectId immediately.
    if (!tenant) {
      const slug = toTenantSlug(tenantKey);
      try {
        await Tenant.create({
          code: slug,
          subdomain: slug,
          name: tenantKey
        });
      } catch (e) {
        // Ignore duplicate race; resolve the row below.
        if (!(e && e.code === 11000)) throw e;
      }
      tenant = await Tenant.findOne({
        $or: [{ code: tenantKeyRegex }, { subdomain: tenantKeyRegex }, { name: tenantKeyRegex }]
      }).select('_id');
      if (!tenant) {
        tenant = await Tenant.findOne({
          $or: [{ code: slug }, { subdomain: slug }, { name: tenantKey }]
        }).select('_id');
      }
    }

    if (tenant?._id) {
      req.user.tenant_key = tenantKey;
      req.user.tenant_id = String(tenant._id);
      tid = req.user.tenant_id;
    }
  }

  if (!tid || !mongoose.Types.ObjectId.isValid(String(tid))) {
    res
      .status(403)
      .json(
        buildErrorBody({
          code: 'JTS_TENANT_REQUIRED',
          message: 'Tenant context missing or invalid in token'
        })
      );
    return true;
  }
  if (headerRaw != null && String(headerRaw).trim() !== '') {
    const tenantKey = req.user?.tenant_key;
    const headerMatches = headerVal === String(tid) || (tenantKey && headerVal === String(tenantKey));
    if (!headerMatches) {
      res
        .status(403)
        .json(
          buildErrorBody({
            code: 'JTS_TENANT_HEADER_MISMATCH',
            message: 'X-Tenant-Id must match the tenant in your access token'
          })
        );
      return true;
    }
  }
  return false;
}

/**
 * Authentication middleware
 * Extracts JWT token and validates it
 */
const authenticate = async (req, res, next) => {
  try {
    // TEST_MODE: Allow requests without authentication for testing
    if (process.env.TEST_MODE === 'true') {
      req.user = {
        id: '000000000000000000000001',
        tenant_id: '000000000000000000000002',
        org_node_id: '000000000000000000000003',
        role: 'EMPLOYEE',
        permissions: []
      };
      return next();
    }

    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    if (!token && req.cookies) {
      token =
        req.cookies.accessToken ||
        req.cookies.access_token ||
        req.cookies.token ||
        req.cookies.jwt ||
        req.cookies.authToken ||
        null;
    }
    if (!token && req.headers.cookie) {
      token = tokenFromCookieHeader(req.headers.cookie);
    }

    if (!token) {
      return res.status(401).json(buildErrorBody({ code: 'AUTH_REQUIRED' }));
    }

    if (!token || token.trim() === '') {
      return res.status(401).json(buildErrorBody({ code: 'INVALID_TOKEN', message: 'Invalid token format' }));
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json(buildErrorBody({ code: 'INVALID_TOKEN' }));
      }

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json(buildErrorBody({ code: 'TOKEN_EXPIRED' }));
      }

      throw error;
    }

    // Extract user info from JWT payload
    // Expected format: { sub: employee_id, tid: tenant_id, oid: org_node_id, rol: role, perms: permissions[] }
    req.user = {
      id: decoded.sub || decoded.userId || decoded.id,
      tenant_id: decoded.tid || decoded.tenant_id || decoded.tenantId,
      org_node_id: decoded.oid || decoded.org_node_id,
      role: decoded.rol || decoded.role,
      permissions: decoded.perms || decoded.permissions || [],
      employee_id: decoded.employee_id || decoded.employeeId,
      email: decoded.email
    };

    try {
      const { resolvePermissionsFromJwtOrRedis } = require('../../../shared/utils/resolvePermissionsFromJwtOrRedis');
      const { getRedisClient } = require('../config/redis');
      const layer = await resolvePermissionsFromJwtOrRedis(decoded, () => getRedisClient(), logger);
      if (layer.source !== 'none') {
        req.user.permissions = layer.permissions;
      }
    } catch (permLayerErr) {
      logger.debug('JTS: permission Redis/JWT layer skipped', { error: permLayerErr.message });
    }

    if (await enforceTenantIsolation(req, res)) return;

    next();
  } catch (error) {
    logger.error('Authentication error', { error: error.message });
    return res.status(401).json(buildErrorBody({ code: 'AUTH_FAILED' }));
  }
};

module.exports = { authenticate };

