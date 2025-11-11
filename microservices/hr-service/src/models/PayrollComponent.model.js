const mongoose = require('mongoose');

const payrollComponentSchema = new mongoose.Schema({
  // Component Identification
  component_id: {
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
  type: {
    type: String,
    required: true,
    enum: ['EARNINGS', 'DEDUCTIONS'],
    index: true
  },
  code: {
    type: String,
    required: true,
    enum: [
      // Earnings
      'BASIC', 'HRA', 'SPECIAL_ALLOWANCE', 'VARIABLE_PAY', 'INCENTIVE', 'ARREAR', 'BONUS', 'OT', 'COMP_OFF',
      // Deductions
      'PF', 'ESI', 'TDS', 'PT', 'LWP', 'ADVANCE', 'LOAN', 'PENALTY', 'CLAWBACK', 'OTHER'
    ],
    index: true
  },
  name: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    default: 0
  },
  
  // Source
  source: {
    type: String,
    required: true,
    enum: ['CALC', 'OVERRIDE', 'MANUAL'],
    default: 'CALC'
  },
  
  // Calculation Details
  calculation_details: {
    base_amount: Number,
    rate: Number,
    percentage: Number,
    formula: String,
    calculation_method: String,
    calculated_at: Date
  },
  
  // Override Details (if source is OVERRIDE)
  override: {
    original_amount: Number,
    override_amount: Number,
    reason_code: {
      type: String,
      enum: ['ARREAR', 'BONUS', 'PENALTY_WAIVE', 'ADJUSTMENT', 'CORRECTION', 'OTHER']
    },
    reason: String,
    attachment_url: String,
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approved_at: Date,
    override_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PayrollOverride'
    }
  },
  
  // Incentive Details (if code is INCENTIVE)
  incentive: {
    claim_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IncentiveClaim'
    },
    sales_amount: Number,
    target_amount: Number,
    achievement_percentage: Number,
    slab_applied: String,
    incentive_percentage: Number
  },
  
  // Claw-back Details (if code is CLAWBACK)
  clawback: {
    return_remake_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReturnsRemakesFeed'
    },
    invoice_id: String,
    original_incentive_amount: Number,
    clawback_amount: Number,
    reason: String
  },
  
  // Tax Applicability
  taxable: {
    type: Boolean,
    default: true
  },
  tax_exempt_amount: {
    type: Number,
    default: 0
  },
  
  // Statutory Applicability
  pf_applicable: {
    type: Boolean,
    default: false
  },
  esic_applicable: {
    type: Boolean,
    default: false
  },
  tds_applicable: {
    type: Boolean,
    default: false
  },
  
  // Notes
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Metadata
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
payrollComponentSchema.index({ employee_id: 1, run_id: 1, code: 1 });
payrollComponentSchema.index({ run_id: 1, type: 1 });
payrollComponentSchema.index({ employee_code: 1, month: 1, year: 1 });

// Pre-save middleware
payrollComponentSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Generate component_id if not provided
  if (!this.component_id) {
    this.component_id = `COMP-${this.employee_code}-${this.year}-${String(this.month).padStart(2, '0')}-${this.code}-${Date.now()}`;
  }
  
  next();
});

const PayrollComponent = mongoose.model('PayrollComponent', payrollComponentSchema);

module.exports = PayrollComponent;

