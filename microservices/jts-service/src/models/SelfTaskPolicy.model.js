const mongoose = require('mongoose');
const { Schema } = mongoose;

const SelfTaskPolicySchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
    role_key: { type: String, required: true },
    auto_assign_to_self: { type: Boolean, default: true },
    mandatory_approval: { type: Boolean, default: true },
    max_minutes_per_task: Number,
    max_minutes_per_shift: Number,
    max_tasks_per_day: Number
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

SelfTaskPolicySchema.index(
  { tenant_id: 1, role_key: 1 },
  { unique: true }
);

module.exports = mongoose.model('SelfTaskPolicy', SelfTaskPolicySchema);

