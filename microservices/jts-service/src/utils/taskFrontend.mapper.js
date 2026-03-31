/**
 * Map Mongoose Task / TaskTimer documents to camelCase shapes expected by HRMS MFE.
 */

/** Public path prefix for links returned in JSON (match ingress: /jts or /api/jts). */
const JTS_PUBLIC_PATH_PREFIX = (process.env.JTS_PUBLIC_PATH_PREFIX || '/api/jts').replace(/\/$/, '');

function refId(doc) {
  if (!doc) return undefined;
  if (typeof doc === 'string') return doc;
  return doc._id ? doc._id.toString() : String(doc);
}

function toEmployeeRef(emp) {
  if (!emp) return undefined;
  const o = emp.toObject ? emp.toObject() : emp;
  return {
    id: refId(o._id),
    name: o.name,
    employeeId: o.code
  };
}

function toTaskTypeRef(tt) {
  if (!tt) return undefined;
  const o = tt.toObject ? tt.toObject() : tt;
  return {
    id: refId(o._id),
    name: o.name,
    code: o.code
  };
}

function computeSlaStatus(task) {
  const now = Date.now();
  const due = new Date(task.due_at).getTime();
  const start = new Date(task.sla_started_at || task.started_at || task.created_at || Date.now()).getTime();
  const pausedTotalSec = Number(task.sla_paused_seconds_total || 0);
  const livePausedSec =
    task.sla_paused_at && task.status === 'ON_HOLD'
      ? Math.max(0, Math.floor((Date.now() - new Date(task.sla_paused_at).getTime()) / 1000))
      : 0;
  const elapsedMinutes = Math.max(
    0,
    Math.floor((now - start) / 60000) - Math.floor((pausedTotalSec + livePausedSec) / 60)
  );
  const remainingMinutes = Math.max(0, Math.floor((due - now) / 60000));
  const windowMs = Math.max(1, due - start);
  const percentComplete = Math.min(100, Math.round(((now - start) / windowMs) * 100));

  let status = 'ON_TRACK';
  let breachedAt = task.breached_at ? new Date(task.breached_at).toISOString() : null;
  if (task.breached_at || now > due) {
    status = task.status === 'COMPLETED' ? 'EXTRA_DELAY' : 'BREACHED';
    if (!breachedAt) breachedAt = new Date(due).toISOString();
  } else {
    const warnThreshold = task.sla_minutes * 0.25 * 60000;
    if (task.warning_at || due - now < warnThreshold) status = 'WARNING';
  }

  return {
    taskId: refId(task._id),
    slaMinutes: task.sla_minutes,
    dueAt: task.due_at,
    elapsedMinutes,
    remainingMinutes,
    percentComplete,
    status,
    breachedAt: breachedAt || null
  };
}

