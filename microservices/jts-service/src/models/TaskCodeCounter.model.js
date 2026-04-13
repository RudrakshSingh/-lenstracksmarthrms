const mongoose = require('mongoose');
const { Schema } = mongoose;

/** Per-tenant, per-year monotonic sequence for human-readable task codes (atomic $inc). */
const TaskCodeCounterSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    year: { type: Number, required: true },
    seq: { type: Number, required: true, default: 0 }
  },
  { timestamps: false }
);

TaskCodeCounterSchema.index({ tenant_id: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('TaskCodeCounter', TaskCodeCounterSchema);
