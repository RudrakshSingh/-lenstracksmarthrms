/**
 * Response caching middleware
 * Caches GET request responses for specified TTL
 */

const cache = require('../utils/cache');
const logger = require('../config/logger');

/**
 * Cache middleware factory
 * @param {number} ttl - Time to live in seconds
 * @param {Function} keyGenerator - Optional function to generate cache key
 */
const cacheMiddleware = (ttl = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching for authenticated user-specific endpoints
    if (req.path.includes('/profile') || req.path.includes('/me')) {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator 
        ? keyGenerator(req)
        : `cache:${req.method}:${req.originalUrl}:${req.user?.id || 'anonymous'}`;

      // Try to get from cache
      const cached = await cache.get(cacheKey);
      if (cached !== null) {
        logger.debug(`Cache hit: ${cacheKey}`);
        return res.status(200).json(cached);
      }

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = function(data) {
        // Cache successful responses
        if (res.statusCode === 200 && data) {
          cache.set(cacheKey, data, ttl).catch(err => {
            logger.warn('Cache set failed:', err);
          });
        }
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next(); // Continue even if cache fails
    }
  };
};

/**
 * Invalidate cache by pattern
 */
const invalidateCache = async (pattern) => {
  try {
    await cache.invalidatePattern(pattern);
  } catch (error) {
    logger.error('Cache invalidation error:', error);
  }
};

module.exports = {
  cacheMiddleware,
  invalidateCache
};

