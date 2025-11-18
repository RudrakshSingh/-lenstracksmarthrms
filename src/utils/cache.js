/**
 * Cache utility for API Gateway
 * Uses in-memory cache with TTL for service status and frequently accessed data
 */

const NodeCache = require('node-cache');

// Create cache instance with default TTL of 5 minutes
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false, // Don't clone values for better performance
  maxKeys: 1000 // Maximum number of keys
});

/**
 * Get value from cache
 */
const get = (key) => {
  try {
    return cache.get(key);
  } catch (error) {
    return undefined;
  }
};

/**
 * Set value in cache
 */
const set = (key, value, ttl = 300) => {
  try {
    return cache.set(key, value, ttl);
  } catch (error) {
    return false;
  }
};

/**
 * Delete value from cache
 */
const del = (key) => {
  try {
    return cache.del(key);
  } catch (error) {
    return false;
  }
};

/**
 * Get or set pattern (cache-aside)
 */
const getOrSet = async (key, fetchFunction, ttl = 300) => {
  try {
    let value = get(key);
    
    if (value === undefined) {
      value = await fetchFunction();
      if (value !== null && value !== undefined) {
        set(key, value, ttl);
      }
    }
    
    return value;
  } catch (error) {
    // If cache fails, just fetch directly
    return await fetchFunction();
  }
};

/**
 * Clear all cache
 */
const flush = () => {
  cache.flushAll();
};

/**
 * Get cache stats
 */
const getStats = () => {
  return cache.getStats();
};

module.exports = {
  get,
  set,
  del,
  getOrSet,
  flush,
  getStats
};