function serializeTask(doc, options = {}) {
  if (!doc) return null;
  const t = doc.toObject ? doc.toObject() : doc;
  const includeSla = options.slaStatus !== false;

  const attachmentRefs = Array.isArray(t.metadata?.attachment_refs) ? t.metadata.attachment_refs : [];
  const attachmentsMeta = t.metadata?.attachment_keys;
  const attachments = attachmentRefs.length > 0
    ? attachmentRefs.map(
        (a) => `${JTS_PUBLIC_PATH_PREFIX}/tasks/${refId(t._id)}/attachments/${a.id}/presign-download`
      )
    : (Array.isArray(attachmentsMeta) ? attachmentsMeta : undefined);

  const out = {
    id: refId(t._id),
    tenantId: refId(t.tenant_id),
    title: t.title,
    category: t.category || undefined,
    description: t.description || '',
    priority: t.priority,
    status: t.status,
    source: t.source,
    createdByEmployeeId: refId(t.created_by_employee_id),
    createdByEmployee: toEmployeeRef(t.created_by_employee_id),
    assignedToEmployeeId: refId(t.assigned_to_employee_id),
    assignedToEmployee: toEmployeeRef(t.assigned_to_employee_id),
    typeId: refId(t.type_id),
    taskType: toTaskTypeRef(t.type_id),
    slaMinutes: t.sla_minutes,
    dueAt: t.due_at,
    code: t.code || undefined,
    workdayId: t.workday_id || t.metadata?.workday_id,
    requiresApproval: t.requires_approval,
    requiresReview: !!t.requires_review,
    requiresEvidence: !!t.requires_evidence,
    requiresTimer: !!t.requires_timer,
    reviewerEmployeeId: refId(t.reviewer_employee_id),
    reviewerEmployee: toEmployeeRef(t.reviewer_employee_id),
    approverEmployeeId: refId(t.approver_employee_id),
    approverEmployee: toEmployeeRef(t.approver_employee_id),
    isBlocked: !!t.is_blocked,
    blockedReason: t.blocked_reason || undefined,
    tags: Array.isArray(t.tags) ? t.tags : undefined,
    estimatedMinutes: t.estimated_minutes != null ? t.estimated_minutes : undefined,
    actualMinutes: t.actual_minutes != null ? t.actual_minutes : undefined,
    checklistItems: Array.isArray(t.checklist_items) ? t.checklist_items : undefined,
    checklistCompletionRequired: !!t.checklist_completion_required,
    dependencyTaskIds: Array.isArray(t.dependency_task_ids)
      ? t.dependency_task_ids.map((id) => refId(id))
      : undefined,
    isRecurring: !!t.is_recurring,
    recurrenceRuleId: refId(t.recurrence_rule_id),
    parentTaskId: refId(t.parent_task_id),
    createdAt: t.created_at,
    acceptedAt: t.accepted_at,
    startedAt: t.started_at,
    completedAt: t.completed_at,
    cancelledAt: t.cancelled_at || undefined,
    submittedForReviewAt: t.submitted_for_review_at || undefined,
    lastActivityAt: t.last_activity_at || undefined,
    updatedAt: t.updated_at,
    estimatedHours: t.metadata?.estimated_hours,
    actualHours: t.metadata?.actual_hours,
    attachments: attachments || [],
    notes: t.metadata?.notes
  };

  if (includeSla) {
    out.slaStatus = computeSlaStatus(t);
  }

  return out;
}

function serializeTimer(doc) {
  if (!doc) return null;
  const x = doc.toObject ? doc.toObject() : doc;
  return {
    id: refId(x._id),
    tenantId: refId(x.tenant_id),
    taskId: refId(x.task_id),
    employeeId: refId(x.employee_id),
    startedAt: x.started_at,
    stoppedAt: x.stopped_at,
    durationSeconds: x.duration_seconds != null ? x.duration_seconds : 0,
    autoStopped: !!x.auto_stopped
  };
}

function serializeTimerSession(row) {
  if (!row) return null;
  const x = row.toObject ? row.toObject() : row;
  return {
    id: refId(x._id),
    tenantId: refId(x.tenant_id),
    taskId: refId(x.task_id),
    employeeId: refId(x.employee_id),
    timerId: refId(x.timer_id),
    startedAt: x.started_at,
    stoppedAt: x.stopped_at || null,
    durationSeconds: x.duration_seconds != null ? x.duration_seconds : null,
    stopReason: x.stop_reason || null,
    createdAt: x.created_at,
    updatedAt: x.updated_at
  };
}

function slaStatusFromTaskDoc(taskDoc) {
  if (!taskDoc) return null;
  const t = taskDoc.toObject ? taskDoc.toObject() : taskDoc;
  return computeSlaStatus(t);
}

function serializeTimerBundle({ activeTimer, sessions = [], totalDurationSeconds = 0 }) {
  return {
    activeTimer: activeTimer ? serializeTimer(activeTimer) : null,
    sessions: sessions.map((s) => serializeTimerSession(s)),
    totalDurationSeconds
  };
}

module.exports = {
  serializeTask,
  serializeTimer,
  serializeTimerSession,
  serializeTimerBundle,
  computeSlaStatus,
  slaStatusFromTaskDoc
};
