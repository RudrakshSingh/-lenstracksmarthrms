const mongoose = require('mongoose');
const { Schema } = mongoose;

const AuditLogSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
    action: { type: String, required: true, index: true },
    actor_id: { type: Schema.Types.ObjectId, ref: 'Employee', index: true },
    resource_type: String,
    resource_id: Schema.Types.ObjectId,
    details: Schema.Types.Mixed,
    ip_address: String,
    user_agent: String,
    created_at: { type: Date, default: Date.now, index: true }
  },
  { timestamps: false }
);

AuditLogSchema.index({ tenant_id: 1, created_at: -1 });
AuditLogSchema.index({ tenant_id: 1, actor_id: 1, created_at: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);

