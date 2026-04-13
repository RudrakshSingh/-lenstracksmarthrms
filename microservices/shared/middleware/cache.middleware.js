/**
 * Simple in-memory cache middleware for API responses
 * Reduces database queries for frequently accessed data
 */

const cache = new Map();
const DEFAULT_TTL = 60 * 1000; // 60 seconds

const cacheMiddleware = (ttl = DEFAULT_TTL) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `${req.originalUrl}:${req.headers['x-tenant-id'] || 'default'}`;
    const cached = cache.get(key);

    if (cached && Date.now() < cached.expiry) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached.data);
    }

    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json to cache response
    res.json = function(data) {
      cache.set(key, {
        data: data,
        expiry: Date.now() + ttl
      });
      
      // Clean old cache entries (simple cleanup)
      if (cache.size > 1000) {
        const now = Date.now();
        for (const [k, v] of cache.entries()) {
          if (now >= v.expiry) {
            cache.delete(k);
          }
        }
      }
      
      res.setHeader('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  };
};

// Clear cache for specific key pattern
const clearCache = (pattern) => {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
};

module.exports = { cacheMiddleware, clearCache };
