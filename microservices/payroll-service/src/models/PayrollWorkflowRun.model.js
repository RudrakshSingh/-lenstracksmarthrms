const mongoose = require('mongoose');

const payrollWorkflowRunSchema = new mongoose.Schema({
  cycle_ref: { type: String, required: true, index: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  dry_run: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'],
    default: 'QUEUED',
    index: true
  },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  idempotency_key: { type: String, index: true },
  failure_reason: String,
  started_at: Date,
  completed_at: Date,
  started_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tenant_id: String
}, { timestamps: true });

payrollWorkflowRunSchema.index({ idempotency_key: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('PayrollWorkflowRun', payrollWorkflowRunSchema);
