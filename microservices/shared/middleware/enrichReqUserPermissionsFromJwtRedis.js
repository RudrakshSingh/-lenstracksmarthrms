const { resolvePermissionsFromJwtOrRedis } = require('../utils/resolvePermissionsFromJwtOrRedis');

/**
 * After req.user exists, set permissions from Redis (userId+permRev) or JWT claim.
 * @param {import('express').Request} req
 * @param {object} decoded - verified JWT payload
 * @param {() => import('ioredis') | null | undefined} getRedis - use () => null if service has no Redis client
 * @param {{ debug?: (msg: string, meta?: object) => void }} logger
 */
async function enrichReqUserPermissionsFromJwtRedis(req, decoded, getRedis, logger = {}) {
  if (!req?.user || !decoded) return;
  try {
    const layer = await resolvePermissionsFromJwtOrRedis(decoded, getRedis, logger);
    if (layer.source !== 'none') {
      req.user.permissions = layer.permissions;
    }
  } catch (e) {
    if (typeof logger.debug === 'function') {
      logger.debug('enrichReqUserPermissionsFromJwtRedis skipped', { error: e.message });
    }
  }
}

module.exports = { enrichReqUserPermissionsFromJwtRedis };
