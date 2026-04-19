const Joi = require('joi');

const startRunBody = Joi.object({
  month: Joi.number().integer().min(1).max(12).required(),
  year: Joi.number().integer().min(2000).max(2100).required(),
  dryRun: Joi.boolean().default(false),
  idempotencyKey: Joi.string().max(200).allow('', null)
});

const initiateCycleBody = Joi.object({
  month: Joi.number().integer().min(1).max(12).required(),
  year: Joi.number().integer().min(2000).max(2100).required(),
  company_id: Joi.string().allow(null, ''),
  brand_id: Joi.string().allow(null, ''),
  branch_id: Joi.string().allow(null, ''),
  department_id: Joi.string().allow(null, '')
});

const financeDecisionBody = Joi.object({
  decision: Joi.string().valid('approve', 'reject').required(),
  comment: Joi.string().allow('', null).max(2000),
  expectedVersion: Joi.number().integer().min(0).allow(null),
  version: Joi.number().integer().min(0).allow(null)
});

const freezeBody = Joi.object({
  confirmation: Joi.string().allow('', null),
  expectedVersion: Joi.number().integer().min(0).allow(null),
  version: Joi.number().integer().min(0).allow(null)
});

const hrSubmitBody = Joi.object({
  expectedVersion: Joi.number().integer().min(0).allow(null),
  version: Joi.number().integer().min(0).allow(null)
});

const postBody = Joi.object({
  store_id: Joi.string().allow(null, ''),
  payment_method: Joi.string().default('BANK_TRANSFER'),
  expectedVersion: Joi.number().integer().min(0).allow(null),
  version: Joi.number().integer().min(0).allow(null)
});

const unlockBody = Joi.object({
  reason: Joi.string().max(500).allow('', null)
});

function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: error.details.map((d) => d.message).join('; ')
      });
    }
    req.body = value;
    return next();
  };
}

module.exports = {
  startRunBody,
  initiateCycleBody,
  financeDecisionBody,
  freezeBody,
  hrSubmitBody,
  postBody,
  unlockBody,
  validateBody
};
