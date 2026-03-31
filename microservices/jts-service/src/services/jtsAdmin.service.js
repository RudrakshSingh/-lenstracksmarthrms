const mongoose = require('mongoose');
const Tenant = require('../models/Tenant.model');
const OrgNode = require('../models/OrgNode.model');
const Employee = require('../models/Employee.model');
const EmployeeRole = require('../models/EmployeeRole.model');
const TaskType = require('../models/TaskType.model');
const TaskTypeSlaRule = require('../models/TaskTypeSlaRule.model');
const EscalationRule = require('../models/EscalationRule.model');
const SelfTaskPolicy = require('../models/SelfTaskPolicy.model');
const ShiftSchedule = require('../models/ShiftSchedule.model');
const ReportingRelationship = require('../models/ReportingRelationship.model');
const AttendanceRecord = require('../models/AttendanceRecord.model');
const DataAccessLog = require('../models/DataAccessLog.model');
const AuditLog = require('../models/AuditLog.model');
const { normalizeAuthEmployeeCode } = require('../utils/employeeCode.util');

function oid(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('VALIDATION_ERROR');
  return new mongoose.Types.ObjectId(id);
}

class JtsAdminService {
  /* ---------- Tenants ---------- */
  async getTenant(tenantId) {
    let t = null;
    if (mongoose.Types.ObjectId.isValid(String(tenantId))) {
      t = await Tenant.findById(tenantId);
    } else {
      const key = String(tenantId || '').trim();
      if (key) {
        t = await Tenant.findOne({ $or: [{ code: key }, { subdomain: key }] });
      }
    }
    if (!t) throw new Error('TENANT_001_NOT_FOUND');
    return t;
  }

  async createTenant(body) {
    return Tenant.create(body);
  }

  async updateTenant(tenantId, body) {
    const t = await Tenant.findByIdAndUpdate(tenantId, { $set: body }, { new: true });
    if (!t) throw new Error('TENANT_001_NOT_FOUND');
    return t;
  }

  /* ---------- Org nodes ---------- */
  async listOrgNodes(tenantId) {
    return OrgNode.find({ tenant_id: tenantId }).sort({ path: 1, name: 1 });
  }

  async createOrgNode(tenantId, body) {
    let path = [];
    if (body.parent_id) {
      const parent = await OrgNode.findOne({ _id: body.parent_id, tenant_id: tenantId });
      if (!parent) throw new Error('ORG_NODE_001_NOT_FOUND');
      path = [...(parent.path || []), parent._id];
    }
    return OrgNode.create({
      tenant_id: tenantId,
      type: body.type,
      name: body.name,
      code: body.code,
      parent_id: body.parent_id || null,
      path
    });
  }

  async updateOrgNode(tenantId, nodeId, body) {
    const node = await OrgNode.findOneAndUpdate(
      { _id: nodeId, tenant_id: tenantId },
      { $set: body },
      { new: true }
    );
    if (!node) throw new Error('ORG_NODE_001_NOT_FOUND');
    return node;
  }

  async deleteOrgNode(tenantId, nodeId) {
    const children = await OrgNode.countDocuments({ tenant_id: tenantId, parent_id: nodeId });
    if (children > 0) throw new Error('JTS_ORG_HAS_CHILDREN');
    const r = await OrgNode.deleteOne({ _id: nodeId, tenant_id: tenantId });
    if (r.deletedCount === 0) throw new Error('ORG_NODE_001_NOT_FOUND');
    return { deleted: true };
  }

  /* ---------- Employees ---------- */
  async listEmployees(tenantId, query = {}) {
    const q = { tenant_id: tenantId };
    if (query.status) q.status = query.status;
    if (query.org_node_id) {
      try {
        q.org_node_id = oid(query.org_node_id);
      } catch {
        throw new Error('VALIDATION_ERROR');
      }
    }
    return Employee.find(q).sort({ name: 1 });
  }

