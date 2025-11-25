const mongoose = require('mongoose');
const { Schema } = mongoose;

const EscalationRuleSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
    task_type_id: { type: Schema.Types.ObjectId, ref: 'TaskType', default: null, index: true },
    threshold: {
      type: String,
      enum: ['PRE_SLA', 'SLA_BREACH', 'EXTRA_DELAY'],
      required: true
    },
    pre_sla_threshold_minutes: Number,
    extra_delay_factor: Number,
    notify_roles: { type: [String], default: [] },
    is_active: { type: Boolean, default: true, index: true }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

EscalationRuleSchema.index(
  { tenant_id: 1, task_type_id: 1, threshold: 1 },
  { name: 'escalation_rules_key' }
);

module.exports = mongoose.model('EscalationRule', EscalationRuleSchema);

