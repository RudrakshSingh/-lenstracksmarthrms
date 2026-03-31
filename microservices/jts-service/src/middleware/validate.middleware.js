const Joi = require('joi');
const { buildErrorBody } = require('../utils/apiError.util');

const validate = (schemas = {}) => (req, res, next) => {
  const options = {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  };

  const errorDetails = [];

  if (schemas.params) {
    const { error, value } = schemas.params.validate(req.params, options);
    if (error) errorDetails.push(...error.details.map((detail) => detail.message));
    else req.params = value;
  }

  if (schemas.query) {
    const { error, value } = schemas.query.validate(req.query, options);
    if (error) errorDetails.push(...error.details.map((detail) => detail.message));
    else req.query = value;
  }

  if (schemas.body) {
    const { error, value } = schemas.body.validate(req.body, options);
    if (error) errorDetails.push(...error.details.map((detail) => detail.message));
    else req.body = value;
  }

  if (errorDetails.length) {
    return res
      .status(400)
      .json(buildErrorBody({ code: 'VALIDATION_ERROR', details: errorDetails }));
  }

  return next();
};

module.exports = { validate, Joi };
