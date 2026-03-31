#!/usr/bin/env node
/**
 * Hits all catalog URLs with a real JWT (login) + X-Tenant-Id from the token.
 * Classifies outcomes: auth layer OK (not 401), vs 2xx success, vs expected business errors.
 *
 * Required env:
 *   JTS_CONTRACT_BASE_URL   (default https://api.etelios.com)
 *   JTS_AUTH_EMAIL
 *   JTS_AUTH_PASSWORD
 *
 * Optional:
 *   JTS_AUTH_LOGIN_URL      full URL if not {BASE}/api/auth/login
 *   JTS_INTERNAL_SERVICE_TOKEN + JTS_INTERNAL_TENANT_ID  (24-hex) for internal/* entries
 *   JTS_CONTRACT_GET_ONLY=1 or --get-only   only GET (+ health/internal); skips writes
 *   JTS_CONTRACT_DELAY_MS     pause between requests
 *   --json                    full per-route output
 *
 * Pass criteria (jwt routes): HTTP status !== 401 (token accepted; 403/404/400 are OK).
 * Internal: valid token → not 401 JTS_INTERNAL_UNAUTHORIZED; or skipped if env unset.
 */
const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (_) {
  /* optional */
}

const axios = require('axios');
const jwt = require('jsonwebtoken');
const { buildManifest, defaultBodyForEntry } = require('./lib/jtsEndpointManifest');
const { urlPathForRemote } = require('./lib/jtsContractUrl');

const BASE = (process.env.JTS_CONTRACT_BASE_URL || 'https://api.etelios.com').replace(/\/$/, '');
const args = new Set(process.argv.slice(2));
const GET_ONLY = process.env.JTS_CONTRACT_GET_ONLY === '1' || args.has('--get-only');
const DELAY_MS = Math.max(0, parseInt(process.env.JTS_CONTRACT_DELAY_MS || '0', 10) || 0);

const INTERNAL_TOKEN = (process.env.JTS_INTERNAL_SERVICE_TOKEN || '').trim();
const INTERNAL_TENANT = (process.env.JTS_INTERNAL_TENANT_ID || '').trim();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function assertHealthBody(body) {
  if (body.status !== 'healthy') return 'status not healthy';
  if (body.service !== 'jts-service') return 'service mismatch';
  if (typeof body.timestamp !== 'string') return 'missing timestamp';
  return null;
}

async function login() {
  const email = (process.env.JTS_AUTH_EMAIL || '').trim();
  const password = (process.env.JTS_AUTH_PASSWORD || '').trim();
  if (!email || !password) {
    throw new Error('Set JTS_AUTH_EMAIL and JTS_AUTH_PASSWORD (tenant user with JTS access).');
  }
  const loginUrl = (process.env.JTS_AUTH_LOGIN_URL || `${BASE}/api/auth/login`).trim();
  const r = await axios.post(loginUrl, { email, password }, { validateStatus: () => true, timeout: 60000 });
  if (r.status !== 200) {
    throw new Error(`Login HTTP ${r.status}: ${JSON.stringify(r.data).slice(0, 500)}`);
  }
  const wrap = r.data && r.data.data !== undefined ? r.data.data : r.data;
  const token = wrap.accessToken || wrap.access_token || wrap.token;
  if (!token || typeof token !== 'string') {
    throw new Error('Login response missing accessToken');
  }
  const decoded = jwt.decode(token) || {};
  const tenantId =
    wrap.user?.tenantId ||
    wrap.user?.tenant_id ||
    decoded.tenantId ||
    decoded.tid ||
    decoded.tenant_id ||
    '';
  return { token, tenantId: tenantId != null ? String(tenantId) : '' };
}

function buildHeaders(entry, loginCtx) {
  if (entry.authGate === 'none') {
    return { Accept: 'application/json' };
  }
  if (entry.authGate === 'internal') {
    const h = { Accept: 'application/json' };
    if (INTERNAL_TOKEN && INTERNAL_TENANT) {
      h['X-JTS-Internal-Token'] = INTERNAL_TOKEN;
      h['X-Tenant-Id'] = INTERNAL_TENANT;
    }
    return h;
  }
  const h = {
    Accept: 'application/json',
    Authorization: `Bearer ${loginCtx.token}`
  };
  if (loginCtx.tenantId) {
    h['X-Tenant-Id'] = loginCtx.tenantId;
  }
  return h;
}

function skipEntry(entry) {
  if (GET_ONLY && entry.authGate === 'jwt' && entry.method !== 'GET') {
    return { skip: true, reason: 'get-only' };
  }
  if (entry.authGate === 'internal' && (!INTERNAL_TOKEN || !INTERNAL_TENANT)) {
    return { skip: true, reason: 'no internal token/tenant env' };
  }
  return { skip: false };
}

