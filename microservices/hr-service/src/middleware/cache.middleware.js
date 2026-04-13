/**
 * Simple in-memory cache middleware for API responses
 * Optimizes latency by caching frequently accessed endpoints
 */

const logger = require('../config/logger');

// Simple in-memory cache (can be replaced with Redis later)
const cache = new Map();
const CACHE_TTL = 30 * 1000; // 30 seconds cache
const MAX_CACHE_SIZE = 1000; // Max 1000 entries

/**
 * Generate cache key from request
 */
const getCacheKey = (req) => {
  const path = req.path;
  const query = JSON.stringify(req.query);
  const tenantId = req.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id') || 'default';
  return `${path}:${tenantId}:${query}`;
};

/**
 * Clean expired cache entries
 */
const cleanExpiredCache = () => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, value] of cache.entries()) {
    if (value.expiresAt < now) {
      cache.delete(key);
      cleaned++;
    }
  }
  
  // If cache is too large, remove oldest entries
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries())
      .sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    
    const toRemove = cache.size - MAX_CACHE_SIZE;
    for (let i = 0; i < toRemove; i++) {
      cache.delete(entries[i][0]);
    }
    cleaned += toRemove;
  }
  
  if (cleaned > 0) {
    logger.debug(`Cleaned ${cleaned} cache entries`);
  }
};

// Clean cache every 60 seconds
setInterval(cleanExpiredCache, 60000);

/**
 * Cache middleware - caches GET requests for specified duration
 * @param {number} ttl - Time to live in milliseconds (default: 30 seconds)
 */
const cacheMiddleware = (ttl = CACHE_TTL) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = getCacheKey(req);
    const cached = cache.get(cacheKey);

    // Check if cache is valid
    if (cached && cached.expiresAt > Date.now()) {
      logger.debug(`Cache hit: ${cacheKey}`);
      return res.status(cached.status).json(cached.data);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = function(data) {
      // Cache successful responses only
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(cacheKey, {
          data,
          status: res.statusCode,
          expiresAt: Date.now() + ttl
        });
        logger.debug(`Cached: ${cacheKey} (TTL: ${ttl}ms)`);
      }
      
      return originalJson(data);
    };

    next();
  };
};

/**
 * Clear cache for specific pattern
 */
const clearCache = (pattern) => {
  let cleared = 0;
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
      cleared++;
    }
  }
  logger.info(`Cleared ${cleared} cache entries matching pattern: ${pattern}`);
  return cleared;
};

/**
 * Clear all cache
 */
const clearAllCache = () => {
  const size = cache.size;
  cache.clear();
  logger.info(`Cleared all cache (${size} entries)`);
  return size;
};

module.exports = {
  cacheMiddleware,
  clearCache,
  clearAllCache,
  getCacheStats: () => ({
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
    ttl: CACHE_TTL
  })
};
