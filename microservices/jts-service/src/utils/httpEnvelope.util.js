/**
 * Standard list JSON envelope for JTS (pagination + meta).
 */
function buildListResponse({ data, page, limit, total, message = 'OK' }) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Number(limit) || 20);
  const t = Number(total) || 0;
  const pages = l > 0 ? Math.ceil(t / l) : 0;
  const pagination = { page: p, limit: l, total: t, pages };
  return {
    success: true,
    data,
    message,
    total: t,
    page: p,
    limit: l,
    pagination,
    meta: { pagination }
  };
}

module.exports = { buildListResponse };
