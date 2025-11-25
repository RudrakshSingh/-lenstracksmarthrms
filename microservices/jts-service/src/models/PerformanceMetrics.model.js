const mongoose = require('mongoose');
const { Schema } = mongoose;

const PerformanceMetricsSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
    employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    period_type: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL'],
      required: true
    },
    period_start_date: { type: Date, required: true },
    period_end_date: { type: Date, required: true },
    total_tasks_assigned: { type: Number, default: 0 },
    total_tasks_completed: { type: Number, default: 0 },
    total_tasks_rejected: { type: Number, default: 0 },
    completion_rate: { type: Number, default: 0 },
    tasks_within_sla: { type: Number, default: 0 },
    tasks_breached_sla: { type: Number, default: 0 },
    tasks_extra_delay: { type: Number, default: 0 },
    sla_compliance_rate: { type: Number, default: 0 },
    avg_completion_time_minutes: Number,
    total_hours_logged: { type: Number, default: 0 },
    self_task_approval_rate: Number,
    avg_acceptance_speed_minutes: Number,
    timer_usage_rate: Number
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

PerformanceMetricsSchema.index(
  { tenant_id: 1, employee_id: 1, period_type: 1, period_start_date: 1 },
  { unique: true }
);

module.exports = mongoose.model('PerformanceMetrics', PerformanceMetricsSchema);

