const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

const errorConverter = (err, req, res, next) => {
  let error = err;
  
  // If error is not an ApiError instance, convert it
  if (!(error instanceof ApiError)) {
    // Handle MongoDB duplicate key errors
    if (error.code === 11000 || error.name === 'MongoServerError') {
      const message = error.message || 'Duplicate key error';
      error = new ApiError(httpStatus.CONFLICT, message, true, err.stack, 'DUPLICATE_KEY');
    }
    // Handle Mongoose validation errors
    else if (error.name === 'ValidationError') {
      const message = error.message || 'Validation error';
      error = new ApiError(httpStatus.BAD_REQUEST, message, true, err.stack, 'VALIDATION_ERROR');
    }
    // Handle Mongoose Cast errors (invalid ObjectId, etc.)
    else if (error.name === 'CastError') {
      const message = `Invalid ${error.path || 'field'}: ${error.value || 'value'}`;
      error = new ApiError(httpStatus.BAD_REQUEST, message, true, err.stack, 'INVALID_INPUT');
    }
    // Handle generic errors
    else {
      // Extract status code from various possible sources
      let statusCode = error.statusCode || error.status || error.code;
      
      // Convert HTTP status code strings to numbers
      if (typeof statusCode === 'string') {
        const statusNum = parseInt(statusCode, 10);
        if (!isNaN(statusNum) && statusNum >= 100 && statusNum < 600) {
          statusCode = statusNum;
        } else {
          statusCode = httpStatus.INTERNAL_SERVER_ERROR;
        }
      }
      
      // Ensure statusCode is a valid number
      if (!statusCode || typeof statusCode !== 'number' || statusCode < 100 || statusCode >= 600) {
        statusCode = httpStatus.INTERNAL_SERVER_ERROR;
      }
      
      // Get error message
      const message = error.message || httpStatus[statusCode] || 'Internal Server Error';
      
      // Create ApiError instance
      error = new ApiError(statusCode, message, false, err.stack);
    }
  }
  
  // Ensure the error has a valid statusCode - double check
  if (!error.statusCode || typeof error.statusCode !== 'number' || !Number.isInteger(error.statusCode)) {
    error.statusCode = httpStatus.INTERNAL_SERVER_ERROR;
  }
  
  // Force statusCode to be a number
  error.statusCode = Number.parseInt(error.statusCode, 10) || httpStatus.INTERNAL_SERVER_ERROR;
  
  // Ensure it's within valid range
  if (error.statusCode < 100 || error.statusCode >= 600) {
    error.statusCode = httpStatus.INTERNAL_SERVER_ERROR;
  }
  
  next(error);
};

const errorHandler = (err, req, res, next) => {
  try {
    // Extract status code with multiple fallbacks - be very defensive
    let statusCode = err.statusCode || err.status || err.code;
    
    // If still undefined, use default
    if (statusCode === undefined || statusCode === null) {
      statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    }
    
    // Convert to number if it's a string
    if (typeof statusCode === 'string') {
      const statusNum = parseInt(statusCode, 10);
      if (!isNaN(statusNum) && statusNum >= 100 && statusNum < 600) {
        statusCode = statusNum;
      } else {
        statusCode = httpStatus.INTERNAL_SERVER_ERROR;
      }
    }
    
    // Force to integer
    statusCode = Number.parseInt(statusCode, 10);
    
    // Ensure statusCode is a valid HTTP status code
    if (isNaN(statusCode) || !Number.isInteger(statusCode) || statusCode < 100 || statusCode >= 600) {
      statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    }
    
    let message = err.message || httpStatus[statusCode] || 'Internal Server Error';
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isProduction = process.env.NODE_ENV === 'production';

    // In production, hide operational error details
    if (isProduction && !err.isOperational && statusCode >= 500) {
      message = 'An unexpected error occurred';
    }

    res.locals.errorMessage = err.message;

    // Log error details
    logger.error('Error Handler', {
      error: err.message,
      stack: err.stack,
      statusCode,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?._id || req.user?.id
    });

    // Map common errors to error codes as per frontend spec
    let errorCode = err.errorCode || err.code;
    if (!errorCode) {
      if (statusCode === 400) {
        errorCode = 'VALIDATION_ERROR';
      } else if (statusCode === 401) {
        if (message.includes('credential') || message.includes('password') || message.includes('email')) {
          errorCode = 'INVALID_CREDENTIALS';
        } else {
          errorCode = 'UNAUTHORIZED';
        }
      } else if (statusCode === 403) {
        errorCode = 'ACCOUNT_BLOCKED';
      } else if (statusCode === 429) {
        errorCode = 'RATE_LIMIT_EXCEEDED';
      } else if (statusCode === 500) {
        errorCode = 'INTERNAL_ERROR';
      }
    }

    const response = {
      success: false,
      ...(errorCode && { error: errorCode }),
      message: message,
      ...(isDevelopment && { 
        stack: err.stack,
        error: err.message 
      }),
      ...(isDevelopment && err.errors && { errors: err.errors }),
      timestamp: new Date().toISOString(),
      path: req.path
    };

    // Final validation - ensure statusCode is ALWAYS a valid integer
    // This is the last line of defense
    let finalStatusCode = httpStatus.INTERNAL_SERVER_ERROR; // Default fallback
    
    if (statusCode !== undefined && statusCode !== null) {
      const parsed = Number.parseInt(statusCode, 10);
      if (!isNaN(parsed) && Number.isInteger(parsed) && parsed >= 100 && parsed < 600) {
        finalStatusCode = parsed;
      }
    }
    
    // Log if we had to use fallback
    if (finalStatusCode === httpStatus.INTERNAL_SERVER_ERROR && statusCode !== httpStatus.INTERNAL_SERVER_ERROR) {
      logger.warn('Error handler: Using fallback status code', {
        originalStatusCode: statusCode,
        errorType: typeof statusCode,
        errorMessage: err.message,
        errorName: err.name,
        isApiError: err instanceof ApiError,
        errKeys: Object.keys(err)
      });
    }
    
    // Send response with validated status code - this MUST work
    res.status(finalStatusCode).json(response);
  } catch (handlerError) {
    // If error handler itself fails, send a basic 500 response
    logger.error('Error handler failed', { 
      handlerError: handlerError.message,
      originalError: err.message 
    });
    res.status(500).json({
      success: false,
      message: 'An internal server error occurred',
      timestamp: new Date().toISOString()
    });
  }
};

module.exports = {
  errorConverter,
  errorHandler
};