  async createEmployee(tenantId, body) {
    const orgOk = await OrgNode.findOne({ _id: body.org_node_id, tenant_id: tenantId });
    if (!orgOk) throw new Error('ORG_NODE_001_NOT_FOUND');
    const code = normalizeAuthEmployeeCode(body.code);
    if (!code) throw new Error('VALIDATION_ERROR');

    if (body.auth_employee_id != null && body.auth_employee_id !== '') {
      const expected = normalizeAuthEmployeeCode(body.auth_employee_id);
      if (expected && expected !== code) {
        throw new Error('JTS_EMPLOYEE_CODE_AUTH_MISMATCH');
      }
    }

    const payload = {
      tenant_id: tenantId,
      org_node_id: body.org_node_id,
      code,
      name: body.name,
      email: body.email,
      phone: body.phone,
      role_key: body.role_key,
      status: body.status || 'ACTIVE',
      joined_at: body.joined_at
    };
    if (body.auth_user_id && mongoose.Types.ObjectId.isValid(String(body.auth_user_id))) {
      payload.auth_user_id = new mongoose.Types.ObjectId(String(body.auth_user_id));
    }
    try {
      return await Employee.create(payload);
    } catch (e) {
      // Idempotent create for repeated sync calls in production scripts/tests.
      if (e && e.code === 11000) {
        const existing = await Employee.findOne({
          tenant_id: tenantId,
          $or: [{ email: payload.email }, { code: payload.code }, ...(payload.auth_user_id ? [{ auth_user_id: payload.auth_user_id }] : [])]
        });
        if (existing) return existing;
      }
      throw e;
    }
  }

  async updateEmployee(tenantId, employeeId, body) {
    const patch = { ...body };
    delete patch.auth_employee_id;

    if (patch.org_node_id) {
      const orgOk = await OrgNode.findOne({ _id: patch.org_node_id, tenant_id: tenantId });
      if (!orgOk) throw new Error('ORG_NODE_001_NOT_FOUND');
    }
    if (patch.code != null) {
      patch.code = normalizeAuthEmployeeCode(patch.code);
      if (!patch.code) throw new Error('VALIDATION_ERROR');
    }
    if (body.auth_employee_id != null && body.auth_employee_id !== '' && patch.code != null) {
      const expected = normalizeAuthEmployeeCode(body.auth_employee_id);
      if (expected && expected !== patch.code) {
        throw new Error('JTS_EMPLOYEE_CODE_AUTH_MISMATCH');
      }
    }
    if (patch.auth_user_id != null) {
      if (patch.auth_user_id === '' || patch.auth_user_id === null) {
        patch.auth_user_id = null;
      } else if (mongoose.Types.ObjectId.isValid(String(patch.auth_user_id))) {
        patch.auth_user_id = new mongoose.Types.ObjectId(String(patch.auth_user_id));
      } else {
        throw new Error('VALIDATION_ERROR');
      }
    }
    const e = await Employee.findOneAndUpdate(
      { _id: employeeId, tenant_id: tenantId },
      { $set: patch },
      { new: true }
    );
    if (!e) throw new Error('EMPLOYEE_001_NOT_FOUND');
    return e;
  }

  /**
   * Caller JWT: set auth_user_id on the employee row whose code matches JWT employee_id (normalized).
   */
  async bindEmployeeFromJwt(tenantId, user) {
    const uid = user?.id;
    if (!uid || !mongoose.Types.ObjectId.isValid(String(uid))) {
      throw new Error('JTS_AUTH_USER_ID_INVALID');
    }
    const authOid = new mongoose.Types.ObjectId(String(uid));
    const code = normalizeAuthEmployeeCode(user.employee_id || user.employeeId);
    if (!code) throw new Error('JTS_AUTH_EMPLOYEE_ID_MISSING');

    const emp = await Employee.findOne({ tenant_id: tenantId, code });
    if (!emp) throw new Error('EMPLOYEE_001_NOT_FOUND');

    const conflict = await Employee.findOne({
      tenant_id: tenantId,
      auth_user_id: authOid,
      _id: { $ne: emp._id }
    });
    if (conflict) throw new Error('JTS_AUTH_USER_ALREADY_LINKED');

    emp.auth_user_id = authOid;
    await emp.save();
    return emp;
  }

