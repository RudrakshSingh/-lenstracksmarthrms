#!/usr/bin/env node
/**
 * Report role + custom/deny + effective permission count for named Lenstrack users.
 * Run from /app: node scripts/report-lenstrack-user-perms.js
 */
const mongoose = require('mongoose');
const User = require('../src/models/User.model');
const Role = require('../src/models/Role.model');
const { computeEffectiveSets } = require('@etelios/shared/utils/permissionCore');
const { getDefaultRolePermissions } = require('@etelios/shared/utils/defaultRolePermissions');
const { ALL_PERMISSION_CODES } = require('@etelios/shared/utils/permissionCatalog');

const TENANT = (process.env.TENANT_ID || 'lenstrack').toLowerCase().trim();
const EMAILS = (process.env.EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const DEFAULT_EMAILS = [
  'sandeep@lenstrack.com',
  'sarwaroopali@gmail.com',
  'lav@lenstrack.com',
  'tej.rd.ca@gmail.com'
];

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
  const list = EMAILS.length ? EMAILS : DEFAULT_EMAILS;

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });
  const col = mongoose.connection.db.collection('users');

  console.log(`Tenant: ${TENANT}\n`);

  for (const email of list) {
    const users = await col.find({ tenantId: TENANT, email, isDeleted: { $ne: true } }).toArray();
    if (!users.length) {
      console.log(`--- ${email} ---\nNOT FOUND\n`);
      continue;
    }
    for (const raw of users) {
      const u = await User.findById(raw._id).lean();
      if (!u) continue;
      const { rolePermissions } = await loadRolePermissionBase(u.role);
      const { effective } = computeEffectiveSets({
        rolePermissions,
        custom_permissions: u.custom_permissions || [],
        permission_denials: u.permission_denials || [],
        legacyUserPermissions: u.permissions || []
      });
      const extra = effective.filter((p) => !ALL_PERMISSION_CODES.includes(p));

      console.log(`--- ${u.email} (${u.name}) emp=${u.employee_id || '?'} ---`);
      console.log(`  role (DB):              ${u.role}`);
      console.log(`  custom_permissions:     ${(u.custom_permissions || []).length} codes`);
      console.log(`  permission_denials:     ${(u.permission_denials || []).length} codes`);
      console.log(`  legacy user.permissions:${(u.permissions || []).length} codes`);
      console.log(`  role base (resolved):   ${rolePermissions.length} codes`);
      console.log(`  effective (unique):     ${effective.length} codes`);
      if (extra.length) console.log(`  effective outside catalog: ${extra.length} (e.g. ${extra.slice(0, 5).join(', ')}…)`);
      if ((u.permission_denials || []).length) {
        console.log(`  denied:                 ${(u.permission_denials || []).sort().join(', ')}`);
      }
      console.log('');
    }
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
