const express = require('express');
const router = express.Router();
const selfTaskController = require('../controllers/selfTask.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate, Joi } = require('../middleware/validate.middleware');

const objectIdSchema = Joi.string().length(24).hex();

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

// Create self-task
router.post(
  '/',
  validate({ body: createSelfTaskSchema }),
  (req, res) => selfTaskController.createSelfTask(req, res)
);

module.exports = router;

