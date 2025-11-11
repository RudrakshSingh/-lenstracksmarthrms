const mongoose = require('mongoose');

const leaveLedgerSchema = new mongoose.Schema({
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
  
  // Period
  period: {
    year: {
      type: Number,
      required: true,
      index: true
    },
    month: {
      type: Number,
      min: 1,
      max: 12
    },
    quarter: {
      type: Number,
      min: 1,
      max: 4
    }
  },
  
  // Leave Type
  leave_type: {
    type: String,
    required: true,
    enum: ['CL', 'SL', 'EL', 'WO', 'PH', 'LWP', 'MATERNITY', 'PATERNITY', 'BEREAVEMENT', 'MARRIAGE', 'COMP_OFF', 'TRAINING'],
    index: true
  },
  
  // Opening Balance
  opening: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  
  // Accrual
  accrual: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  accrual_date: {
    type: Date
  },
  
  // Usage
  used: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  used_details: [{
    request_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LeaveRequest'
    },
    days: Number,
    from_date: Date,
    to_date: Date
  }],
  
  // Encashment
  encashed: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  encashed_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  encashment_date: {
    type: Date
  },
  
  // Carry Forward
  carried_forward: {
    type: Number,
    default: 0,
    min: 0
  },
  carried_from_period: {
    year: Number,
    month: Number
  },
  
  // Closing Balance
  closing: {
    type: Number,
    required: true,
    default: 0
  },
  
  // Negative Balance (LWP)
  negative_balance: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Metadata
  policy_id: {
    type: String,
    ref: 'LeavePolicy'
  },
  policy_version: {
    type: String
  },
  
  // Audit
  last_updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  last_updated_at: {
    type: Date,
    default: Date.now
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
leaveLedgerSchema.index({ employee_id: 1, period: 1, leave_type: 1 }, { unique: true });
leaveLedgerSchema.index({ employee_code: 1, 'period.year': 1 });
leaveLedgerSchema.index({ leave_type: 1, 'period.year': 1 });

// Pre-save middleware
leaveLedgerSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Calculate closing balance
  this.closing = this.opening + this.accrual - this.used - this.encashed + this.carried_forward;
  
  // Calculate negative balance if closing is negative
  if (this.closing < 0) {
    this.negative_balance = Math.abs(this.closing);
    this.closing = 0;
  } else {
    this.negative_balance = 0;
  }
  
  next();
});

const LeaveLedger = mongoose.model('LeaveLedger', leaveLedgerSchema);

module.exports = LeaveLedger;

