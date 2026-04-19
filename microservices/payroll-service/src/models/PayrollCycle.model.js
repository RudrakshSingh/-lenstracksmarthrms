const mongoose = require('mongoose');

const payrollCycleSchema = new mongoose.Schema({
  cycle_ref: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: [
      // Canonical (Etelios payroll module)
      'DRAFT',
      'PROCESSING',
      'COMPLETED',
      'HR_APPROVED',
      'FINANCE_APPROVED',
      'FROZEN',
      'POSTED',
      'RECONCILED',
      // Legacy (existing rows / gradual migration)
      'DRAFT_HR',
      'FINANCE_REVIEW',
      'SLIP_FROZEN',
      'POSTED_TO_FINANCE',
      'SENT_BACK_TO_HR'
    ],
    default: 'DRAFT',
    index: true
  },
  workflow_version: {
    type: Number,
    default: 0,
    min: 0
  },
  hr_submitted_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  hr_submitted_at: Date,
  finance_approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  finance_approved_at: Date,
  frozen_at: Date,
  unlocked_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  unlocked_at: Date,
  unlock_reason: String,
  employee_count: {
    type: Number,
    default: 0
  },
  total_gross: {
    type: Number,
    default: 0
  },
  total_net: {
    type: Number,
    default: 0
  },
  total_adjustments: {
    type: Number,
    default: 0
  },
  total_final_payable: {
    type: Number,
    default: 0
  },
  finance_record_id: {
    type: String,
    index: true
  },
  external_ref_id: {
    type: String,
    index: true
  },
  last_reconciliation: {
    matched: Boolean,
    details: mongoose.Schema.Types.Mixed,
    at: Date
  },
  company_id: String,
  brand_id: String,
  branch_id: String,
  department_id: String,
  tenant_id: String,
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

payrollCycleSchema.index({ month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('PayrollCycle', payrollCycleSchema);