  /** Admin: force Employee.code to match auth employee_id string (e.g. HR employee_id). */
  async alignEmployeeCodeToAuth(tenantId, employeeId, authEmployeeIdString) {
    const code = normalizeAuthEmployeeCode(authEmployeeIdString);
    if (!code) throw new Error('JTS_AUTH_EMPLOYEE_ID_MISSING');

    const dup = await Employee.findOne({
      tenant_id: tenantId,
      code,
      _id: { $ne: employeeId }
    });
    if (dup) throw new Error('JTS_EMPLOYEE_CODE_CONFLICT');

    const e = await Employee.findOneAndUpdate(
      { _id: employeeId, tenant_id: tenantId },
      { $set: { code } },
      { new: true }
    );
    if (!e) throw new Error('EMPLOYEE_001_NOT_FOUND');
    return e;
  }

  /** Admin: link auth User._id to a JTS employee (when code alignment is not used). */
  async linkAuthUserToEmployee(tenantId, employeeId, authUserIdString) {
    if (!mongoose.Types.ObjectId.isValid(String(authUserIdString))) {
      throw new Error('VALIDATION_ERROR');
    }
    const authOid = new mongoose.Types.ObjectId(String(authUserIdString));

    const conflict = await Employee.findOne({
      tenant_id: tenantId,
      auth_user_id: authOid,
      _id: { $ne: employeeId }
    });
    if (conflict) throw new Error('JTS_AUTH_USER_ALREADY_LINKED');

    const e = await Employee.findOneAndUpdate(
      { _id: employeeId, tenant_id: tenantId },
      { $set: { auth_user_id: authOid } },
      { new: true }
    );
    if (!e) throw new Error('EMPLOYEE_001_NOT_FOUND');
    return e;
  }

  async deleteEmployee(tenantId, employeeId) {
    const r = await Employee.deleteOne({ _id: employeeId, tenant_id: tenantId });
    if (r.deletedCount === 0) throw new Error('EMPLOYEE_001_NOT_FOUND');
    await EmployeeRole.deleteMany({ tenant_id: tenantId, employee_id: employeeId });
    return { deleted: true };
  }

  /* ---------- Employee roles ---------- */
  async listEmployeeRoles(tenantId, filters = {}) {
    const q = { tenant_id: tenantId };
    if (filters.employee_id) q.employee_id = filters.employee_id;
    return EmployeeRole.find(q);
  }

  async addEmployeeRole(tenantId, body) {
    const empOk = await Employee.findOne({ _id: body.employee_id, tenant_id: tenantId });
    if (!empOk) throw new Error('EMPLOYEE_001_NOT_FOUND');
    return EmployeeRole.findOneAndUpdate(
      { tenant_id: tenantId, employee_id: body.employee_id, role: body.role.toUpperCase() },
      { tenant_id: tenantId, employee_id: body.employee_id, role: body.role.toUpperCase() },
      { upsert: true, new: true }
    );
  }

  async removeEmployeeRole(tenantId, employeeId, role) {
    await EmployeeRole.deleteOne({
      tenant_id: tenantId,
      employee_id: employeeId,
      role: role.toUpperCase()
    });
    return { deleted: true };
  }

  /* ---------- Task types ---------- */
  async listTaskTypes(tenantId) {
    return TaskType.find({ tenant_id: tenantId }).sort({ name: 1 });
  }

  async createTaskType(tenantId, body) {
    return TaskType.create({ ...body, tenant_id: tenantId });
  }

  async updateTaskType(tenantId, id, body) {
    const t = await TaskType.findOneAndUpdate(
      { _id: id, tenant_id: tenantId },
      { $set: body },
      { new: true }
    );
    if (!t) throw new Error('TASK_TYPE_001_NOT_FOUND');
    return t;
  }

  async deleteTaskType(tenantId, id) {
    const r = await TaskType.deleteOne({ _id: id, tenant_id: tenantId });
    if (r.deletedCount === 0) throw new Error('TASK_TYPE_001_NOT_FOUND');
    return { deleted: true };
  }

