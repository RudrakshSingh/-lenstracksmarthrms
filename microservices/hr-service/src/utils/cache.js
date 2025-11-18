/**
 * Cache utility for HR Service
 * Uses Redis if available, falls back to in-memory cache
 */

const { connectRedis } = require('../config/redis');
const logger = require('../config/logger');

let redis = null;
let memoryCache = new Map();

// Initialize Redis connection
const initCache = () => {
  try {
    redis = connectRedis();
    logger.info('Cache: Using Redis for caching');
  } catch (error) {
    logger.warn('Cache: Redis not available, using in-memory cache', { error: error.message });
    redis = null;
  }
};

/**
 * Get value from cache
 */
const get = async (key) => {
  try {
    if (redis) {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } else {
      const cached = memoryCache.get(key);
      if (cached && cached.expires > Date.now()) {
        return cached.value;
      }
      memoryCache.delete(key);
      return null;
    }
  } catch (error) {
    logger.error('Cache get error:', error);
    return null;
  }
};

/**
 * Set value in cache
 */
const set = async (key, value, ttl = 300) => {
  try {
    if (redis) {
      await redis.setex(key, ttl, JSON.stringify(value));
    } else {
      memoryCache.set(key, {
        value,
        expires: Date.now() + (ttl * 1000)
      });
      // Clean up expired entries periodically
      if (memoryCache.size > 1000) {
        const now = Date.now();
        for (const [k, v] of memoryCache.entries()) {
          if (v.expires <= now) {
            memoryCache.delete(k);
          }
        }
      }
    }
    return true;
  } catch (error) {
    logger.error('Cache set error:', error);
    return false;
  }
};

/**
 * Delete value from cache
 */
const del = async (key) => {
  try {
    if (redis) {
      await redis.del(key);
    } else {
      memoryCache.delete(key);
    }
    return true;
  } catch (error) {
    logger.error('Cache delete error:', error);
    return false;
  }
};

/**
 * Get or set pattern (cache-aside)
 */
const getOrSet = async (key, fetchFunction, ttl = 300) => {
  try {
    let value = await get(key);
    
    if (value === null) {
      value = await fetchFunction();
      if (value !== null && value !== undefined) {
        await set(key, value, ttl);
      }
    }
    
    return value;
  } catch (error) {
    // If cache fails, just fetch directly
    logger.warn('Cache getOrSet error, fetching directly:', error);
    return await fetchFunction();
  }
};

/**
 * Invalidate cache by pattern
 */
const invalidatePattern = async (pattern) => {
  try {
    if (redis) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } else {
      // For in-memory cache, iterate and delete matching keys
      for (const key of memoryCache.keys()) {
        if (key.includes(pattern.replace('*', ''))) {
          memoryCache.delete(key);
        }
      }
    }
    return true;
  } catch (error) {
    logger.error('Cache invalidatePattern error:', error);
    return false;
  }
};

// Initialize cache on module load
initCache();

module.exports = {
  get,
  set,
  del,
  getOrSet,
  invalidatePattern,
  initCache
};

