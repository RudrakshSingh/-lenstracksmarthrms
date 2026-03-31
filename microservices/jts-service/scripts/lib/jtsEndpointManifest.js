/**
 * Single source of truth for JTS HTTP surface (aligned with docs/JTS_SERVICE_COMPLETE_API_CATALOG_BY_FUNCTION_AND_RBAC.md).
 * Each entry: method + path pattern; placeholders expanded for live requests.
 */

const SAMPLE_OID = '507f1f77bcf86cd799439011';
const SAMPLE_OID_B = '507f1f77bcf86cd799439012';

function expandPath(pattern) {
  return String(pattern)
    .replace(/:id\b/g, SAMPLE_OID)
    .replace(/:taskId\b/g, SAMPLE_OID)
    .replace(/:subtaskId\b/g, SAMPLE_OID_B)
    .replace(/:attachmentId\b/g, SAMPLE_OID_B)
    .replace(/:approvalId\b/g, SAMPLE_OID_B)
    .replace(/:reviewId\b/g, SAMPLE_OID_B)
    .replace(/:employeeId\b/g, 'EMP001')
    .replace(/:workdayId\b/g, 'workday-2026-03-29');
}

function push(out, method, pathPattern, group, authGate = 'jwt') {
  const path = expandPath(pathPattern);
  out.push({
    method: method.toUpperCase(),
    pathPattern,
    path,
    group,
    authGate
  });
}

function buildCompatOps() {
  return [
    ['POST', '/self-tasks'],
    ['GET', '/self-tasks/my'],
    ['GET', '/tasks/my'],
    ['GET', '/tenant/current'],
    ['GET', '/approvals/pending'],
    ['POST', '/approvals/:approvalId/approve'],
    ['POST', '/approvals/:approvalId/reject'],
    ['GET', '/analytics'],
    ['GET', '/reviews']
  ];
}

function buildCollabOps() {
  return [
    ['GET', '/approvals/pending/me'],
    ['PATCH', '/approvals/:approvalId'],
    ['GET', '/:taskId/reviews'],
    ['POST', '/:taskId/reviews'],
    ['GET', '/:taskId/comments'],
    ['POST', '/:taskId/comments'],
    ['GET', '/:taskId/attachments'],
    ['POST', '/:taskId/attachments/presign-upload'],
    ['GET', '/:taskId/attachments/:attachmentId/presign-download'],
    ['POST', '/:taskId/attachments'],
    ['GET', '/:taskId/quality'],
    ['PUT', '/:taskId/quality'],
    ['GET', '/:taskId/approvals'],
    ['POST', '/:taskId/approvals']
  ];
}

function buildTaskOps() {
  return [
    ['POST', '/self-tasks'],
    ['POST', '/'],
    ['GET', '/'],
    ['GET', '/sla/alerts'],
    ['GET', '/workday/:workdayId'],
    ['GET', '/summary/me'],
    ['GET', '/summary/:employeeId'],
    ['GET', '/:id/sla'],
    ['GET', '/:id/subtasks'],
    ['POST', '/:id/subtasks'],
    ['PATCH', '/:id/subtasks/:subtaskId/status'],
    ['GET', '/:id/activities'],
    ['POST', '/:id/start'],
    ['POST', '/:id/submit-review'],
    ['POST', '/:id/reopen'],
    ['POST', '/:id/cancel'],
    ['POST', '/:id/block'],
    ['POST', '/:id/unblock'],
    ['POST', '/:id/reassign'],
    ['PUT', '/:id'],
    ['DELETE', '/:id'],
    ['POST', '/:id/complete'],
    ['POST', '/:id/accept'],
    ['POST', '/:id/reject'],
    ['POST', '/:id/rate'],
    ['PATCH', '/:id/status'],
    ['GET', '/:id']
  ];
}

function buildTimerOps() {
  return [
    ['POST', '/tasks/:id/timer/start'],
    ['POST', '/tasks/:id/timer/stop'],
    ['POST', '/tasks/:id/timer/pause'],
    ['GET', '/tasks/:id/timer'],
    ['GET', '/tasks/:id/timer/sessions'],
    ['GET', '/active'],
    ['GET', '/timers/active']
  ];
}

