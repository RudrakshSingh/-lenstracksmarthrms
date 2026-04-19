const mongoose = require('mongoose');

const payrollWorkflowAuditSchema = new mongoose.Schema({
  cycle_ref: { type: String, required: true, index: true },
  action: { type: String, required: true, index: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role: String,
  payload: mongoose.Schema.Types.Mixed,
  request_id: String,
  ip: String,
  user_agent: String,
  prev_hash: String,
  entry_hash: String,
  tenant_id: String
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

payrollWorkflowAuditSchema.index({ cycle_ref: 1, created_at: -1 });

module.exports = mongoose.model('PayrollWorkflowAudit', payrollWorkflowAuditSchema);
