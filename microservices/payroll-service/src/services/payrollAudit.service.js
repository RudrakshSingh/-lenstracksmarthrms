const crypto = require('crypto');
const PayrollWorkflowAudit = require('../models/PayrollWorkflowAudit.model');

async function appendAudit({
  cycleRef,
  action,
  req,
  payload = {},
  tenantId
}) {
  const last = await PayrollWorkflowAudit.findOne({ cycle_ref: cycleRef })
    .sort({ created_at: -1 })
    .select('entry_hash')
    .lean();

  const prevHash = last?.entry_hash || 'genesis';
  const body = JSON.stringify({ cycleRef, action, payload, prevHash, ts: Date.now() });
  const entryHash = crypto.createHash('sha256').update(body).digest('hex');

  return PayrollWorkflowAudit.create({
    cycle_ref: cycleRef,
    action,
    user_id: req?.user?.id || req?.user?.userId,
    role: req?.user?.role,
    payload,
    request_id: req?.headers?.['x-request-id'] || req?.headers?.['X-Request-ID'],
    ip: req?.ip,
    user_agent: req?.get?.('User-Agent'),
    prev_hash: prevHash,
    entry_hash: entryHash,
    tenant_id: tenantId || req?.headers?.['x-tenant-id'] || req?.headers?.['X-Tenant-Id']
  });
}

module.exports = { appendAudit };
