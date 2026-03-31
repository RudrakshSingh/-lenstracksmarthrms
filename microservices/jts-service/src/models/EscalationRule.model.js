const mongoose = require('mongoose');
const { Schema } = mongoose;

const EscalationRuleSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
    task_type_id: { type: Schema.Types.ObjectId, ref: 'TaskType', default: null, index: true },
    threshold: {
      type: String,
      enum: ['PRE_SLA', 'SLA_BREACH', 'EXTRA_DELAY', 'L0', 'L1', 'L2', 'L3'],
      required: true
    },
    trigger_type: {
      type: String,
      enum: ['SLA_BREACH', 'NO_ACCEPTANCE', 'NO_ACTIVITY', 'REPEATED_REJECTIONS'],
      default: 'SLA_BREACH',
      index: true
    },
    trigger_minutes: Number,
    trigger_rejection_count: Number,
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

