#!/usr/bin/env node
/**
 * Prod smoke: Sandeep (or any user) login + HR /employees with tenant header scenarios.
 * Verifies validateTenant fix: missing or wrong X-Tenant-Id should not 403 TENANT_MISMATCH
 * (JWT tenant wins unless STRICT_TENANT_HEADER=true on hr-service).
 *
 *   cd repo root
 *   JTS_AUTH_PASSWORD='***' node scripts/prod-sandeep-tenant-hr-smoke.js
 *
 * Optional: JTS_AUTH_EMAIL, JTS_TENANT_ID, JTS_CONTRACT_BASE_URL (default https://api.etelios.com)
 */
const path = require('path');

const root = path.join(__dirname, '..');
try {
  require('dotenv').config({ path: path.join(root, '.env') });
} catch (_) {}

const BASE = (process.env.JTS_CONTRACT_BASE_URL || 'https://api.etelios.com').replace(/\/$/, '');
const EMAIL = (process.env.JTS_AUTH_EMAIL || 'sandeep@lenstrack.com').trim();
const PASSWORD = (
  process.env.JTS_AUTH_PASSWORD ||
  process.env.SANDEEP_PASSWORD ||
  process.env.LENSTRACK_SANDEEP_PASSWORD ||
  ''
).trim();
const TENANT = (process.env.JTS_TENANT_ID || 'lenstrack').trim().toLowerCase();

function log(ok, step, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${step}${detail ? ` — ${detail}` : ''}`);
}

async function fetchJson(method, pathname, { headers = {}, body, searchParams } = {}) {
  const u = new URL(BASE + pathname);
  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) => u.searchParams.set(k, String(v)));
  }
  const res = await fetch(u, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
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
  if (!PASSWORD) {
    console.error(
      'Set JTS_AUTH_PASSWORD (or SANDEEP_PASSWORD). Example:\n' +
        `  JTS_AUTH_PASSWORD='your-password' node scripts/prod-sandeep-tenant-hr-smoke.js`
    );
    process.exit(1);
  }

  const r0 = await fetchJson('GET', '/jts/health');
  log(r0.status === 200 && r0.data?.status === 'healthy', 'GET /jts/health', `HTTP ${r0.status}`);

  const rLogin = await fetchJson('POST', '/api/auth/login', {
    body: { email: EMAIL, password: PASSWORD, tenantId: TENANT }
  });

  if (rLogin.status !== 200 || !(rLogin.data?.data?.accessToken || rLogin.data?.accessToken)) {
    log(false, 'POST /api/auth/login', `HTTP ${rLogin.status} ${JSON.stringify(rLogin.data).slice(0, 240)}`);
    process.exit(1);
  }

  const wrap = rLogin.data.data || rLogin.data;
  const token = wrap.accessToken || wrap.access_token || wrap.token;
  const jwtTenant = String(
    wrap.user?.tenantId || wrap.user?.tenant_id || TENANT
  )
    .toLowerCase()
    .trim();

  log(true, 'POST /api/auth/login', `tenant=${jwtTenant} role=${wrap.user?.role || 'n/a'}`);

  const pathEmp = '/api/hr/employees';
  const searchParams = { page: 1, limit: 1 };

  const r1 = await fetchJson('GET', pathEmp, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Id': jwtTenant },
    searchParams
  });
  log(
    r1.status === 200 && r1.data?.success !== false,
    'GET /api/hr/employees (X-Tenant-Id matches JWT)',
    `HTTP ${r1.status} err=${r1.data?.error || r1.data?.message || 'none'}`
  );

  const r2 = await fetchJson('GET', pathEmp, {
    headers: { Authorization: `Bearer ${token}` },
    searchParams
  });
  log(
    r2.status === 200 && r2.data?.success !== false,
    'GET /api/hr/employees (no X-Tenant-Id)',
    `HTTP ${r2.status} err=${r2.data?.error || r2.data?.message || 'none'}`
  );

  const r3 = await fetchJson('GET', pathEmp, {
    headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Id': 'wrong-tenant-ghost' },
    searchParams
  });
  const mismatch =
    r3.status === 403 &&
    (r3.data?.error === 'TENANT_MISMATCH' || String(r3.data?.message || '').includes('does not match'));
  log(
    r3.status === 200 && r3.data?.success !== false,
    'GET /api/hr/employees (wrong X-Tenant-Id; expect JWT wins)',
    `HTTP ${r3.status} TENANT_MISMATCH=${mismatch} body=${JSON.stringify(r3.data).slice(0, 180)}`
  );

  if (r2.status !== 200 || r3.status !== 200) {
    console.error('\nIf GET failed with TENANT_MISMATCH, confirm hr-service image includes tenant-jwt-fix rollout.');
    process.exit(2);
  }

  console.log('\nAll HR tenant scenarios passed.');
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
