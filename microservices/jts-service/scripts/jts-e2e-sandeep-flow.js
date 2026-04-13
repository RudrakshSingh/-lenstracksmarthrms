#!/usr/bin/env node
/**
 * Sandeep / any tenant user — full JTS smoke (prod-safe titles with timestamp).
 *
 *   cd microservices/jts-service
 *   JTS_AUTH_EMAIL=sandeep@lenstrack.com JTS_AUTH_PASSWORD='***' node scripts/jts-e2e-sandeep-flow.js
 *
 * Env:
 *   JTS_CONTRACT_BASE_URL  default https://api.etelios.com
 *   JTS_TENANT_ID         default lenstrack (sent as login body tenantId + X-Tenant-Id after token)
 */
const path = require('path');
const axios = require('axios');
const jwt = require('jsonwebtoken');

try {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });
} catch (_) {}
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (_) {}

const BASE = (process.env.JTS_CONTRACT_BASE_URL || 'https://api.etelios.com').replace(/\/$/, '');
const EMAIL = (process.env.JTS_AUTH_EMAIL || 'sandeep@lenstrack.com').trim();
const PASSWORD = (
  process.env.JTS_AUTH_PASSWORD ||
  process.env.SANDEEP_PASSWORD ||
  process.env.LENSTRACK_SANDEEP_PASSWORD ||
  ''
).trim();
const TENANT_ID = (process.env.JTS_TENANT_ID || 'lenstrack').trim().toLowerCase();

const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');

const results = [];

function log(step, ok, detail = '') {
  const line = `${ok ? 'PASS' : 'FAIL'} ${step}${detail ? ` — ${detail}` : ''}`;
  results.push(line);
  console.log(line);
}

