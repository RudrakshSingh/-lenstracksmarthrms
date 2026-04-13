/**
 * Query Optimizer Utility
 * 
 * Provides utilities for optimizing database queries:
 * 1. Query result caching
 * 2. Query batching
 * 3. Index hints
 * 4. Query projection optimization
 * 5. Aggregation pipeline optimization
 */

const logger = require('../config/logger');

/**
 * Optimize query with best practices
 */
const optimizeQuery = (query, options = {}) => {
  const {
    timeout = 5000,
    lean = true, // Use lean() for read-only queries (faster)
    limit = 100, // Default limit to prevent large result sets
    select = null, // Project only needed fields
    sort = null, // Add sort for consistent results
    hint = null // Use specific index
  } = options;

  // Apply optimizations
  if (lean) {
    query.lean();
  }

  if (limit) {
    query.limit(limit);
  }

  if (select) {
    query.select(select);
  }

  if (sort) {
    query.sort(sort);
  }

  if (hint) {
    query.hint(hint);
  }

  // Add timeout
  query.maxTimeMS(timeout);

  return query;
};

/**
 * Batch queries for better performance
 */
const batchQueries = async (queries, batchSize = 10) => {
  const results = [];
  
  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(q => q()));
    results.push(...batchResults);
  }
  
  return results;
};

/**
 * Create optimized aggregation pipeline
 */
const createOptimizedAggregation = (pipeline, options = {}) => {
  const {
    allowDiskUse = true, // Allow disk use for large aggregations
    cursor = { batchSize: 1000 } // Use cursor for large results
  } = options;

  return {
    pipeline,
    options: {
      allowDiskUse,
      cursor
    }
  };
};

/**
 * Optimize find query with common patterns
 */
const optimizeFind = (model, filter = {}, options = {}) => {
  const {
    fields = null, // Fields to select
    limit = 100,
    skip = 0,
    sort = null,
    lean = true,
    timeout = 5000
  } = options;

  let query = model.find(filter);

  if (fields) {
    query = query.select(fields);
  }

  if (sort) {
    query = query.sort(sort);
  }

  if (skip) {
    query = query.skip(skip);
  }

  query = query.limit(limit);

  if (lean) {
    query = query.lean();
  }

  query = query.maxTimeMS(timeout);

  return query;
};

/**
 * Optimize count query
 */
const optimizeCount = (model, filter = {}, options = {}) => {
  const { timeout = 5000 } = options;
  return model.countDocuments(filter).maxTimeMS(timeout);
};

/**
 * Create index hint based on query pattern
 */
const getIndexHint = (filter, sort = {}) => {
  // Analyze filter and sort to suggest best index
  const filterKeys = Object.keys(filter);
  const sortKeys = Object.keys(sort);
  
  // Combine filter and sort keys for compound index hint
  const hintKeys = [...filterKeys, ...sortKeys];
  
  if (hintKeys.length > 0) {
    const hint = {};
    hintKeys.forEach(key => {
      hint[key] = 1;
    });
    return hint;
  }
  
  return null;
};

/**
 * Optimize populate queries
 */
const optimizePopulate = (query, populateOptions) => {
  if (!populateOptions || populateOptions.length === 0) {
    return query;
  }

  // Optimize each populate
  const optimizedPopulates = populateOptions.map(option => {
    if (typeof option === 'string') {
      return {
        path: option,
        select: null, // Select all fields
        lean: true // Use lean for populated documents
      };
    }
    
    return {
      ...option,
      lean: option.lean !== false // Default to lean
    };
  });

  return query.populate(optimizedPopulates);
};

module.exports = {
  optimizeQuery,
  batchQueries,
  createOptimizedAggregation,
  optimizeFind,
  optimizeCount,
  getIndexHint,
  optimizePopulate
};
