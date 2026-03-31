const mongoose = require('mongoose');
const Employee = require('../models/Employee.model');
const { normalizeAuthEmployeeCode } = require('./employeeCode.util');

function isMongoObjectIdString(s) {
  return typeof s === 'string' && /^[a-fA-F0-9]{24}$/.test(s.trim());
}

async function findEmployeeIdByCodeOrEmail(tenantId, raw) {
  const v = String(raw).trim();
  if (!v) return null;
  const codeNorm = normalizeAuthEmployeeCode(v);
  let doc = await Employee.findOne({ tenant_id: tenantId, code: codeNorm }).select('_id').lean();
  if (!doc && v !== codeNorm) {
    doc = await Employee.findOne({ tenant_id: tenantId, code: v }).select('_id').lean();
  }
  if (!doc) {
    const email = v.toLowerCase();
    doc = await Employee.findOne({ tenant_id: tenantId, email }).select('_id').lean();
  }
  return doc ? doc._id : null;
}

function isSelfRef(raw) {
  if (raw == null) return false;
  const v = String(raw).trim().toLowerCase();
  return v === 'self' || v === 'me' || v === 'current_user' || v === 'current-user';
}

async function resolveEmployeeIdToObjectId(tenantId, raw, options = {}) {
  if (raw == null || raw === '') throw new Error('EMPLOYEE_001_NOT_FOUND');
  const v = String(raw).trim();
  if (!v) throw new Error('EMPLOYEE_001_NOT_FOUND');
  if (isSelfRef(v)) {
    if (!options.actorId) throw new Error('EMPLOYEE_001_NOT_FOUND');
    return options.actorId;
  }
  if (isMongoObjectIdString(v)) {
    const oid = new mongoose.Types.ObjectId(v);
    const byId = await Employee.findOne({ tenant_id: tenantId, _id: oid }).select('_id').lean();
    if (byId) return byId._id;
    const byAuthUserId = await Employee.findOne({ tenant_id: tenantId, auth_user_id: oid })
      .select('_id')
      .lean();
    if (byAuthUserId) return byAuthUserId._id;
    throw new Error('EMPLOYEE_001_NOT_FOUND');
  }
  const id = await findEmployeeIdByCodeOrEmail(tenantId, v);
  if (!id) throw new Error('EMPLOYEE_001_NOT_FOUND');
  return id;
}

/**
 * List filters: 24-char hex → ObjectId (may yield empty tasks); short code → employee _id or { empty: true }.
 */
async function resolveListFilterEmployeeId(tenantId, raw) {
  if (raw == null || raw === '') return {};
  const v = String(raw).trim();
  if (!v) return {};
  if (isMongoObjectIdString(v)) {
    return { id: new mongoose.Types.ObjectId(v) };
  }
  const id = await findEmployeeIdByCodeOrEmail(tenantId, v);
  if (!id) return { empty: true };
  return { id };
}

module.exports = {
  isMongoObjectIdString,
  isSelfRef,
  findEmployeeIdByCodeOrEmail,
  resolveEmployeeIdToObjectId,
  resolveListFilterEmployeeId
};
