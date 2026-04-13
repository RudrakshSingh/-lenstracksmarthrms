const Role = require('../models/Role.model');
const { ALL_PERMISSION_CODES } = require('@etelios/shared/utils/permissionCatalog');
const { computeEffectiveSets } = require('@etelios/shared/utils/permissionCore');
const { getDefaultRolePermissions } = require('@etelios/shared/utils/defaultRolePermissions');
const {
  getRolePermissionsCached,
  setRolePermissionsCached,
  setUserEffectiveCached
} = require('./permissionCache');

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
  const roleName = normalizeRoleName(userDoc.role);
  const custom_permissions = userDoc.custom_permissions || [];
  const permission_denials = userDoc.permission_denials || [];
  const legacyUserPermissions = userDoc.permissions || [];
  const userId = userDoc._id;
  const revision = userDoc.permissionsRevision != null ? userDoc.permissionsRevision : 0;

  const { rolePermissions, usedFallback } = await loadRolePermissionBase(roleName);

  const { effective } = computeEffectiveSets({
    rolePermissions,
    custom_permissions,
    permission_denials,
    legacyUserPermissions
  });

  const result = {
    roleName,
    rolePermissions: [...new Set(rolePermissions)].sort(),
    custom_permissions: [...new Set(custom_permissions.map((p) => String(p).trim()))].filter(Boolean).sort(),
    permission_denials: [...new Set(permission_denials.map((p) => String(p).trim()))].filter(Boolean).sort(),
    legacyUserPermissions: [...new Set(legacyUserPermissions.map((p) => String(p).trim()))].filter(Boolean).sort(),
    effectivePermissions: effective,
    meta: { usedFallback, fromCache: false }
  };

  if (userId) {
    await setUserEffectiveCached(userId, revision, effective);
  }

  return result;
}

module.exports = {
  normalizeRoleName,
  computeEffectiveSets,
  loadRolePermissionBase,
  resolveEffectivePermissionsForUser
};
