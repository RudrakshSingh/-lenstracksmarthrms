const axios = require('axios');
const logger = require('../config/logger');

function getFinancialBaseUrl() {
  return (process.env.FINANCIAL_SERVICE_URL || 'http://financial-service').replace(/\/$/, '');
}

function buildHeaders({ authorization, tenantId, companyId, requestId } = {}) {
  const headers = {
    'Content-Type': 'application/json'
  };

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

async function reflectSalaryExpense(payload, context = {}) {
  const url = `${getFinancialBaseUrl()}/api/financial/expenses/salary-reflection`;
  const headers = buildHeaders(context);

  try {
    const response = await axios.post(url, payload, { headers, timeout: 15000 });
    return response.data;
  } catch (error) {
    logger.error('[payroll->financial] salary reflection failed', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    throw error;
  }
}

async function postPayrollLedger(payload, context = {}) {
  const url = `${getFinancialBaseUrl()}/api/financial/payroll/posting`;
  const headers = buildHeaders(context);
  const response = await axios.post(url, payload, { headers, timeout: 15000 });
  return response.data;
}

async function getExpenseBySource(sourceRefId, context = {}) {
  const url = `${getFinancialBaseUrl()}/api/financial/expenses/by-source/${encodeURIComponent(sourceRefId)}`;
  const headers = buildHeaders(context);
  const response = await axios.get(url, { headers, timeout: 10000 });
  return response.data;
}

module.exports = {
  reflectSalaryExpense,
  postPayrollLedger,
  getExpenseBySource
};
