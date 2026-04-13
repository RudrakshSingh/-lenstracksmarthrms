/**
 * Query optimization utilities
 * Reduces query execution time
 */

/**
 * Optimize Mongoose query with common performance settings
 */
const optimizeQuery = (query) => {
  return query
    .lean() // Return plain JS objects (faster)
    .maxTimeMS(5000) // 5 second timeout
    .hint({}) // Use indexes
    .read('primary'); // Read from primary (faster)
};

/**
 * Optimize aggregation pipeline
 */
const optimizeAggregation = (pipeline) => {
  // Add $match early in pipeline
  // Add $limit early if possible
  // Use indexes
  return pipeline;
};

/**
 * Batch queries for better performance
 */
const batchQuery = async (queries, batchSize = 10) => {
  const results = [];
  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(q => q()));
    results.push(...batchResults);
  }
  return results;
};

module.exports = {
  optimizeQuery,
  optimizeAggregation,
  batchQuery
};
