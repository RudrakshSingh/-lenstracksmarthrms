#!/usr/bin/env node
/**
 * Lenstrack tenant: create employee, full HR onboarding, then hit view/read APIs.
 *
 * Usage (from repo root):
 *   LENSTRACK_ADMIN_PASSWORD='***' node scripts/lenstrack-onboard-full-and-view-apis.js
 *
 * Env:
 *   API_BASE_URL or JTS_CONTRACT_BASE_URL — default https://api.etelios.com (no /api suffix)
 *   LENSTRACK_ADMIN_EMAIL — default admin@lenstrack.com
 *   LENSTRACK_ADMIN_PASSWORD — required (or ADMIN_PASSWORD)
 *   TENANT_ID — default lenstrack
 */
const path = require('path');
const root = path.join(__dirname, '..');
try {
  require('dotenv').config({ path: path.join(root, '.env') });
} catch (_) {}

const rawBase =
  process.env.API_BASE_URL ||
  process.env.JTS_CONTRACT_BASE_URL ||
  process.env.BACKEND_URL ||
  'https://api.etelios.com';
const BASE = String(rawBase).replace(/\/+$/, '').replace(/\/api\/?$/, '');

const ADMIN_EMAIL = (process.env.LENSTRACK_ADMIN_EMAIL || 'admin@lenstrack.com').trim().toLowerCase();
const ADMIN_PASSWORD = (
  process.env.LENSTRACK_ADMIN_PASSWORD ||
  process.env.ADMIN_PASSWORD ||
  ''
).trim();
const TENANT = (process.env.TENANT_ID || 'lenstrack').trim().toLowerCase();

const ts = Date.now();
const EMP_CODE = `LENSTRACK-EMP-${ts}`;
const EMP_EMAIL = `lenstrack.employee.${ts}@lenstrack.com`.toLowerCase();
const EMP_PASSWORD = process.env.NEW_EMP_PASSWORD || 'TestEmployee@123';
const EMP_PHONE = '+919876543210';
const PLACEHOLDER_DOC = 'https://example.com/lenstrack-onboarding-doc-placeholder.png';

function headers(token, tenantId, extra = {}) {
  const h = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...extra,
  };
  if (token) h.Authorization = `Bearer ${token}`;
  if (tenantId) h['X-Tenant-Id'] = String(tenantId).toLowerCase().trim();
  return h;
}

