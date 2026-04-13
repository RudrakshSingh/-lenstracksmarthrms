const CLIENT_ERROR_STATUS = {
  VALIDATION_ERROR: 400,
  TASK_001_NOT_FOUND: 404,
  TASK_TYPE_001_NOT_FOUND: 404,
  ORG_NODE_001_NOT_FOUND: 404,
  EMPLOYEE_001_NOT_FOUND: 404,
  POLICY_001_SELF_TASK_NOT_ALLOWED: 403,
  POLICY_002_MAX_TASKS_PER_DAY_EXCEEDED: 400,
  POLICY_003_MAX_TASK_DURATION_EXCEEDED: 400,
  APPROVAL_003_NO_MANAGER_FOUND: 400,
  TASK_002_INVALID_STATUS_TRANSITION: 400,
  TASK_005_DELETED: 404,
  TASK_CODE_ALLOCATION_FAILED: 500,
  TASK_CODE_DUPLICATE: 409,
  TIMER_005_TASK_BLOCKED: 400,
  TASK_006_DEPENDENCIES_INCOMPLETE: 409,
  TASK_007_CHECKLIST_INCOMPLETE: 400,
  TASK_008_TIMER_REQUIRED: 400,
  TIMER_001_NO_ACTIVE_TIMER: 404,
  TIMER_002_TIMER_ALREADY_RUNNING: 409,
  TIMER_003_INVALID_TASK_STATUS: 400,
  TIMER_004_ATTENDANCE_NOT_ACTIVE: 400,
  SLA_001_RULE_NOT_FOUND: 404,
  TENANT_001_NOT_FOUND: 404,
  NOTIFICATION_001_NOT_FOUND: 404,
  NOTIFICATION_002_NO_RECIPIENTS: 400,
  NOTIFICATION_003_AWS_SDK_MISSING: 500,
  NOTIFICATION_004_SES_FROM_EMAIL_MISSING: 500,
  NOTIFICATION_005_PROVIDER_NOT_AWS: 400,
  NOTIFICATION_006_TEST_EMAIL_TO_MISSING: 400,
  JTS_TASK_ACCESS_DENIED: 403,
  JTS_TASK_DELETE_FORBIDDEN: 403,
  JTS_ACTOR_EMPLOYEE_NOT_RESOLVED: 403,
  JTS_APPROVAL_001_NOT_FOUND: 404,
  JTS_APPROVAL_002_FORBIDDEN: 403,
  JTS_ORG_HAS_CHILDREN: 400,
  JTS_ESCALATION_RULE_NOT_FOUND: 404,
  JTS_POLICY_NOT_FOUND: 404,
  JTS_SHIFT_NOT_FOUND: 404,
  JTS_REPORTING_NOT_FOUND: 404,
  JTS_RECURRENCE_RULE_NOT_FOUND: 404,
  JTS_RECURRENCE_ERROR: 500,
  JTS_REVIEW_NOT_FOUND: 404,
  JTS_REVIEW_ACK_FORBIDDEN: 403,
  JTS_ALERT_NOT_FOUND: 404,
  JTS_AUTH_EMPLOYEE_ID_MISSING: 400,
  JTS_AUTH_USER_ID_INVALID: 400,
  JTS_AUTH_USER_ALREADY_LINKED: 409,
  JTS_EMPLOYEE_CODE_CONFLICT: 409,
  JTS_EMPLOYEE_CODE_AUTH_MISMATCH: 400,
  JTS_ATTACHMENT_STORAGE_NOT_CONFIGURED: 503,
  JTS_ATTACHMENT_NOT_FOUND: 404,
  JTS_ATTENDANCE_ROW_NOT_FOUND: 404,
  JTS_APPROVAL_QUERY_FORBIDDEN: 403,
  JTS_TENANT_REQUIRED: 403,
  JTS_TENANT_HEADER_MISMATCH: 403,
  JTS_TENANT_SCOPE_FORBIDDEN: 403,
  JTS_FORCE_COMPLETE_FORBIDDEN: 403,
  JTS_EXTENSION_APPROVER_REQUIRED: 400,
  TASK_REOPEN_INVALID_STATE: 400,
  JTS_ESCALATION_ERROR: 500
};

const { buildErrorBody, toMessageFromCode } = require('./apiError.util');

/**
 * Map thrown values to stable app codes. Mongo E11000 on tasks (tenant_id+code) → TASK_CODE_DUPLICATE.
 */
function resolveApplicationErrorCode(error, fallbackCode) {
  if (!error) return fallbackCode || 'INTERNAL_ERROR';

  const msg = String(error.message || '');
  if (msg && CLIENT_ERROR_STATUS[msg]) return msg;

  const isDup =
    error.code === 11000 ||
    error.code === '11000' ||
    (msg.includes('E11000') && (msg.includes('duplicate key') || msg.includes('dup key')));
  if (isDup) {
    const kp = error.keyPattern || {};
    const kv = error.keyValue || {};
    const taskCodeIndex =
      kp.code != null ||
      kv.code != null ||
      msg.includes('tenant_id_1_code_1') ||
      /collection:\s*tasks\b/i.test(msg) ||
      /index:\s*tenant_id_1_code_1/i.test(msg);
    if (taskCodeIndex) return 'TASK_CODE_DUPLICATE';
  }

  return msg || fallbackCode || 'INTERNAL_ERROR';
}

const toErrorPayload = (error, fallbackCode) => {
  const code = resolveApplicationErrorCode(error, fallbackCode);
  const status = CLIENT_ERROR_STATUS[code] || 500;

  return {
    status,
    body: buildErrorBody({
      code,
      message: toMessageFromCode(code)
    })
  };
};

module.exports = { toErrorPayload, resolveApplicationErrorCode };