function buildCatalogOps() {
  return [
    ['GET', '/tenants'],
    ['GET', '/tenant/current'],
    ['POST', '/tenants'],
    ['PATCH', '/tenants/:id'],
    ['GET', '/org-nodes'],
    ['POST', '/org-nodes'],
    ['PATCH', '/org-nodes/:id'],
    ['DELETE', '/org-nodes/:id'],
    ['GET', '/employees'],
    ['POST', '/employees'],
    ['POST', '/employees/bind-from-jwt'],
    ['PATCH', '/employees/:id/align-auth-code'],
    ['PUT', '/employees/:id/auth-user-link'],
    ['PATCH', '/employees/:id'],
    ['DELETE', '/employees/:id'],
    ['GET', '/employee-roles'],
    ['POST', '/employee-roles'],
    ['DELETE', '/employee-roles/:employeeId'],
    ['GET', '/task-types'],
    ['POST', '/task-types'],
    ['PATCH', '/task-types/:id'],
    ['DELETE', '/task-types/:id'],
    ['GET', '/sla-rules'],
    ['PUT', '/sla-rules'],
    ['DELETE', '/sla-rules/:id'],
    ['GET', '/escalation-rules'],
    ['POST', '/escalation-rules'],
    ['PATCH', '/escalation-rules/:id'],
    ['DELETE', '/escalation-rules/:id'],
    ['GET', '/self-task-policies'],
    ['PUT', '/self-task-policies'],
    ['DELETE', '/self-task-policies/:id'],
    ['GET', '/shift-schedules'],
    ['POST', '/shift-schedules'],
    ['DELETE', '/shift-schedules/:id'],
    ['GET', '/reporting-relationships'],
    ['PUT', '/reporting-relationships'],
    ['DELETE', '/reporting-relationships/:id'],
    ['GET', '/attendance-records'],
    ['PUT', '/attendance-records'],
    ['POST', '/attendance-records/open-session'],
    ['POST', '/attendance-records/close-session'],
    ['GET', '/audit-logs'],
    ['GET', '/data-access-logs'],
    ['POST', '/data-access-logs']
  ];
}

function buildRecOps() {
  return [
    ['GET', '/'],
    ['POST', '/'],
    ['GET', '/:id'],
    ['PATCH', '/:id'],
    ['DELETE', '/:id']
  ];
}

function buildPerfOps() {
  return [
    ['GET', '/metrics'],
    ['GET', '/scores'],
    ['POST', '/calculate-daily'],
    ['GET', '/reviews'],
    ['POST', '/reviews'],
    ['PATCH', '/reviews/:id'],
    ['DELETE', '/reviews/:id'],
    ['POST', '/reviews/:reviewId/goals'],
    ['GET', '/reviews/:reviewId/goals'],
    ['POST', '/reviews/:reviewId/acknowledge'],
    ['GET', '/alerts'],
    ['POST', '/alerts'],
    ['PATCH', '/alerts/:id/resolve']
  ];
}

function buildNotifOps() {
  return [
    ['GET', '/'],
    ['GET', '/health'],
    ['GET', '/me'],
    ['PATCH', '/:id/read'],
    ['PATCH', '/me/read-all'],
    ['GET', '/preferences/me'],
    ['PUT', '/preferences/me'],
    ['POST', '/dispatch'],
    ['POST', '/process-queues'],
    ['GET', '/providers/health'],
    ['POST', '/test-email']
  ];
}

/**
 * Minimal JSON bodies so POST/PATCH/PUT hit route validation (not blocked by express.json empty).
 * Keys match Joi expectations where strict; otherwise {} may still yield VALIDATION_ERROR after auth.
 */
