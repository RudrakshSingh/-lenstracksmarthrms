const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const selfTaskController = require('../controllers/selfTask.controller');
const subtaskRoutes = require('./subtask.routes');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validate, Joi } = require('../middleware/validate.middleware');
const { employeeRefSchema } = require('../validation/employeeRefSchema');

const objectIdSchema = Joi.string().length(24).hex();

const createTaskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).required(),
  description: Joi.string().allow('', null).optional(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional(),
  scope_org_node_id: objectIdSchema.optional(),
  scopeOrgNodeId: objectIdSchema.optional(),
  assigned_to_employee_id: employeeRefSchema.optional(),
  assignedToEmployeeId: employeeRefSchema.optional(),
  type_id: objectIdSchema.optional(),
  typeId: objectIdSchema.optional(),
  requires_approval: Joi.boolean().optional(),
  requiresApproval: Joi.boolean().optional(),
  requires_review: Joi.boolean().optional(),
  requiresReview: Joi.boolean().optional(),
  requires_evidence: Joi.boolean().optional(),
  requiresEvidence: Joi.boolean().optional(),
  requires_timer: Joi.boolean().optional(),
  requiresTimer: Joi.boolean().optional(),
  reviewer_employee_id: employeeRefSchema.optional(),
  reviewerEmployeeId: employeeRefSchema.optional(),
  approver_employee_id: employeeRefSchema.optional(),
  approverEmployeeId: employeeRefSchema.optional(),
  workday_id: Joi.string().max(64).optional(),
  workdayId: Joi.string().max(64).optional(),
  sla_minutes_override: Joi.number().integer().min(1).optional(),
  slaMinutes: Joi.number().integer().min(1).optional(),
  metadata: Joi.object().optional(),
  dueAt: Joi.alternatives().try(Joi.date(), Joi.string()).optional(),
  due_at: Joi.alternatives().try(Joi.date(), Joi.string()).optional(),
  category: Joi.string().max(120).optional(),
  dependency_task_ids: Joi.array().items(objectIdSchema).optional(),
  dependencyTaskIds: Joi.array().items(objectIdSchema).optional(),
  checklist_items: Joi.array()
    .items(
      Joi.object({
        key: Joi.string().required(),
        label: Joi.string().required(),
        done: Joi.boolean().optional(),
        order: Joi.number().optional()
      })
    )
    .optional(),
  checklistItems: Joi.array()
    .items(
      Joi.object({
        key: Joi.string().required(),
        label: Joi.string().required(),
        done: Joi.boolean().optional(),
        order: Joi.number().optional()
      })
    )
    .optional(),
  checklist_completion_required: Joi.boolean().optional(),
  checklistCompletionRequired: Joi.boolean().optional(),
  is_recurring: Joi.boolean().optional(),
  isRecurring: Joi.boolean().optional(),
  recurrence_rule_id: objectIdSchema.optional(),
  recurrenceRuleId: objectIdSchema.optional()
});

const taskIdParamSchema = Joi.object({
  id: objectIdSchema.required()
});

