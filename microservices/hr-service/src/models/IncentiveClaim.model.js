const mongoose = require('mongoose');

const incentiveClaimSchema = new mongoose.Schema({
  // Claim Identification
  claim_id: {
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
  
  // Period
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
  period: {
    type: String,
    required: true,
    index: true
  },
  
  // Store Reference
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true,
    index: true
  },
  store_name: {
    type: String,
    required: true
  },
  
  // Sales Performance
  target_sales: {
    type: Number,
    required: true,
    min: 0
  },
  actual_sales: {
    type: Number,
    required: true,
    min: 0
  },
  achievement_percentage: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Incentive Calculation
  incentive_slab: {
    slab_name: String,
    min_sales: Number,
    max_sales: Number,
    incentive_percentage: Number
  },
  calculated_amount: {
    type: Number,
    required: true,
    min: 0
  },
  approved_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Basis Details (JSON)
  basis_json: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Eligibility Gates
  eligibility: {
    training_completed: {
      type: Boolean,
      default: true
    },
    discipline_clear: {
      type: Boolean,
      default: true
    },
    attendance_threshold_met: {
      type: Boolean,
      default: true
    },
    other_conditions: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  
  // Status
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAID', 'DISPUTED', 'CANCELLED'],
    default: 'PENDING',
    index: true
  },
  
  // Approval Workflow
  approvals_json: {
    store_manager: {
      proposed: {
        type: Boolean,
        default: false
      },
      proposed_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      proposed_at: Date,
      amount: Number,
      comments: String
    },
    area_manager: {
      validated: {
        type: Boolean,
        default: false
      },
      validated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      validated_at: Date,
      amount: Number,
      comments: String
    },
    finance: {
      posted: {
        type: Boolean,
        default: false
      },
      posted_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      posted_at: Date,
      amount: Number,
      comments: String
    }
  },
  
  // Tier-based Approval
  tier: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'],
    default: 'LOW',
    index: true
  },
  tier_threshold: {
    type: Number,
    default: 0
  },
  
  // Dispute Window
  dispute_window_open: {
    type: Boolean,
    default: true
  },
  dispute_window_closes_at: {
    type: Date
  },
  disputes: [{
    raised_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    raised_at: {
      type: Date,
      default: Date.now
    },
    comments: String,
    attachments: [{
      file_name: String,
      file_url: String
    }],
    status: {
      type: String,
      enum: ['PENDING', 'RESOLVED', 'REJECTED'],
      default: 'PENDING'
    },
    resolved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolved_at: Date,
    resolution: String
  }],
  
  // Payment
  paid: {
    type: Boolean,
    default: false
  },
  paid_at: Date,
  paid_in_run_id: {
    type: String,
    ref: 'PayrollRun'
  },
  paid_amount: {
    type: Number,
    default: 0
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
incentiveClaimSchema.index({ employee_id: 1, month: 1, year: 1 });
incentiveClaimSchema.index({ store_id: 1, period: 1 });
incentiveClaimSchema.index({ status: 1, created_at: 1 });
incentiveClaimSchema.index({ tier: 1, status: 1 });

// Pre-save middleware
incentiveClaimSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Generate period string
  if (!this.period && this.month && this.year) {
    this.period = `${this.year}-${String(this.month).padStart(2, '0')}`;
  }
  
  // Calculate achievement percentage
  if (this.target_sales > 0 && this.actual_sales >= 0) {
    this.achievement_percentage = (this.actual_sales / this.target_sales) * 100;
  }
  
  // Determine tier based on amount
  const amount = this.approved_amount || this.calculated_amount;
  if (amount >= 50000) {
    this.tier = 'VERY_HIGH';
  } else if (amount >= 25000) {
    this.tier = 'HIGH';
  } else if (amount >= 10000) {
    this.tier = 'MEDIUM';
  } else {
    this.tier = 'LOW';
  }
  
  // Set dispute window (3 days from approval)
  if (this.status === 'APPROVED' && !this.dispute_window_closes_at) {
    const closesAt = new Date();
    closesAt.setDate(closesAt.getDate() + 3);
    this.dispute_window_closes_at = closesAt;
  }
  
  // Generate claim_id if not provided
  if (!this.claim_id) {
    this.claim_id = `INC-${this.employee_code}-${this.year}-${String(this.month).padStart(2, '0')}-${Date.now()}`;
  }
  
  next();
});

const IncentiveClaim = mongoose.model('IncentiveClaim', incentiveClaimSchema);

module.exports = IncentiveClaim;