function defaultBodyForEntry(entry) {
  const { method, pathPattern, group } = entry;
  if (!['POST', 'PUT', 'PATCH'].includes(method)) return undefined;

  if (group === 'notif' && pathPattern === '/me/read-all') return {};
  if (group === 'notif' && pathPattern === '/:id/read') return {};

  if (group === 'perf' && pathPattern === '/calculate-daily') {
    return { employee_id: SAMPLE_OID, date: new Date().toISOString() };
  }
  if (group === 'perf' && pathPattern === '/reviews') {
    return {
      employee_id: SAMPLE_OID,
      reviewer_employee_id: SAMPLE_OID_B,
      review_period_start: new Date().toISOString(),
      review_period_end: new Date().toISOString(),
      review_type: 'AD_HOC'
    };
  }
  if (group === 'perf' && pathPattern.includes('/goals') && method === 'POST') {
    return { description: 'Goal from contract script' };
  }
  if (group === 'perf' && pathPattern.includes('/acknowledge')) {
    return {};
  }
  if (group === 'perf' && pathPattern === '/alerts') {
    return {
      employee_id: SAMPLE_OID,
      alert_type: 'LOW_SLA',
      severity: 'INFO',
      title: 't',
      metric_name: 'm',
      metric_value: 1,
      threshold_value: 2
    };
  }
  if (group === 'perf' && pathPattern.includes('/resolve')) {
    return {};
  }

  if (group === 'catalog' && pathPattern === '/tenants') {
    return { code: 't1', name: 'T1', subdomain: 't1-sub' };
  }
  if (group === 'catalog' && pathPattern === '/org-nodes') {
    return { type: 'STORE', name: 'S', code: 'S1', parent_id: null };
  }
  if (group === 'catalog' && pathPattern === '/employees') {
    return {
      org_node_id: SAMPLE_OID,
      code: 'E1',
      name: 'Employee One',
      email: 'e1@example.com',
      role_key: 'EMPLOYEE'
    };
  }
  if (group === 'catalog' && pathPattern.includes('employee-roles') && method === 'POST') {
    return { employee_id: SAMPLE_OID, role: 'MANAGER' };
  }
  if (group === 'catalog' && pathPattern === '/task-types') {
    return { name: 'TT', code: 'TT1', default_priority: 'MEDIUM' };
  }
  if (group === 'catalog' && pathPattern === '/sla-rules') {
    return {
      task_type_id: SAMPLE_OID,
      priority: 'MEDIUM',
      base_sla_minutes: 60,
      basis: 'CALENDAR_TIME'
    };
  }
  if (group === 'catalog' && pathPattern === '/escalation-rules') {
    return { threshold: 'SLA_BREACH', notify_roles: [] };
  }
  if (group === 'catalog' && pathPattern === '/self-task-policies') {
    return { role_key: 'EMPLOYEE' };
  }
  if (group === 'catalog' && pathPattern === '/shift-schedules') {
    return { employee_id: SAMPLE_OID, shift_date: new Date().toISOString(), start_time: '09:00', end_time: '17:00' };
  }
  if (group === 'catalog' && pathPattern === '/reporting-relationships') {
    return { manager_id: SAMPLE_OID, reportee_id: SAMPLE_OID_B };
  }
  if (group === 'catalog' && pathPattern === '/attendance-records' && method === 'PUT') {
    return { employee_id: SAMPLE_OID, work_date: new Date().toISOString() };
  }
  if (group === 'catalog' && pathPattern.includes('open-session')) {
    return { employee_id: SAMPLE_OID };
  }
  if (group === 'catalog' && pathPattern.includes('close-session')) {
    return { employee_id: SAMPLE_OID };
  }
  if (group === 'catalog' && pathPattern === '/data-access-logs') {
    return { resource_type: 'TASK', action: 'READ' };
  }

  if (group === 'rec') {
    return {
      name: 'R1',
      frequency: 'DAILY'
    };
  }

  if (group === 'compat' && pathPattern === '/self-tasks') {
    return { title: 'Self task from contract script' };
  }
  if (group === 'compat' && pathPattern.includes('/approve')) {
    return {};
  }
  if (group === 'compat' && pathPattern.includes('/reject')) {
    return { reason: 'no' };
  }

  if (group === 'task-self') {
    return { title: 'Self from nested route' };
  }

  if (group === 'tasks' || group === 'tasks-collab') {
    if (pathPattern.includes('/comments') && method === 'POST') return { message: 'hi' };
    if (pathPattern.includes('/attachments') && method === 'POST' && !pathPattern.includes('presign')) {
      return {
        file_key: 'k1',
        file_name: 'f.txt',
        mime_type: 'text/plain',
        size_bytes: 10
      };
    }
    if (pathPattern.includes('presign-upload')) {
      return { file_name: 'f.txt', mime_type: 'text/plain' };
    }
    if (pathPattern.includes('/quality') && method === 'PUT') {
      return { quality_score: 3, timeliness_score: 3, thoroughness_score: 3 };
    }
    if (pathPattern.includes('/approvals') && method === 'POST' && !pathPattern.includes('pending')) {
      return { approver_employee_id: SAMPLE_OID };
    }
    if (pathPattern.includes('/reviews') && method === 'POST') {
      return { status: 'APPROVED' };
    }
    if (pathPattern === '/') {
      return {
        title: 'Manager task from contract script',
        priority: 'MEDIUM'
      };
    }
    if (pathPattern === '/self-tasks') {
      return { title: 'Self-task alias body' };
    }
    if (pathPattern.includes('/subtasks') && method === 'POST') {
      return { title: 'Sub' };
    }
    if (pathPattern.includes('/rate')) {
      return { rating: 4 };
    }
    if (pathPattern.includes('/status')) {
      return { status: 'IN_PROGRESS' };
    }
    if (pathPattern.includes('/reject') && method === 'POST') {
      return {};
    }
    if (method === 'PATCH' && pathPattern.includes('/approvals/')) {
      return { status: 'APPROVED' };
    }
    return {};
  }

  if (group === 'notif') {
    if (pathPattern === '/preferences/me') return { channel_in_app: true };
    if (pathPattern === '/dispatch') {
      return {
        recipient_ids: [SAMPLE_OID],
        type: 'TEST',
        title: 'T',
        message: 'M',
        channels: ['in_app']
      };
    }
    if (pathPattern === '/process-queues') return {};
    if (pathPattern === '/test-email') {
      return { to_email: 'test@example.com' };
    }
  }

  return {};
}

