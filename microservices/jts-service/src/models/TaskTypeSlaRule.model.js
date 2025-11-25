const mongoose = require('mongoose');
const { Schema } = mongoose;

const TaskTypeSlaRuleSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    task_type_id: { type: Schema.Types.ObjectId, ref: 'TaskType', required: true, index: true },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true
    },
    base_sla_minutes: { type: Number, required: true },
    basis: {
      type: String,
      enum: ['CALENDAR_TIME', 'BUSINESS_HOURS'],
      required: true
    }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

TaskTypeSlaRuleSchema.index(
  { tenant_id: 1, task_type_id: 1, priority: 1 },
  { unique: true }
);

module.exports = mongoose.model('TaskTypeSlaRule', TaskTypeSlaRuleSchema);