async function requestEntry(entry, loginCtx) {
  const urlPath = urlPathForRemote(entry);
  const url = `${BASE}${urlPath}`;
  const body = defaultBodyForEntry(entry);
  const headers = buildHeaders(entry, loginCtx);
  const method = entry.method.toLowerCase();
  const cfg = {
    method,
    url,
    headers,
    validateStatus: () => true,
    timeout: 60000
  };
  if (body !== undefined && ['post', 'put', 'patch'].includes(method)) {
    cfg.data = body;
    cfg.headers['Content-Type'] = 'application/json';
  }
  return axios(cfg);
}

function classify(entry, status, body, skipped) {
  if (skipped) {
    return { ok: true, bucket: 'skipped', skipped: true };
  }
  if (entry.authGate === 'none') {
    if (status !== 200) return { ok: false, bucket: 'health', issue: `expected 200, got ${status}` };
    const d = assertHealthBody(body);
    if (d) return { ok: false, bucket: 'health', issue: d };
    return { ok: true, bucket: 'health' };
  }
  if (entry.authGate === 'internal') {
    if (status === 401) {
      return { ok: false, bucket: 'internal', issue: body && body.code ? String(body.code) : '401' };
    }
    if (status >= 500) return { ok: false, bucket: 'server', issue: `HTTP ${status}` };
    return { ok: true, bucket: 'internal' };
  }
  if (status === 401) {
    const code = body && body.code;
    return { ok: false, bucket: 'auth', issue: code || '401' };
  }
  if (status >= 500) return { ok: false, bucket: 'server', issue: `HTTP ${status}` };
  if (status >= 200 && status < 300) return { ok: true, bucket: '2xx' };
  return { ok: true, bucket: `${status}` };
}

async function run() {
  const loginCtx = await login();
  const manifest = buildManifest();
  const results = [];
  const buckets = {
    skipped: 0,
    ok2xx: 0,
    okHealth: 0,
    okInternal: 0,
    okOther: 0,
    fail401: 0,
    fail5xx: 0,
    failHealth: 0,
    failInternal: 0,
    failNetwork: 0
  };
  let n = 0;

  function tally(c, skipped) {
    if (skipped) {
      buckets.skipped += 1;
      return;
    }
    if (!c.ok) {
      if (c.bucket === 'auth') buckets.fail401 += 1;
      else if (c.bucket === 'server') buckets.fail5xx += 1;
      else if (c.bucket === 'health') buckets.failHealth += 1;
      else if (c.bucket === 'internal') buckets.failInternal += 1;
      else if (c.bucket === 'network') buckets.failNetwork += 1;
      return;
    }
    if (c.bucket === '2xx') buckets.ok2xx += 1;
    else if (c.bucket === 'health') buckets.okHealth += 1;
    else if (c.bucket === 'internal') buckets.okInternal += 1;
    else buckets.okOther += 1;
  }

  for (const entry of manifest) {
    n += 1;
    const { skip, reason } = skipEntry(entry);
    let res;
    let skipped = false;
    let skipReason;
    if (skip) {
      skipped = true;
      skipReason = reason;
    } else {
      try {
        res = await requestEntry(entry, loginCtx);
      } catch (e) {
        results.push({
          method: entry.method,
          path: entry.path,
          group: entry.group,
          authGate: entry.authGate,
          ok: false,
          bucket: 'network',
          issue: e.message,
          status: null,
          skipped: false
        });
        tally({ ok: false, bucket: 'network' }, false);
        if (n % 50 === 0) process.stderr.write(`… ${n}/${manifest.length}\n`);
        if (DELAY_MS) await sleep(DELAY_MS);
        continue;
      }
    }

    const status = skipped ? null : res.status;
    const data = skipped ? null : res.data;
    const c = classify(entry, status, data, skipped);
    tally(c, skipped);

    results.push({
      method: entry.method,
      path: entry.path,
      group: entry.group,
      authGate: entry.authGate,
      ok: c.ok,
      bucket: c.skipped ? 'skipped' : c.bucket,
      issue: c.issue || skipReason,
      status,
      skipped,
      code: data && typeof data === 'object' ? data.code : undefined
    });

    if (n % 50 === 0) process.stderr.write(`… ${n}/${manifest.length}\n`);
    if (DELAY_MS) await sleep(DELAY_MS);
  }

  const hardFail = results.filter((r) => !r.ok && !r.skipped);
  const payload = {
    baseUrl: BASE,
    getOnly: GET_ONLY,
    loginTenantHeader: loginCtx.tenantId || '(from JWT only)',
    ok: hardFail.length === 0,
    total: results.length,
    hardFailures: hardFail.length,
    buckets,
    failures: hardFail.slice(0, 80).map((f) => ({
      method: f.method,
      path: f.path,
      status: f.status,
      bucket: f.bucket,
      issue: f.issue,
      code: f.code
    }))
  };

  if (args.has('--json')) {
    process.stdout.write(JSON.stringify({ ...payload, results }, null, 2));
  } else {
    process.stdout.write(JSON.stringify(payload, null, 2));
    process.stdout.write('\n');
  }

  if (hardFail.length) process.exit(1);
}

run().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
