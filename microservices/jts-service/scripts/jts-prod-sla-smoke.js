#!/usr/bin/env node
/**
 * Prod/staging smoke: health + SLA alerts + executive summary + task list.
 *
 *   cd microservices/jts-service
 *   JTS_AUTH_EMAIL=you@corp.com JTS_AUTH_PASSWORD='***' node scripts/jts-prod-sla-smoke.js
 *
 * Optional: JTS_CONTRACT_BASE_URL=https://api.etelios.com (default)
 */
const path = require('path');
const axios = require('axios');
const jwt = require('jsonwebtoken');

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (_) {}

const BASE = (process.env.JTS_CONTRACT_BASE_URL || 'https://api.etelios.com').replace(/\/$/, '');
const email = (process.env.JTS_AUTH_EMAIL || '').trim();
const password = (process.env.JTS_AUTH_PASSWORD || '').trim();

async function main() {
  const h = await axios.get(`${BASE}/jts/health`, { validateStatus: () => true, timeout: 30000 });
  console.log('[1] GET /jts/health', h.status, h.data?.status, h.data?.service);

  if (!email || !password) {
    console.log('[2] SKIP authed calls — set JTS_AUTH_EMAIL and JTS_AUTH_PASSWORD');
    process.exit(0);
  }

  const lr = await axios.post(
    `${BASE}/api/auth/login`,
    { email, password },
    { validateStatus: () => true, timeout: 60000 }
  );
  if (lr.status !== 200) {
    console.log('[2] POST /api/auth/login', lr.status, lr.data?.message || JSON.stringify(lr.data).slice(0, 200));
    process.exit(1);
  }
  const wrap = lr.data?.data ?? lr.data;
  const token = wrap.accessToken || wrap.access_token || wrap.token;
  if (!token) {
    console.log('[2] login: no accessToken in response');
    process.exit(1);
  }
  const dec = jwt.decode(token) || {};
  const tenantId = String(wrap.user?.tenantId || wrap.user?.tenant_id || dec.tid || dec.tenantId || '');
  console.log('[2] login OK, tenantId length', tenantId.length);

  const hdr = { Authorization: `Bearer ${token}`, 'X-Tenant-Id': tenantId };

  const tasks = await axios.get(`${BASE}/jts/tasks`, {
    params: { page: 1, limit: 2 },
    headers: hdr,
    validateStatus: () => true,
    timeout: 60000
  });
  console.log('[3] GET /jts/tasks', tasks.status, 'total', tasks.data?.total);

  const alerts = await axios.get(`${BASE}/jts/tasks/sla/alerts`, {
    params: { limit: 10 },
    headers: hdr,
    validateStatus: () => true,
    timeout: 60000
  });
  console.log('[4] GET /jts/tasks/sla/alerts', alerts.status, 'n', alerts.data?.data?.length);

  const ex = await axios.get(`${BASE}/jts/tasks/sla/executive-summary`, {
    params: { hours: 24, recentLimit: 10, teamLimit: 15 },
    headers: hdr,
    validateStatus: () => true,
    timeout: 60000
  });
  console.log('[5] GET /jts/tasks/sla/executive-summary', ex.status);
  if (ex.status === 200 && ex.data?.data) {
    console.log('    summary', ex.data.data.summary);
    console.log('    heatmap rows', ex.data.data.teamHeatmap?.length, 'recent', ex.data.data.recentBreaches?.length);
  } else if (ex.status === 403) {
    console.log('    (403 — need MANAGER+ / executive role for this route)');
  } else {
    console.log('    ', JSON.stringify(ex.data).slice(0, 300));
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