  /* ---------- SLA rules ---------- */
  async listSlaRules(tenantId) {
    return TaskTypeSlaRule.find({ tenant_id: tenantId });
  }

  async upsertSlaRule(tenantId, body) {
    const tt = await TaskType.findOne({ _id: body.task_type_id, tenant_id: tenantId });
    if (!tt) throw new Error('TASK_TYPE_001_NOT_FOUND');
    return TaskTypeSlaRule.findOneAndUpdate(
      {
        tenant_id: tenantId,
        task_type_id: body.task_type_id,
        priority: body.priority
      },
      {
        tenant_id: tenantId,
        task_type_id: body.task_type_id,
        priority: body.priority,
        base_sla_minutes: body.base_sla_minutes,
        basis: body.basis
      },
      { upsert: true, new: true }
    );
  }

  async deleteSlaRule(tenantId, id) {
    const r = await TaskTypeSlaRule.deleteOne({ _id: id, tenant_id: tenantId });
    if (r.deletedCount === 0) throw new Error('SLA_001_RULE_NOT_FOUND');
    return { deleted: true };
  }

  /* ---------- Escalation rules ---------- */
  async listEscalationRules(tenantId) {
    return EscalationRule.find({ tenant_id: tenantId });
  }

  async createEscalationRule(tenantId, body) {
    return EscalationRule.create({ ...body, tenant_id: tenantId });
  }

  async updateEscalationRule(tenantId, id, body) {
    const r = await EscalationRule.findOneAndUpdate(
      { _id: id, tenant_id: tenantId },
      { $set: body },
      { new: true }
    );
    if (!r) throw new Error('JTS_ESCALATION_RULE_NOT_FOUND');
    return r;
  }

  async deleteEscalationRule(tenantId, id) {
    const r = await EscalationRule.deleteOne({ _id: id, tenant_id: tenantId });
    if (r.deletedCount === 0) throw new Error('JTS_ESCALATION_RULE_NOT_FOUND');
    return { deleted: true };
  }

  /* ---------- Self-task policies ---------- */
  async listSelfPolicies(tenantId) {
    return SelfTaskPolicy.find({ tenant_id: tenantId });
  }

  async upsertSelfPolicy(tenantId, body) {
    return SelfTaskPolicy.findOneAndUpdate(
      { tenant_id: tenantId, role_key: body.role_key },
      { $set: { ...body, tenant_id: tenantId } },
      { upsert: true, new: true }
    );
  }

  async deleteSelfPolicy(tenantId, id) {
    const r = await SelfTaskPolicy.deleteOne({ _id: id, tenant_id: tenantId });
    if (r.deletedCount === 0) throw new Error('JTS_POLICY_NOT_FOUND');
    return { deleted: true };
  }

  /* ---------- Shift schedules ---------- */
  async listShifts(tenantId, query) {
    const q = { tenant_id: tenantId };
    if (query.employee_id) q.employee_id = query.employee_id;
    return ShiftSchedule.find(q).sort({ shift_date: 1 });
  }

  async createShift(tenantId, body) {
    return ShiftSchedule.create({ ...body, tenant_id: tenantId });
  }

  async deleteShift(tenantId, id) {
    const r = await ShiftSchedule.deleteOne({ _id: id, tenant_id: tenantId });
    if (r.deletedCount === 0) throw new Error('JTS_SHIFT_NOT_FOUND');
    return { deleted: true };
  }

  /* ---------- Reporting ---------- */
  async listReporting(tenantId) {
    return ReportingRelationship.find({ tenant_id: tenantId });
  }

  async upsertReporting(tenantId, body) {
    return ReportingRelationship.findOneAndUpdate(
      { tenant_id: tenantId, manager_id: body.manager_id, reportee_id: body.reportee_id },
      { tenant_id: tenantId, manager_id: body.manager_id, reportee_id: body.reportee_id },
      { upsert: true, new: true }
    );
  }

