const mongoose = require('mongoose');

const payrollOverrideSchema = new mongoose.Schema({
  // Override Identification
  override_id: {
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
  
  // Payroll Run Reference
  run_id: {
    type: String,
    ref: 'PayrollRun',
    required: true,
    index: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
    index: true
  },
  year: {
    type: Number,
    required: true,
    index: true
  },
  
  // Component Details
  component_code: {
    type: String,
    required: true,
    enum: [
      'BASIC', 'HRA', 'SPECIAL_ALLOWANCE', 'VARIABLE_PAY', 'INCENTIVE', 'ARREAR', 'BONUS',
      'PF', 'ESI', 'TDS', 'PT', 'LWP', 'ADVANCE', 'LOAN', 'PENALTY', 'CLAWBACK', 'OTHER'
    ],
    index: true
  },
  component_name: {
    type: String,
    required: true
  },
  
  // Amount Details
  original_amount: {
    type: Number,
    required: true,
    default: 0
  },
  override_amount: {
    type: Number,
    required: true
  },
  difference: {
    type: Number,
    required: true
  },
  
  // Reason
  reason_code: {
    type: String,
    required: true,
    enum: ['ARREAR', 'BONUS', 'PENALTY_WAIVE', 'ADJUSTMENT', 'CORRECTION', 'OTHER'],
    index: true
  },
  reason: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  
  // Attachment
  attachment_url: {
    type: String,
    trim: true
  },
  attachment_type: {
    type: String,
    enum: ['DOCUMENT', 'EMAIL', 'SCREENSHOT', 'OTHER']
  },
  
  // Approval Workflow
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
    default: 'PENDING',
    index: true
  },
  
  // Approval Chain
  approvers: [{
    level: {
      type: Number,
      required: true,
      min: 1,
      max: 2
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
    rejected_at: Date
  }],
  
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
  
  // High Value Check
  is_high_value: {
    type: Boolean,
    default: false,
    index: true
  },
  high_value_threshold: {
    type: Number,
    default: 10000
  },
  requires_dual_approval: {
    type: Boolean,
    default: false
  },
  
  // Applied Status
  applied: {
    type: Boolean,
    default: false
  },
  applied_at: {
    type: Date
  },
  applied_to_component_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PayrollComponent'
  },
  
  // Metadata
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
payrollOverrideSchema.index({ employee_id: 1, run_id: 1 });
payrollOverrideSchema.index({ status: 1, created_at: 1 });
payrollOverrideSchema.index({ is_high_value: 1, status: 1 });

// Pre-save middleware
payrollOverrideSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Calculate difference
  this.difference = this.override_amount - this.original_amount;
  
  // Check if high value
  if (Math.abs(this.difference) >= this.high_value_threshold) {
    this.is_high_value = true;
    this.requires_dual_approval = true;
  }
  
  // Generate override_id if not provided
  if (!this.override_id) {
    this.override_id = `OVR-${this.employee_code}-${this.year}-${String(this.month).padStart(2, '0')}-${this.component_code}-${Date.now()}`;
  }
  
  next();
});

const PayrollOverride = mongoose.model('PayrollOverride', payrollOverrideSchema);

module.exports = PayrollOverride;

