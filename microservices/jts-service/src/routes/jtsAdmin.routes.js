const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/jtsAdmin.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validate, Joi } = require('../middleware/validate.middleware');

const objectIdSchema = Joi.string().length(24).hex();

const readRoles = [
  'MANAGER',
  'STORE_MANAGER',
  'CLUSTER_MANAGER',
  'COUNTRY_OPS',
  'TENANT_ADMIN',
  'HOD',
  'SUPERADMIN',
  'ADMIN'
];

const writeRoles = ['TENANT_ADMIN', 'COUNTRY_OPS', 'HOD', 'CLUSTER_MANAGER', 'SUPERADMIN', 'ADMIN'];

/** Only platform roles may create/update Tenant documents (tenant isolation). */
const tenantCreateRoles = ['SUPERADMIN', 'ADMIN'];

router.use(authenticate);

/* Tenants (scoped) */
router.get('/tenants', requireRole(readRoles), (req, res) => ctrl.listTenants(req, res));
router.get('/tenant/current', requireRole(readRoles), (req, res) => ctrl.getCurrentTenant(req, res));
router.post(
  '/tenants',
  requireRole(tenantCreateRoles),
  validate({
    body: Joi.object({
      code: Joi.string().trim().min(1).max(100).required(),
      name: Joi.string().trim().min(1).max(200).required(),
      subdomain: Joi.string().trim().min(1).max(100).required(),
      is_active: Joi.boolean().optional(),
      settings: Joi.object().optional()
    })
  }),
  (req, res) => ctrl.createTenant(req, res)
);
router.patch(
  '/tenants/:id',
  requireRole(tenantCreateRoles),
  validate({ params: Joi.object({ id: objectIdSchema.required() }) }),
  (req, res) => ctrl.updateTenant(req, res)
);

/* Org */
router.get('/org-nodes', requireRole(readRoles), (req, res) => ctrl.listOrgNodes(req, res));
router.post(
  '/org-nodes',
  requireRole(writeRoles),
  validate({
    body: Joi.object({
      type: Joi.string()
        .valid(
          'GLOBAL',
          'REGION',
          'COUNTRY',
          'CLUSTER',
          'STORE',
          'OFFICE',
          'WAREHOUSE',
          'LAB'
        )
        .required(),
      name: Joi.string().min(1).max(200).required(),
      code: Joi.string().min(1).max(64).required(),
      parent_id: objectIdSchema.allow(null).optional()
    })
  }),
  (req, res) => ctrl.createOrgNode(req, res)
);
router.patch(
  '/org-nodes/:id',
  requireRole(writeRoles),
  validate({ params: Joi.object({ id: objectIdSchema.required() }) }),
  (req, res) => ctrl.updateOrgNode(req, res)
);
router.delete(
  '/org-nodes/:id',
  requireRole(writeRoles),
  validate({ params: Joi.object({ id: objectIdSchema.required() }) }),
  (req, res) => ctrl.deleteOrgNode(req, res)
);

/* Employees */
router.get('/employees', requireRole(readRoles), (req, res) => ctrl.listEmployees(req, res));
router.post(
  '/employees',
  requireRole(writeRoles),
  validate({
    body: Joi.object({
      org_node_id: objectIdSchema.required(),
      code: Joi.string().required(),
      name: Joi.string().required(),
      email: Joi.string().email().required(),
      phone: Joi.string().allow('', null).optional(),
      role_key: Joi.string().required(),
      status: Joi.string().valid('ACTIVE', 'INACTIVE', 'ON_LEAVE').optional(),
      joined_at: Joi.date().optional(),
      /** If set, must equal normalized code (same as auth JWT employee_id) */
      auth_employee_id: Joi.string().allow('', null).optional(),
      auth_user_id: objectIdSchema.optional()
    })
  }),
  (req, res) => ctrl.createEmployee(req, res)
);
router.post(
  '/employees/bind-from-jwt',
  requireRole(readRoles),
  (req, res) => ctrl.bindEmployeeFromJwt(req, res)
);
router.patch(
  '/employees/:id/align-auth-code',
  requireRole(writeRoles),
  validate({
    params: Joi.object({ id: objectIdSchema.required() }),
    body: Joi.object({
      auth_employee_id: Joi.string().min(1).max(64).required()
    })
  }),
  (req, res) => ctrl.alignEmployeeAuthCode(req, res)
);
router.put(
  '/employees/:id/auth-user-link',
  requireRole(writeRoles),
  validate({
    params: Joi.object({ id: objectIdSchema.required() }),
    body: Joi.object({
      auth_user_id: objectIdSchema.required()
    })
  }),
  (req, res) => ctrl.linkAuthUserToEmployee(req, res)
);
router.patch(
  '/employees/:id',
  requireRole(writeRoles),
  validate({ params: Joi.object({ id: objectIdSchema.required() }) }),
  (req, res) => ctrl.updateEmployee(req, res)
);
router.delete(
  '/employees/:id',
  requireRole(writeRoles),
  validate({ params: Joi.object({ id: objectIdSchema.required() }) }),
  (req, res) => ctrl.deleteEmployee(req, res)
);

