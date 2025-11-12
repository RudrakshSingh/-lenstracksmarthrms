const Joi = require('joi');
const logger = require('../config/logger');

/**
 * Wrapper function to create validation middleware with Joi schemas
 * @param {object} schema - Joi schema with optional .body, .params, .query properties
 * @returns {function} Express middleware function
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    const validationOptions = {
      abortEarly: false, // Include all errors
      allowUnknown: true, // Allow unknown keys that are not in the schema
      stripUnknown: true, // Remove unknown keys
    };

    const errors = {};

    // Validate req.params
    if (schema.params) {
      const { error, value } = schema.params.validate(req.params, validationOptions);
      if (error) {
        errors.params = error.details.map(detail => detail.message);
      } else {
        req.params = value;
      }
    }

    // Validate req.query
    if (schema.query) {
      const { error, value } = schema.query.validate(req.query, validationOptions);
      if (error) {
        errors.query = error.details.map(detail => detail.message);
      } else {
        req.query = value;
      }
    }

    // Validate req.body
    if (schema.body) {
      const { error, value } = schema.body.validate(req.body, validationOptions);
      if (error) {
        errors.body = error.details.map(detail => detail.message);
      } else {
        req.body = value;
      }
    }

      if (Object.keys(errors).length > 0) {
        const ApiError = require('../utils/ApiError');
        const httpStatus = require('http-status');

        const errorMessages = Object.values(errors).flat().join(', ');
        const validationError = new ApiError(httpStatus.BAD_REQUEST, `Validation failed: ${errorMessages}`);
        validationError.errors = errors;
        validationError.statusCode = httpStatus.BAD_REQUEST; // Ensure statusCode is set
        validationError.errorCode = 'VALIDATION_ERROR'; // Add error code

        logger.warn('Request validation failed', {
          errors,
          path: req.originalUrl,
          method: req.method,
          userId: req.user?.id
        });

        return next(validationError);
      }

    next();
  };
};

/**
 * Common validation schemas that can be reused
 */
const commonSchemas = {
  // ObjectId validation
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  
  // Pagination
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().default('-created_at'),
    order: Joi.string().valid('asc', 'desc').default('desc')
  },

  // Date range
  dateRange: {
    start_date: Joi.date().iso(),
    end_date: Joi.date().iso().min(Joi.ref('start_date'))
  },

  // Search
  search: {
    search: Joi.string().min(1).max(100),
    filters: Joi.object()
  },

  // File upload
  fileUpload: {
    fileType: Joi.string().valid('image', 'document', 'all').default('all'),
    description: Joi.string().max(500)
  }
};

/**
 * Helper function to create validation schemas for common operations
 */
const createValidationSchemas = {
  // Get by ID
  getById: (idParam = 'id') => ({
    params: Joi.object({
      [idParam]: commonSchemas.objectId
    })
  }),

  // Pagination
  pagination: (additionalQuery = {}) => ({
    query: Joi.object({
      ...commonSchemas.pagination,
      ...additionalQuery
    })
  }),

  // Search with pagination
  search: (additionalQuery = {}) => ({
    query: Joi.object({
      ...commonSchemas.pagination,
      ...commonSchemas.search,
      ...additionalQuery
    })
  }),

  // Date range with pagination
  dateRange: (additionalQuery = {}) => ({
    query: Joi.object({
      ...commonSchemas.pagination,
      ...commonSchemas.dateRange,
      ...additionalQuery
    })
  }),

  // Create/Update with body validation
  createUpdate: (bodySchema, additionalParams = {}, additionalQuery = {}) => ({
    body: bodySchema,
    params: Joi.object(additionalParams),
    query: Joi.object(additionalQuery)
  }),

  // File upload
  fileUpload: (additionalBody = {}) => ({
    body: Joi.object({
      ...commonSchemas.fileUpload,
      ...additionalBody
    })
  })
};

module.exports = {
  validateRequest,
  commonSchemas,
  createValidationSchemas
};