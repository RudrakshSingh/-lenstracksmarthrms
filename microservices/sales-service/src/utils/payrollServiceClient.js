const axios = require('axios');
const logger = require('../config/logger');

function getPayrollBaseUrl() {
  return (process.env.PAYROLL_SERVICE_URL || 'http://payroll-service').replace(/\/$/, '');
}

function buildHeaders({ authorization, tenantId, requestId } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (authorization) headers.Authorization = authorization.startsWith('Bearer ') ? authorization : `Bearer ${authorization}`;
  if (tenantId) headers['X-Tenant-Id'] = String(tenantId);
  if (requestId) headers['X-Request-ID'] = String(requestId);
  return headers;
}

async function getPayrollAnalytics({ month, year, authorization, tenantId, requestId } = {}) {
  if (!month || !year) return null;
  const url = `${getPayrollBaseUrl()}/api/unified-payroll/analytics/${month}/${year}`;
  try {
    const { data } = await axios.get(url, {
      headers: buildHeaders({ authorization, tenantId, requestId }),
      timeout: 12000
    });
    return data;
  } catch (error) {
    logger.warn('[sales-payroll-client] getPayrollAnalytics failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    return null;
  }
}

module.exports = {
  getPayrollBaseUrl,
  getPayrollAnalytics
};
