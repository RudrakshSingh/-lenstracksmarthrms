const express = require('express');
const router = express.Router({ mergeParams: true });
const ctrl = require('../controllers/subtask.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate, Joi } = require('../middleware/validate.middleware');
const { employeeRefSchema } = require('../validation/employeeRefSchema');

const objectIdSchema = Joi.string().length(24).hex();

router.use(authenticate);

router.get('/', (req, res) => ctrl.list(req, res));

router.post(
  '/',
  validate({
    body: Joi.object({
      title: Joi.string().trim().min(1).max(250).required(),
      description: Joi.string().allow('', null).optional(),
      assigned_to_employee_id: employeeRefSchema.optional(),
      due_at: Joi.alternatives().try(Joi.date(), Joi.string()).optional()
    })
  }),
  (req, res) => ctrl.create(req, res)
);

router.patch(
  '/:subtaskId/status',
  validate({
    params: Joi.object({ subtaskId: objectIdSchema.required() }),
    body: Joi.object({ status: Joi.string().valid('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED').required() })
  }),
  (req, res) => ctrl.updateStatus(req, res)
);

module.exports = router;

