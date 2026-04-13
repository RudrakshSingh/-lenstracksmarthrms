/**
 * attendance-service → jts-service (cluster). See docs/JTS_SERVER_TO_SERVER_INTEGRATION.md
 */
const axios = require('axios');
const logger = require('../config/logger');

function getJtsBaseUrl() {
  return (process.env.JTS_SERVICE_URL || 'http://jts-service:3018').replace(/\/$/, '');
}

/**
 * @param {{ authorization?: string, tenantId?: string, date?: string }} ctx
 */
async function getMyTaskSummary(ctx = {}) {
  const { authorization, tenantId, date } = ctx;
  if (!authorization) return null;
  const headers = {
    Authorization: authorization.startsWith('Bearer ') ? authorization : `Bearer ${authorization}`,
    'Content-Type': 'application/json'
  };
  if (tenantId) {
    headers['X-Tenant-Id'] = String(tenantId);
  }
  const q = date ? `?date=${encodeURIComponent(date)}` : '';
  const url = `${getJtsBaseUrl()}/api/jts/tasks/summary/me${q}`;
  try {
    const { data } = await axios.get(url, { headers, timeout: 10000 });
    return data;
  } catch (err) {
    logger.warn('[jtsServiceClient] getMyTaskSummary failed', {
      status: err.response?.status,
      message: err.response?.data?.message || err.message
    });
    return null;
  }
}

module.exports = { getJtsBaseUrl, getMyTaskSummary };
