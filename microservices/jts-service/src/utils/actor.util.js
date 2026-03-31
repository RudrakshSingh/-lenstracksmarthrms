const mongoose = require('mongoose');
const Employee = require('../models/Employee.model');
const OrgNode = require('../models/OrgNode.model');
const { normalizeAuthEmployeeCode } = require('./employeeCode.util');

/**
 * Resolve JTS Employee document id from JWT user:
 * 1) Employee._id === JWT id
 * 2) Employee.auth_user_id === JWT id (auth User._id)
 * 3) Employee.code === normalized JWT employee_id
 */
async function resolveEmployeeId(tenantId, user) {
  if (!tenantId || !user) return null;

  const byId = await Employee.findOne({ tenant_id: tenantId, _id: user.id }).select('_id');
  if (byId) return byId._id;

  const uid = user.id != null ? String(user.id) : '';
  if (uid && mongoose.Types.ObjectId.isValid(uid)) {
    const byAuth = await Employee.findOne({
      tenant_id: tenantId,
      auth_user_id: uid
    }).select('_id');
    if (byAuth) return byAuth._id;
  }

  const normalizedCode = normalizeAuthEmployeeCode(user.employee_id || user.employeeId);
  if (normalizedCode) {
    const byCode = await Employee.findOne({
      tenant_id: tenantId,
      code: normalizedCode
    }).select('_id');
    if (byCode) return byCode._id;
  }

  // Last resort: provision a minimal employee row when catalog mapping
  // has not been seeded yet (works for both employee and admin JWTs).
  const roleKey = String(user.role || user.role_key || user.user_type || 'EMPLOYEE').toUpperCase();
  const uidRaw = user.id != null ? String(user.id) : '';
  const uidSuffix = uidRaw.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
  const generatedCode = normalizeAuthEmployeeCode(
    normalizedCode || `AUTO-${uidSuffix || 'USER'}`
  );

  if (generatedCode && user.email) {
    const defaultOrg = await OrgNode.findOne({ tenant_id: tenantId }).sort({ created_at: 1 }).select('_id');
    if (defaultOrg?._id) {
      try {
        const created = await Employee.create({
          tenant_id: tenantId,
          org_node_id: defaultOrg._id,
          code: generatedCode,
          name: user.email.split('@')[0],
          email: user.email,
          role_key: roleKey,
          auth_user_id: mongoose.Types.ObjectId.isValid(String(user.id)) ? String(user.id) : undefined
        });
        return created._id;
      } catch (e) {
        const existing = await Employee.findOne({
          tenant_id: tenantId,
          $or: [{ code: generatedCode }, { email: user.email }]
        }).select('_id');
        if (existing) return existing._id;
      }
    }
  }

  return null;
}

module.exports = { resolveEmployeeId };
