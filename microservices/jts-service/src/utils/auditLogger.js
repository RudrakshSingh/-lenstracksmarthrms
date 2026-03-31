const AuditLog = require('../models/AuditLog.model');

async function logAudit(tenantId, actorId, action, details = {}) {
  try {
    await AuditLog.create({
      tenant_id: tenantId,
      actor_id: actorId || undefined,
      action,
      resource_type: details.resource_type,
      resource_id: details.resource_id,
      details: details.payload,
      ip_address: details.ip_address,
      user_agent: details.user_agent
    });
  } catch {
    // non-blocking
  }
}

module.exports = { logAudit };
