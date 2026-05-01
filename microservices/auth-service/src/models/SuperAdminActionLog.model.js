const mongoose = require('mongoose');

const superAdminActionLogSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, trim: true, lowercase: true, index: true },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    actorEmail: { type: String, trim: true, lowercase: true },
    action: { type: String, required: true, trim: true },
    scope: { type: String, enum: ['finance', 'payroll', 'general', 'gst', 'customer'], default: 'general' },
    method: { type: String, trim: true, uppercase: true },
    path: { type: String, trim: true },
    statusCode: { type: Number },
    requestId: { type: String, trim: true },
    ip: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

superAdminActionLogSchema.index({ tenantId: 1, actorUserId: 1, createdAt: -1 });

module.exports = mongoose.model('SuperAdminActionLog', superAdminActionLogSchema);