const listTaskQuerySchema = Joi.object({
  status: Joi.alternatives().try(
    Joi.string(),
    Joi.array().items(Joi.string().valid(
      'DRAFT',
      'PENDING_APPROVAL',
      'ASSIGNED',
      'ACCEPTED',
      'IN_PROGRESS',
      'ON_HOLD',
      'PENDING_REVIEW',
      'COMPLETED',
      'REJECTED',
      'BLOCKED',
      'CANCELLED',
      'REOPENED'
    ))
  ).optional(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional(),
  type_id: objectIdSchema.optional(),
  taskType: objectIdSchema.optional(),
  typeId: objectIdSchema.optional(),
  assigned_to_employee_id: employeeRefSchema.optional(),
  assignedTo: employeeRefSchema.optional(),
  assignedToEmployeeId: employeeRefSchema.optional(),
  employeeId: employeeRefSchema.optional(),
  assignerId: employeeRefSchema.optional(),
  createdByEmployeeId: employeeRefSchema.optional(),
  scope_org_node_id: objectIdSchema.optional(),
  date_from: Joi.date().iso().optional(),
  date_to: Joi.date().iso().optional(),
  date: Joi.string().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(200).optional(),
  search: Joi.string().max(200).optional(),
  workdayId: Joi.string().max(64).optional(),
  requiresApproval: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')).optional()
});

const changeStatusBodySchema = Joi.object({
  status: Joi.string().required(),
  reason: Joi.string().max(500).allow('', null).optional()
});

const updateTaskBodySchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).optional(),
  description: Joi.string().allow('', null).optional(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional(),
  status: Joi.string().optional(),
  dueAt: Joi.alternatives().try(Joi.date(), Joi.string()).optional(),
  due_at: Joi.alternatives().try(Joi.date(), Joi.string()).optional(),
  notes: Joi.string().max(5000).allow('', null).optional(),
  assignedToEmployeeId: employeeRefSchema.optional(),
  assigned_to_employee_id: employeeRefSchema.optional(),
  estimatedHours: Joi.number().min(0).optional(),
  estimated_hours: Joi.number().min(0).optional(),
  estimatedMinutes: Joi.number().min(0).optional(),
  estimated_minutes: Joi.number().min(0).optional(),
  actualMinutes: Joi.number().min(0).optional(),
  actual_minutes: Joi.number().min(0).optional(),
  workdayId: Joi.string().max(64).optional(),
  workday_id: Joi.string().max(64).optional(),
  reviewerEmployeeId: employeeRefSchema.optional(),
  reviewer_employee_id: employeeRefSchema.optional(),
  approverEmployeeId: employeeRefSchema.optional(),
  approver_employee_id: employeeRefSchema.optional(),
  requiresReview: Joi.boolean().optional(),
  requires_review: Joi.boolean().optional(),
  requiresEvidence: Joi.boolean().optional(),
  requires_evidence: Joi.boolean().optional(),
  requiresTimer: Joi.boolean().optional(),
  requires_timer: Joi.boolean().optional(),
  metadata: Joi.object().optional(),
  reason: Joi.string().max(500).allow('', null).optional(),
  category: Joi.string().max(120).optional(),
  checklist_items: Joi.array()
    .items(
      Joi.object({
        key: Joi.string().required(),
        label: Joi.string().required(),
        done: Joi.boolean().optional(),
        order: Joi.number().optional()
      })
    )
    .optional(),
  checklistItems: Joi.array()
    .items(
      Joi.object({
        key: Joi.string().required(),
        label: Joi.string().required(),
        done: Joi.boolean().optional(),
        order: Joi.number().optional()
      })
    )
    .optional(),
  checklist_completion_required: Joi.boolean().optional(),
  checklistCompletionRequired: Joi.boolean().optional(),
  dependency_task_ids: Joi.array().items(objectIdSchema).optional(),
  dependencyTaskIds: Joi.array().items(objectIdSchema).optional(),
  is_recurring: Joi.boolean().optional(),
  isRecurring: Joi.boolean().optional(),
  recurrence_rule_id: objectIdSchema.allow(null).optional(),
  recurrenceRuleId: objectIdSchema.allow(null).optional()
}).min(1);

const lifecycleReasonBodySchema = Joi.object({
  reason: Joi.string().max(500).allow('', null).optional(),
  blockedReason: Joi.string().max(500).allow('', null).optional()
});

const reassignTaskBodySchema = Joi.object({
  assigned_to_employee_id: employeeRefSchema.optional(),
  assignedToEmployeeId: employeeRefSchema.optional(),
  assigneeId: employeeRefSchema.optional()
}).min(1);

const completeTaskBodySchema = Joi.object({
  notes: Joi.string().max(5000).allow('', null).optional()
});

const rateTaskBodySchema = Joi.object({
  rating: Joi.number().min(1).max(5).required(),
  comments: Joi.string().max(2000).allow('', null).optional()
});

/** Same contract as POST /api/jts/self-tasks — any authenticated employee may create own self-task (approval flow in service). */
const createSelfTaskSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).required(),
  description: Joi.string().allow('', null).optional(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional(),
  scope_org_node_id: objectIdSchema.optional(),
  type_id: objectIdSchema.optional(),
  taskType: objectIdSchema.optional(),
  sla_minutes_override: Joi.number().integer().min(1).optional(),
  metadata: Joi.object().optional()
});

// All routes require authentication
router.use(authenticate);

// Self-task create under task stack (for clients that POST to .../tasks/self-tasks instead of .../self-tasks)
router.post(
  '/self-tasks',
  validate({ body: createSelfTaskSchema }),
  (req, res) => selfTaskController.createSelfTask(req, res)
);

// Create task - requires manager role
router.post(
  '/',
  requireRole(['MANAGER', 'STORE_MANAGER', 'CLUSTER_MANAGER', 'COUNTRY_OPS', 'TENANT_ADMIN', 'HOD']),
  validate({ body: createTaskSchema }),
  (req, res) => taskController.createTask(req, res)
);

// Get tasks
router.get(
  '/',
  validate({ query: listTaskQuerySchema }),
  (req, res) => taskController.getTasks(req, res)
);

router.get(
  '/sla/alerts',
  validate({
    query: Joi.object({
      employeeId: employeeRefSchema.optional(),
      employee_id: employeeRefSchema.optional(),
      teamId: objectIdSchema.optional(),
      limit: Joi.number().integer().min(1).max(200).optional()
    })
  }),
  (req, res) => taskController.getSlaAlerts(req, res)
);

