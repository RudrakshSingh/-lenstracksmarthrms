const mongoose = require('mongoose');
const { Schema } = mongoose;

const TaskSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    title: { type: String, required: true },
    description: String,
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
    type_id: { type: Schema.Types.ObjectId, ref: 'TaskType', required: true, index: true },
    source: { type: String, enum: ['SYSTEM', 'MANAGER', 'SELF'], required: true },
    requires_approval: { type: Boolean, required: true, default: false },
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
        'REJECTED'
      ],
      required: true,
      index: true
    },
    sla_minutes: { type: Number, required: true },
    due_at: { type: Date, required: true, index: true },
    accepted_at: Date,
    started_at: Date,
    completed_at: Date,
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

// Key indexes for performance
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
      status: { $in: ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'ON_HOLD'] }
    }
  }
);

module.exports = mongoose.model('Task', TaskSchema);

