#!/usr/bin/env node
/**
 * Apply a daily store roster in production (or any environment) via HR API bulk upsert.
 * Frontend reads GET /api/hr/roster?date=YYYY-MM-DD — entries created here show after cache TTL (~20s).
 *
 * Required env (one of):
 *   - HR_ACCESS_TOKEN + HR_TENANT_ID + ROSTER_API_BASE
 *   - ROSTER_LOGIN_EMAIL + ROSTER_LOGIN_PASSWORD + ROSTER_API_BASE
 *     Password with ! → use single quotes in zsh/bash: ROSTER_LOGIN_PASSWORD='AdminPass123!'
 *     Or ROSTER_LOGIN_PASSWORD_FILE=/path/to/file (one line, no newline). Do not use … as password.
 *
 * Optional:
 *   ROSTER_DATE=2026-04-01   (default: today UTC)
 *   APPLY=1                  (without this, only resolves and prints planned rows; no POST)
 *   STORE_CODE_OVERRIDES='{"Pn":"PN","Shk":"SHK"}'  JSON map label -> exact store code in DB
 *   EMPLOYEE_ID_OVERRIDES='{"Golu":"EMP-XXX"}'     JSON map first-name token -> employeeId string
 *
 * Usage:
 *   ROSTER_API_BASE=https://your-gateway APPLY=1 ROSTER_LOGIN_EMAIL=... ROSTER_LOGIN_PASSWORD=... node scripts/apply-jts-daily-roster.js
 */

const ROSTER_API_BASE = (process.env.ROSTER_API_BASE || process.env.API_BASE || '').replace(/\/$/, '');
const HR_TENANT_ID = process.env.HR_TENANT_ID || process.env.X_TENANT_ID || '';
const APPLY = process.env.APPLY === '1' || process.env.APPLY === 'true';

function rosterDate() {
  if (process.env.ROSTER_DATE) return process.env.ROSTER_DATE.trim();
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 01/04/26 roster — store label -> display names (matched against employee search). */
const JTS_ROSTER_2026_04_01 = {
  Shk: ['Amit', 'Golu'],
  RKC: ['Kishan', 'Anchala', 'kaveri'],
  NRN: ['Anita', 'Mahima', 'Praveen'],
  Pn: ['Mahendra', 'Pooja'],
  Mowa: ['Ajeet', 'Shahrukh'],
  BP: ['Rizwan', 'Madhu'],
  MD: ['Sumit', 'Madhuri', 'Shubham']
};

/** Lenstrack tenant: JTS sheet labels -> HR store `code` (from store list). */
const LENSTRACK_STORE_LABEL_TO_CODE = {
  Shk: 'LT-2',
  RKC: 'RKC',
  NRN: 'LT-6',
  Pn: 'LT-8',
  Mowa: 'LT-11',
  BP: 'LT-13',
  MD: 'LT-1'
};

let storeCodeOverrides = {};
let employeeIdOverrides = {};
try {
  if (process.env.STORE_CODE_OVERRIDES) {
    storeCodeOverrides = JSON.parse(process.env.STORE_CODE_OVERRIDES);
  }
} catch (e) {
  console.error('Invalid STORE_CODE_OVERRIDES JSON:', e.message);
  process.exit(1);
}
try {
  if (process.env.EMPLOYEE_ID_OVERRIDES) {
    employeeIdOverrides = JSON.parse(process.env.EMPLOYEE_ID_OVERRIDES);
  }
} catch (e) {
  console.error('Invalid EMPLOYEE_ID_OVERRIDES JSON:', e.message);
  process.exit(1);
}

const DEFAULT_FETCH_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'apply-jts-daily-roster/1 (+https://github.com/lenstrack)'
};

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...DEFAULT_FETCH_HEADERS,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
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

function extractEmployeeList(body) {
  if (!body || !body.success) return [];
  const d = body.data;
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.employees)) return d.employees;
  return [];
}

