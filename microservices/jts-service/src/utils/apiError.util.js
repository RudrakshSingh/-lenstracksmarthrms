/** Human-readable defaults for stable machine codes (frontend should prefer `message`). */
const CODE_MESSAGES = {
  VALIDATION_ERROR: 'Validation failed',
  AUTH_REQUIRED: 'Access token required',
  INVALID_TOKEN: 'Invalid token',
  TOKEN_EXPIRED: 'Token expired',
  AUTH_FAILED: 'Authentication failed',
  ROUTE_NOT_FOUND: 'Route not found',
  INTERNAL_ERROR: 'Internal server error',
  INSUFFICIENT_ROLE: 'Access denied. Insufficient role privileges.',
  INSUFFICIENT_PERMISSION: 'Access denied. Insufficient permissions.',
  TASK_CODE_DUPLICATE:
    'Task number pehle se use ho chuka hai — ek baar dubara create try karein. Server naya unique code assign karega.',
  TASK_001_NOT_FOUND: 'Task not found',
  TENANT_001_NOT_FOUND: 'Tenant not found',
  JTS_ACTOR_EMPLOYEE_NOT_RESOLVED:
    'Employee profile is not linked to this login. Use HR linking or POST /api/jts/catalog/employees/bind-from-jwt.',
  JTS_FORCE_COMPLETE_FORBIDDEN: 'You do not have permission to force-complete this task.',
  JTS_TENANT_REQUIRED: 'Tenant context missing or invalid in token',
  JTS_TENANT_HEADER_MISMATCH: 'X-Tenant-Id must match the tenant in your access token',
  JTS_TENANT_SCOPE_FORBIDDEN: 'This action is not allowed for your tenant scope',
  JTS_APPROVAL_QUERY_FORBIDDEN: 'Cannot list approvals for another approver without elevated role',
  JTS_RECURRENCE_RULE_NOT_FOUND: 'Recurrence rule not found',
  TASK_REOPEN_INVALID_STATE: 'Task cannot be reopened in its current state',
  JTS_ADMIN_ERROR: 'Catalog or admin operation failed'
};

function toMessageFromCode(code) {
  if (!code) return 'An error occurred';
  if (CODE_MESSAGES[code]) return CODE_MESSAGES[code];
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

/** One-liner for the most common 403 in JTS (missing HR ↔ auth employee link). */
function actorUnresolvedBody() {
  return buildErrorBody({ code: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED' });
}

module.exports = { buildErrorBody, toMessageFromCode, actorUnresolvedBody };

