const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/performanceManagement.controller');
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

router.use(authenticate);

router.get('/metrics', requireRole(readRoles), (req, res) => ctrl.listMetrics(req, res));
router.get('/scores', requireRole(readRoles), (req, res) => ctrl.listScores(req, res));
router.post(
  '/calculate-daily',
  requireRole(writeRoles),
  validate({
    body: Joi.object({
      employee_id: objectIdSchema.required(),
      date: Joi.date().optional()
    })
  }),
  (req, res) => ctrl.calculateDaily(req, res)
);

router.get('/reviews', requireRole(readRoles), (req, res) => ctrl.listReviews(req, res));
router.post(
  '/reviews',
  requireRole(writeRoles),
  validate({
    body: Joi.object({
      employee_id: objectIdSchema.required(),
      reviewer_employee_id: objectIdSchema.required(),
      review_period_start: Joi.date().required(),
      review_period_end: Joi.date().required(),
      review_type: Joi.string().valid('QUARTERLY', 'ANNUAL', 'PROBATION', 'AD_HOC').required(),
      manager_rating: Joi.number().min(1).max(5).optional(),
      manager_comments: Joi.string().allow('', null).optional(),
      strengths: Joi.string().allow('', null).optional(),
      areas_for_improvement: Joi.string().allow('', null).optional(),
      recommended_action: Joi.string().allow('', null).optional(),
      training_needs: Joi.string().allow('', null).optional(),
      goals_next_period: Joi.string().allow('', null).optional(),
      status: Joi.string().valid('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'CLOSED').optional()
    })
  }),
  (req, res) => ctrl.createReview(req, res)
);
router.patch(
  '/reviews/:id',
  requireRole(writeRoles),
  validate({ params: Joi.object({ id: objectIdSchema.required() }) }),
  (req, res) => ctrl.updateReview(req, res)
);
router.delete(
  '/reviews/:id',
  requireRole(writeRoles),
  validate({ params: Joi.object({ id: objectIdSchema.required() }) }),
  (req, res) => ctrl.deleteReview(req, res)
);

router.post(
  '/reviews/:reviewId/goals',
  requireRole(writeRoles),
  validate({
    params: Joi.object({ reviewId: objectIdSchema.required() }),
    body: Joi.object({
      description: Joi.string().required(),
      metric_target: Joi.string().allow('', null).optional(),
      due_date: Joi.date().optional()
    })
  }),
  (req, res) => ctrl.addGoal(req, res)
);
router.get(
  '/reviews/:reviewId/goals',
  requireRole(readRoles),
  validate({ params: Joi.object({ reviewId: objectIdSchema.required() }) }),
  (req, res) => ctrl.listGoals(req, res)
);

router.post(
  '/reviews/:reviewId/acknowledge',
  requireRole(readRoles),
  validate({
    params: Joi.object({ reviewId: objectIdSchema.required() }),
    body: Joi.object({ comments: Joi.string().allow('', null).optional() })
  }),
  (req, res) => ctrl.acknowledge(req, res)
);

router.get('/alerts', requireRole(readRoles), (req, res) => ctrl.listAlerts(req, res));
router.post(
  '/alerts',
  requireRole(writeRoles),
  validate({
    body: Joi.object({
      employee_id: objectIdSchema.required(),
      alert_type: Joi.string()
        .valid(
          'UNDERPERFORMANCE',
          'CONSISTENT_DELAYS',
          'LOW_SLA',
          'HIGH_PERFORMER',
          'IMPROVEMENT'
        )
        .required(),
      severity: Joi.string().valid('INFO', 'WARNING', 'CRITICAL').required(),
      title: Joi.string().required(),
      description: Joi.string().allow('', null).optional(),
      metric_name: Joi.string().required(),
      metric_value: Joi.number().required(),
      threshold_value: Joi.number().required(),
      action_required: Joi.boolean().optional()
    })
  }),
  (req, res) => ctrl.createAlert(req, res)
);
router.patch(
  '/alerts/:id/resolve',
  requireRole(writeRoles),
  validate({
    params: Joi.object({ id: objectIdSchema.required() }),
    body: Joi.object({ action_taken: Joi.string().allow('', null).optional() })
  }),
  (req, res) => ctrl.resolveAlert(req, res)
);

module.exports = router;
