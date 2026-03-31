const mongoose = require('mongoose');
const { Schema } = mongoose;

const TaskTimerSessionSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    task_id: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    timer_id: { type: Schema.Types.ObjectId, ref: 'TaskTimer', required: true, index: true },
    started_at: { type: Date, required: true },
    stopped_at: Date,
    duration_seconds: Number,
    stop_reason: {
      type: String,
      enum: ['MANUAL', 'AUTO', 'COMPLETE', 'SHIFT_END', 'PAUSE'],
      default: 'MANUAL'
    }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

TaskTimerSessionSchema.index({ tenant_id: 1, task_id: 1, started_at: -1 });

module.exports = mongoose.model('TaskTimerSession', TaskTimerSessionSchema);
