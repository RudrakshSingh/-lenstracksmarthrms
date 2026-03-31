#!/usr/bin/env node
/**
 * Lightweight API smoke (no MongoDB required).
 * Verifies app boots, health, and auth gate on protected routes.
 *
 * Usage: npm run smoke   (from microservices/jts-service)
 */
process.env.NODE_ENV = 'test';
process.env.ENABLE_BACKGROUND_JOBS = 'false';
// Ensure internal API is "disabled" for smoke (503), not 401 from missing header when parent shell has token set
process.env.JTS_INTERNAL_SERVICE_TOKEN = '';

const request = require('supertest');
const { createApp } = require('../src/createApp');

async function main() {
  const app = createApp();
  const checks = [];

  let r = await request(app).get('/health');
  checks.push({ name: 'GET /health', ok: r.status === 200, status: r.status });

  r = await request(app).get('/api/v1/health');
  checks.push({ name: 'GET /api/v1/health', ok: r.status === 200, status: r.status });

  r = await request(app).get('/api/jts/tasks');
  checks.push({
    name: 'GET /api/jts/tasks without Authorization -> 401',
    ok: r.status === 401,
    status: r.status
  });

  r = await request(app).get('/api/jts/tasks/summary/me');
  checks.push({
    name: 'GET /api/jts/tasks/summary/me without Authorization -> 401',
    ok: r.status === 401,
    status: r.status
  });

  r = await request(app).get('/api/jts/analytics');
  checks.push({
    name: 'GET /api/jts/analytics without Authorization -> 401',
    ok: r.status === 401,
    status: r.status
  });

  r = await request(app).get('/api/jts/catalog/org-nodes');
  checks.push({
    name: 'GET /api/jts/catalog/org-nodes without Authorization -> 401',
    ok: r.status === 401,
    status: r.status
  });

  r = await request(app).get('/api/jts/internal/tenant-analytics');
  checks.push({
    name: 'GET internal/tenant-analytics without JTS_INTERNAL_SERVICE_TOKEN -> 503',
    ok: r.status === 503,
    status: r.status
  });

  const failed = checks.filter((c) => !c.ok);
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        ok: failed.length === 0,
        passed: checks.length - failed.length,
        failed: failed.length,
        checks
      },
      null,
      2
    )
  );

  if (failed.length) {
    process.exit(1);
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