  async deleteReporting(tenantId, id) {
    const r = await ReportingRelationship.deleteOne({ _id: id, tenant_id: tenantId });
    if (r.deletedCount === 0) throw new Error('JTS_REPORTING_NOT_FOUND');
    return { deleted: true };
  }

  /* ---------- Attendance mirror (JTS local) ---------- */
  async mirrorAttendance(tenantId, body) {
    const emp = await Employee.findOne({ _id: body.employee_id, tenant_id: tenantId });
    if (!emp) throw new Error('EMPLOYEE_001_NOT_FOUND');
    const orgNodeId = body.org_node_id || emp.org_node_id;

    const day = new Date(body.work_date);
    day.setHours(0, 0, 0, 0);
    return AttendanceRecord.findOneAndUpdate(
      {
        tenant_id: tenantId,
        employee_id: body.employee_id,
        work_date: day
      },
      {
        tenant_id: tenantId,
        employee_id: body.employee_id,
        org_node_id: orgNodeId,
        work_date: day,
        check_in_at: body.check_in_at ? new Date(body.check_in_at) : null,
        check_out_at: body.check_out_at ? new Date(body.check_out_at) : null
      },
      { upsert: true, new: true }
    );
  }

  async listAttendanceMirror(tenantId, query) {
    const q = { tenant_id: tenantId };
    if (query.employee_id) q.employee_id = query.employee_id;
    return AttendanceRecord.find(q).sort({ work_date: -1 }).limit(200);
  }

  /** Mirror an open clock-in for today (or work_date) without using attendance-service. */
  async mirrorAttendanceOpenSession(tenantId, body) {
    const emp = await Employee.findOne({ _id: body.employee_id, tenant_id: tenantId });
    if (!emp) throw new Error('EMPLOYEE_001_NOT_FOUND');
    const orgNodeId = body.org_node_id || emp.org_node_id;

    const day = body.work_date ? new Date(body.work_date) : new Date();
    day.setHours(0, 0, 0, 0);
    const checkIn = body.check_in_at ? new Date(body.check_in_at) : new Date();

    return AttendanceRecord.findOneAndUpdate(
      {
        tenant_id: tenantId,
        employee_id: body.employee_id,
        work_date: day
      },
      {
        tenant_id: tenantId,
        employee_id: body.employee_id,
        org_node_id: orgNodeId,
        work_date: day,
        check_in_at: checkIn,
        check_out_at: null
      },
      { upsert: true, new: true }
    );
  }

  /** Mirror clock-out for the given day (default today). */
  async mirrorAttendanceCloseSession(tenantId, body) {
    const emp = await Employee.findOne({ _id: body.employee_id, tenant_id: tenantId });
    if (!emp) throw new Error('EMPLOYEE_001_NOT_FOUND');

    const day = body.work_date ? new Date(body.work_date) : new Date();
    day.setHours(0, 0, 0, 0);

    const row = await AttendanceRecord.findOne({
      tenant_id: tenantId,
      employee_id: body.employee_id,
      work_date: day
    });
    if (!row) throw new Error('JTS_ATTENDANCE_ROW_NOT_FOUND');

    row.check_out_at = body.check_out_at ? new Date(body.check_out_at) : new Date();
    await row.save();
    return row;
  }

  /* ---------- Logs ---------- */
  async listAuditLogs(tenantId, query) {
    const q = { tenant_id: tenantId };
    if (query.actor_id) q.actor_id = query.actor_id;
    return AuditLog.find(q).sort({ created_at: -1 }).limit(Number(query.limit) || 100);
  }

  async listDataAccessLogs(tenantId, query) {
    const q = { tenant_id: tenantId };
    if (query.actor_id) q.actor_id = query.actor_id;
    return DataAccessLog.find(q).sort({ created_at: -1 }).limit(Number(query.limit) || 100);
  }

  async recordDataAccess(tenantId, actorId, body) {
    return DataAccessLog.create({
      tenant_id: tenantId,
      actor_id: actorId,
      resource_type: body.resource_type,
      resource_id: body.resource_id,
      action: body.action,
      ip_address: body.ip_address,
      user_agent: body.user_agent
    });
  }
}

module.exports = new JtsAdminService();
