const mongoose = require('mongoose');

const permissionAuditSchema = new mongoose.Schema(
  {
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    tenantId: { type: String, trim: true, lowercase: true, index: true },
    action: {
      type: String,
      enum: ['patch_overrides', 'put_permissions', 'reset', 'unknown'],
      default: 'unknown'
    },
    previousCustom: [{ type: String }],
    previousDeny: [{ type: String }],
    nextCustom: [{ type: String }],
    nextDeny: [{ type: String }],
    catalogVersion: { type: Number, default: 0 },
    permissionsRevisionBefore: { type: Number },
    permissionsRevisionAfter: { type: Number },
    unknownCustomStripped: [{ type: String }],
    unknownDenyStripped: [{ type: String }],
    ip: { type: String },
    userAgent: { type: String }
  },
  { timestamps: true }
);

permissionAuditSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PermissionAudit', permissionAuditSchema);
