const mongoose = require('mongoose');
const { Schema } = mongoose;

const PerformanceAlertSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
    employee_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    alert_type: {
      type: String,
      enum: ['UNDERPERFORMANCE', 'CONSISTENT_DELAYS', 'LOW_SLA', 'HIGH_PERFORMER', 'IMPROVEMENT'],
      required: true
    },
    severity: { type: String, enum: ['INFO', 'WARNING', 'CRITICAL'], required: true },
    title: { type: String, required: true },
    description: String,
    metric_name: { type: String, required: true },
    metric_value: { type: Number, required: true },
    threshold_value: { type: Number, required: true },
    action_required: { type: Boolean, default: false },
    action_taken: String,
    resolved_at: Date,
    created_at: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

PerformanceAlertSchema.index({ tenant_id: 1, employee_id: 1, severity: 1, created_at: -1 });

module.exports = mongoose.model('PerformanceAlert', PerformanceAlertSchema);