/* Roles */
router.get('/employee-roles', requireRole(readRoles), (req, res) => ctrl.listEmployeeRoles(req, res));
router.post(
  '/employee-roles',
  requireRole(writeRoles),
  validate({
    body: Joi.object({
      employee_id: objectIdSchema.required(),
      role: Joi.string().min(1).max(64).required()
    })
  }),
  (req, res) => ctrl.addEmployeeRole(req, res)
);
router.delete(
  '/employee-roles/:employeeId',
  requireRole(writeRoles),
  validate({
    params: Joi.object({ employeeId: objectIdSchema.required() }),
    query: Joi.object({ role: Joi.string().required() })
  }),
  (req, res) => ctrl.removeEmployeeRole(req, res)
);

/* Task types */
router.get('/task-types', requireRole(readRoles), (req, res) => ctrl.listTaskTypes(req, res));
router.post(
  '/task-types',
  requireRole(writeRoles),
  validate({
    body: Joi.object({
      name: Joi.string().required(),
      code: Joi.string().required(),
      category: Joi.string().allow('', null).optional(),
      default_priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').required(),
      description: Joi.string().allow('', null).optional()
    })
  }),
  (req, res) => ctrl.createTaskType(req, res)
);
router.patch(
  '/task-types/:id',
  requireRole(writeRoles),
  validate({ params: Joi.object({ id: objectIdSchema.required() }) }),
  (req, res) => ctrl.updateTaskType(req, res)
);
router.delete(
  '/task-types/:id',
  requireRole(writeRoles),
  validate({ params: Joi.object({ id: objectIdSchema.required() }) }),
  (req, res) => ctrl.deleteTaskType(req, res)
);

/* SLA */
router.get('/sla-rules', requireRole(readRoles), (req, res) => ctrl.listSlaRules(req, res));
router.put(
  '/sla-rules',
  requireRole(writeRoles),
  validate({
    body: Joi.object({
      task_type_id: objectIdSchema.required(),
      priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').required(),
      base_sla_minutes: Joi.number().integer().min(1).required(),
      basis: Joi.string().valid('CALENDAR_TIME', 'BUSINESS_HOURS').required()
    })
  }),
  (req, res) => ctrl.upsertSlaRule(req, res)
);
router.delete(
  '/sla-rules/:id',
  requireRole(writeRoles),
  validate({ params: Joi.object({ id: objectIdSchema.required() }) }),
  (req, res) => ctrl.deleteSlaRule(req, res)
);

/* Escalation */
router.get('/escalation-rules', requireRole(readRoles), (req, res) => ctrl.listEscalationRules(req, res));
router.post(
  '/escalation-rules',
  requireRole(writeRoles),
  validate({
    body: Joi.object({
      task_type_id: objectIdSchema.allow(null).optional(),
      threshold: Joi.string().valid('PRE_SLA', 'SLA_BREACH', 'EXTRA_DELAY').required(),
      pre_sla_threshold_minutes: Joi.number().optional(),
      extra_delay_factor: Joi.number().optional(),
      notify_roles: Joi.array().items(Joi.string()).default([]),
      is_active: Joi.boolean().optional()
    })
  }),
  (req, res) => ctrl.createEscalationRule(req, res)
);
router.patch(
  '/escalation-rules/:id',
  requireRole(writeRoles),
  validate({ params: Joi.object({ id: objectIdSchema.required() }) }),
  (req, res) => ctrl.updateEscalationRule(req, res)
);
router.delete(
  '/escalation-rules/:id',
  requireRole(writeRoles),
  validate({ params: Joi.object({ id: objectIdSchema.required() }) }),
  (req, res) => ctrl.deleteEscalationRule(req, res)
);

