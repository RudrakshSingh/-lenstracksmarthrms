const mongoose = require('mongoose');
const { Schema } = mongoose;

const SubtaskSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    task_id: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    title: { type: String, required: true },
    description: String,
    assigned_to_employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', index: true },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'],
      default: 'OPEN',
      index: true
    },
    due_at: Date,
    completed_at: Date,
    created_by_employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    is_deleted: { type: Boolean, default: false, index: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

SubtaskSchema.index({ tenant_id: 1, task_id: 1, is_deleted: 1, created_at: -1 });

module.exports = mongoose.model('Subtask', SubtaskSchema);

