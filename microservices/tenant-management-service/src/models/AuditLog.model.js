const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    index: true
  },
  actor: {
    id: {
      type: String,
      required: true
    },
    email: String,
    role: String,
    name: String
  },
  target: {
    type: {
      type: String,
      required: true
    },
    id: String,
    email: String,
    name: String
  },
  tenantId: {
    type: String,
    ref: 'Tenant',
    index: true,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  details: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  result: {
    type: String,
    enum: ['success', 'failure', 'partial'],
    default: 'success'
  },
  error: {
    message: String,
    code: String
  }
}, {
  timestamps: true
});

auditLogSchema.index({ tenantId: 1, timestamp: -1 });
auditLogSchema.index({ 'actor.id': 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;

