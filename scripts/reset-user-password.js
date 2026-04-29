#!/usr/bin/env node
/**
 * Reset a user's password in `users` collection (auth-service / shared DB).
 *
 * Usage:
 *   MONGODB_URI="mongodb://..." \
 *   EMAIL="user@tenant.com" \
 *   TENANT_ID="tenantslug" \
 *   NEW_PASSWORD='Secret123!' \
 *   node scripts/reset-user-password.js
 *
 * Optional: DRY_RUN=1 (only print match, do not update)
 * Optional: MONGO_TLS_RELAXED=1 — strip tlsCAFile from URI + tlsAllowInvalidCertificates (local/dev only)
 */

const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  require('dotenv').config({ path: path.join(__dirname, '..', 'microservices', 'auth-service', '.env') });
  require('dotenv').config({ path: path.join(__dirname, '..', 'microservices', 'jts-service', '.env') });
} catch (_) {}

let MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const EMAIL = (process.env.EMAIL || '').trim().toLowerCase();
const TENANT_ID = (process.env.TENANT_ID || '').trim().toLowerCase();
const NEW_PASSWORD = process.env.NEW_PASSWORD || '';
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

async function main() {
  if (!MONGODB_URI) {
    console.error('Missing MONGODB_URI (or MONGO_URI)');
    process.exit(1);
  }
  if (!EMAIL || !TENANT_ID || !NEW_PASSWORD) {
    console.error('Set EMAIL, TENANT_ID, and NEW_PASSWORD');
    process.exit(1);
  }
  if (NEW_PASSWORD.length < 6) {
    console.error('NEW_PASSWORD must be at least 6 characters');
    process.exit(1);
  }

  const connOpts = {
    serverSelectionTimeoutMS: 30000
  };
  if (process.env.MONGO_TLS_RELAXED === '1' || process.env.MONGO_TLS_RELAXED === 'true') {
    MONGODB_URI = String(MONGODB_URI)
      .replace(/[?&]tlsCAFile=[^&]*/gi, '')
      .replace(/\?&/g, '?')
      .replace(/&+/g, '&')
      .replace(/\?$/g, '');
    connOpts.tls = true;
    connOpts.tlsAllowInvalidCertificates = true;
  }

  console.log('Connecting to MongoDB…');
  await mongoose.connect(MONGODB_URI, connOpts);
  const dbName =
    mongoose.connection.db?.databaseName || mongoose.connection.name || '(unknown)';
  console.log('Connected. Database:', dbName);
  console.log('Looking up user…');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));

  const user = await User.findOne({
    tenantId: TENANT_ID,
    email: EMAIL
  });

  if (!user) {
    console.error('No user found for', { tenantId: TENANT_ID, email: EMAIL });
    console.error('\nHint: login uses exact { email, tenantId }. Wrong Mongo database = empty hints below.');
    try {
      const total = await User.countDocuments();
      console.error(`\nusers collection count: ${total}`);

      const tenants = await User.distinct('tenantId');
      const tenantList = (tenants || [])
        .filter(Boolean)
        .map((t) => String(t).toLowerCase())
        .sort();
      console.error(
        `Distinct tenantId in DB (${tenantList.length}):`,
        tenantList.length ? tenantList.slice(0, 50).join(', ') : '(none)'
      );
      if (TENANT_ID && !tenantList.map((t) => String(t).toLowerCase()).includes(TENANT_ID)) {
        console.error(
          `⚠️  "${TENANT_ID}" is not among tenantIds above — slug mismatch or wrong cluster.`
        );
      }

      const local = EMAIL.includes('@') ? EMAIL.split('@')[0] : EMAIL;
      const escaped = local.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const hints = await User.find({ email: new RegExp(escaped, 'i') })
        .limit(25)
        .select('email tenantId name employee_id employeeId role')
        .lean();
      if (hints.length) {
        console.error('\nRows with email matching local-part (pick exact EMAIL + TENANT_ID):');
        console.error(JSON.stringify(hints, null, 2));
      } else {
        const fuzzy = await User.find({
          $or: [
            { email: /sandeep/i },
            { name: /sandeep/i }
          ]
        })
          .limit(20)
          .select('email tenantId name employee_id employeeId')
          .lean();
        if (fuzzy.length) {
          console.error('\nRows with "sandeep" in email or name:');
          console.error(JSON.stringify(fuzzy, null, 2));
        }
      }

      const byTenant = await User.find({ tenantId: TENANT_ID })
        .limit(15)
        .select('email tenantId name')
        .lean();
      if (byTenant.length) {
        console.error(`\nSample users in tenant "${TENANT_ID}" (first 15):`);
        console.error(JSON.stringify(byTenant, null, 2));
      } else if (total > 0) {
        console.error(`\nNo users at all with tenantId === "${TENANT_ID}".`);
      }
    } catch (e) {
      console.error('(Could not run diagnostic query)', e.message);
    }
    await mongoose.connection.close();
    process.exit(1);
  }

  console.log('Found user:', user.email, 'id:', String(user._id), 'role:', user.role);

  if (DRY_RUN) {
    console.log('DRY_RUN=1 — not updating');
    await mongoose.connection.close();
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 12);
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        password: hashedPassword,
        mustChangePassword: false,
        passwordTemporary: false,
        passwordChangedAt: new Date(),
        updatedAt: new Date()
      }
    }
  );

  console.log('Password updated successfully for', EMAIL);
  await mongoose.connection.close();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
