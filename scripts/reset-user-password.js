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

  await mongoose.connect(MONGODB_URI, connOpts);

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));

  const user = await User.findOne({
    tenantId: TENANT_ID,
    email: EMAIL
  });

  if (!user) {
    console.error('No user found for', { tenantId: TENANT_ID, email: EMAIL });
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
