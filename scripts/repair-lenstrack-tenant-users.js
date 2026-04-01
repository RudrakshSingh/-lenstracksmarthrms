#!/usr/bin/env node
/**
 * Repair users stuck on tenant "default" who should be Lenstrack (or another target tenant).
 *
 * - Moves tenantId default -> lenstrack when NO other user exists with (targetTenant, same email).
 * - Optional: remove duplicate "default" row when (lenstrack, email) already exists and employee_id matches.
 *
 * AWS DocumentDB (MongoDB-compatible) — use the same URI as auth-service / hr-service:
 *   - Usually `tls=true`, `replicaSet=rs0`, `readPreference=secondaryPreferred`, `retryWrites=false`,
 *     `authSource=admin`, `authMechanism=SCRAM-SHA-1`, and `tlsCAFile` pointing at the RDS CA bundle.
 *   - From your laptop: download AWS global CA bundle (e.g. RDS combined CA) and either embed the path
 *     in MONGODB_URI, or set DOCDB_TLS_CA_FILE=/path/to/global-bundle.pem (script adds TLS options).
 *
 * Usage (dry run — prints only):
 *   MONGODB_URI="mongodb://user:pass@lenstrack-docdb-cluster....amazonaws.com:27017/hrms?tls=true&..." \
 *   node scripts/repair-lenstrack-tenant-users.js
 *
 * Apply updates:
 *   APPLY=1 MONGODB_URI="..." node scripts/repair-lenstrack-tenant-users.js
 *
 * Remove default duplicate when lenstrack user already exists (same email + employee_id):
 *   APPLY=1 DELETE_DEFAULT_DUP=1 MONGODB_URI="..." node scripts/repair-lenstrack-tenant-users.js
 *
 * Options:
 *   TARGET_TENANT=lenstrack   (default)
 *   SOURCE_TENANTS=default    comma-separated wrong tenant ids to scan
 *   DOCDB_TLS_CA_FILE         optional path to CA PEM for TLS when not in URI (local runs)
 */

const mongoose = require('mongoose');

const TARGET = (process.env.TARGET_TENANT || 'lenstrack').toLowerCase().trim();
const SOURCES = (process.env.SOURCE_TENANTS || 'default')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const APPLY = process.env.APPLY === '1' || process.env.APPLY === 'true';
const DELETE_DUP = process.env.DELETE_DEFAULT_DUP === '1' || process.env.DELETE_DEFAULT_DUP === 'true';

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) {
  console.error('Set MONGODB_URI or MONGO_URI to the same AWS DocumentDB / auth-service database (e.g. hrms).');
  process.exit(1);
}

function mongooseConnectOptions() {
  const opts = { serverSelectionTimeoutMS: 30000 };
  const ca = process.env.DOCDB_TLS_CA_FILE;
  if (ca) {
    opts.tls = true;
    opts.tlsCAFile = ca;
  }
  return opts;
}

function normEmail(e) {
  return String(e || '').toLowerCase().trim();
}

function normEmp(id) {
  return String(id || '').toUpperCase().trim();
}

async function main() {
  console.log(`Target tenant: ${TARGET}`);
  console.log(`Source tenants (wrong): ${SOURCES.join(', ')}`);
  console.log(`Mode: ${APPLY ? 'APPLY (writes)' : 'DRY RUN (no writes)'}`);
  if (DELETE_DUP) console.log('DELETE_DEFAULT_DUP: will remove default rows when lenstrack duplicate matches employee_id');
  console.log('');

  await mongoose.connect(uri, mongooseConnectOptions());
  const col = mongoose.connection.db.collection('users');

  const baseFilter = {
    tenantId: { $in: SOURCES },
    isDeleted: { $ne: true }
  };

  const wrongUsers = await col.find(baseFilter).toArray();
  console.log(`Found ${wrongUsers.length} user(s) in source tenant(s).\n`);

  let moved = 0;
  let skippedDup = 0;
  let deletedDup = 0;
  let errors = [];

  for (const u of wrongUsers) {
    const email = normEmail(u.email);
    const emp = normEmp(u.employee_id || u.employeeId);
    if (!email) {
      errors.push(`Skip _id ${u._id}: no email`);
      continue;
    }

    const existingTarget = await col.findOne({
      tenantId: TARGET,
      email
    });

    if (existingTarget) {
      const sameEmp =
        emp &&
        normEmp(existingTarget.employee_id || existingTarget.employeeId) === emp;
      if (DELETE_DUP && sameEmp) {
        console.log(
          `DELETE duplicate default user: ${email} ${emp} (_id ${u._id}) — keeping ${TARGET} _id ${existingTarget._id}`
        );
        if (APPLY) {
          await col.deleteOne({ _id: u._id });
          deletedDup++;
        }
      } else {
        console.log(
          `SKIP (already exists in ${TARGET}): ${email} — default _id ${u._id}, target _id ${existingTarget._id}${sameEmp ? ' (same employee_id)' : ''}`
        );
        skippedDup++;
      }
      continue;
    }

    const empConflict = emp
      ? await col.findOne({
          tenantId: TARGET,
          $or: [{ employee_id: emp }, { employeeId: emp }]
        })
      : null;

    if (empConflict && normEmail(empConflict.email) !== email) {
      console.log(
        `SKIP employee_id collision in ${TARGET}: ${emp} belongs to ${empConflict.email}, wrong row ${email}`
      );
      skippedDup++;
      continue;
    }

    console.log(`MOVE: ${email} ${emp || '(no emp)'} tenant ${u.tenantId} -> ${TARGET} (_id ${u._id})`);
    if (APPLY) {
      const r = await col.updateOne({ _id: u._id }, { $set: { tenantId: TARGET } });
      if (r.modifiedCount === 1) moved++;
      else errors.push(`Update failed for _id ${u._id}: ${JSON.stringify(r)}`);
    }
  }

  console.log('\n--- Summary ---');
  if (APPLY) {
    console.log(`Updated to ${TARGET}: ${moved}`);
    console.log(`Deleted default duplicates: ${deletedDup}`);
  } else {
    console.log('Dry run: no database changes. Set APPLY=1 to execute.');
  }
  console.log(`Skipped (duplicate / collision): ${skippedDup}`);
  if (errors.length) {
    console.log('Issues:');
    errors.forEach((e) => console.log(' ', e));
  }

  console.log('\nUsers must log out and log in again (or refresh tokens) so JWT carries the correct tenantId.');
  console.log('Frontend: send tenantId in login body and X-Tenant-Id header for Lenstrack: lenstrack');

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
