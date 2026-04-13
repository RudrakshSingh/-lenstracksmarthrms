#!/usr/bin/env node
/**
 * Lenstrack: Sandeep (or env email) — near-admin effective access for feature testing.
 * Role set to `manager` (or TARGET_ROLE); custom + denials = near-admin effective set.
 *
 * Run from auth-service root (Docker / local): `node scripts/apply-sandeep-near-admin-perms.js`
 * In cluster: `kubectl cp ... auth-pod:/tmp/p.js && kubectl exec ... -- env APPLY=1 node /tmp/p.js`
 *
 *   APPLY=1              required for writes (else dry run)
 *   SANDEEP_EMAIL        default sandeep@lenstrack.com
 *   TENANT_ID            default lenstrack
 *   TARGET_ROLE          default manager (must match User.model role enum)
 */
const mongoose = require('mongoose');
const { ALL_PERMISSION_CODES } = require('@etelios/shared/utils/permissionCatalog');

const EMAIL = (process.env.SANDEEP_EMAIL || 'sandeep@lenstrack.com').toLowerCase().trim();
const TENANT = (process.env.TENANT_ID || 'lenstrack').toLowerCase().trim();
const TARGET_ROLE = (process.env.TARGET_ROLE || 'manager').toLowerCase().trim();
const APPLY = process.env.APPLY === '1' || process.env.APPLY === 'true';

/** Slightly below full tenant admin: no system/role hard-delete surface */
const NEAR_ADMIN_EXCLUDE = new Set([
  'system_admin',
  'backup_restore',
  'audit_logs',
  'write_roles',
  'create_roles',
  'update_roles',
  'delete_users'
]);

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('Set MONGODB_URI or MONGO_URI');
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });
  const col = mongoose.connection.db.collection('users');

  const user = await col.findOne({
    tenantId: TENANT,
    email: EMAIL,
    isDeleted: { $ne: true }
  });

  if (!user) {
    console.error(`No user found for tenant=${TENANT} email=${EMAIL}`);
    process.exit(1);
  }

  /** Full catalog on user + explicit denials — base role alone may still grant overlapping codes */
  const custom = [...ALL_PERMISSION_CODES];
  const denials = [...NEAR_ADMIN_EXCLUDE];

  console.log('Found:', user.name, '| email:', user.email, '| prev role:', user.role);
  console.log('Catalog codes:', ALL_PERMISSION_CODES.length, '| custom (full catalog):', custom.length);
  console.log('permission_denials (blocked):', denials.sort().join(', '));
  console.log('Target role:', TARGET_ROLE);

  if (!APPLY) {
    console.log('\nDry run only. Re-run with APPLY=1 to write.');
    await mongoose.disconnect();
    return;
  }

  const rev = (user.permissionsRevision != null ? user.permissionsRevision : 0) + 1;

  await col.updateOne(
    { _id: user._id },
    {
      $set: {
        role: TARGET_ROLE,
        custom_permissions: custom,
        permission_denials: denials,
        permissionsRevision: rev
      }
    }
  );

  console.log('\nUpdated. permissionsRevision ->', rev);
  console.log('Sandeep should log out and log in again so JWT picks up role + permRev.');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
