/**
 * HRMS MFE–oriented paths under /api/jts (no extra /tasks segment).
 * Task CRUD remains on /api/jts/tasks (see server duplicate mounts).
 */
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/hrmsJtsCompat.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validate, Joi } = require('../middleware/validate.middleware');

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

const objectIdSchema = Joi.string().length(24).hex();

const createSelfTaskCompatSchema = Joi.object({
  title: Joi.string().trim().min(3).max(200).required(),
  description: Joi.string().allow('', null).optional(),
  priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional(),
  scope_org_node_id: objectIdSchema.optional(),
  type_id: objectIdSchema.optional(),
  taskType: objectIdSchema.optional(),
  sla_minutes_override: Joi.number().integer().min(1).optional(),
  metadata: Joi.object().optional()
});

// Public health for ingress paths /jts/health and /api/jts/health (must be before authenticate).
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'jts-service',
    timestamp: new Date().toISOString()
  });
});

router.use(authenticate);

router.post(
  '/self-tasks',
  validate({ body: createSelfTaskCompatSchema }),
  (req, res) => ctrl.createSelfTask(req, res)
);

// Compatibility alias expected by some clients/tests.
router.get(
  '/self-tasks/my',
  validate({
    query: Joi.object({
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(200).optional(),
      status: Joi.string().optional()
    })
  }),
  (req, res) => ctrl.getMyTasks(req, res)
);

router.get(
  '/tasks/my',
  validate({
    query: Joi.object({
      page: Joi.number().integer().min(1).optional(),
      limit: Joi.number().integer().min(1).max(200).optional(),
      status: Joi.string().optional()
    })
  }),
  (req, res) => ctrl.getMyTasks(req, res)
);

router.get('/tenant/current', (req, res) => ctrl.getCurrentTenant(req, res));

/** Alias for UIs that call `.../approvals/pending/me` (same as `/approvals/pending` with no approverId). */
router.get('/approvals/pending/me', (req, res) => ctrl.listPendingApprovals(req, res));

router.get(
  '/approvals/pending',
  validate({
    query: Joi.object({
      approverId: objectIdSchema.optional()
    })
  }),
  (req, res) => ctrl.listPendingApprovals(req, res)
);

router.post(
  '/approvals/:approvalId/approve',
  validate({
    params: Joi.object({ approvalId: objectIdSchema.required() }),
    body: Joi.object({ notes: Joi.string().allow('', null).optional() })
  }),
  (req, res) => ctrl.approveApproval(req, res)
);

router.post(
  '/approvals/:approvalId/reject',
  validate({
    params: Joi.object({ approvalId: objectIdSchema.required() }),
    body: Joi.object({ reason: Joi.string().required() })
  }),
  (req, res) => ctrl.rejectApproval(req, res)
);

const analyticsQuerySchema = Joi.object({
  timeRange: Joi.string().valid('3months', '6months', '1year').optional(),
  department: Joi.string().optional(),
  teamId: objectIdSchema.optional()
});

/** Register specific paths before `/analytics` so Express does not treat `overview` as a param. */
router.get('/analytics/overview', validate({ query: analyticsQuerySchema }), (req, res) =>
  ctrl.getAnalyticsOverview(req, res)
);

router.get('/analytics/by-employee', validate({ query: analyticsQuerySchema }), (req, res) =>
  ctrl.getAnalyticsByEmployee(req, res)
);

router.get('/analytics/by-team', validate({ query: analyticsQuerySchema }), (req, res) =>
  ctrl.getAnalyticsByTeam(req, res)
);

router.get('/analytics/by-task-type', validate({ query: analyticsQuerySchema }), (req, res) =>
  ctrl.getAnalyticsByTaskType(req, res)
);

router.get('/analytics', validate({ query: analyticsQuerySchema }), (req, res) =>
  ctrl.getAnalytics(req, res)
);

router.get(
  '/reviews/queue',
  requireRole(readRoles),
  validate({
    query: Joi.object({
      limit: Joi.number().integer().min(1).max(200).optional(),
      status: Joi.string().optional(),
      employeeId: objectIdSchema.optional()
    })
  }),
  (req, res) => ctrl.getUnifiedReviewQueue(req, res)
);

router.get('/sla-policies', requireRole(readRoles), (req, res) => ctrl.listSlaPoliciesPublic(req, res));

router.get(
  '/sla-policies/:id',
  requireRole(readRoles),
  validate({ params: Joi.object({ id: objectIdSchema.required() }) }),
  (req, res) => ctrl.getSlaPolicyByIdPublic(req, res)
);

router.get('/escalations/console', requireRole(readRoles), (req, res) =>
  ctrl.getEscalationConsole(req, res)
);

router.get(
  '/reviews',
  validate({
    query: Joi.object({
      employeeId: objectIdSchema.optional(),
      status: Joi.string().valid('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'CLOSED').optional(),
      limit: Joi.number().integer().min(1).max(200).optional()
    })
  }),
  (req, res) => ctrl.listReviews(req, res)
);

module.exports = router;
