const ApiError = require('./ApiError');
const logger = require('../config/logger');

/**
 * Wraps async route handlers to automatically catch errors
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      // Log error details
      logger.error('Async handler error', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        userId: req.user?.id || req.user?._id,
        body: req.body,
        params: req.params,
        query: req.query
      });

      // If error is already an ApiError, pass it along
      if (error instanceof ApiError) {
        return next(error);
      }

      // If error has statusCode, convert to ApiError
      if (error.statusCode || error.status) {
        const statusCode = error.statusCode || error.status;
        const apiError = new ApiError(statusCode, error.message, true, error.stack);
        return next(apiError);
      }

      // Handle Mongoose validation errors
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message).join(', ');
        const apiError = new ApiError(400, `Validation Error: ${messages}`, true, error.stack);
        return next(apiError);
      }

      // Handle Mongoose cast errors (invalid ObjectId)
      if (error.name === 'CastError') {
        const apiError = new ApiError(400, `Invalid ID format: ${error.value}`, true, error.stack);
        return next(apiError);
      }

      // Handle duplicate key errors
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0];
        const apiError = new ApiError(409, `${field} already exists`, true, error.stack);
        return next(apiError);
      }

      // Default to 500 error
      const apiError = new ApiError(500, error.message || 'Internal Server Error', false, error.stack);
      return next(apiError);
    });
  };
};

module.exports = asyncHandler;

