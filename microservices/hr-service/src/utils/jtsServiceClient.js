/**
 * Server-to-server calls from hr-service → jts-service (cluster DNS).
 * See docs/JTS_SERVER_TO_SERVER_INTEGRATION.md
 *
 * Requires JTS_SERVICE_URL (e.g. http://jts-service:3018) and forwarding
 * the end-user Authorization + X-Tenant-Id so JTS can authenticate.
 */
const axios = require('axios');
const logger = require('../config/logger');

function getJtsBaseUrl() {
  return (process.env.JTS_SERVICE_URL || 'http://jts-service:3018').replace(/\/$/, '');
}

/**
 * Task summary for the current user (JTS resolves Employee from JWT).
 * @param {{ authorization?: string, tenantId?: string, date?: string }} ctx
 * @returns {Promise<object|null>} JTS JSON body or null on failure
 */
async function getMyTaskSummary(ctx = {}) {
  const { authorization, tenantId, date } = ctx;
  if (!authorization) {
    return null;
  }
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
    const status = err.response?.status;
    const msg = err.response?.data?.message || err.message;
    logger.warn('[jtsServiceClient] getMyTaskSummary failed', { status, msg, url });
    return null;
  }
}

/**
 * @param {string} employeeId - Mongo ObjectId string (JTS Employee _id)
 * @param {{ authorization?: string, tenantId?: string, date?: string }} ctx - from incoming req
 * @returns {Promise<object|null>} JTS JSON body or null on failure
 */
async function getTaskSummaryForEmployee(employeeId, ctx = {}) {
  const { authorization, tenantId, date } = ctx;
  if (!authorization || !employeeId) {
    return null;
  }
  const headers = {
    Authorization: authorization.startsWith('Bearer ') ? authorization : `Bearer ${authorization}`,
    'Content-Type': 'application/json'
  };
  if (tenantId) {
    headers['X-Tenant-Id'] = String(tenantId);
  }
  const q = date ? `?date=${encodeURIComponent(date)}` : '';
  const url = `${getJtsBaseUrl()}/api/jts/tasks/summary/${employeeId}${q}`;
  try {
    const { data } = await axios.get(url, { headers, timeout: 10000 });
    return data;
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.message || err.message;
    logger.warn('[jtsServiceClient] getTaskSummaryForEmployee failed', { status, msg, url });
    return null;
  }
}

/**
 * Tenant-level analytics (same auth requirements as browser).
 * @param {{ authorization?: string, tenantId?: string }} ctx
 */
async function getJtsAnalytics(ctx = {}) {
  const { authorization, tenantId } = ctx;
  if (!authorization) {
    return null;
  }
  const headers = {
    Authorization: authorization.startsWith('Bearer ') ? authorization : `Bearer ${authorization}`,
    'Content-Type': 'application/json'
  };
  if (tenantId) {
    headers['X-Tenant-Id'] = String(tenantId);
  }
  const url = `${getJtsBaseUrl()}/api/jts/analytics`;
  try {
    const { data } = await axios.get(url, { headers, timeout: 15000 });
    return data;
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.message || err.message;
    logger.warn('[jtsServiceClient] getJtsAnalytics failed', { status, msg });
    return null;
  }
}

module.exports = {
  getJtsBaseUrl,
  getMyTaskSummary,
  getTaskSummaryForEmployee,
  getJtsAnalytics
};
