const { userEffectiveKey } = require('./permissionCacheKeys');

/**
 * Same layering as attendance-service: Redis key (userId + permRev), then JWT permissions[].
 * @param {object} decoded - Verified access token payload
 * @param {() => import('ioredis') | null | undefined} getRedis - Returns Redis client with .get or null
 * @param {{ debug?: (msg: string, meta?: object) => void }} log
 * @returns {Promise<{ permissions: string[], source: 'redis' | 'jwt' | 'none' }>}
 */
async function resolvePermissionsFromJwtOrRedis(decoded, getRedis, log = {}) {
  const uid = decoded && (decoded.userId || decoded.id || decoded.sub);
  const empty = { permissions: [], source: 'none' };
  if (!uid || String(uid).startsWith('mock_')) return empty;

  try {
    const r = typeof getRedis === 'function' ? getRedis() : null;
    if (r && typeof r.get === 'function') {
      const permRev = decoded.permRev != null ? decoded.permRev : 0;
      const raw = await r.get(userEffectiveKey(uid, permRev));
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          return { permissions: list, source: 'redis' };
        }
      }
    }
  } catch (e) {
    if (log.debug) log.debug('resolvePermissionsFromJwtOrRedis: redis', { error: e.message });
  }

  if (Array.isArray(decoded.permissions)) {
    return { permissions: decoded.permissions, source: 'jwt' };
  }

  return empty;
}

module.exports = { resolvePermissionsFromJwtOrRedis };
