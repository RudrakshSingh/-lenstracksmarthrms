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

async function getMonthlyPayrollSummary(ctx = {}) {
  const { month, year } = ctx;
  if (!month || !year) return null;
  const url = `${getPayrollBaseUrl()}/api/unified-payroll/summary/${month}/${year}`;
  try {
    const { data } = await axios.get(url, { headers: buildHeaders(ctx), timeout: 12000 });
    return data;
  } catch (error) {
    logger.warn('[analytics-payroll-client] getMonthlyPayrollSummary failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    return null;
  }
}

module.exports = {
  getPayrollBaseUrl,
  getMonthlyPayrollSummary
};
