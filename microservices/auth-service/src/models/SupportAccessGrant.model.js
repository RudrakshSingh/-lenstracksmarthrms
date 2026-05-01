const mongoose = require('mongoose');

const supportAccessGrantSchema = new mongoose.Schema(
  {
    tenantId: { type: String, required: true, trim: true, lowercase: true, index: true },
    grantedBy: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }, // tenant admin
    grantedTo: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }, // super admin
    scope: [
      {
        type: String,
        enum: ['finance', 'payroll', 'general', 'gst', 'customer'],
        required: true
      }
    ],
    requireExtraApproval: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true, index: true },
    createdAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null, index: true },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, default: null }
  },
  { timestamps: true }
);

supportAccessGrantSchema.index({ tenantId: 1, grantedTo: 1, expiresAt: 1, revokedAt: 1 });

module.exports = mongoose.model('SupportAccessGrant', supportAccessGrantSchema);
