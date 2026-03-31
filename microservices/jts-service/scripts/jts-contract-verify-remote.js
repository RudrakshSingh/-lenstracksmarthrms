#!/usr/bin/env node
/**
 * Same expectations as jts-contract-verify.js but against a live base URL (no Bearer).
 *   authGate jwt     → 401 AUTH_REQUIRED
 *   authGate internal→ 503 JTS_INTERNAL_DISABLED (when server has no internal token)
 *   authGate none    → 200 healthy JSON
 *
 * Usage:
 *   JTS_CONTRACT_BASE_URL=https://api.etelios.com node scripts/jts-contract-verify-remote.js
 *   node scripts/jts-contract-verify-remote.js --json
 */
const axios = require('axios');
const { buildManifest, defaultBodyForEntry } = require('./lib/jtsEndpointManifest');
const { urlPathForRemote } = require('./lib/jtsContractUrl');

const BASE = (process.env.JTS_CONTRACT_BASE_URL || 'https://api.etelios.com').replace(/\/$/, '');
const args = new Set(process.argv.slice(2));

function assertErrorEnvelope(body, expectedCode) {
  if (typeof body !== 'object' || body === null) return 'body is not an object';
  if (body.success !== false) return `expected success===false, got ${body.success}`;
  if (body.code !== expectedCode) return `expected code ${expectedCode}, got ${body.code}`;
  if (typeof body.message !== 'string' || !body.message) return 'missing message string';
  if (body.error !== body.code) return `error alias should match code (got error=${body.error})`;
  return null;
}

function assertHealthBody(body) {
  if (body.status !== 'healthy') return 'status not healthy';
  if (body.service !== 'jts-service') return 'service mismatch';
  if (typeof body.timestamp !== 'string') return 'missing timestamp';
  return null;
}

async function requestEntry(entry) {
  const { method } = entry;
  const urlPath = urlPathForRemote(entry);
  const url = `${BASE}${urlPath}`;
  const body = defaultBodyForEntry(entry);
  const cfg = {
    method: method.toLowerCase(),
    url,
    validateStatus: () => true,
    timeout: 30000,
    headers: { Accept: 'application/json' }
  };
  if (body !== undefined && ['post', 'put', 'patch'].includes(cfg.method)) {
    cfg.data = body;
    cfg.headers['Content-Type'] = 'application/json';
  }
  return axios(cfg);
}

async function run() {
  const manifest = buildManifest();
  const results = [];
  let i = 0;
  for (const entry of manifest) {
    i += 1;
    let res;
    try {
      res = await requestEntry(entry);
    } catch (e) {
      results.push({
        method: entry.method,
        path: entry.path,
        group: entry.group,
        ok: false,
        status: null,
        contractIssue: e.message || String(e),
        bodyKeys: []
      });
      continue;
    }

    const data = res.data;
    let ok = false;
    let detail = null;

    if (entry.authGate === 'none') {
      ok = res.status === 200;
      if (ok) detail = assertHealthBody(data);
      if (detail) ok = false;
    } else if (entry.authGate === 'internal') {
      if (res.status === 503) {
        detail = assertErrorEnvelope(data, 'JTS_INTERNAL_DISABLED');
        ok = !detail;
      } else if (res.status === 401) {
        detail = assertErrorEnvelope(data, 'JTS_INTERNAL_UNAUTHORIZED');
        ok = !detail;
      } else {
        detail = `expected 503 or 401, got ${res.status}`;
        ok = false;
      }
    } else {
      ok = res.status === 401;
      if (ok) detail = assertErrorEnvelope(data, 'AUTH_REQUIRED');
      if (detail) ok = false;
    }

    results.push({
      method: entry.method,
      path: entry.path,
      group: entry.group,
      ok,
      status: res.status,
      contractIssue: detail,
      bodyKeys: data && typeof data === 'object' ? Object.keys(data).sort() : []
    });

    if (i % 50 === 0) {
      process.stderr.write(`… ${i}/${manifest.length}\n`);
    }
  }

  const failed = results.filter((r) => !r.ok);
  const payload = {
    baseUrl: BASE,
    ok: failed.length === 0,
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    failures: failed.map((f) => ({
      method: f.method,
      path: f.path,
      status: f.status,
      contractIssue: f.contractIssue,
      bodyKeys: f.bodyKeys
    }))
  };

  if (args.has('--json')) {
    process.stdout.write(JSON.stringify({ ...payload, results }, null, 2));
  } else {
    process.stdout.write(JSON.stringify(payload, null, 2));
    process.stdout.write('\n');
  }

  if (failed.length) process.exit(1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