function buildManifest() {
  const out = [];

  push(out, 'GET', '/health', 'health', 'none');
  push(out, 'GET', '/api/v1/health', 'health', 'none');

  push(out, 'GET', '/api/jts/internal/tenant-analytics', 'internal', 'internal');
  push(out, 'GET', '/jts/internal/tenant-analytics', 'internal', 'internal');

  for (const base of ['/api/jts', '/jts']) {
    for (const [m, p] of buildCompatOps()) {
      push(out, m, base + p, 'compat');
    }
  }

  for (const base of ['/api/jts/tasks', '/api/v1/tasks', '/jts/tasks']) {
    push(out, 'POST', `${base}/self`, 'task-self');
    for (const [m, p] of buildCollabOps()) {
      push(out, m, base + p, 'tasks-collab');
    }
    for (const [m, p] of buildTaskOps()) {
      push(out, m, base + p, 'tasks');
    }
  }

  for (const base of ['/api/jts', '/api/v1', '/jts']) {
    for (const [m, p] of buildTimerOps()) {
      push(out, m, base + p, 'timer');
    }
  }

  for (const base of ['/api/v1/jts/catalog', '/api/jts/catalog', '/jts/catalog']) {
    for (const [m, p] of buildCatalogOps()) {
      push(out, m, base + p, 'catalog');
    }
  }

  for (const base of ['/api/v1/jts/recurrence-rules', '/api/jts/recurrence-rules', '/jts/recurrence-rules']) {
    for (const [m, p] of buildRecOps()) {
      const path = p === '/' ? base : base + p;
      push(out, m, path, 'rec');
    }
  }

  for (const base of ['/api/v1/jts/performance', '/api/jts/performance', '/jts/performance']) {
    for (const [m, p] of buildPerfOps()) {
      push(out, m, base + p, 'perf');
    }
  }

  const notifBase = '/api/v1/notifications';
  for (const [m, p] of buildNotifOps()) {
    const suffix = p === '/' ? '' : p;
    push(out, m, notifBase + suffix, 'notif');
  }

  return out;
}

/** Standard error envelope from buildErrorBody */
const ERROR_ENVELOPE_KEYS = ['success', 'code', 'message', 'error'];

/** Success JSON from most controllers */
const SUCCESS_MIN_KEYS = ['success'];

module.exports = {
  buildManifest,
  expandPath,
  defaultBodyForEntry,
  ERROR_ENVELOPE_KEYS,
  SUCCESS_MIN_KEYS,
  SAMPLE_OID,
  SAMPLE_OID_B
};
