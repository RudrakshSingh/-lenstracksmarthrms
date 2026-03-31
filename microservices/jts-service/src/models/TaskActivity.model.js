const mongoose = require('mongoose');
const { Schema } = mongoose;

/** Blueprint-aligned audit trail actions (plus small extensions). */
const TASK_ACTIVITY_ACTIONS = [
  'CREATED',
  'ASSIGNED',
  'ACCEPTED',
  'STARTED',
  'PAUSED',
  'RESUMED',
  'COMMENTED',
  'FILE_UPLOADED',
  'SUBMITTED_FOR_REVIEW',
  'APPROVED',
  'REJECTED',
  'COMPLETED',
  'REOPENED',
  'ESCALATED',
  'REASSIGNED',
  'CANCELLED',
  'BLOCKED',
  'STATUS_CHANGED'
];

const TaskActivitySchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    task_id: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    actor_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    action: { type: String, enum: TASK_ACTIVITY_ACTIONS, required: true, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    created_at: { type: Date, required: true, default: Date.now, index: true }
  },
  { timestamps: false }
);

TaskActivitySchema.index({ tenant_id: 1, task_id: 1, created_at: -1 });

module.exports = mongoose.model('TaskActivity', TaskActivitySchema);
module.exports.TASK_ACTIVITY_ACTIONS = TASK_ACTIVITY_ACTIONS;
