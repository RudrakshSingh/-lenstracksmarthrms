const mongoose = require('mongoose');
const { Schema } = mongoose;

const SlaBreachLogSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
    task_id: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    employee_id: { type: Schema.Types.ObjectId, ref: 'Employee' },
    due_at: { type: Date, required: true },
    breached_at: { type: Date, required: true },
    delay_minutes: { type: Number, required: true },
    created_at: { type: Date, default: Date.now },
    breach_reason_code: { type: String, maxlength: 64 },
    acknowledged_at: Date,
    acknowledged_by_employee_id: { type: Schema.Types.ObjectId, ref: 'Employee' },
    acknowledgment_note: { type: String, maxlength: 2000 }
  },
  { timestamps: false }
);

SlaBreachLogSchema.index({ tenant_id: 1, created_at: -1 });
SlaBreachLogSchema.index({ tenant_id: 1, employee_id: 1, created_at: -1 });
SlaBreachLogSchema.index({ tenant_id: 1, acknowledged_at: 1, created_at: -1 });

module.exports = mongoose.model('SlaBreachLog', SlaBreachLogSchema);

