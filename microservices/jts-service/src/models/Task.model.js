const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Core JTS task document — human `code`, category, extended `source`, SLA timestamps, assign/review/approve,
 * checklist, dependencies, recurrence, tags, soft-delete (`is_deleted`), and activity counters. API DTOs use
 * camelCase via `taskFrontend.mapper`.
 */
const TaskSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    /** Human-readable code e.g. JTS-2026-000145 */
    code: { type: String, sparse: true },
    title: { type: String, required: true },
    description: String,
    /** Denormalized / override display category (also on TaskType). */
    category: { type: String, index: true, sparse: true },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
      index: true
    },
    scope_org_node_id: {
      type: Schema.Types.ObjectId,
      ref: 'OrgNode',
      required: true,
      index: true
    },
    created_by_employee_id: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true
    },
    assigned_to_employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', index: true },
    reviewer_employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', index: true },
    approver_employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', index: true },
    type_id: { type: Schema.Types.ObjectId, ref: 'TaskType', required: true, index: true },
    source: {
      type: String,
      enum: ['SYSTEM', 'MANAGER', 'SELF', 'ESCALATION', 'WORKDAY', 'INCIDENT'],
      required: true
    },
    requires_approval: { type: Boolean, required: true, default: false },
    requires_review: { type: Boolean, default: false },
    requires_evidence: { type: Boolean, default: false },
    requires_timer: { type: Boolean, default: false },
    status: {
      type: String,
      enum: [
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
      ],
      required: true,
      index: true
    },
    sla_minutes: { type: Number, required: true },
    sla_policy_id: { type: Schema.Types.ObjectId, ref: 'TaskTypeSlaRule', index: true, sparse: true },
    due_at: { type: Date, required: true, index: true },
    warning_at: Date,
    breached_at: Date,
    sla_started_at: Date,
    sla_paused_at: Date,
    sla_paused_seconds_total: { type: Number, default: 0 },
    accepted_at: Date,
    started_at: Date,
    completed_at: Date,
    cancelled_at: Date,
    submitted_for_review_at: Date,
    last_activity_at: Date,
    estimated_minutes: Number,
    actual_minutes: Number,
    workday_id: { type: String, index: true, sparse: true },
    parent_task_id: { type: Schema.Types.ObjectId, ref: 'Task', index: true, sparse: true },
    child_task_ids: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    dependency_task_ids: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    is_recurring: { type: Boolean, default: false, index: true },
    recurrence_rule_id: {
      type: Schema.Types.ObjectId,
      ref: 'RecurrenceRule',
      index: true,
      sparse: true
    },
    checklist_items: [
      {
        key: { type: String, required: true },
        label: { type: String, required: true },
        done: { type: Boolean, default: false },
        order: { type: Number, default: 0 }
      }
    ],
    checklist_completion_required: { type: Boolean, default: false },
    is_blocked: { type: Boolean, default: false, index: true },
    blocked_reason: String,
    blocked_at: Date,
    unblocked_at: Date,
    escalation_level: { type: Number, default: 0, index: true },
    reopened_count: { type: Number, default: 0 },
    extension_count: { type: Number, default: 0 },
    rejection_count: { type: Number, default: 0 },
    tags: [{ type: String }],
    is_deleted: { type: Boolean, default: false, index: true },
    deleted_at: Date,
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

TaskSchema.index(
  { tenant_id: 1, assigned_to_employee_id: 1, status: 1, due_at: 1 },
  { name: 'tasks_assignee_status_due' }
);

TaskSchema.index(
  { tenant_id: 1, scope_org_node_id: 1, status: 1 },
  { name: 'tasks_orgnode_status' }
);

TaskSchema.index(
  { tenant_id: 1, status: 1, due_at: 1 },
  {
    name: 'tasks_sla_monitor',
    partialFilterExpression: {
      status: { $in: ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'ON_HOLD', 'PENDING_REVIEW', 'BLOCKED'] }
    }
  }
);

TaskSchema.index({ tenant_id: 1, code: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Task', TaskSchema);
