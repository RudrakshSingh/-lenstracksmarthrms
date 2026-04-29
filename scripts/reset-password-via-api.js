#!/usr/bin/env node
/**
 * Reset a user password via POST /api/auth/admin/reset-password (admin JWT).
 *
 *   API_BASE=https://api.etelios.com \
 *   ADMIN_EMAIL=admin@lenstrack.com \
 *   ADMIN_PASSWORD='...' \
 *   TARGET_EMAIL=sandeep@lenstrack.com \
 *   TENANT_ID=lenstrack \
 *   NEW_PASSWORD='Sandeeo123@' \
 *   node scripts/reset-password-via-api.js
 *
 * Loads repo root .env if present (for API_BASE / credentials).
 */
const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (_) {}

const API_BASE = (process.env.API_BASE || process.env.JTS_CONTRACT_BASE_URL || 'https://api.etelios.com')
  .replace(/\/$/, '');
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@lenstrack.com').trim().toLowerCase();
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || '').trim();
const TARGET_EMAIL = (process.env.TARGET_EMAIL || 'sandeep@lenstrack.com').trim().toLowerCase();
const TENANT_ID = (process.env.TENANT_ID || 'lenstrack').trim().toLowerCase();
const NEW_PASSWORD = (process.env.NEW_PASSWORD || '').trim();

async function postJson(url, body, headers = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

async function main() {
  if (!NEW_PASSWORD) {
    console.error('Set NEW_PASSWORD');
    process.exit(1);
  }
  if (!ADMIN_PASSWORD) {
    console.error('Set ADMIN_PASSWORD (Lenstrack admin) — not stored in repo.');
    process.exit(1);
  }

  const loginUrl = `${API_BASE}/api/auth/login`;
  const r1 = await postJson(
    loginUrl,
    { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, tenantId: TENANT_ID },
    { 'X-Tenant-Id': TENANT_ID }
  );

  const wrap = r1.data && r1.data.data ? r1.data.data : r1.data;
  const token = wrap && (wrap.accessToken || wrap.access_token);
  if (r1.status !== 200 || !token) {
    console.error('Login failed', r1.status, JSON.stringify(r1.data).slice(0, 400));
    process.exit(1);
  }

  const r2 = await postJson(
    `${API_BASE}/api/auth/admin/reset-password`,
    { email: TARGET_EMAIL, newPassword: NEW_PASSWORD },
    { Authorization: `Bearer ${token}`, 'X-Tenant-Id': TENANT_ID }
  );

  if (r2.status !== 200 || r2.data?.success === false) {
    console.error('Reset failed', r2.status, JSON.stringify(r2.data).slice(0, 500));
    process.exit(1);
  }

  console.log('OK — password reset via API for', TARGET_EMAIL, 'tenant', TENANT_ID);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
