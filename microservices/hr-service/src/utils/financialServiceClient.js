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

async function postPayrollRunToFinance(payload, context = {}) {
  const url = `${getFinancialBaseUrl()}/api/financial/payroll/posting`;
  const headers = buildHeaders(context);

  try {
    const response = await axios.post(url, payload, { headers, timeout: 15000 });
    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const responseData = error.response?.data;
    logger.error('[financialServiceClient] payroll posting failed', {
      status,
      message: responseData?.message || error.message,
      payrollRunId: payload?.payrollRunId
    });
    throw error;
  }
}

module.exports = {
  getFinancialBaseUrl,
  postPayrollRunToFinance
};
