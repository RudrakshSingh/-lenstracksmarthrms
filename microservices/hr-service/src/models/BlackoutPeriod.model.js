const mongoose = require('mongoose');

const blackoutPeriodSchema = new mongoose.Schema({
  // Tenant isolation
  tenantId: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  
  // Blackout period details
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    required: true,
    index: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  applicableTo: {
    type: String,
    default: 'All Employees',
    trim: true
  },
  leaveTypes: [{
    type: String,
    enum: ['CL', 'SL', 'EL', 'WO', 'PH', 'LWP', 'MATERNITY', 'PATERNITY', 'BEREAVEMENT', 'MARRIAGE', 'COMP_OFF', 'TRAINING'],
    default: ['CL', 'EL'] // Default: Casual Leave and Earned Leave
  }],
  departmentIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }],
  storeIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  }],
  
  // Approval override
  requiresAreaManagerApproval: {
    type: Boolean,
    default: false
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Metadata
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
blackoutPeriodSchema.index({ tenantId: 1, startDate: 1, endDate: 1 });
blackoutPeriodSchema.index({ tenantId: 1, isActive: 1 });

// Validation: endDate must be after startDate
blackoutPeriodSchema.pre('save', function(next) {
  if (this.endDate < this.startDate) {
    next(new Error('End date must be after start date'));
  } else {
    next();
  }
});

module.exports = mongoose.model('BlackoutPeriod', blackoutPeriodSchema);
