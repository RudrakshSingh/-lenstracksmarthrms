#!/usr/bin/env node
/**
 * Lenstrack: set org roles for named users (no bulk, no extra custom_permissions).
 * Clears custom_permissions + permission_denials so effective = role defaults (+ legacy if any).
 *
 * Defaults (override with env):
 *   SANDEEP_EMAIL   sandeep@lenstrack.com   → manager
 *   ROOPALI_EMAIL   sarwaroopali@gmail.com  → manager (Lenstrack)
 *   LAV_EMAIL       lav@lenstrack.com       → admin
 *   TEJ_EMAIL       tej.rd.ca@gmail.com     → accountant (updates all matching rows)
 *
 *   TENANT_ID=lenstrack  APPLY=1  required for writes
 */
const mongoose = require('mongoose');

const TENANT = (process.env.TENANT_ID || 'lenstrack').toLowerCase().trim();
const APPLY = process.env.APPLY === '1' || process.env.APPLY === 'true';

const ROWS = [
  {
    email: (process.env.SANDEEP_EMAIL || 'sandeep@lenstrack.com').toLowerCase().trim(),
    role: 'manager'
  },
  {
    email: (process.env.ROOPALI_EMAIL || 'sarwaroopali@gmail.com').toLowerCase().trim(),
    role: 'manager'
  },
  {
    email: (process.env.LAV_EMAIL || 'lav@lenstrack.com').toLowerCase().trim(),
    role: 'admin'
  },
  {
    email: (process.env.TEJ_EMAIL || 'tej.rd.ca@gmail.com').toLowerCase().trim(),
    role: 'accountant'
  }
];

async function main() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('Set MONGODB_URI or MONGO_URI');
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });
  const col = mongoose.connection.db.collection('users');

  console.log(`Tenant: ${TENANT} | mode: ${APPLY ? 'APPLY' : 'dry-run'}\n`);

  for (const { email, role } of ROWS) {
    const list = await col
      .find({ tenantId: TENANT, email, isDeleted: { $ne: true } })
      .toArray();
    if (!list.length) {
      console.log(`SKIP (not found): ${email} → ${role}`);
      continue;
    }
    for (const u of list) {
      const rev = (u.permissionsRevision != null ? u.permissionsRevision : 0) + 1;
      console.log(
        `OK: ${email} | ${u.name || '?'} | emp=${u.employee_id || '?'} | ${u.role} → ${role} | permRev ${rev}`
      );

      if (APPLY) {
        await col.updateOne(
          { _id: u._id },
          {
            $set: {
              role,
              custom_permissions: [],
              permission_denials: [],
              permissionsRevision: rev
            }
          }
        );
      }
    }
  }

  if (!APPLY) console.log('\nDry run. Set APPLY=1 to write.');
  else console.log('\nDone. Everyone should re-login.');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
