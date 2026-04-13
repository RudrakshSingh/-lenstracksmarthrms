#!/usr/bin/env node
/**
 * 1) Upsert Role "accountant" with shared default permission set (accounts + employee mgmt).
 * 2) Lenstrack Tej (tej.rd.ca@gmail.com): same codes as custom_permissions override + bump permRev.
 *
 *   APPLY=1   required to write
 *   TENANT_ID default lenstrack
 *   TEJ_EMAIL default tej.rd.ca@gmail.com
 */
const mongoose = require('mongoose');
const Role = require('../src/models/Role.model');
const User = require('../src/models/User.model');
const { getDefaultRolePermissions } = require('@etelios/shared/utils/defaultRolePermissions');
const { filterValidCodes } = require('@etelios/shared/utils/permissionCatalog');

const TENANT = (process.env.TENANT_ID || 'lenstrack').toLowerCase().trim();
const TEJ_EMAIL = (process.env.TEJ_EMAIL || 'tej.rd.ca@gmail.com').toLowerCase().trim();
const APPLY = process.env.APPLY === '1' || process.env.APPLY === 'true';

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('Set MONGODB_URI');
    process.exit(1);
  }

  const codes = filterValidCodes(getDefaultRolePermissions('accountant'));
  console.log('Accountant catalog codes:', codes.length);
  console.log('Sample:', codes.slice(0, 12).join(', '), '…');

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });

  if (!APPLY) {
    console.log('\nDry run. APPLY=1 to upsert Role + update Tej users.');
    await mongoose.disconnect();
    return;
  }

  const role = await Role.findOneAndUpdate(
    { name: 'accountant' },
    {
      $set: {
        display_name: 'Accountant',
        description: 'Finance, payroll alignment, AP, employee master',
        permissions: codes,
        is_active: true
      }
    },
    { upsert: true, new: true }
  );
  console.log('\nRole accountant upserted. permission_count:', role.permissions?.length);

  const tejUsers = await User.find({
    tenantId: TENANT,
    email: TEJ_EMAIL,
    isDeleted: { $ne: true }
  });

  for (const u of tejUsers) {
    const rev = (u.permissionsRevision != null ? u.permissionsRevision : 0) + 1;
    u.custom_permissions = [...codes];
    u.permission_denials = [];
    u.permissionsRevision = rev;
    u.role = 'accountant';
    await u.save();
    console.log('Tej user updated:', u.name, u.employee_id, 'permRev', rev);
  }

  if (!tejUsers.length) console.log('No Tej users found for', TEJ_EMAIL, TENANT);

  console.log('\nTej should re-login.');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
