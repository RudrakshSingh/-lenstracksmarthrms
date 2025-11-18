const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const securityIncidentSchema = new mongoose.Schema({
  incidentId: {
    type: String,
    required: true,
    unique: true,
    default: () => `incident_${uuidv4().split('-')[0]}`
  },
  type: {
    type: String,
    required: true,
    enum: ['brute_force', 'unauthorized_access', 'suspicious_activity', 'data_breach', 'ddos', 'malware', 'phishing', 'other'],
    index: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'investigating', 'mitigated', 'resolved', 'false_positive'],
    default: 'active',
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  affectedTenants: [{
    type: String,
    ref: 'Tenant'
  }],
  detectedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  assignedTo: {
    type: String,
    default: null
  },
  actions: [{
    action: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    },
    performedBy: String
  }],
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

securityIncidentSchema.index({ status: 1, severity: 1 });
securityIncidentSchema.index({ detectedAt: -1 });
securityIncidentSchema.index({ type: 1, status: 1 });

const SecurityIncident = mongoose.model('SecurityIncident', securityIncidentSchema);

module.exports = SecurityIncident;