/* Self policies */
router.get('/self-task-policies', requireRole(readRoles), (req, res) => ctrl.listSelfPolicies(req, res));
router.put(
  '/self-task-policies',
  requireRole(writeRoles),
  validate({
    body: Joi.object({
      role_key: Joi.string().required(),
      auto_assign_to_self: Joi.boolean().optional(),
      mandatory_approval: Joi.boolean().optional(),
      max_minutes_per_task: Joi.number().optional(),
      max_minutes_per_shift: Joi.number().optional(),
      max_tasks_per_day: Joi.number().optional()
    })
  }),
  (req, res) => ctrl.upsertSelfPolicy(req, res)
);
router.delete(
  '/self-task-policies/:id',
  requireRole(writeRoles),
  validate({ params: Joi.object({ id: objectIdSchema.required() }) }),
  (req, res) => ctrl.deleteSelfPolicy(req, res)
);

/* Shifts */
router.get('/shift-schedules', requireRole(readRoles), (req, res) => ctrl.listShifts(req, res));
router.post(
  '/shift-schedules',
  requireRole(writeRoles),
  validate({
    body: Joi.object({
      employee_id: objectIdSchema.required(),
      shift_date: Joi.date().required(),
      start_time: Joi.string().required(),
      end_time: Joi.string().required()
    })
  }),
  (req, res) => ctrl.createShift(req, res)
);
router.delete(
  '/shift-schedules/:id',
  requireRole(writeRoles),
  validate({ params: Joi.object({ id: objectIdSchema.required() }) }),
  (req, res) => ctrl.deleteShift(req, res)
);

/* Reporting */
router.get('/reporting-relationships', requireRole(readRoles), (req, res) => ctrl.listReporting(req, res));
router.put(
  '/reporting-relationships',
  requireRole(writeRoles),
  validate({
    body: Joi.object({
      manager_id: objectIdSchema.required(),
      reportee_id: objectIdSchema.required()
    })
  }),
  (req, res) => ctrl.upsertReporting(req, res)
);
router.delete(
  '/reporting-relationships/:id',
  requireRole(writeRoles),
  validate({ params: Joi.object({ id: objectIdSchema.required() }) }),
  (req, res) => ctrl.deleteReporting(req, res)
);

/* Attendance mirror */
router.get('/attendance-records', requireRole(readRoles), (req, res) => ctrl.listAttendanceMirror(req, res));
router.put(
  '/attendance-records',
  requireRole(writeRoles),
  validate({
    body: Joi.object({
      employee_id: objectIdSchema.required(),
      work_date: Joi.date().required(),
      check_in_at: Joi.date().allow(null).optional(),
      check_out_at: Joi.date().allow(null).optional(),
      org_node_id: objectIdSchema.optional()
    })
  }),
  (req, res) => ctrl.mirrorAttendance(req, res)
);
router.post(
  '/attendance-records/open-session',
  requireRole(writeRoles),
  validate({
    body: Joi.object({
      employee_id: objectIdSchema.required(),
      work_date: Joi.date().optional(),
      check_in_at: Joi.date().optional(),
      org_node_id: objectIdSchema.optional()
    })
  }),
  (req, res) => ctrl.mirrorAttendanceOpenSession(req, res)
);
router.post(
  '/attendance-records/close-session',
  requireRole(writeRoles),
  validate({
    body: Joi.object({
      employee_id: objectIdSchema.required(),
      work_date: Joi.date().optional(),
      check_out_at: Joi.date().optional()
    })
  }),
  (req, res) => ctrl.mirrorAttendanceCloseSession(req, res)
);

/* Logs */
router.get('/audit-logs', requireRole(writeRoles), (req, res) => ctrl.listAuditLogs(req, res));
router.get('/data-access-logs', requireRole(writeRoles), (req, res) => ctrl.listDataAccessLogs(req, res));
router.post(
  '/data-access-logs',
  requireRole(readRoles),
  validate({
    body: Joi.object({
      resource_type: Joi.string().required(),
      resource_id: objectIdSchema.optional(),
      action: Joi.string().required()
    })
  }),
  (req, res) => ctrl.recordDataAccess(req, res)
);

module.exports = router;