router.get(
  '/workday/:workdayId',
  validate({
    params: Joi.object({ workdayId: Joi.string().max(64).required() }),
    query: listTaskQuerySchema
  }),
  (req, res) => taskController.getWorkdayTasks(req, res)
);

router.get(
  '/summary/me',
  validate({
    query: Joi.object({ date: Joi.string().optional() })
  }),
  (req, res) => taskController.getMyTaskSummary(req, res)
);

router.get(
  '/summary/:employeeId',
  validate({
    params: Joi.object({ employeeId: employeeRefSchema.required() }),
    query: Joi.object({ date: Joi.string().optional() })
  }),
  (req, res) => taskController.getTaskSummary(req, res)
);

// Sub-routes on :id must be registered before GET /:id
router.get(
  '/:id/sla',
  validate({ params: taskIdParamSchema }),
  (req, res) => taskController.getTaskSla(req, res)
);

router.use(
  '/:id/subtasks',
  validate({ params: taskIdParamSchema }),
  subtaskRoutes
);

router.get(
  '/:id/activities',
  validate({
    params: taskIdParamSchema,
    query: Joi.object({ limit: Joi.number().integer().min(1).max(500).optional() })
  }),
  (req, res) => taskController.getTaskActivities(req, res)
);

router.post(
  '/:id/start',
  validate({ params: taskIdParamSchema, body: lifecycleReasonBodySchema }),
  (req, res) => taskController.startTask(req, res)
);

router.post(
  '/:id/submit-review',
  validate({ params: taskIdParamSchema, body: lifecycleReasonBodySchema }),
  (req, res) => taskController.submitForReview(req, res)
);

router.post(
  '/:id/reopen',
  validate({ params: taskIdParamSchema, body: lifecycleReasonBodySchema }),
  (req, res) => taskController.reopenTask(req, res)
);

router.post(
  '/:id/cancel',
  validate({ params: taskIdParamSchema, body: lifecycleReasonBodySchema }),
  (req, res) => taskController.cancelTask(req, res)
);

router.post(
  '/:id/block',
  validate({ params: taskIdParamSchema, body: lifecycleReasonBodySchema }),
  (req, res) => taskController.blockTask(req, res)
);

router.post(
  '/:id/unblock',
  validate({ params: taskIdParamSchema, body: lifecycleReasonBodySchema }),
  (req, res) => taskController.unblockTask(req, res)
);

router.post(
  '/:id/reassign',
  requireRole(['MANAGER', 'STORE_MANAGER', 'CLUSTER_MANAGER', 'COUNTRY_OPS', 'TENANT_ADMIN', 'HOD']),
  validate({ params: taskIdParamSchema, body: reassignTaskBodySchema }),
  (req, res) => taskController.reassignTask(req, res)
);

router.put(
  '/:id',
  requireRole(['MANAGER', 'STORE_MANAGER', 'CLUSTER_MANAGER', 'COUNTRY_OPS', 'TENANT_ADMIN', 'HOD']),
  validate({ params: taskIdParamSchema, body: updateTaskBodySchema }),
  (req, res) => taskController.updateTask(req, res)
);

router.delete(
  '/:id',
  requireRole(['MANAGER', 'STORE_MANAGER', 'CLUSTER_MANAGER', 'COUNTRY_OPS', 'TENANT_ADMIN', 'HOD']),
  validate({ params: taskIdParamSchema }),
  (req, res) => taskController.deleteTask(req, res)
);

router.post(
  '/:id/complete',
  validate({ params: taskIdParamSchema, body: completeTaskBodySchema }),
  (req, res) => taskController.completeTask(req, res)
);

router.post(
  '/:id/accept',
  validate({ params: taskIdParamSchema }),
  (req, res) => taskController.acceptTask(req, res)
);

router.post(
  '/:id/reject',
  validate({
    params: taskIdParamSchema,
    body: Joi.object({ reason: Joi.string().max(500).allow('', null).optional() })
  }),
  (req, res) => taskController.rejectTask(req, res)
);

router.post(
  '/:id/rate',
  validate({ params: taskIdParamSchema, body: rateTaskBodySchema }),
  (req, res) => taskController.rateTask(req, res)
);

router.patch(
  '/:id/status',
  validate({ params: taskIdParamSchema, body: changeStatusBodySchema }),
  (req, res) => taskController.changeStatus(req, res)
);

// Get task by ID
router.get(
  '/:id',
  validate({ params: taskIdParamSchema }),
  (req, res) => taskController.getTaskById(req, res)
);

module.exports = router;
