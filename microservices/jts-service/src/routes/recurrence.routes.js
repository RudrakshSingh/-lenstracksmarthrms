const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/recurrence.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validate, Joi } = require('../middleware/validate.middleware');

const objectIdSchema = Joi.string().length(24).hex();

const createBody = Joi.object({
  name: Joi.string().trim().min(1).max(200).required(),
  frequency: Joi.string().valid('DAILY', 'WEEKLY', 'MONTHLY').required(),
  interval: Joi.number().integer().min(1).optional(),
  config: Joi.object().optional(),
  next_run_at: Joi.alternatives().try(Joi.date(), Joi.string()).optional(),
  is_active: Joi.boolean().optional(),
  task_template: Joi.object().optional()
});

const updateBody = Joi.object({
  name: Joi.string().trim().min(1).max(200).optional(),
  frequency: Joi.string().valid('DAILY', 'WEEKLY', 'MONTHLY').optional(),
  interval: Joi.number().integer().min(1).optional(),
  config: Joi.object().optional(),
  next_run_at: Joi.alternatives().try(Joi.date(), Joi.string()).allow(null).optional(),
  is_active: Joi.boolean().optional(),
  task_template: Joi.object().optional()
}).min(1);

router.use(authenticate);
router.use(
  requireRole(['MANAGER', 'STORE_MANAGER', 'CLUSTER_MANAGER', 'COUNTRY_OPS', 'TENANT_ADMIN', 'HOD'])
);

router.get(
  '/',
  validate({
    query: Joi.object({ active: Joi.string().optional() })
  }),
  (req, res) => ctrl.list(req, res)
);

router.post('/', validate({ body: createBody }), (req, res) => ctrl.create(req, res));

router.get('/:id', validate({ params: Joi.object({ id: objectIdSchema.required() }) }), (req, res) =>
  ctrl.getById(req, res)
);

router.patch(
  '/:id',
  validate({ params: Joi.object({ id: objectIdSchema.required() }), body: updateBody }),
  (req, res) => ctrl.update(req, res)
);

router.delete(
  '/:id',
  validate({ params: Joi.object({ id: objectIdSchema.required() }) }),
  (req, res) => ctrl.remove(req, res)
);

module.exports = router;
