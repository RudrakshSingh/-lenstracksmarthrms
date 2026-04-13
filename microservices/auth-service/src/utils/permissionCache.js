const { connectRedis } = require('../config/redis');
const logger = require('../config/logger');
const { userEffectiveKey, userEffectivePattern, rolePermsKey } = require('@etelios/shared/utils/permissionCacheKeys');

const ROLE_TTL_SEC = parseInt(process.env.PERMISSION_ROLE_CACHE_TTL_SEC, 10) || 600;
const USER_TTL_SEC = parseInt(process.env.PERMISSION_USER_CACHE_TTL_SEC, 10) || 900;

function getRedis() {
  try {
    return connectRedis();
  } catch (e) {
    return null;
  }
}

async function getRolePermissionsCached(roleName) {
  const r = getRedis();
  if (!r) return null;
  try {
    const raw = await r.get(rolePermsKey(roleName));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    logger.warn('permissionCache getRole failed', { error: e.message });
    return null;
  }
}

async function setRolePermissionsCached(roleName, permissionsArray) {
  const r = getRedis();
  if (!r) return;
  try {
    await r.setex(rolePermsKey(roleName), ROLE_TTL_SEC, JSON.stringify(permissionsArray));
  } catch (e) {
    logger.warn('permissionCache setRole failed', { error: e.message });
  }
}

async function getUserEffectiveCached(userId, revision) {
  const r = getRedis();
  if (!r) return null;
  try {
    const raw = await r.get(userEffectiveKey(userId, revision));
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

async function setUserEffectiveCached(userId, revision, effectivePermissions) {
  const r = getRedis();
  if (!r) return;
  try {
    await r.setex(
      userEffectiveKey(userId, revision),
      USER_TTL_SEC,
      JSON.stringify(effectivePermissions)
    );
  } catch (e) {
    logger.warn('permissionCache setUserEffective failed', { error: e.message });
  }
}

async function invalidateUserPermissionCache(userId) {
  const r = getRedis();
  if (!r) return;
  try {
    const pat = userEffectivePattern(userId);
    const keys = await r.keys(pat);
    if (keys.length > 0) await r.del(...keys);
  } catch (e) {
    logger.warn('permissionCache invalidate user failed', { error: e.message });
  }
}

async function invalidateRolePermissionCache(roleName) {
  const r = getRedis();
  if (!r) return;
  try {
    await r.del(rolePermsKey(roleName));
  } catch (e) {
    logger.warn('permissionCache invalidate role failed', { error: e.message });
  }
}

module.exports = {
  getRolePermissionsCached,
  setRolePermissionsCached,
  getUserEffectiveCached,
  setUserEffectiveCached,
  invalidateUserPermissionCache,
  invalidateRolePermissionCache
};
