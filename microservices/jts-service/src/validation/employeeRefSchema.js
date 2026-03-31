const Joi = require('joi');

/**
 * Body/query employee reference: Mongo ObjectId hex, HR `code`, email, or JSON number.
 * Controllers resolve via resolveEmployeeIdToObjectId — do not require 24-char hex at the edge.
 */
const employeeRefSchema = Joi.alternatives()
  .try(
    Joi.string().trim().min(1).max(254),
    Joi.number().integer().min(1).max(Number.MAX_SAFE_INTEGER)
  )
  .custom((v) => (typeof v === 'number' ? String(v) : v));

module.exports = { employeeRefSchema };
