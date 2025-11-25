const mongoose = require('mongoose');
const { Schema } = mongoose;

const TaskTimerSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    task_id: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    started_at: { type: Date, required: true },
    stopped_at: Date,
    duration_seconds: Number,
    auto_stopped: { type: Boolean, required: true, default: false }
  },
  { timestamps: false }
);

TaskTimerSchema.index(
  { tenant_id: 1, employee_id: 1, stopped_at: 1 },
  { name: 'timers_by_employee' }
);

TaskTimerSchema.index(
  { tenant_id: 1, task_id: 1, started_at: 1 },
  { name: 'timers_by_task' }
);

module.exports = mongoose.model('TaskTimer', TaskTimerSchema);

