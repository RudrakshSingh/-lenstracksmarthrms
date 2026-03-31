const mongoose = require('mongoose');
const { Schema } = mongoose;

const RecurrenceRuleSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    frequency: {
      type: String,
      enum: ['DAILY', 'WEEKLY', 'MONTHLY'],
      required: true
    },
    interval: { type: Number, default: 1, min: 1 },
    /** Cron-like hints or ISO weekdays for WEEKLY — kept flexible */
    config: { type: Schema.Types.Mixed, default: {} },
    /** Next scheduled materialisation (worker can consume) */
    next_run_at: Date,
    is_active: { type: Boolean, default: true, index: true },
    /** Template task snapshot or reference — minimal for v1 */
    task_template: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

RecurrenceRuleSchema.index({ tenant_id: 1, is_active: 1, next_run_at: 1 });

module.exports = mongoose.model('RecurrenceRule', RecurrenceRuleSchema);
