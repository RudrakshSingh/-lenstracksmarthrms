const NodeCache = require('node-cache');
const logger = require('../config/logger');

// Employee cache with 15 minute TTL (increased for better performance)
const employeeCache = new NodeCache({ 
  stdTTL: 900, // 15 minutes (increased from 5 minutes)
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false, // Better performance
  maxKeys: 1000 // Limit cache size to prevent memory issues
});

// Store cache with 10 minute TTL (stores change less frequently)
const storeCache = new NodeCache({ 
  stdTTL: 600, // 10 minutes
  checkperiod: 120,
  useClones: false
});

/**
 * Get employee from cache or return null
 */
const getCachedEmployee = (employeeId, tenantId = 'default') => {
  const cacheKey = `emp_${tenantId}_${employeeId}`;
  const cached = employeeCache.get(cacheKey);
  
  if (cached) {
    logger.debug('Employee cache hit', { employeeId, tenantId });
    return cached;
  }
  
  return null;
};

/**
 * Cache employee data
 */
const cacheEmployee = (employee, tenantId = 'default') => {
  if (!employee || !employee.employeeId) return;
  
  const cacheKey = `emp_${tenantId}_${employee.employeeId}`;
  employeeCache.set(cacheKey, employee);
  
  // Also cache by MongoDB _id for faster lookups
  if (employee._id) {
    const idCacheKey = `emp_id_${tenantId}_${employee._id}`;
    employeeCache.set(idCacheKey, employee);
  }
  
  logger.debug('Employee cached', { 
    employeeId: employee.employeeId, 
    tenantId,
    cacheKey 
  });
};

/**
 * Get store from cache
 */
const getCachedStore = (storeId, tenantId = 'default') => {
  const cacheKey = `store_${tenantId}_${storeId}`;
  const cached = storeCache.get(cacheKey);
  
  if (cached) {
    logger.debug('Store cache hit', { storeId, tenantId });
    return cached;
  }
  
  return null;
};

/**
 * Cache store data
 */
const cacheStore = (store, tenantId = 'default') => {
  if (!store || !store._id) return;
  
  const cacheKey = `store_${tenantId}_${store._id}`;
  storeCache.set(cacheKey, store);
  
  // Also cache by code
  if (store.code) {
    const codeCacheKey = `store_code_${tenantId}_${store.code}`;
    storeCache.set(codeCacheKey, store);
  }
  
  logger.debug('Store cached', { 
    storeId: store._id, 
    code: store.code,
    tenantId 
  });
};

/**
 * Clear employee cache (useful for updates)
 */
const clearEmployeeCache = (employeeId, tenantId = 'default') => {
  const cacheKey = `emp_${tenantId}_${employeeId}`;
  employeeCache.del(cacheKey);
  logger.debug('Employee cache cleared', { employeeId, tenantId });
};

/**
 * Get cache statistics
 */
const getCacheStats = () => {
  return {
    employees: {
      keys: employeeCache.keys().length,
      hits: employeeCache.getStats().hits,
      misses: employeeCache.getStats().misses,
      hitRate: employeeCache.getStats().hits / (employeeCache.getStats().hits + employeeCache.getStats().misses) || 0
    },
    stores: {
      keys: storeCache.keys().length,
      hits: storeCache.getStats().hits,
      misses: storeCache.getStats().misses,
      hitRate: storeCache.getStats().hits / (storeCache.getStats().hits + storeCache.getStats().misses) || 0
    }
  };
};

module.exports = {
  employeeCache, // Export cache instance for direct access
  storeCache, // Export store cache instance
  getCachedEmployee,
  cacheEmployee,
  getCachedStore,
  cacheStore,
  clearEmployeeCache,
  getCacheStats
};