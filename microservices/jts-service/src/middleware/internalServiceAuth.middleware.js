const mongoose = require('mongoose');
const crypto = require('crypto');
const { buildErrorBody } = require('../utils/apiError.util');

/**
 * Pattern B: service-to-JTS calls without an end-user JWT.
 * Requires env JTS_INTERNAL_SERVICE_TOKEN and headers:
 *   X-JTS-Internal-Token: <same as env>
 *   X-Tenant-Id: <24-hex tenant ObjectId>
 *
 * Do NOT expose these paths on public ingress without network restrictions.
 */
function internalServiceAuth(req, res, next) {
  const secret = process.env.JTS_INTERNAL_SERVICE_TOKEN;
  if (!secret || String(secret).length < 8) {
    return res
      .status(503)
      .json(
        buildErrorBody({
          code: 'JTS_INTERNAL_DISABLED',
          message: 'Internal JTS API disabled (set JTS_INTERNAL_SERVICE_TOKEN)'
        })
      );
  }

  const presented = req.get('X-JTS-Internal-Token') || '';
  const a = Buffer.from(String(secret), 'utf8');
  const b = Buffer.from(String(presented), 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json(buildErrorBody({ code: 'JTS_INTERNAL_UNAUTHORIZED', message: 'Invalid internal token' }));
  }

  const tid = req.get('X-Tenant-Id') || req.get('x-tenant-id');
  if (!tid || !mongoose.Types.ObjectId.isValid(String(tid))) {
    return res
      .status(400)
      .json(
        buildErrorBody({
          code: 'JTS_TENANT_REQUIRED',
          message: 'X-Tenant-Id must be a valid tenant ObjectId'
        })
      );
  }

  req.user = {
    id: String(tid),
    tenant_id: String(tid),
    org_node_id: null,
    role: 'TENANT_ADMIN',
    permissions: [],
    employee_id: null,
    email: null,
    internal_service: true
  };

  next();
}

module.exports = { internalServiceAuth };
