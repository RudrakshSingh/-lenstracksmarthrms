#!/usr/bin/env node
/**
 * Verifies every HTTP route in the JTS catalog matches documented contracts
 * when called without a Bearer token (or for public/internal, the documented shape).
 *
 * Docs: docs/JTS_SERVICE_COMPLETE_API_CATALOG_BY_FUNCTION_AND_RBAC.md
 * Manifest: scripts/lib/jtsEndpointManifest.js
 *
 * Usage (from microservices/jts-service):
 *   npm run contract-verify
 *   node scripts/jts-contract-verify.js --json   # machine-readable report
 *   node scripts/jts-contract-verify.js --export # print manifest + request samples as JSON
 *
 * Unauthenticated protected routes must return 401 with:
 *   { success: false, code: 'AUTH_REQUIRED', message, error }
 *
 * Health:
 *   { status: 'healthy', service: 'jts-service', timestamp }
 *
 * Internal (token unset):
 *   503 { success: false, code: 'JTS_INTERNAL_DISABLED', ... }
 */
process.env.NODE_ENV = 'test';
process.env.ENABLE_BACKGROUND_JOBS = 'false';
process.env.JTS_INTERNAL_SERVICE_TOKEN = '';

const request = require('supertest');
const { createApp } = require('../src/createApp');
const {
  buildManifest,
  defaultBodyForEntry,
  ERROR_ENVELOPE_KEYS
} = require('./lib/jtsEndpointManifest');
const { contractForEntry } = require('./lib/jtsResponseContracts');

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

function buildRequest(agent, entry) {
  const { method, path } = entry;
  let p = path;
  if (method === 'DELETE' && p.includes('/employee-roles/') && !p.includes('?')) {
    p += '?role=MANAGER';
  }

  const body = defaultBodyForEntry(entry);
  const m = method.toLowerCase();
  if (m === 'get') return agent.get(p);
  if (m === 'delete') return agent.delete(p);
  if (m === 'post') return agent.post(p).send(body !== undefined ? body : {});
  if (m === 'put') return agent.put(p).send(body !== undefined ? body : {});
  if (m === 'patch') return agent.patch(p).send(body !== undefined ? body : {});
  return null;
}

async function run() {
  const app = createApp();
  const agent = request(app);
  const manifest = buildManifest();
  const results = [];
  const args = new Set(process.argv.slice(2));

  if (args.has('--export')) {
    const enriched = manifest.map((e) => {
      const body = defaultBodyForEntry(e);
      return {
        method: e.method,
        pathPattern: e.pathPattern,
        pathExpanded: e.path,
        group: e.group,
        authGate: e.authGate,
        request: {
          headers: {
            ...(e.authGate === 'jwt' && { Authorization: 'Bearer <access_token>' }),
            ...(e.authGate === 'jwt' && { 'X-Tenant-Id': '<optional; must match JWT tenant>' }),
            ...(e.authGate === 'internal' && {
              'X-JTS-Internal-Token': '<matches JTS_INTERNAL_SERVICE_TOKEN>',
              'X-Tenant-Id': '<24-char hex tenant ObjectId>'
            })
          },
          body: body === undefined ? null : body
        },
        response: contractForEntry(e)
      };
    });
    process.stdout.write(
      JSON.stringify(
        {
          description:
            'JTS endpoint contracts: exact without-auth responses are verified by npm run contract-verify. With-auth shapes are typical only (needs MongoDB + data).',
          count: enriched.length,
          endpoints: enriched
        },
        null,
        2
      )
    );
    return;
  }

  for (const entry of manifest) {
    const req = buildRequest(agent, entry);
    if (!req) {
      results.push({
        method: entry.method,
        path: entry.path,
        ok: false,
        error: 'unsupported method'
      });
      continue;
    }

    const res = await req;
    let ok = false;
    let detail = null;

    if (entry.authGate === 'none') {
      ok = res.status === 200;
      if (ok) detail = assertHealthBody(res.body);
      if (detail) ok = false;
    } else if (entry.authGate === 'internal') {
      ok = res.status === 503;
      if (ok) detail = assertErrorEnvelope(res.body, 'JTS_INTERNAL_DISABLED');
      if (detail) ok = false;
    } else {
      ok = res.status === 401;
      if (ok) detail = assertErrorEnvelope(res.body, 'AUTH_REQUIRED');
      if (detail) ok = false;
    }

    results.push({
      method: entry.method,
      path: entry.path,
      group: entry.group,
      ok,
      status: res.status,
      contractIssue: detail,
      bodyKeys: res.body && typeof res.body === 'object' ? Object.keys(res.body).sort() : []
    });
  }

  const failed = results.filter((r) => !r.ok);
  const payload = {
    manifestVersion: 1,
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    expectedErrorKeys: ERROR_ENVELOPE_KEYS,
    results: args.has('--json') ? results : undefined,
    failures: failed.slice(0, 50)
  };

  if (!args.has('--json')) {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          ok: failed.length === 0,
          total: payload.total,
          passed: payload.passed,
          failed: payload.failed,
          failures: failed.map((f) => ({
            method: f.method,
            path: f.path,
            status: f.status,
            contractIssue: f.contractIssue,
            bodyKeys: f.bodyKeys
          }))
        },
        null,
        2
      )
    );
  } else {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ ...payload, results }, null, 2));
  }

  if (failed.length) {
    process.exit(1);
  }
}

run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
