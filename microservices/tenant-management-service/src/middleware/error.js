const httpStatus = require('http-status');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');

const errorConverter = (err, req, res, next) => {
  let error = err;
  
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || httpStatus.INTERNAL_SERVER_ERROR;
    const message = error.message || httpStatus[statusCode];
    error = new ApiError(statusCode, message, false, err.stack);
  }
  
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = httpStatus[statusCode];
  }

  res.locals.errorMessage = err.message;

  const response = {
    success: false,
    error: {
      code: err.code || `ERROR_${statusCode}`,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  };

  logger.error(err);

  res.status(statusCode).json(response);
};

module.exports = {
  errorConverter,
  errorHandler
};

