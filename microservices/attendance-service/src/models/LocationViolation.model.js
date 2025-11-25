const mongoose = require('mongoose');

const locationViolationSchema = new mongoose.Schema({
  violation_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    index: true
  },
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  violation_type: {
    type: String,
    enum: [
      'MOCK_LOCATION',
      'FAKE_GPS_APP',
      'SPEED_ANOMALY',
      'NETWORK_MISMATCH',
      'SATELLITE_INVALID',
      'DEVICE_ROOTED',
      'APP_STATE_INVALID',
      'FACE_MISMATCH',
      'AI_ANOMALY',
      'MULTIPLE_VIOLATIONS'
    ],
    required: true,
    index: true
  },
  suspicious_score: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    index: true
  },
  action_taken: {
    type: String,
    enum: ['ALLOWED', 'FLAGGED', 'BLOCKED'],
    required: true,
    index: true
  },
  
  // Location Data
  location_data: {
    gps: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      accuracy: { type: Number },
      altitude: { type: Number },
      heading: { type: Number },
      speed: { type: Number },
      timestamp: { type: Date }
    },
    network: {
      latitude: { type: Number },
      longitude: { type: Number },
      accuracy: { type: Number },
      source: { type: String }
    },
    ip: {
      latitude: { type: Number },
      longitude: { type: Number },
      city: { type: String },
      region: { type: String },
      country: { type: String },
      ip: { type: String }
    },
    satellite_count: { type: Number },
    average_snr: { type: Number }
  },
  
  // Device Info
  device_info: {
    platform: { type: String },
    user_agent: { type: String },
    is_rooted: { type: Boolean, default: false },
    is_jailbroken: { type: Boolean, default: false },
    mock_location_enabled: { type: Boolean, default: false },
    fake_gps_apps: [{ type: String }],
    developer_mode: { type: Boolean, default: false },
    is_web: { type: Boolean, default: false }
  },
  
  // App State
  app_state: {
    is_active: { type: Boolean },
    is_online: { type: Boolean },
    last_interaction: { type: Date },
    screen_on: { type: Boolean }
  },
  
  // Security Checks
  security_checks: {
    mock_location: {
      passed: { type: Boolean, default: true },
      details: { type: mongoose.Schema.Types.Mixed }
    },
    device_security: {
      passed: { type: Boolean, default: true },
      details: { type: mongoose.Schema.Types.Mixed }
    },
    speed: {
      passed: { type: Boolean, default: true },
      details: { type: mongoose.Schema.Types.Mixed }
    },
    network: {
      passed: { type: Boolean, default: true },
      details: { type: mongoose.Schema.Types.Mixed }
    },
    satellite: {
      passed: { type: Boolean, default: true },
      details: { type: mongoose.Schema.Types.Mixed }
    },
    app_state: {
      passed: { type: Boolean, default: true },
      details: { type: mongoose.Schema.Types.Mixed }
    },
    face_verification: {
      passed: { type: Boolean, default: true },
      details: { type: mongoose.Schema.Types.Mixed }
    },
    ai_analysis: {
      passed: { type: Boolean, default: true },
      details: { type: mongoose.Schema.Types.Mixed }
    }
  },
  
  // Violation Details
  violations: [{
    type: {
      type: String,
      enum: [
        'MOCK_LOCATION',
        'FAKE_GPS_APP',
        'SPEED_ANOMALY',
        'NETWORK_MISMATCH',
        'SATELLITE_INVALID',
        'DEVICE_ROOTED',
        'APP_STATE_INVALID',
        'FACE_MISMATCH',
        'AI_ANOMALY'
      ]
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    },
    message: { type: String },
    details: { type: mongoose.Schema.Types.Mixed }
  }],
  
  // Resolution
  resolved: {
    type: Boolean,
    default: false,
    index: true
  },
  resolved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolved_at: { type: Date },
  resolution_notes: { type: String },
  
  // Context
  action_type: {
    type: String,
    enum: ['CLOCK_IN', 'CLOCK_OUT', 'LOCATION_UPDATE'],
    required: true
  },
  attendance_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance'
  },
  
  // Timestamps
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes
locationViolationSchema.index({ employee_id: 1, created_at: -1 });
locationViolationSchema.index({ violation_type: 1, resolved: 1 });
locationViolationSchema.index({ suspicious_score: -1 });
locationViolationSchema.index({ action_taken: 1, resolved: 1 });

// Generate violation ID
locationViolationSchema.pre('save', async function(next) {
  if (!this.violation_id) {
    const count = await mongoose.model('LocationViolation').countDocuments();
    this.violation_id = `VIOL-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Method to mark as resolved
locationViolationSchema.methods.resolve = function(resolvedBy, notes) {
  this.resolved = true;
  this.resolved_by = resolvedBy;
  this.resolved_at = new Date();
  this.resolution_notes = notes;
  return this.save();
};

const LocationViolation = mongoose.model('LocationViolation', locationViolationSchema);

module.exports = LocationViolation;

