const jtsAdminService = require('../services/jtsAdmin.service');
const { listTenantsVisible, canMutateAnyTenant } = require('../services/tenantScope.service');
const logger = require('../config/logger');
const { toErrorPayload } = require('../utils/errorResponse');
const { resolveEmployeeId } = require('../utils/actor.util');
const { logAudit } = require('../utils/auditLogger');

class JtsAdminController {
  async listTenants(req, res) {
    try {
      const rows = await listTenantsVisible(req.user.tenant_id, req.user.role);
      res.json({ success: true, data: rows });
    } catch (error) {
      logger.error('JTS list tenants', { error: error.message });
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getCurrentTenant(req, res) {
    try {
      const row = await jtsAdminService.getTenant(req.user.tenant_id);
      res.json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async createTenant(req, res) {
    try {
      if (!canMutateAnyTenant(req.user.role)) {
        return res.status(403).json({
          success: false,
          code: 'JTS_TENANT_SCOPE_FORBIDDEN',
          error: 'JTS_TENANT_SCOPE_FORBIDDEN'
        });
      }
      const row = await jtsAdminService.createTenant(req.body);
      await logAudit(req.user.tenant_id, null, 'JTS_TENANT_CREATE', { payload: req.body });
      res.status(201).json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async updateTenant(req, res) {
    try {
      if (!canMutateAnyTenant(req.user.role) && String(req.params.id) !== String(req.user.tenant_id)) {
        return res.status(403).json({
          success: false,
          code: 'JTS_TENANT_SCOPE_FORBIDDEN',
          error: 'JTS_TENANT_SCOPE_FORBIDDEN'
        });
      }
      const row = await jtsAdminService.updateTenant(req.params.id, req.body);
      res.json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async listOrgNodes(req, res) {
    try {
      const rows = await jtsAdminService.listOrgNodes(req.user.tenant_id);
      res.json({ success: true, data: rows });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async createOrgNode(req, res) {
    try {
      const row = await jtsAdminService.createOrgNode(req.user.tenant_id, req.body);
      res.status(201).json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async updateOrgNode(req, res) {
    try {
      const row = await jtsAdminService.updateOrgNode(
        req.user.tenant_id,
        req.params.id,
        req.body
      );
      res.json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async deleteOrgNode(req, res) {
    try {
      const row = await jtsAdminService.deleteOrgNode(req.user.tenant_id, req.params.id);
      res.json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async listEmployees(req, res) {
    try {
      const rows = await jtsAdminService.listEmployees(req.user.tenant_id, req.query);
      res.json({ success: true, data: rows });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async createEmployee(req, res) {
    try {
      const row = await jtsAdminService.createEmployee(req.user.tenant_id, req.body);
      res.status(201).json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async updateEmployee(req, res) {
    try {
      const row = await jtsAdminService.updateEmployee(
        req.user.tenant_id,
        req.params.id,
        req.body
      );
      res.json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async deleteEmployee(req, res) {
    try {
      const row = await jtsAdminService.deleteEmployee(req.user.tenant_id, req.params.id);
      res.json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async bindEmployeeFromJwt(req, res) {
    try {
      const row = await jtsAdminService.bindEmployeeFromJwt(req.user.tenant_id, req.user);
      res.json({
        success: true,
        data: row,
        message:
          'Linked auth user to JTS employee row matching JWT employee_id (normalized) to Employee.code'
      });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async alignEmployeeAuthCode(req, res) {
    try {
      const row = await jtsAdminService.alignEmployeeCodeToAuth(
        req.user.tenant_id,
        req.params.id,
        req.body.auth_employee_id
      );
      res.json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async linkAuthUserToEmployee(req, res) {
    try {
      const row = await jtsAdminService.linkAuthUserToEmployee(
        req.user.tenant_id,
        req.params.id,
        req.body.auth_user_id
      );
      res.json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async listEmployeeRoles(req, res) {
    try {
      const rows = await jtsAdminService.listEmployeeRoles(req.user.tenant_id, req.query);
      res.json({ success: true, data: rows });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async addEmployeeRole(req, res) {
    try {
      const row = await jtsAdminService.addEmployeeRole(req.user.tenant_id, req.body);
      res.status(201).json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async removeEmployeeRole(req, res) {
    try {
      const row = await jtsAdminService.removeEmployeeRole(
        req.user.tenant_id,
        req.params.employeeId,
        req.params.role
      );
      res.json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async listTaskTypes(req, res) {
    try {
      const rows = await jtsAdminService.listTaskTypes(req.user.tenant_id);
      res.json({ success: true, data: rows });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async createTaskType(req, res) {
    try {
      const row = await jtsAdminService.createTaskType(req.user.tenant_id, req.body);
      res.status(201).json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async updateTaskType(req, res) {
    try {
      const row = await jtsAdminService.updateTaskType(
        req.user.tenant_id,
        req.params.id,
        req.body
      );
      res.json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async deleteTaskType(req, res) {
    try {
      const row = await jtsAdminService.deleteTaskType(req.user.tenant_id, req.params.id);
      res.json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async listSlaRules(req, res) {
    try {
      const rows = await jtsAdminService.listSlaRules(req.user.tenant_id);
      res.json({ success: true, data: rows });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async upsertSlaRule(req, res) {
    try {
      const row = await jtsAdminService.upsertSlaRule(req.user.tenant_id, req.body);
      res.json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async deleteSlaRule(req, res) {
    try {
      const row = await jtsAdminService.deleteSlaRule(req.user.tenant_id, req.params.id);
      res.json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async listEscalationRules(req, res) {
    try {
      const rows = await jtsAdminService.listEscalationRules(req.user.tenant_id);
      res.json({ success: true, data: rows });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async createEscalationRule(req, res) {
    try {
      const row = await jtsAdminService.createEscalationRule(req.user.tenant_id, req.body);
      res.status(201).json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async updateEscalationRule(req, res) {
    try {
      const row = await jtsAdminService.updateEscalationRule(
        req.user.tenant_id,
        req.params.id,
        req.body
      );
      res.json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async deleteEscalationRule(req, res) {
    try {
      const row = await jtsAdminService.deleteEscalationRule(
        req.user.tenant_id,
        req.params.id
      );
      res.json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async listSelfPolicies(req, res) {
    try {
      const rows = await jtsAdminService.listSelfPolicies(req.user.tenant_id);
      res.json({ success: true, data: rows });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async upsertSelfPolicy(req, res) {
    try {
      const row = await jtsAdminService.upsertSelfPolicy(req.user.tenant_id, req.body);
      res.json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async deleteSelfPolicy(req, res) {
    try {
      const row = await jtsAdminService.deleteSelfPolicy(req.user.tenant_id, req.params.id);
      res.json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async listShifts(req, res) {
    try {
      const rows = await jtsAdminService.listShifts(req.user.tenant_id, req.query);
      res.json({ success: true, data: rows });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async createShift(req, res) {
    try {
      const row = await jtsAdminService.createShift(req.user.tenant_id, req.body);
      res.status(201).json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async deleteShift(req, res) {
    try {
      const row = await jtsAdminService.deleteShift(req.user.tenant_id, req.params.id);
      res.json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async listReporting(req, res) {
    try {
      const rows = await jtsAdminService.listReporting(req.user.tenant_id);
      res.json({ success: true, data: rows });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async upsertReporting(req, res) {
    try {
      const row = await jtsAdminService.upsertReporting(req.user.tenant_id, req.body);
      res.json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async deleteReporting(req, res) {
    try {
      const row = await jtsAdminService.deleteReporting(req.user.tenant_id, req.params.id);
      res.json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async mirrorAttendance(req, res) {
    try {
      const row = await jtsAdminService.mirrorAttendance(req.user.tenant_id, req.body);
      res.json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async mirrorAttendanceOpenSession(req, res) {
    try {
      const row = await jtsAdminService.mirrorAttendanceOpenSession(req.user.tenant_id, req.body);
      res.json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async mirrorAttendanceCloseSession(req, res) {
    try {
      const row = await jtsAdminService.mirrorAttendanceCloseSession(req.user.tenant_id, req.body);
      res.json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async listAttendanceMirror(req, res) {
    try {
      const rows = await jtsAdminService.listAttendanceMirror(req.user.tenant_id, req.query);
      res.json({ success: true, data: rows });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async listAuditLogs(req, res) {
    try {
      const rows = await jtsAdminService.listAuditLogs(req.user.tenant_id, req.query);
      res.json({ success: true, data: rows });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async listDataAccessLogs(req, res) {
    try {
      const rows = await jtsAdminService.listDataAccessLogs(req.user.tenant_id, req.query);
      res.json({ success: true, data: rows });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async recordDataAccess(req, res) {
    try {
      const actorId = await resolveEmployeeId(req.user.tenant_id, req.user);
      if (!actorId) {
        return res.status(403).json({
          success: false,
          code: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED'
        });
      }
      const row = await jtsAdminService.recordDataAccess(
        req.user.tenant_id,
        actorId,
        {
          ...req.body,
          ip_address: req.ip,
          user_agent: req.get('user-agent')
        }
      );
      res.status(201).json({ success: true, data: row });
    } catch (error) {
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }
}

module.exports = new JtsAdminController();
