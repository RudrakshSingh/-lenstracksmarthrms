/**
 * Documented response shapes for tooling / OpenAPI hints.
 * "Without auth" is enforced by jts-contract-verify.js.
 * "With auth" shapes are typical; many endpoints return 400/403/404/500 depending on DB.
 */

const WITHOUT_AUTH = {
  jwt: {
    status: 401,
    body: {
      success: false,
      code: 'AUTH_REQUIRED',
      message: 'string',
      error: 'AUTH_REQUIRED'
    }
  },
  none: {
    status: 200,
    body: {
      status: 'healthy',
      service: 'jts-service',
      timestamp: 'ISO8601 string'
    }
  },
  internal: {
    status: 503,
    body: {
      success: false,
      code: 'JTS_INTERNAL_DISABLED',
      message: 'string',
      error: 'JTS_INTERNAL_DISABLED'
    }
  }
};

/** Typical success envelope after createApp meta normalization */
const WITH_AUTH_TYPICAL = {
  success: true,
  meta: 'object (pagination echo or {})',
  message: 'string (optional on some routes)',
  data: 'payload (shape varies by route)'
};

const GROUP_NOTES = {
  health: 'No Authorization header.',
  internal: 'Requires X-JTS-Internal-Token + X-Tenant-Id (not JWT). When token unset → 503 contract above.',
  compat: 'JWT + tenant. Success body usually { success, data?, message? }.',
  'task-self': 'POST creates self-task; success 201 with { success, data: serialized task }.',
  'tasks-collab': 'JWT; collaboration service may return 403 JTS_TASK_ACCESS_DENIED if not assignee/creator/privileged.',
  tasks: 'JWT. List: { success, data[], total, page, limit, pagination, message }. Single task: { success, data }.',
  timer: 'JWT. JSON shapes from timer.controller.',
  catalog: 'JWT + requireRole. Mutations return created/updated entity or list.',
  rec: 'JWT + manager ladder on router. CRUD on recurrence rules.',
  perf: 'JWT + readRoles/writeRoles per route.',
  notif: 'JWT. Inbox { success, data[] }; dispatch requires manager ladder.'
};

function contractForEntry(entry) {
  const gate = entry.authGate;
  const without = WITHOUT_AUTH[gate] || WITHOUT_AUTH.jwt;
  return {
    withoutAuth: without,
    withAuthTypicalNote:
      gate === 'none' || gate === 'internal'
        ? null
        : {
            summary: GROUP_NOTES[entry.group] || GROUP_NOTES.tasks,
            envelope: WITH_AUTH_TYPICAL
          }
  };
}

module.exports = {
  WITHOUT_AUTH,
  WITH_AUTH_TYPICAL,
  GROUP_NOTES,
  contractForEntry
};
