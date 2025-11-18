/**
 * Cache utility for Auth Service
 * Uses Redis if available, falls back to in-memory cache
 */

const logger = require('../config/logger');

let redis = null;
let memoryCache = new Map();

// Try to use Redis if available
try {
  const Redis = require('ioredis');
  const redisOptions = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    db: parseInt(process.env.REDIS_DB) || 0,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    connectTimeout: 5000,
    commandTimeout: 3000
  };
  
  if (process.env.REDIS_PASSWORD) {
    redisOptions.password = process.env.REDIS_PASSWORD;
  }
  
  redis = new Redis(redisOptions);
  redis.on('error', () => {
    redis = null; // Fallback to memory cache
  });
  logger.info('Cache: Using Redis for caching');
} catch (error) {
  logger.warn('Cache: Redis not available, using in-memory cache');
  redis = null;
}

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
    }
    return true;
  } catch (error) {
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
    return await fetchFunction();
  }
};

module.exports = {
  get,
  set,
  del,
  getOrSet
};

