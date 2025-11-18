const Joi = require('joi');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const validateRequest = (schema) => {
  return (req, res, next) => {
    const validSchema = pick(schema, ['params', 'query', 'body']);
    const object = pick(req, Object.keys(validSchema));
    const { value, error } = Joi.compile(validSchema)
      .prefs({ errors: { label: 'key' }, abortEarly: false })
      .validate(object);

    if (error) {
      const errorMessage = error.details.map((details) => details.message).join(', ');
      const validationError = new ApiError(httpStatus.BAD_REQUEST, errorMessage);
      validationError.statusCode = httpStatus.BAD_REQUEST;
      validationError.errorCode = 'VALIDATION_ERROR';
      return next(validationError);
    }
    Object.assign(req, value);
    return next();
  };
};

const pick = (object, keys) => {
  return keys.reduce((obj, key) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key)) {
      obj[key] = object[key];
    }
    return obj;
  }, {});
};

module.exports = { validateRequest };

