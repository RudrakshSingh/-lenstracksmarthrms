const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  // Request Identification
  request_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  
  // Employee Reference
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  employee_code: {
    type: String,
    required: true,
    index: true
  },
  employee_name: {
    type: String,
    required: true
  },
  
  // Leave Details
  leave_type: {
    type: String,
    required: true,
    enum: ['CL', 'SL', 'EL', 'WO', 'PH', 'LWP', 'MATERNITY', 'PATERNITY', 'BEREAVEMENT', 'MARRIAGE', 'COMP_OFF', 'TRAINING'],
    index: true
  },
  from_date: {
    type: Date,
    required: true,
    index: true
  },
  to_date: {
    type: Date,
    required: true,
    index: true
  },
  days: {
    type: Number,
    required: true,
    min: 0.5,
    max: 365
  },
  half_day: {
    type: Boolean,
    default: false
  },
  half_day_type: {
    type: String,
    enum: ['FIRST_HALF', 'SECOND_HALF'],
    default: null
  },
  
  // Reason & Details
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  emergency_contact: {
    name: String,
    phone: String,
    relation: String
  },
  
  // Attachments
  attachments: [{
    file_name: {
      type: String,
      required: true
    },
    file_url: {
      type: String,
      required: true
    },
    file_type: {
      type: String,
      enum: ['MEDICAL_CERTIFICATE', 'DOCUMENT', 'OTHER']
    },
    uploaded_at: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Medical Certificate
  medical_certificate: {
    required: {
      type: Boolean,
      default: false
    },
    provided: {
      type: Boolean,
      default: false
    },
    file_url: String,
    verified: {
      type: Boolean,
      default: false
    },
    verified_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verified_at: Date
  },
  
  // Status & Workflow
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'WITHDRAWN'],
    default: 'PENDING',
    index: true
  },
  
  // Approval Chain
  approvers: [{
    level: {
      type: Number,
      required: true,
      min: 1,
      max: 3
    },
    approver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approver_name: String,
    approver_role: String,
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING'
    },
    comments: String,
    approved_at: Date,
    rejected_at: Date,
    sla_deadline: Date,
    sla_breached: {
      type: Boolean,
      default: false
    }
  }],
  
  // Current Approver
  current_approver_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  current_approver_name: String,
  
  // Final Approval
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approved_at: {
    type: Date
  },
  rejected_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejected_at: {
    type: Date
  },
  rejection_reason: {
    type: String,
    trim: true
  },
  
  // Blackout Date Override
  blackout_override: {
    required: {
      type: Boolean,
      default: false
    },
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approved_at: Date,
    reason: String
  },
  
  // Comp-off Details (if applicable)
  comp_off: {
    is_comp_off: {
      type: Boolean,
      default: false
    },
    source: {
      type: String,
      enum: ['OT', 'EXTRA_WORK']
    },
    source_date: Date,
    source_details: String
  },
  
  // Balance Check
  balance_available: {
    type: Number,
    default: 0
  },
  balance_after: {
    type: Number,
    default: 0
  },
  negative_balance: {
    type: Boolean,
    default: false
  },
  
  // SLA Tracking
  sla_hours: {
    type: Number,
    default: 48
  },
  submitted_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  first_response_at: Date,
  total_processing_time_hours: Number,
  
  // Cancellation
  cancelled_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelled_at: Date,
  cancellation_reason: String,
  
  // Withdrawal
  withdrawn_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  withdrawn_at: Date,
  
  // Metadata
  policy_id: {
    type: String,
    ref: 'LeavePolicy'
  },
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  },
  
  // Audit
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
leaveRequestSchema.index({ employee_id: 1, from_date: 1, to_date: 1 });
leaveRequestSchema.index({ status: 1, submitted_at: 1 });
leaveRequestSchema.index({ current_approver_id: 1, status: 1 });
leaveRequestSchema.index({ leave_type: 1, from_date: 1 });

// Pre-save middleware
leaveRequestSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Calculate days if not provided
  if (this.from_date && this.to_date && !this.days) {
    const diffTime = Math.abs(this.to_date - this.from_date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    this.days = this.half_day ? diffDays - 0.5 : diffDays;
  }
  
  // Set SLA deadline (48 hours from submission)
  if (this.status === 'PENDING' && this.submitted_at && !this.approvers[0]?.sla_deadline) {
    const slaDeadline = new Date(this.submitted_at);
    slaDeadline.setHours(slaDeadline.getHours() + this.sla_hours);
    if (this.approvers.length > 0) {
      this.approvers[0].sla_deadline = slaDeadline;
    }
  }
  
  next();
});

const LeaveRequest = mongoose.model('LeaveRequest', leaveRequestSchema);

module.exports = LeaveRequest;

