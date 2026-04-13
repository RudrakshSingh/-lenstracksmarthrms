const axios = require('axios');
const logger = require('../config/logger');

function getPayrollBaseUrl() {
  return (process.env.PAYROLL_SERVICE_URL || 'http://payroll-service').replace(/\/$/, '');
}

function buildHeaders(ctx = {}) {
  const { authorization, tenantId, requestId } = ctx;
  const headers = { 'Content-Type': 'application/json' };
  if (authorization) headers.Authorization = authorization.startsWith('Bearer ') ? authorization : `Bearer ${authorization}`;
  if (tenantId) headers['X-Tenant-Id'] = String(tenantId);
  if (requestId) headers['X-Request-ID'] = String(requestId);
  return headers;
}

/**
 * When unified monthly payroll is not generated yet, use the direct salary record
 * (same contract as hr-service payrollServiceClient fallback).
 */
async function fetchSalaryAsPayrollFallback(headers, employeeCode) {
  const fallbackUrl = `${getPayrollBaseUrl()}/api/payroll/salary?employeeId=${encodeURIComponent(employeeCode)}`;
  const { data } = await axios.get(fallbackUrl, { headers, timeout: 12000 });
  if (data?.success !== true || data.data == null) return null;
  const s = data.data;
  return {
    success: true,
    message: 'Employee payroll retrieved from salary record',
    data: {
      ...s,
      adjusted_gross: s.gross_monthly || s.adjusted_gross || 0,
      total_employee_deductions: s.total_deductions || s.total_employee_deductions || 0,
      net_take_home: s.net_take_home ?? 0,
      status: s.status || 'DRAFT'
    }
  };
}

async function getEmployeePayroll(ctx = {}) {
  const { employeeCode, month, year } = ctx;
  if (!employeeCode || !month || !year) return null;
  const headers = buildHeaders(ctx);
  const url = `${getPayrollBaseUrl()}/api/unified-payroll/employee/${encodeURIComponent(employeeCode)}/${month}/${year}`;

  const tryFallback = async (reason, meta = {}) => {
    try {
      const out = await fetchSalaryAsPayrollFallback(headers, employeeCode);
      if (out) logger.info('[attendance-payroll-client] salary fallback succeeded', { employeeCode, reason, ...meta });
      return out;
    } catch (fallbackError) {
      logger.warn('[attendance-payroll-client] salary fallback failed', {
        employeeCode,
        reason,
        status: fallbackError.response?.status,
        message: fallbackError.response?.data?.message || fallbackError.message
      });
      return null;
    }
  };

  try {
    const { data } = await axios.get(url, { headers, timeout: 12000 });
    if (data?.success && data?.data) return data;
    // Unified can respond 200 with no record, or success false — still try salary store
    return await tryFallback('unified_empty_or_missing', { message: data?.message });
  } catch (error) {
    logger.warn('[attendance-payroll-client] unified payroll request failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    return await tryFallback('unified_error', { status: error.response?.status });
  }
}

module.exports = {
  getPayrollBaseUrl,
  getEmployeePayroll
};
