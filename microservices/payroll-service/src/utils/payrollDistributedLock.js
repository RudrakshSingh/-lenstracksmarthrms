const { connectRedis } = require('../config/redis');
const logger = require('../config/logger');

const PREFIX = 'payroll:lock:';

/**
 * Acquire a distributed lock (Redis SET NX EX). Returns release function or null if not acquired.
 */
async function acquirePayrollLock(key, ttlSeconds = 900) {
  if (process.env.PAYROLL_DISTRIBUTED_LOCK === 'false') {
    return async () => {};
  }
  try {
    const redis = connectRedis();
    const fullKey = `${PREFIX}${key}`;
    const ok = await redis.set(fullKey, '1', 'EX', ttlSeconds, 'NX');
    if (ok !== 'OK') {
      return null;
    }
    let released = false;
    return async function release() {
      if (released) return;
      released = true;
      try {
        await redis.del(fullKey);
      } catch (e) {
        logger.warn('payroll lock release failed', { key: fullKey, message: e.message });
      }
    };
  } catch (e) {
    logger.warn('payroll lock acquire failed', { message: e.message });
    return null;
  }
}

module.exports = { acquirePayrollLock, PREFIX };
