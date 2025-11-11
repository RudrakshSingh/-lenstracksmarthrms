const mongoose = require('mongoose');

const fnfCaseSchema = new mongoose.Schema({
  // Case Identification
  case_id: {
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
  
  // Separation Details
  lwd: {
    type: Date,
    required: true,
    index: true
  },
  doj: {
    type: Date,
    required: true
  },
  notice_period_days: {
    type: Number,
    default: 0
  },
  notice_served_days: {
    type: Number,
    default: 0
  },
  notice_shortfall_days: {
    type: Number,
    default: 0
  },
  
  // Reason
  reason: {
    type: String,
    required: true,
    enum: ['RESIGNATION', 'TERMINATION', 'RETIREMENT', 'END_OF_CONTRACT', 'DEATH', 'OTHER'],
    index: true
  },
  reason_details: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  // Status
  status: {
    type: String,
    enum: ['INITIATED', 'CALCULATING', 'PENDING_APPROVAL', 'APPROVED', 'PAID', 'CANCELLED', 'ON_HOLD'],
    default: 'INITIATED',
    index: true
  },
  
  // Components
  components: {
    unpaid_salary: {
      amount: {
        type: Number,
        default: 0,
        min: 0
      },
      days: Number,
      calculated: {
        type: Boolean,
        default: false
      }
    },
    el_encashment: {
      amount: {
        type: Number,
        default: 0,
        min: 0
      },
      days: Number,
      rate: {
        type: String,
        enum: ['BASIC', 'GROSS'],
        default: 'BASIC'
      },
      calculated: {
        type: Boolean,
        default: false
      }
    },
    approved_incentives: {
      amount: {
        type: Number,
        default: 0,
        min: 0
      },
      claims: [{
        claim_id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'IncentiveClaim'
        },
        amount: Number
      }],
      calculated: {
        type: Boolean,
        default: false
      }
    },
    recoveries: {
      total: {
        type: Number,
        default: 0,
        min: 0
      },
      items: [{
        type: {
          type: String,
          enum: ['ASSET', 'ADVANCE', 'LOAN', 'NOTICE_SHORTFALL', 'OTHER']
        },
        description: String,
        amount: Number,
        recovered: {
          type: Boolean,
          default: false
        }
      }],
      calculated: {
        type: Boolean,
        default: false
      }
    },
    statutory_deductions: {
      tds: {
        type: Number,
        default: 0,
        min: 0
      },
      pf_final: {
        type: Number,
        default: 0,
        min: 0
      },
      esic_final: {
        type: Number,
        default: 0,
        min: 0
      },
      calculated: {
        type: Boolean,
        default: false
      }
    }
  },
  
  // Totals
  total_payable: {
    type: Number,
    default: 0,
    min: 0
  },
  total_receivable: {
    type: Number,
    default: 0,
    min: 0
  },
  net_settlement: {
    type: Number,
    default: 0
  },
  
  // Approval Workflow
  approvals: {
    manager: {
      approved: {
        type: Boolean,
        default: false
      },
      approved_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      approved_at: Date,
      comments: String
    },
    accounts: {
      approved: {
        type: Boolean,
        default: false
      },
      approved_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      approved_at: Date,
      comments: String
    },
    hr_head: {
      approved: {
        type: Boolean,
        default: false
      },
      approved_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      approved_at: Date,
      comments: String
    }
  },
  
  // Payout
  payout: {
    initiated: {
      type: Boolean,
      default: false
    },
    initiated_at: Date,
    initiated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    payout_ref: {
      type: String,
      trim: true
    },
    payout_date: Date,
    payout_method: {
      type: String,
      enum: ['BANK_TRANSFER', 'CHEQUE', 'CASH', 'OTHER']
    },
    bank_details: {
      account_number: String,
      ifsc: String,
      bank_name: String
    },
    paid: {
      type: Boolean,
      default: false
    },
    paid_at: Date
  },
  
  // Documents
  statement_url: {
    type: String,
    trim: true
  },
  statement_generated: {
    type: Boolean,
    default: false
  },
  statement_generated_at: Date,
  relieving_letter_url: {
    type: String,
    trim: true
  },
  experience_letter_url: {
    type: String,
    trim: true
  },
  
  // Statutory
  statutory: {
    tds_on_fnf: {
      type: Number,
      default: 0,
      min: 0
    },
    pf_final_settlement: {
      type: Number,
      default: 0,
      min: 0
    },
    esic_final_settlement: {
      type: Number,
      default: 0,
      min: 0
    },
    form16_updated: {
      type: Boolean,
      default: false
    },
    form16_updated_at: Date
  },
  
  // System Locks
  system_access: {
    disabled: {
      type: Boolean,
      default: false
    },
    disabled_at: Date,
    disabled_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Clearance Checklist
  clearance_checklist: {
    assets_returned: {
      type: Boolean,
      default: false
    },
    id_card_returned: {
      type: Boolean,
      default: false
    },
    email_deactivated: {
      type: Boolean,
      default: false
    },
    system_access_revoked: {
      type: Boolean,
      default: false
    },
    other_items: [{
      item: String,
      returned: {
        type: Boolean,
        default: false
      }
    }],
    completed: {
      type: Boolean,
      default: false
    },
    completed_at: Date
  },
  
  // Metadata
  initiated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  initiated_at: {
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
fnfCaseSchema.index({ employee_id: 1, lwd: 1 });
fnfCaseSchema.index({ status: 1, created_at: 1 });
fnfCaseSchema.index({ case_id: 1 });

// Pre-save middleware
fnfCaseSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Calculate net settlement
  this.net_settlement = this.total_payable - this.total_receivable;
  
  // Calculate notice shortfall
  if (this.lwd && this.doj) {
    // Calculate notice period served
    // This would need actual notice period from employee record
    if (this.notice_period_days > 0) {
      this.notice_shortfall_days = Math.max(0, this.notice_period_days - this.notice_served_days);
    }
  }
  
  // Generate case_id if not provided
  if (!this.case_id) {
    this.case_id = `FNF-${this.employee_code}-${Date.now()}`;
  }
  
  // Check if all approvals done
  if (this.approvals.manager.approved && 
      this.approvals.accounts.approved && 
      this.approvals.hr_head.approved &&
      this.status === 'PENDING_APPROVAL') {
    this.status = 'APPROVED';
  }
  
  next();
});

const FnFCase = mongoose.model('FnFCase', fnfCaseSchema);

module.exports = FnFCase;

