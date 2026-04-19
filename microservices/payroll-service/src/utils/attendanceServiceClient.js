const axios = require('axios');

function getAttendanceBaseUrl() {
  return (process.env.ATTENDANCE_SERVICE_URL || 'http://attendance-service:3003').replace(/\/$/, '');
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
 * One page of GET /api/attendance/records (same contract as attendance-service).
 */
async function fetchAttendanceRecordsPage(ctx, query) {
  const url = `${getAttendanceBaseUrl()}/api/attendance/records`;
  const headers = buildHeaders(ctx);
  const { data } = await axios.get(url, { headers, params: query, timeout: 45000 });
  return data;
}

/**
 * Pull all attendance rows in [startDate, endDate] by paging attendance-service.
 * Stops when no next page, or maxRows reached (then truncated = true).
 */
async function fetchAttendanceRecordsForRange(ctx, {
  startDate,
  endDate,
  storeId,
  departmentId,
  pageSize = 500,
  maxRows = 50000
}) {
  const rows = [];
  let page = 1;
  let truncated = false;
  let pagesFetched = 0;

  const baseQuery = {
    startDate,
    endDate,
    limit: pageSize
  };
  if (storeId) baseQuery.storeId = storeId;
  if (departmentId) baseQuery.departmentId = departmentId;

  while (rows.length < maxRows) {
    const data = await fetchAttendanceRecordsPage(ctx, { ...baseQuery, page });
    if (!data || data.success === false) {
      const msg = data?.message || 'Attendance service returned unsuccessful response';
      const err = new Error(msg);
      err.code = 'ATTENDANCE_UPSTREAM';
      err.status = 502;
      throw err;
    }

    const chunk = Array.isArray(data.data) ? data.data : [];
    pagesFetched = page;
    const remaining = maxRows - rows.length;

    if (chunk.length > remaining) {
      rows.push(...chunk.slice(0, remaining));
      truncated = true;
      break;
    }

    rows.push(...chunk);

    const pag = data.pagination || {};
    if (!pag.hasNext || chunk.length === 0) {
      break;
    }

    page += 1;
    if (page > 500) {
      truncated = true;
      break;
    }
  }

  if (rows.length >= maxRows) {
    truncated = true;
  }

  return { rows, truncated, pages_fetched: pagesFetched };
}

module.exports = {
  getAttendanceBaseUrl,
  fetchAttendanceRecordsPage,
  fetchAttendanceRecordsForRange
};