async function main() {
  if (!PASSWORD) {
    console.error(
      'Set JTS_AUTH_PASSWORD or SANDEEP_PASSWORD (optional JTS_AUTH_EMAIL). Repo root .env is loaded first.'
    );
    process.exit(1);
  }

  const api = axios.create({ baseURL: BASE, timeout: 90000, validateStatus: () => true });
  const tag = stamp();

  // 1 Health
  let r = await api.get('/jts/health');
  log(
    'GET /jts/health',
    r.status === 200 && r.data?.status === 'healthy',
    `HTTP ${r.status}`
  );

  // 2 Login
  r = await api.post('/api/auth/login', {
    email: EMAIL,
    password: PASSWORD,
    tenantId: TENANT_ID
  });
  if (r.status !== 200 || !(r.data?.data?.accessToken || r.data?.accessToken)) {
    log('POST /api/auth/login', false, `HTTP ${r.status} ${JSON.stringify(r.data).slice(0, 200)}`);
    process.exit(1);
  }
  const wrap = r.data.data || r.data;
  const token = wrap.accessToken || wrap.access_token || wrap.token;
  const tenantId = String(wrap.user?.tenantId || wrap.user?.tenant_id || '');
  const dec = jwt.decode(token) || {};
  const tid = tenantId || String(dec.tid || dec.tenantId || '');
  log('POST /api/auth/login', true, `tenant=${tid} role=${wrap.user?.role || dec.rol}`);

  const H = { Authorization: `Bearer ${token}`, 'X-Tenant-Id': tid };

  // 3 Catalog
  r = await api.get('/jts/catalog/tenant/current', { headers: H });
  log('GET /jts/catalog/tenant/current', r.status === 200, `HTTP ${r.status}`);

  r = await api.get('/jts/catalog/org-nodes', { headers: H, params: { page: 1, limit: 5 } });
  log('GET /jts/catalog/org-nodes', r.status === 200, `HTTP ${r.status}`);
  const org0 = r.data?.data?.[0] || r.data?.data?.items?.[0];
  const orgId = org0?._id || org0?.id;

  r = await api.get('/jts/catalog/task-types', { headers: H, params: { page: 1, limit: 5 } });
  log('GET /jts/catalog/task-types', r.status === 200, `HTTP ${r.status}`);
  const tt0 = r.data?.data?.[0] || r.data?.data?.items?.[0];
  const typeId = tt0?._id || tt0?.id;

  r = await api.get('/jts/catalog/employees', { headers: H, params: { page: 1, limit: 50 } });
  log('GET /jts/catalog/employees', r.status === 200, `HTTP ${r.status}`);
  const emps = r.data?.data || r.data?.items || [];
  const list = Array.isArray(emps) ? emps : emps.items || [];
  const me = list.find(
    (e) =>
      String(e.email || '')
        .toLowerCase()
        .includes('sandeep') || String(e.code || '').includes('ETE-2026-054317')
  );
  const myEmpId = me?._id || me?.id;
  log('resolve Sandeep employee row', !!myEmpId, myEmpId ? String(myEmpId) : 'not in first page');

  // 4 Self-task (compat)
  r = await api.post(
    '/jts/self-tasks',
    {
      title: `E2E self-task ${tag}`,
      description: 'automated jts-e2e',
      priority: 'MEDIUM'
    },
    { headers: { ...H, 'Content-Type': 'application/json' } }
  );
  const selfTaskId = r.data?.data?.id || r.data?.data?._id;
  log('POST /jts/self-tasks', r.status === 201 || r.status === 200, `HTTP ${r.status} id=${selfTaskId || 'n/a'}`);

  r = await api.get('/jts/self-tasks/my', { headers: H, params: { page: 1, limit: 10 } });
  log('GET /jts/self-tasks/my', r.status === 200, `HTTP ${r.status}`);

  r = await api.get('/jts/tasks/my', { headers: H, params: { page: 1, limit: 10 } });
  log('GET /jts/tasks/my', r.status === 200, `HTTP ${r.status}`);

  // 5 Manager create + assign to self (needs MANAGER+ on route)
  let mgrTaskId = null;
  if (myEmpId && typeId) {
    r = await api.post(
      '/jts/tasks',
      {
        title: `E2E manager assign self ${tag}`,
        description: 'e2e',
        priority: 'MEDIUM',
        assignedToEmployeeId: String(myEmpId),
        type_id: String(typeId),
        scope_org_node_id: orgId ? String(orgId) : undefined
      },
      { headers: { ...H, 'Content-Type': 'application/json' } }
    );
    mgrTaskId = r.data?.data?.id || r.data?.data?._id;
    log(
      'POST /jts/tasks (assign self)',
      r.status === 201 || r.status === 200,
      `HTTP ${r.status} id=${mgrTaskId || JSON.stringify(r.data).slice(0, 120)}`
    );
  } else {
    log('POST /jts/tasks (assign self)', false, 'skip: missing myEmpId or typeId from catalog');
  }

  const taskId = mgrTaskId || selfTaskId;

  if (taskId) {
    r = await api.get(`/jts/tasks/${taskId}`, { headers: H });
    log('GET /jts/tasks/:id', r.status === 200, `HTTP ${r.status}`);

    r = await api.get(`/jts/tasks/${taskId}/sla`, { headers: H });
    log('GET /jts/tasks/:id/sla', r.status === 200, `HTTP ${r.status}`);

    r = await api.get(`/jts/tasks/${taskId}/activities`, { headers: H, params: { limit: 20 } });
    log('GET /jts/tasks/:id/activities', r.status === 200, `HTTP ${r.status}`);

    // Lifecycle: accept if ASSIGNED
    r = await api.post(`/jts/tasks/${taskId}/accept`, {}, { headers: { ...H, 'Content-Type': 'application/json' } });
    log('POST /jts/tasks/:id/accept', r.status < 500, `HTTP ${r.status}`);

    r = await api.post(
      `/jts/tasks/${taskId}/start`,
      {},
      { headers: { ...H, 'Content-Type': 'application/json' } }
    );
    log('POST /jts/tasks/:id/start', r.status < 500, `HTTP ${r.status}`);

    // Extension: approving EXTENSION_APPROVAL must update task.due_at (backend side effect)
    if (myEmpId) {
      r = await api.get(`/jts/tasks/${taskId}`, { headers: H });
      const t0 = r.data?.data;
      const beforeDue = t0?.due_at || t0?.dueAt;
      const extendTo = new Date();
      extendTo.setDate(extendTo.getDate() + 5);
      r = await api.post(
        `/jts/tasks/${taskId}/approvals`,
        {
          approver_employee_id: String(myEmpId),
          approval_type: 'EXTENSION_APPROVAL',
          payload: { newDueAt: extendTo.toISOString() }
        },
        { headers: { ...H, 'Content-Type': 'application/json' } }
      );
      const apprId = r.data?.data?._id || r.data?.data?.id;
      log(
        'POST /jts/tasks/:id/approvals (EXTENSION)',
        r.status === 201 || r.status === 200,
        `HTTP ${r.status} approval=${apprId || 'n/a'}`
      );
      if (apprId) {
        r = await api.post(
          `/jts/approvals/${apprId}/approve`,
          { notes: 'e2e extension' },
          { headers: { ...H, 'Content-Type': 'application/json' } }
        );
        log('POST /jts/approvals/:id/approve (extension)', r.status === 200, `HTTP ${r.status}`);
        r = await api.get(`/jts/tasks/${taskId}`, { headers: H });
        const t1 = r.data?.data;
        const afterDue = t1?.due_at || t1?.dueAt;
        const extOk =
          !!beforeDue &&
          !!afterDue &&
          new Date(afterDue).getTime() !== new Date(beforeDue).getTime();
        log(
          'GET task after extension (due_at changed)',
          extOk,
          extOk ? 'ok' : `before=${beforeDue} after=${afterDue}`
        );
      } else {
        log('GET task after extension (due_at changed)', false, 'no approval id from create');
      }
    } else {
      log('POST /jts/tasks/:id/approvals (EXTENSION)', false, 'skip: no myEmpId');
    }

    r = await api.post(
      `/jts/tasks/${taskId}/timer/start`,
      {},
      { headers: { ...H, 'Content-Type': 'application/json' } }
    );
    log(
      'POST /jts/tasks/:id/timer/start',
      r.status === 200 || r.status === 400,
      `HTTP ${r.status} ${r.data?.code || r.data?.message || ''}`.slice(0, 120)
    );

    if (r.status === 200) {
      r = await api.post(
        `/jts/tasks/${taskId}/timer/pause`,
        {},
        { headers: { ...H, 'Content-Type': 'application/json' } }
      );
      log('POST /jts/tasks/:id/timer/pause', r.status < 500, `HTTP ${r.status}`);
    }

    r = await api.get(`/jts/tasks/${taskId}/timer`, { headers: H });
    log('GET /jts/tasks/:id/timer', r.status === 200 || r.status === 404, `HTTP ${r.status}`);

    r = await api.patch(
      `/jts/tasks/${taskId}/status`,
      { status: 'IN_PROGRESS' },
      { headers: { ...H, 'Content-Type': 'application/json' } }
    );
    const stOk =
      (r.status >= 200 && r.status < 300) ||
      (r.status === 400 && String(r.data?.code || '').includes('STATUS'));
    log(
      'PATCH /jts/tasks/:id/status',
      stOk,
      `HTTP ${r.status} ${r.status === 400 ? '(ok if already IN_PROGRESS after /start)' : ''}`
    );

    r = await api.post(
      `/jts/tasks/${taskId}/complete`,
      { notes: `e2e done ${tag}` },
      { headers: { ...H, 'Content-Type': 'application/json' } }
    );
    log('POST /jts/tasks/:id/complete', r.status < 500, `HTTP ${r.status} ${r.data?.code || ''}`);

    r = await api.post(
      `/jts/tasks/${taskId}/rate`,
      { rating: 4, comments: 'e2e rating' },
      { headers: { ...H, 'Content-Type': 'application/json' } }
    );
    log('POST /jts/tasks/:id/rate', r.status < 500, `HTTP ${r.status} ${r.data?.code || ''}`);

    r = await api.delete(`/jts/tasks/${taskId}`, { headers: H });
    log('DELETE /jts/tasks/:id (soft-delete)', r.status === 204, `HTTP ${r.status}`);
  }

  // 6 SLA + summary
  r = await api.get('/jts/tasks/sla/alerts', { headers: H, params: { limit: 20 } });
  log('GET /jts/tasks/sla/alerts', r.status === 200, `HTTP ${r.status}`);

  r = await api.get('/jts/tasks/sla/executive-summary', { headers: H, params: { hours: 24, recentLimit: 5 } });
  log('GET /jts/tasks/sla/executive-summary', r.status === 200 || r.status === 403, `HTTP ${r.status}`);

  const today = new Date().toISOString().slice(0, 10);
  r = await api.get('/jts/tasks/summary/me', { headers: H, params: { date: today } });
  log('GET /jts/tasks/summary/me', r.status === 200, `HTTP ${r.status}`);

  // 7 Compat analytics / reviews
  r = await api.get('/jts/analytics', { headers: H, params: { timeRange: '6months' } });
  log('GET /jts/analytics', r.status === 200 || r.status === 403, `HTTP ${r.status}`);

  r = await api.get('/jts/reviews', { headers: H, params: { limit: 5 } });
  log('GET /jts/reviews', r.status === 200 || r.status === 403, `HTTP ${r.status}`);

  r = await api.get('/jts/approvals/pending', { headers: H });
  log('GET /jts/approvals/pending', r.status === 200, `HTTP ${r.status}`);

  r = await api.get('/jts/tasks', { headers: H, params: { page: 1, limit: 5 } });
  log('GET /jts/tasks', r.status === 200, `HTTP ${r.status} total=${r.data?.total}`);

  const failed = results.filter((l) => l.startsWith('FAIL')).length;
  console.log('\n---');
  console.log(`Done. FAIL count: ${failed} / ${results.length}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
