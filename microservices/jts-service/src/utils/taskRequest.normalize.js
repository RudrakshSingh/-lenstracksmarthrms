/**
 * Normalize HRMS MFE / jts-client request shapes (camelCase, proxy status strings)
 * into jts-service internal snake_case and TaskStatus enum values.
 */

/** Board / proxy status strings → Task.status */
const PROXY_STATUS_MAP = {
  assigned: 'ASSIGNED',
  in_progress: 'IN_PROGRESS',
  on_hold: 'ON_HOLD',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
  canceled: 'CANCELLED',
  draft: 'DRAFT',
  pending_approval: 'PENDING_APPROVAL',
  accepted: 'ACCEPTED',
  pending_review: 'PENDING_REVIEW',
  rejected: 'REJECTED',
  blocked: 'BLOCKED',
  reopened: 'REOPENED'
};

const TASK_STATUSES = new Set([
  'DRAFT',
  'PENDING_APPROVAL',
  'ASSIGNED',
  'ACCEPTED',
  'IN_PROGRESS',
  'ON_HOLD',
  'PENDING_REVIEW',
  'COMPLETED',
  'REJECTED',
  'BLOCKED',
  'CANCELLED',
  'REOPENED'
]);

function normalizeTaskStatus(input) {
  if (input == null || input === '') return input;
  const s = String(input).trim();
  if (TASK_STATUSES.has(s)) return s;
  const key = s.toLowerCase();
  if (PROXY_STATUS_MAP[key]) return PROXY_STATUS_MAP[key];
  return s;
}

/**
 * List query: frontend param names → service filters
 */
function normalizeListQuery(query = {}) {
  const out = { ...query };

  const assigned =
    query.assigned_to_employee_id ||
    query.assignedToEmployeeId ||
    query.assignedTo ||
    query.employeeId;
  if (assigned) out.assigned_to_employee_id = assigned;

  const typeId = query.type_id || query.taskType || query.typeId;
  if (typeId) out.type_id = typeId;

  const assigner = query.assignerId || query.createdByEmployeeId;
  if (assigner) out.created_by_employee_id = assigner;

  if (query.workdayId) out.workday_id = query.workdayId;

  if (typeof query.requiresApproval === 'string') {
    out.requires_approval = query.requiresApproval === 'true';
  } else if (typeof query.requiresApproval === 'boolean') {
    out.requires_approval = query.requiresApproval;
  }

  if (query.date && !query.date_from && !query.date_to) {
    const d = new Date(query.date);
    if (!Number.isNaN(d.getTime())) {
      const start = new Date(d);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      out.date_from = start.toISOString();
      out.date_to = end.toISOString();
    }
  }

  if (typeof out.status === 'string' && out.status.includes(',')) {
    // keep for controller split
  } else if (out.status) {
    out.status = normalizeTaskStatus(out.status);
  }

  return out;
}

/**
 * Create / update body: camelCase → snake_case for manager task API
 */
function normalizeManagerTaskBody(body = {}) {
  const b = { ...body };
  if (b.assignedToEmployeeId && !b.assigned_to_employee_id) {
    b.assigned_to_employee_id = b.assignedToEmployeeId;
  }
  if (b.typeId && !b.type_id) b.type_id = b.typeId;
  if (b.scopeOrgNodeId && !b.scope_org_node_id) b.scope_org_node_id = b.scopeOrgNodeId;
  if (b.slaMinutes != null && b.sla_minutes_override == null) {
    b.sla_minutes_override = b.slaMinutes;
  }
  if (b.requiresApproval != null && b.requires_approval == null) {
    b.requires_approval = b.requiresApproval;
  }
  if (b.requiresReview != null && b.requires_review == null) {
    b.requires_review = b.requiresReview;
  }
  if (b.requiresEvidence != null && b.requires_evidence == null) {
    b.requires_evidence = b.requiresEvidence;
  }
  if (b.requiresTimer != null && b.requires_timer == null) {
    b.requires_timer = b.requiresTimer;
  }
  if (b.reviewerEmployeeId && !b.reviewer_employee_id) {
    b.reviewer_employee_id = b.reviewerEmployeeId;
  }
  if (b.approverEmployeeId && !b.approver_employee_id) {
    b.approver_employee_id = b.approverEmployeeId;
  }
  if (b.workdayId && !b.workday_id) b.workday_id = b.workdayId;
  if (b.dependencyTaskIds && !b.dependency_task_ids) b.dependency_task_ids = b.dependencyTaskIds;
  if (b.recurrenceRuleId && !b.recurrence_rule_id) b.recurrence_rule_id = b.recurrenceRuleId;
  if (typeof b.checklistCompletionRequired === 'boolean' && b.checklist_completion_required == null) {
    b.checklist_completion_required = b.checklistCompletionRequired;
  }
  if (Array.isArray(b.checklistItems) && !b.checklist_items) {
    b.checklist_items = b.checklistItems.map((item, i) => ({
      key: item.key != null ? String(item.key) : String(i),
      label: item.label != null ? String(item.label) : String(item.title || i),
      done: !!item.done,
      order: item.order != null ? item.order : i
    }));
  }
  if (b.dueAt && !b.due_at) b.due_at = b.dueAt;
  return b;
}

/**
 * Self-task body (proxy: taskType)
 */
function normalizeSelfTaskBody(body = {}) {
  const b = normalizeManagerTaskBody(body);
  if (b.taskType && !b.type_id) b.type_id = b.taskType;
  return b;
}

/**
 * Update task body from jts-client UpdateTaskDto
 */
function normalizeUpdateTaskBody(body = {}) {
  const b = normalizeManagerTaskBody(body);
  if (b.estimatedHours != null && b.estimated_hours == null) {
    b.estimated_hours = b.estimatedHours;
  }
  if (b.estimatedMinutes != null && b.estimated_minutes == null) {
    b.estimated_minutes = b.estimatedMinutes;
  }
  if (b.actualMinutes != null && b.actual_minutes == null) {
    b.actual_minutes = b.actualMinutes;
  }
  if (b.notes != null && b.metadata == null) {
    b.metadata = { ...(body.metadata || {}), notes: b.notes };
  }
  if (b.status) b.status = normalizeTaskStatus(b.status);
  if (Array.isArray(b.checklistItems) && !b.checklist_items) {
    b.checklist_items = b.checklistItems.map((item, i) => ({
      key: item.key != null ? String(item.key) : String(i),
      label: item.label != null ? String(item.label) : String(item.title || i),
      done: !!item.done,
      order: item.order != null ? item.order : i
    }));
  }
  if (typeof b.checklistCompletionRequired === 'boolean' && b.checklist_completion_required == null) {
    b.checklist_completion_required = b.checklistCompletionRequired;
  }
  if (b.dependencyTaskIds && !b.dependency_task_ids) b.dependency_task_ids = b.dependencyTaskIds;
  if (b.recurrenceRuleId && !b.recurrence_rule_id) b.recurrence_rule_id = b.recurrenceRuleId;
  return b;
}

module.exports = {
  normalizeTaskStatus,
  normalizeListQuery,
  normalizeManagerTaskBody,
  normalizeSelfTaskBody,
  normalizeUpdateTaskBody,
  TASK_STATUSES
};
