const Role = require('../models/Role.model');
const { ALL_PERMISSION_CODES } = require('@etelios/shared/utils/permissionCatalog');
const { computeEffectiveSets } = require('@etelios/shared/utils/permissionCore');
const { getDefaultRolePermissions } = require('@etelios/shared/utils/defaultRolePermissions');
const {
  getRolePermissionsCached,
  setRolePermissionsCached,
  setUserEffectiveCached
} = require('./permissionCache');
const { compileShellRouteAndViewPermissions } = require('@etelios/shared/utils/shellRoutePermissions');

function normalizeRoleName(role) {
  if (!role) return 'employee';
  if (typeof role === 'object' && role.name) return String(role.name).toLowerCase().trim();
  return String(role).toLowerCase().trim();
}

async function loadRolePermissionBase(roleName) {
  const name = normalizeRoleName(roleName);
  if (name === 'superadmin' || name === 'admin') {
    return { rolePermissions: ALL_PERMISSION_CODES, usedFallback: false };
  }

  const cached = await getRolePermissionsCached(name);
  if (cached && Array.isArray(cached) && cached.length > 0) {
    return { rolePermissions: cached, usedFallback: false };
  }

  const roleDoc = await Role.findOne({ name });
  let rolePermissions = [];
  if (roleDoc && Array.isArray(roleDoc.permissions) && roleDoc.permissions.length > 0) {
    rolePermissions = [...roleDoc.permissions];
  } else {
    rolePermissions = Role.getDefaultPermissions(name) || [];
  }

  if (!rolePermissions.length) {
    rolePermissions = getDefaultRolePermissions('employee');
    await setRolePermissionsCached(name, rolePermissions);
    return { rolePermissions, usedFallback: true };
  }

  await setRolePermissionsCached(name, rolePermissions);
  return { rolePermissions, usedFallback: false };
}

/**
 * @param {import('mongoose').Document | object} userDoc
 */
async function resolveEffectivePermissionsForUser(userDoc) {
  const opts = arguments.length > 1 && arguments[1] ? arguments[1] : {};
  const { skipUserCacheWrite = false, rolePermissionsOverride = null } = opts;
  const roleName = normalizeRoleName(userDoc.role);
  const custom_permissions = userDoc.custom_permissions || [];
  const permission_denials = userDoc.permission_denials || [];
  const legacyUserPermissions = userDoc.permissions || [];
  const userId = userDoc._id;
  const revision = userDoc.permissionsRevision != null ? userDoc.permissionsRevision : 0;

  const loadedRole = rolePermissionsOverride == null
    ? await loadRolePermissionBase(roleName)
    : { rolePermissions: rolePermissionsOverride, usedFallback: false };
  const { rolePermissions, usedFallback } = loadedRole;

  const { effective } = computeEffectiveSets({
    rolePermissions,
    custom_permissions,
    permission_denials,
    legacyUserPermissions
  });

  const compiledEffective = compileShellRouteAndViewPermissions(effective, roleName);

  const result = {
    roleName,
    rolePermissions: [...new Set(rolePermissions)].sort(),
    custom_permissions: [...new Set(custom_permissions.map((p) => String(p).trim()))].filter(Boolean).sort(),
    permission_denials: [...new Set(permission_denials.map((p) => String(p).trim()))].filter(Boolean).sort(),
    legacyUserPermissions: [...new Set(legacyUserPermissions.map((p) => String(p).trim()))].filter(Boolean).sort(),
    effectivePermissions: compiledEffective,
    meta: { usedFallback, fromCache: false }
  };

  if (userId && !skipUserCacheWrite) {
    await setUserEffectiveCached(userId, revision, compiledEffective);
  }

  return result;
}

/**
 * Resolve effective permissions for a user list with role-level preloading.
 * Avoids N+1 role lookups and skips per-user cache writes for list endpoints.
 * @param {Array<object>} users
 */
async function resolveEffectivePermissionsForUsers(users = []) {
  const roleNames = [...new Set(users.map((u) => normalizeRoleName(u.role)).filter(Boolean))];
  const rolePermissionMap = new Map();
  const defaultEmployee = getDefaultRolePermissions('employee');

  // List endpoint path: avoid Redis dependency to prevent latency spikes when Redis is unavailable.
  const dbRoleNames = roleNames.filter((name) => !['superadmin', 'admin'].includes(name));
  let roleDocs = [];
  if (dbRoleNames.length > 0) {
    roleDocs = await Role.find({ name: { $in: dbRoleNames } }).select('name permissions').lean();
  }
  const roleDocMap = new Map(roleDocs.map((doc) => [String(doc.name).toLowerCase().trim(), doc]));

  roleNames.forEach((roleName) => {
    if (roleName === 'superadmin' || roleName === 'admin') {
      rolePermissionMap.set(roleName, ALL_PERMISSION_CODES);
      return;
    }
    const roleDoc = roleDocMap.get(roleName);
    if (roleDoc && Array.isArray(roleDoc.permissions) && roleDoc.permissions.length > 0) {
      rolePermissionMap.set(roleName, [...roleDoc.permissions]);
      return;
    }
    const modelDefaults = Role.getDefaultPermissions(roleName) || [];
    rolePermissionMap.set(roleName, modelDefaults.length > 0 ? modelDefaults : defaultEmployee);
  });

  return Promise.all(
    users.map((u) =>
      resolveEffectivePermissionsForUser(u, {
        skipUserCacheWrite: true,
        rolePermissionsOverride: rolePermissionMap.get(normalizeRoleName(u.role)) || []
      })
    )
  );
}

module.exports = {
  normalizeRoleName,
  computeEffectiveSets,
  loadRolePermissionBase,
  resolveEffectivePermissionsForUser,
  resolveEffectivePermissionsForUsers
};
