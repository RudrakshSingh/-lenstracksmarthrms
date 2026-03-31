function toMessageFromCode(code) {
  if (!code) return 'An error occurred';
  if (code === 'VALIDATION_ERROR') return 'Validation failed';
  if (code === 'AUTH_REQUIRED') return 'Access token required';
  if (code === 'INVALID_TOKEN') return 'Invalid token';
  if (code === 'TOKEN_EXPIRED') return 'Token expired';
  if (code === 'AUTH_FAILED') return 'Authentication failed';
  if (code === 'ROUTE_NOT_FOUND') return 'Route not found';
  if (code === 'INTERNAL_ERROR') return 'Internal server error';
  return String(code);
}

/**
 * Standard error response helper.
 *
 * Contract (minimum): { success:false, code, message, details? }
 * Back-compat: include `error` as alias of `code` so older clients don't break.
 */
function buildErrorBody({ code, message, details, extra } = {}) {
  const c = code || 'INTERNAL_ERROR';
  const m = message || toMessageFromCode(c);
  const body = {
    success: false,
    code: c,
    message: m,
    // legacy alias used across existing endpoints/clients
    error: c
  };
  if (Array.isArray(details) && details.length > 0) {
    body.details = details;
  }
  if (extra && typeof extra === 'object') {
    Object.assign(body, extra);
  }
  return body;
}

module.exports = { buildErrorBody, toMessageFromCode };