function extractStoreList(body) {
  if (!body || !body.success) return [];
  const d = body.data;
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.stores)) return d.stores;
  return [];
}

function norm(s) {
  return String(s || '')
    .trim()
    .toLowerCase();
}

function titleCaseToken(s) {
  const t = String(s || '').trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

function pickEmployeeForName(nameToken, candidates) {
  const key = norm(nameToken);
  if (employeeIdOverrides[nameToken] || employeeIdOverrides[key]) {
    const id = employeeIdOverrides[nameToken] || employeeIdOverrides[key];
    const byId = candidates.find(
      (e) =>
        norm(e.employeeId) === norm(id) ||
        norm(e.employee_id) === norm(id) ||
        norm(e._id) === norm(id)
    );
    if (byId) return byId;
  }

  const exact = candidates.filter((e) => {
    const fn = norm(e.firstName);
    const ln = norm(e.lastName);
    const full = `${fn} ${ln}`.trim();
    return fn === key || ln === key || full === key;
  });
  if (exact.length === 1) return exact[0];
  // Single search hit: first or last name must equal token (no substring — avoids wrong person / duplicates)
  if (exact.length === 0 && candidates.length === 1 && key.length >= 2) {
    const e = candidates[0];
    const fn = norm(e.firstName);
    const ln = norm(e.lastName);
    if (fn === key || ln === key) return e;
  }
  if (exact.length > 1) {
    const onlyActive = exact.filter((e) => norm(e.status) === 'active' || norm(e.status) === '');
    if (onlyActive.length === 1) return onlyActive[0];
    throw new Error(
      `Ambiguous name "${nameToken}": ${exact.map((e) => `${e.firstName} ${e.lastName} (${e.employeeId || e._id})`).join('; ')}`
    );
  }
  return null;
}

function resolveStore(storeLabel, stores, tenantId) {
  const t = norm(tenantId || '');
  const lenstrackDefault =
    t === 'lenstrack'
      ? LENSTRACK_STORE_LABEL_TO_CODE[storeLabel] ||
        LENSTRACK_STORE_LABEL_TO_CODE[
          Object.keys(LENSTRACK_STORE_LABEL_TO_CODE).find((k) => norm(k) === norm(storeLabel)) || ''
        ]
      : null;
  const override =
    storeCodeOverrides[storeLabel] ||
    storeCodeOverrides[norm(storeLabel)] ||
    lenstrackDefault;
  if (override) {
    const s = stores.find((x) => norm(x.code) === norm(override));
    if (s) return s;
    throw new Error(`STORE_CODE_OVERRIDES: no store with code "${override}"`);
  }

  const aliases = [
    storeLabel,
    storeLabel.toUpperCase(),
    storeLabel.toLowerCase()
  ];
  if (norm(storeLabel) === 'pn') aliases.push('PN', 'Pn');
  if (norm(storeLabel) === 'mowa') aliases.push('MOWA', 'mowa');

  for (const a of aliases) {
    const byCode = stores.find((x) => norm(x.code) === norm(a));
    if (byCode) return byCode;
  }
  const loose = stores.find(
    (x) =>
      norm(x.name).includes(norm(storeLabel)) ||
      norm(storeLabel).includes(norm(x.code))
  );
  if (loose) return loose;
  throw new Error(
    `No store for label "${storeLabel}". Set STORE_CODE_OVERRIDES. Known codes: ${stores.map((s) => s.code).filter(Boolean).join(', ')}`
  );
}

function employeeRosterId(emp) {
  return emp.employeeId || emp.employee_id || emp._id || emp.id;
}

function readPasswordFromEnv() {
  const file = process.env.ROSTER_LOGIN_PASSWORD_FILE;
  if (file) {
    const fs = require('fs');
    return fs.readFileSync(file, 'utf8').trim();
  }
  return process.env.ROSTER_LOGIN_PASSWORD || '';
}

function loginErrorHint(status, data) {
  const raw = typeof data?.raw === 'string' ? data.raw : '';
  const isHtml = /<!DOCTYPE|<html/i.test(raw);
  const lines = [
    isHtml || status === 400
      ? 'Server returned non-JSON (often invalid request body). Check:'
      : null,
    isHtml
      ? '  • Password: use your REAL password, not the … ellipsis from examples.'
      : null,
    '  • Shell: if password contains ! use SINGLE quotes: ROSTER_LOGIN_PASSWORD=\'YourPass!\'',
    '  • Or avoid password in shell: ROSTER_LOGIN_PASSWORD_FILE=/path/to/secret.txt',
    '  • Or login via browser/curl and pass HR_ACCESS_TOKEN + HR_TENANT_ID instead.'
  ].filter(Boolean);
  return lines.join('\n');
}

async function login(base, email, password) {
  const pwd = password;
  if (!pwd || pwd === '\u2026' || pwd === '…' || /^\.{3}$/.test(pwd)) {
    throw new Error(
      'ROSTER_LOGIN_PASSWORD is missing or still the placeholder (…). Set a real password or use HR_ACCESS_TOKEN.'
    );
  }
  const payload = { email, password: pwd };
  if (HR_TENANT_ID) payload.tenantId = HR_TENANT_ID;
  let body;
  try {
    body = JSON.stringify(payload);
  } catch (e) {
    throw new Error(`Could not build login JSON: ${e.message}`);
  }
  const authPath = process.env.ROSTER_AUTH_PATH || '/api/auth/login';
  const url = `${base.replace(/\/$/, '')}${authPath.startsWith('/') ? '' : '/'}${authPath}`;
  const headers = { ...DEFAULT_FETCH_HEADERS, 'Content-Type': 'application/json' };
  if (HR_TENANT_ID) headers['X-Tenant-Id'] = HR_TENANT_ID;
  const res = await fetch(url, { method: 'POST', headers, body });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  const status = res.status;
  if (status !== 200 || !data.success) {
    const hint = loginErrorHint(status, data);
    throw new Error(`Login failed (${status}): ${JSON.stringify(data).slice(0, 500)}${hint ? `\n${hint}` : ''}`);
  }
  const inner = data.data && typeof data.data === 'object' ? data.data : data;
  const token =
    inner.accessToken ||
    inner.token ||
    data.accessToken ||
    data.data?.accessToken;
  const user = inner.user || data.data?.user || data.user;
  const tenantId = user?.tenantId || HR_TENANT_ID;
  if (!token) throw new Error('Login ok but no accessToken in response');
  return { token, tenantId: (tenantId || 'default').toString().toLowerCase() };
}

async function main() {
  if (!ROSTER_API_BASE) {
    console.error('Set ROSTER_API_BASE (or API_BASE) to your API gateway URL.');
    process.exit(1);
  }

  const date = rosterDate();
  let token = process.env.HR_ACCESS_TOKEN;
  let tenantId = HR_TENANT_ID;

  if (!token) {
    const email = process.env.ROSTER_LOGIN_EMAIL;
    const password = readPasswordFromEnv();
    if (!email || !password) {
      console.error(
        'Provide HR_ACCESS_TOKEN + HR_TENANT_ID, or ROSTER_LOGIN_EMAIL + ROSTER_LOGIN_PASSWORD (or ROSTER_LOGIN_PASSWORD_FILE).'
      );
      process.exit(1);
    }
    const session = await login(ROSTER_API_BASE, email, password);
    token = session.token;
    tenantId = tenantId || session.tenantId;
  }

  if (!tenantId) {
    console.error('Set HR_TENANT_ID (or X_TENANT_ID) when using HR_ACCESS_TOKEN.');
    process.exit(1);
  }

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'X-Tenant-Id': tenantId
  };

  const storesRes = await fetchJson(
    `${ROSTER_API_BASE}/api/hr/stores?page=1&limit=500`,
    { headers: authHeaders }
  );
  const stores = extractStoreList(storesRes.data);
  if (stores.length === 0) {
    console.error('No stores returned:', storesRes.status, JSON.stringify(storesRes.data).slice(0, 500));
    process.exit(1);
  }

  const entries = [];
  const errors = [];

  for (const [label, names] of Object.entries(JTS_ROSTER_2026_04_01)) {
    let store;
    try {
      store = resolveStore(label, stores, tenantId);
    } catch (e) {
      errors.push(`${label}: ${e.message}`);
      continue;
    }
    const storeId = store.code || store._id || store.id;

    for (const rawName of names) {
      const nameToken = rawName.trim();
      const search = encodeURIComponent(nameToken);
      let list = extractEmployeeList(
        (
          await fetchJson(
            `${ROSTER_API_BASE}/api/hr/employees?search=${search}&limit=50&page=1`,
            { headers: authHeaders }
          )
        ).data
      );
      if (list.length === 0 && nameToken !== titleCaseToken(nameToken)) {
        const alt = encodeURIComponent(titleCaseToken(nameToken));
        list = extractEmployeeList(
          (
            await fetchJson(
              `${ROSTER_API_BASE}/api/hr/employees?search=${alt}&limit=50&page=1`,
              { headers: authHeaders }
            )
          ).data
        );
      }
      let emp;
      try {
        emp = pickEmployeeForName(nameToken, list);
      } catch (e) {
        errors.push(`${label} / ${nameToken}: ${e.message}`);
        continue;
      }
      if (!emp) {
        errors.push(`${label} / ${nameToken}: no unique employee match (search returned ${list.length})`);
        continue;
      }

      entries.push({
        employeeId: employeeRosterId(emp),
        storeId,
        date,
        shift: 'FULL_DAY',
        notes: `JTS roster ${date} (${label})`
      });
    }
  }

  console.log(`Tenant: ${tenantId}\nDate: ${date}\nResolved entries: ${entries.length}\n`);
  for (const e of entries) {
    console.log(`  ${e.date} | ${e.storeId} | emp ${e.employeeId} | ${e.shift}`);
  }
  if (errors.length) {
    console.log('\nIssues:');
    errors.forEach((x) => console.log(`  - ${x}`));
  }

  if (errors.length && entries.length === 0) {
    process.exit(1);
  }

  if (!APPLY) {
    console.log('\nDry run only. Set APPLY=1 to POST /api/hr/roster/bulk');
    process.exit(errors.length ? 2 : 0);
  }

  const bulk = await fetchJson(`${ROSTER_API_BASE}/api/hr/roster/bulk`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ entries })
  });

  const msg = String(bulk.data?.message || bulk.data?.error || '');
  const useSinglePost =
    bulk.status === 404 || /route not found|not found/i.test(msg) || /not found/i.test(JSON.stringify(bulk.data));

  if (useSinglePost) {
    console.log('\nBulk roster not available; applying via POST /api/hr/roster per entry...');
    let ok = 0;
    let fail = 0;
    for (const entry of entries) {
      const one = await fetchJson(`${ROSTER_API_BASE}/api/hr/roster`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(entry)
      });
      const okStatus = one.status >= 200 && one.status < 300;
      if (okStatus && one.data?.success !== false) {
        ok++;
      } else {
        fail++;
        console.error('  FAIL', entry.employeeId, entry.storeId, one.status, JSON.stringify(one.data).slice(0, 200));
      }
    }
    console.log(`\nSingle POST roster: ${ok} ok, ${fail} failed`);
    if (fail > 0) process.exit(1);
    return;
  }

  console.log('\nBulk API:', bulk.status, JSON.stringify(bulk.data, null, 2));
  if (bulk.status >= 400 || bulk.data?.success === false) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
