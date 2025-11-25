const mongoose = require('mongoose');
const { Schema } = mongoose;

const TaskStatusHistorySchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    task_id: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    from_status: String,
    to_status: { type: String, required: true },
    changed_by_employee_id: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true
    },
    changed_at: { type: Date, required: true, default: Date.now },
    reason: String
  },
  { timestamps: false }
);

TaskStatusHistorySchema.index({ tenant_id: 1, task_id: 1, changed_at: -1 });

module.exports = mongoose.model('TaskStatusHistory', TaskStatusHistorySchema);

