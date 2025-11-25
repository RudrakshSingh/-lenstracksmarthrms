const mongoose = require('mongoose');
const { Schema } = mongoose;

const DataAccessLogSchema = new Schema(
  {
    tenant_id: { type: Schema.Types.ObjectId, required: true, index: true },
    actor_id: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    resource_type: { type: String, required: true },
    resource_id: Schema.Types.ObjectId,
    action: { type: String, required: true },
    ip_address: String,
    user_agent: String,
    created_at: { type: Date, default: Date.now, index: true }
  },
  { timestamps: false }
);

DataAccessLogSchema.index({ tenant_id: 1, created_at: -1 });
DataAccessLogSchema.index({ tenant_id: 1, actor_id: 1, created_at: -1 });

module.exports = mongoose.model('DataAccessLog', DataAccessLogSchema);

