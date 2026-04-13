#!/usr/bin/env node
/**
 * Sandeep prod: login → attendance check-status → optional clock-out → clock-in at store coords → JTS E2E.
 *
 *   JTS_AUTH_PASSWORD='...' node scripts/prod-sandeep-attendance-plus-jts.js
 */
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
try {
  require('dotenv').config({ path: path.join(root, '.env') });
} catch (_) {}

const BASE = (process.env.JTS_CONTRACT_BASE_URL || 'https://api.etelios.com').replace(/\/$/, '');
const EMAIL = (process.env.JTS_AUTH_EMAIL || 'sandeep@lenstrack.com').trim();
const PASSWORD = (
  process.env.JTS_AUTH_PASSWORD ||
  process.env.SANDEEP_PASSWORD ||
  ''
).trim();
const TENANT = (process.env.JTS_TENANT_ID || 'lenstrack').trim().toLowerCase();

async function fetchJson(method, pathname, { headers = {}, body } = {}) {
  const res = await fetch(BASE + pathname, {
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

function log(step, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${step}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  if (!PASSWORD) {
    console.error('Set JTS_AUTH_PASSWORD');
    process.exit(1);
  }

  let r = await fetchJson('POST', '/api/auth/login', {
    body: { email: EMAIL, password: PASSWORD, tenantId: TENANT }
  });
  if (r.status !== 200 || !(r.data?.data?.accessToken || r.data?.accessToken)) {
    log('POST /api/auth/login', false, `HTTP ${r.status}`);
    process.exit(1);
  }
  const wrap = r.data.data || r.data;
  const token = wrap.accessToken || wrap.access_token;
  const jwtTenant = String(wrap.user?.tenantId || TENANT)
    .toLowerCase()
    .trim();
  const H = { Authorization: `Bearer ${token}`, 'X-Tenant-Id': jwtTenant };
  log('POST /api/auth/login', true, `tenant=${jwtTenant}`);

  r = await fetchJson('GET', '/api/attendance/check-status', { headers: H });
  log('GET /api/attendance/check-status', r.status === 200, `HTTP ${r.status}`);
  const clockedIn =
    r.data?.data?.isClockedIn === true ||
    r.data?.isClockedIn === true ||
    r.data?.data?.clockedIn === true;

  r = await fetchJson('GET', '/api/hr/stores?page=1&limit=20', { headers: H });
  let lat;
  let lng;
  let storeName = '';
  if (r.status === 200 && r.data?.data) {
    const list = Array.isArray(r.data.data) ? r.data.data : r.data.data.items || r.data.data.stores || [];
    for (const s of list) {
      const la = s.coordinates?.latitude ?? s.latitude;
      const lo = s.coordinates?.longitude ?? s.longitude;
      if (la != null && lo != null && !Number.isNaN(+la) && !Number.isNaN(+lo)) {
        lat = +la;
        lng = +lo;
        storeName = s.name || s.code || String(s._id || '');
        break;
      }
    }
  }
  if (lat == null || lng == null) {
    log('resolve store GPS', false, `HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
    console.log('\nContinuing without attendance check-in (no store coordinates). Running JTS E2E...\n');
  } else {
    log('resolve store GPS', true, `${storeName} (${lat},${lng})`);

    if (clockedIn) {
      r = await fetchJson('POST', '/api/attendance/check-out', {
        headers: H,
        body: { latitude: lat, longitude: lng, notes: 'e2e bundle: reset before check-in' }
      });
      log(
        'POST /api/attendance/check-out (clear open session)',
        r.status >= 200 && r.status < 300,
        `HTTP ${r.status} ${r.data?.message || r.data?.error || ''}`.slice(0, 120)
      );
    }

    r = await fetchJson('POST', '/api/attendance/check-in', {
      headers: H,
      body: { latitude: lat, longitude: lng, notes: 'e2e bundle sandeep' }
    });
    const okIn = r.status >= 200 && r.status < 300 && r.data?.success !== false;
    log('POST /api/attendance/check-in', okIn, `HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 180)}`);

    r = await fetchJson('GET', '/api/attendance/today', { headers: H });
    log('GET /api/attendance/today', r.status === 200, `HTTP ${r.status}`);
  }

  console.log('\n--- JTS E2E (subprocess) ---\n');
  execSync(`node "${path.join(root, 'microservices/jts-service/scripts/jts-e2e-sandeep-flow.js')}"`, {
    stdio: 'inherit',
    env: { ...process.env, JTS_AUTH_PASSWORD: PASSWORD, JTS_AUTH_EMAIL: EMAIL, JTS_TENANT_ID: TENANT, JTS_CONTRACT_BASE_URL: BASE }
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
