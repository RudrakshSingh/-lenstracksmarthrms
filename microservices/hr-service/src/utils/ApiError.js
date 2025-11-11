const httpStatus = require('http-status');

class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '', errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errorCode = errorCode;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ApiError;
