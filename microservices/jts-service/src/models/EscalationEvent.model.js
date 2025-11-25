const mongoose = require('mongoose');
const { Schema } = mongoose;

const EscalationEventSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
    task_id: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    rule_id: { type: Schema.Types.ObjectId, ref: 'EscalationRule', required: true, index: true },
    level: {
      type: String,
      enum: ['PRE_SLA', 'SLA_BREACH', 'EXTRA_DELAY'],
      required: true,
      index: true
    },
    notified_roles: { type: [String], default: [] },
    notified_employee_ids: { type: [Schema.Types.ObjectId], ref: 'Employee', default: [] },
    created_at: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

EscalationEventSchema.index({ tenant_id: 1, task_id: 1, level: 1, created_at: -1 });

module.exports = mongoose.model('EscalationEvent', EscalationEventSchema);