async function req(method, pathname, { token, tenantId, body, query } = {}) {
  const pathPart = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const url = new URL(BASE + pathPart);
  if (query) {
    Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }
  const res = await fetch(url, {
    method,
    headers: headers(token, tenantId),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { _raw: text.slice(0, 400) };
  }
  return { status: res.status, data, ok: res.ok };
}

function logResult(label, { status, data, ok }) {
  const err = data?.error || data?.message;
  const short = err && String(err).length > 120 ? `${String(err).slice(0, 120)}…` : err;
  console.log(`${ok ? 'OK ' : 'FAIL'} [${status}] ${label}${short && !ok ? ` — ${short}` : ''}`);
  return ok;
}

function unwrap(inner) {
  return inner?.data?.data ?? inner?.data ?? inner;
}

async function main() {
  if (!ADMIN_PASSWORD) {
    console.error(
      'Set LENSTRACK_ADMIN_PASSWORD (or ADMIN_PASSWORD). Example:\n' +
        `  LENSTRACK_ADMIN_PASSWORD='your-admin-password' node scripts/lenstrack-onboard-full-and-view-apis.js`
    );
    process.exit(1);
  }

  console.log('API base:', BASE);
  console.log('Tenant:', TENANT);
  console.log('New employee code:', EMP_CODE, '| email:', EMP_EMAIL);
  console.log('---');

  let r = await req('POST', '/api/auth/login', {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, tenantId: TENANT },
  });
  if (!logResult('Admin login', r)) {
    console.error(JSON.stringify(r.data).slice(0, 500));
    process.exit(1);
  }
  const loginWrap = unwrap(r.data);
  const adminToken = loginWrap.accessToken || loginWrap.access_token;
  const jwtTenant = String(loginWrap.user?.tenantId || loginWrap.user?.tenant_id || TENANT)
    .toLowerCase()
    .trim();

  const depRes = await req('GET', '/api/hr/departments', { token: adminToken, tenantId: jwtTenant });
  const departments = unwrap(depRes.data);
  const deptList = Array.isArray(departments) ? departments : departments?.data || [];
  const deptName = deptList[0]?.name || deptList[0]?.departmentName || 'IT';
  const deptId = deptList[0]?._id || deptList[0]?.id;

  const storeRes = await req('GET', '/api/hr/stores', {
    token: adminToken,
    tenantId: jwtTenant,
    query: { page: 1, limit: 5 },
  });
  const storesPayload = unwrap(storeRes.data);
  const storesList = Array.isArray(storesPayload)
    ? storesPayload
    : storesPayload?.data || [];
  const storeId = storesList[0]?._id || storesList[0]?.id || '';

  console.log('Using department:', deptName, deptId ? `(id ${deptId})` : '');
  console.log('Using store:', storeId || '(none)');
  console.log('---');

  r = await req('POST', '/api/hr/employees', {
    token: adminToken,
    tenantId: jwtTenant,
    body: {
      employeeId: EMP_CODE,
      firstName: 'Onboard',
      lastName: 'TestUser',
      fullName: 'Onboard TestUser',
      email: EMP_EMAIL,
      password: EMP_PASSWORD,
      phone: '9876543210',
      department: deptName,
      jobTitle: 'Associate',
      designation: 'Associate',
      roleName: 'Employee',
      doj: new Date().toISOString().slice(0, 10),
      status: 'active',
      storeId: storeId || undefined,
    },
  });
  if (!logResult('Create employee (HR)', r)) {
    console.error(JSON.stringify(r.data).slice(0, 600));
    process.exit(1);
  }
  const created = unwrap(r.data);
  const mongoId = created.id || created._id;
  if (!mongoId) {
    console.error('No mongo id in create response', JSON.stringify(created).slice(0, 400));
    process.exit(1);
  }

  r = await req('POST', '/api/hr/onboarding/work-details', {
    token: adminToken,
    tenantId: jwtTenant,
    body: {
      employeeId: EMP_CODE,
      jobTitle: 'Associate',
      department: deptName,
      designation: 'Associate',
      role_family: 'Operations',
      joining_date: new Date().toISOString(),
      storeId: storeId || undefined,
      workMode: 'BACKOFFICE',
      attendancePolicy: 'NO_GEOFENCE',
      employee_status: 'ACTIVE',
      annual_ctc: 600000,
      pf_applicable: true,
      esic_applicable: false,
      pt_applicable: true,
      tds_applicable: true,
    },
  });
  logResult('Onboarding work-details', r);

  r = await req('POST', '/api/hr/onboarding/personal-details', {
    token: adminToken,
    tenantId: jwtTenant,
    body: {
      employee_id: EMP_CODE,
      name: 'Onboard TestUser',
      email: EMP_EMAIL,
      phone: EMP_PHONE,
      date_of_birth: '1995-06-15',
      gender: 'Male',
      address: {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country: 'India',
      },
    },
  });
  logResult('Onboarding personal-details', r);

  r = await req('POST', '/api/hr/onboarding/statutory-info', {
    token: adminToken,
    tenantId: jwtTenant,
    body: {
      employeeId: EMP_CODE,
      bankAccount: {
        account_number: '123456789012',
        ifsc_code: 'HDFC0001234',
        bank_name: 'HDFC Bank',
        account_type: 'Salary',
      },
      panNumber: 'ABCDE1234F',
    },
  });
  logResult('Onboarding statutory-info', r);

  r = await req('POST', '/api/hr/onboarding/documents', {
    token: adminToken,
    tenantId: jwtTenant,
    body: {
      employeeId: EMP_CODE,
      documents: [
        { type: 'PHOTO', url: PLACEHOLDER_DOC },
        { type: 'AADHAR', url: PLACEHOLDER_DOC },
      ],
    },
  });
  logResult('Onboarding documents', r);

  r = await req('POST', `/api/hr/onboarding/complete/${mongoId}`, {
    token: adminToken,
    tenantId: jwtTenant,
    body: {},
  });
  logResult('Onboarding complete', r);

  console.log('\n--- View APIs (admin token) ---');
  const viewChecks = [
    ['GET employee by id (full HR profile)', `/api/hr/employees/${mongoId}`],
    [
      'GET /api/hr/employee/:id (performance summary; uses same path as singular alias)',
      `/api/hr/employee/${mongoId}`,
    ],
    [
      'GET employees list (filter)',
      `/api/hr/employees?employeeId=${encodeURIComponent(EMP_CODE)}&page=1&limit=10`,
    ],
    ['GET onboarding draft', `/api/hr/onboarding/draft?employee_id=${encodeURIComponent(EMP_CODE)}`],
    [`GET documents for employee`, `/api/hr/documents/${mongoId}`],
    ['GET all documents (HR)', `/api/hr/documents`],
  ];

  for (const [label, path] of viewChecks) {
    const res = await req('GET', path, { token: adminToken, tenantId: jwtTenant });
    logResult(label, res);
  }

  if (deptId) {
    const res = await req('GET', `/api/hr/departments/${deptId}`, {
      token: adminToken,
      tenantId: jwtTenant,
    });
    logResult('GET department by id', res);
  }
  if (storeId) {
    const res = await req('GET', `/api/hr/stores/${storeId}`, {
      token: adminToken,
      tenantId: jwtTenant,
    });
    logResult('GET store by id', res);
  }

  console.log('\n--- Employee auth + profile views ---');
  r = await req('POST', '/api/auth/login', {
    body: { email: EMP_EMAIL, password: EMP_PASSWORD, tenantId: jwtTenant },
  });
  if (!logResult('Employee login', r)) {
    console.log('Skipping employee-scoped GETs (login failed).');
    console.log('\nSummary: created', EMP_CODE, '| mongoId', mongoId, '|', EMP_EMAIL);
    return;
  }
  const empWrap = unwrap(r.data);
  const empToken = empWrap.accessToken || empWrap.access_token;

  for (const path of ['/api/auth/profile', '/api/auth/me']) {
    const res = await req('GET', path, { token: empToken, tenantId: jwtTenant });
    logResult(path, res);
  }

  const selfEmp = await req('GET', `/api/hr/employees/${mongoId}`, {
    token: empToken,
    tenantId: jwtTenant,
  });
  logResult('GET own employee record (employee token)', selfEmp);

  console.log('\nSummary: created', EMP_CODE, '| mongoId', mongoId, '|', EMP_EMAIL, '| password (this run):', EMP_PASSWORD);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
