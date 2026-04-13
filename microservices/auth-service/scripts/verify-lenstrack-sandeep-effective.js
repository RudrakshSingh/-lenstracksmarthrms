#!/usr/bin/env node
/**
 * Pure DB + catalog check (no Redis). Same merge as permissionCore: role ∪ custom ∪ legacy \ deny.
 */
const mongoose = require('mongoose');
const User = require('../src/models/User.model');
const Role = require('../src/models/Role.model');
const { computeEffectiveSets } = require('@etelios/shared/utils/permissionCore');
const { getDefaultRolePermissions } = require('@etelios/shared/utils/defaultRolePermissions');
const { ALL_PERMISSION_CODES } = require('@etelios/shared/utils/permissionCatalog');

const EMAIL = (process.env.SANDEEP_EMAIL || 'sandeep@lenstrack.com').toLowerCase().trim();
const TENANT = (process.env.TENANT_ID || 'lenstrack').toLowerCase().trim();

const NEAR_ADMIN_EXCLUDE = new Set([
  'system_admin',
  'backup_restore',
  'audit_logs',
  'write_roles',
  'create_roles',
  'update_roles',
  'delete_users'
]);

function normalizeRoleName(role) {
  if (!role) return 'employee';
  if (typeof role === 'object' && role.name) return String(role.name).toLowerCase().trim();
  return String(role).toLowerCase().trim();
}

async function loadRolePermissionBase(roleName) {
  const name = normalizeRoleName(roleName);
  if (name === 'superadmin' || name === 'admin') {
    return { rolePermissions: [...ALL_PERMISSION_CODES] };
  }
  const roleDoc = await Role.findOne({ name });
  if (roleDoc && Array.isArray(roleDoc.permissions) && roleDoc.permissions.length > 0) {
    return { rolePermissions: [...roleDoc.permissions] };
  }
  const d = Role.getDefaultPermissions ? Role.getDefaultPermissions(name) : null;
  if (d && d.length) return { rolePermissions: d };
  return { rolePermissions: getDefaultRolePermissions(name) };
}

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('No MONGODB_URI');
    process.exit(1);
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });
  const u = await User.findOne({ tenantId: TENANT, email: EMAIL, isDeleted: { $ne: true } });
  if (!u) {
    console.error('User not found');
    process.exit(1);
  }
  const { rolePermissions } = await loadRolePermissionBase(u.role);
  const { effective } = computeEffectiveSets({
    rolePermissions,
    custom_permissions: u.custom_permissions || [],
    permission_denials: u.permission_denials || [],
    legacyUserPermissions: u.permissions || []
  });
  const eff = new Set(effective);
  const missing = [...NEAR_ADMIN_EXCLUDE].filter((x) => eff.has(x));
  const inCatalogNotEff = ALL_PERMISSION_CODES.filter((c) => !eff.has(c));

  console.log('User:', u.name, '| role:', u.role, '| permRev:', u.permissionsRevision);
  console.log('Effective unique count:', eff.size, '| catalog size:', ALL_PERMISSION_CODES.length);
  console.log('Blocked codes still in effective (want none):', missing.length ? missing.join(', ') : 'none');
  console.log('Catalog codes missing from effective:', inCatalogNotEff.length, inCatalogNotEff.join(', ') || '(none)');

  const ok = missing.length === 0 && inCatalogNotEff.length === NEAR_ADMIN_EXCLUDE.size;
  console.log(ok ? 'OK — near-admin strip matches catalog.' : 'WARN — see above.');
  await mongoose.disconnect();
  process.exit(ok ? 0 : 2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
