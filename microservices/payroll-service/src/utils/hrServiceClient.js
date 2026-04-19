const axios = require('axios');
const logger = require('../config/logger');

function getHrBaseUrl() {
  return (process.env.HR_SERVICE_URL || 'http://hr-service:3002').replace(/\/$/, '');
}

function buildHeaders({ authorization, tenantId, companyId, requestId } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (authorization) {
    headers.Authorization = authorization.startsWith('Bearer ')
      ? authorization
      : `Bearer ${authorization}`;
  }
  if (tenantId) headers['X-Tenant-Id'] = String(tenantId);
  if (companyId) headers['X-Company-Id'] = String(companyId);
  if (requestId) headers['X-Request-ID'] = String(requestId);
  return headers;
}

/**
 * Active employees for roster merge (payroll attendance preview).
 * HR list uses query.store / query.department (not storeId on HR side).
 */
async function fetchActiveEmployeeRoster(ctx, { storeId, departmentId, maxPages = 20 } = {}) {
  const base = getHrBaseUrl();
  const headers = buildHeaders(ctx);
  const roster = new Map();
  let page = 1;

  while (page <= maxPages) {
    const params = {
      page,
      limit: 1000,
      status: 'active'
    };
    if (storeId) params.store = storeId;
    if (departmentId) params.department = departmentId;

    let data;
    try {
      const res = await axios.get(`${base}/api/hr/employees`, { headers, params, timeout: 30000 });
      data = res.data;
    } catch (e) {
      logger.warn('[payroll->hr] roster fetch failed', {
        status: e.response?.status,
        message: e.response?.data?.message || e.message
      });
      throw e;
    }

    if (!data?.success || !Array.isArray(data.data)) break;

    for (const emp of data.data) {
      const code = String(emp.employeeId || emp.employee_id || '').toUpperCase().trim();
      if (!code) continue;
      roster.set(code, emp.name || emp.fullName || emp.full_name || '');
    }

    const pag = data.pagination || {};
    if (!pag.hasNext) break;
    page += 1;
  }

  return roster;
}

/**
 * Batch lookup: UAN, PAN, bank from HR Employee master (for statutory exports).
 * Returns { [employee_code]: { uan, panNumber, bankAccount, fullName, ... } }.
 * On failure returns {} (caller still emits payroll-row-only export).
 */
async function fetchPayrollStatutoryMap(ctx, employeeCodes) {
  const codes = [...new Set((employeeCodes || []).map((c) => String(c).trim()).filter(Boolean))];
  if (!codes.length) return {};

  const base = getHrBaseUrl();
  const headers = buildHeaders(ctx);
  try {
    const res = await axios.post(
      `${base}/api/hr/payroll/statutory-lookup`,
      { employee_codes: codes },
      { headers, timeout: 60000, validateStatus: () => true }
    );
    if (res.status >= 400 || !res.data?.success || !res.data?.data || typeof res.data.data !== 'object') {
      logger.warn('[payroll->hr] statutory-lookup non-success', {
        status: res.status,
        message: res.data?.message
      });
      return {};
    }
    return res.data.data;
  } catch (e) {
    logger.warn('[payroll->hr] statutory lookup failed', {
      status: e.response?.status,
      message: e.response?.data?.message || e.message
    });
    return {};
  }
}

module.exports = {
  getHrBaseUrl,
  fetchActiveEmployeeRoster,
  fetchPayrollStatutoryMap
};
