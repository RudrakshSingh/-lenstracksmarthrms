const mongoose = require('mongoose');

const payrollAdjustmentSchema = new mongoose.Schema({
  cycle_ref: {
    type: String,
    required: true,
    index: true
  },
  employee_code: {
    type: String,
    required: true,
    index: true
  },
  adjustment_type: {
    type: String,
    enum: ['FINE_DEBIT', 'INCREMENT_CREDIT'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  reason: {
    type: String,
    required: true
  },
  requested_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: [
      'PENDING_AUTHORITY_APPROVAL',
      'AUTHORITY_APPROVED',
      'AUTHORITY_REJECTED',
      'FINANCE_APPROVED',
      'FINANCE_REJECTED',
      'APPLIED',
      'REVOKED'
    ],
    default: 'PENDING_AUTHORITY_APPROVAL',
    index: true
  },
  authority_approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  authority_approved_at: Date,
  authority_comment: String,
  finance_reviewed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  finance_reviewed_at: Date,
  finance_comment: String,
  is_post_freeze_request: {
    type: Boolean,
    default: false
  },
  logs: [{
    event: String,
    actor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    details: mongoose.Schema.Types.Mixed,
    at: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

module.exports = mongoose.model('PayrollAdjustment', payrollAdjustmentSchema);
