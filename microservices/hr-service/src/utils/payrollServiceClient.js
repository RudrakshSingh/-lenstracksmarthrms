const axios = require('axios');
const logger = require('../config/logger');

function getPayrollBaseUrl() {
  return (process.env.PAYROLL_SERVICE_URL || 'http://payroll-service').replace(/\/$/, '');
}

function buildHeaders({ authorization, tenantId, requestId } = {}) {
  const headers = {
    'Content-Type': 'application/json'
  };
  if (authorization) {
    headers.Authorization = authorization.startsWith('Bearer ')
      ? authorization
      : `Bearer ${authorization}`;
  }
  if (tenantId) headers['X-Tenant-Id'] = String(tenantId);
  if (requestId) headers['X-Request-ID'] = String(requestId);
  return headers;
}

async function getEmployeePayroll(ctx = {}) {
  const { employeeCode, month, year, authorization, tenantId, requestId } = ctx;
  if (!employeeCode || !month || !year) return null;
  if (!authorization) return null;

  const headers = buildHeaders({ authorization, tenantId, requestId });
  const unifiedUrl = `${getPayrollBaseUrl()}/api/unified-payroll/employee/${encodeURIComponent(employeeCode)}/${month}/${year}`;

  try {
    const { data } = await axios.get(unifiedUrl, { headers, timeout: 12000 });
    return data;
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.message || err.message;
    logger.warn('[payrollServiceClient] unified payroll lookup failed, trying fallback', { status, msg, unifiedUrl });

    // Fallback for deployments where unified-payroll route is not exposed yet.
    try {
      const salaryUrl = `${getPayrollBaseUrl()}/api/payroll/salary?employeeId=${encodeURIComponent(employeeCode)}`;
      const { data } = await axios.get(salaryUrl, { headers, timeout: 12000 });
      if (data?.success === true) {
        return {
          success: true,
          data: data.data
            ? {
                ...data.data,
                adjusted_gross: data.data.gross_monthly || 0,
                total_employee_deductions: data.data.total_deductions || 0,
                net_take_home: data.data.net_take_home || 0,
                status: 'DRAFT'
              }
            : null
        };
      }
      return null;
    } catch (fallbackErr) {
      logger.warn('[payrollServiceClient] payroll fallback lookup failed', {
        status: fallbackErr.response?.status,
        msg: fallbackErr.response?.data?.message || fallbackErr.message
      });
      return null;
    }
  }
}

module.exports = {
  getPayrollBaseUrl,
  getEmployeePayroll
};
