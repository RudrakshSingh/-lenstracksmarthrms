const mongoose = require('mongoose');

const leavePolicySchema = new mongoose.Schema({
  // Policy Identification
  policy_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  version: {
    type: String,
    required: true,
    default: '1.0'
  },
  
  // Applicability
  role_group: {
    type: String,
    required: true,
    enum: ['SALES', 'BACKEND', 'LAB', 'HR', 'MANAGEMENT', 'TECH', 'ALL'],
    index: true
  },
  store_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  }],
  applicable_from: {
    type: Date,
    required: true
  },
  applicable_to: {
    type: Date
  },
  
  // Leave Types Configuration
  leave_types: [{
    leave_type: {
      type: String,
      required: true,
      enum: ['CL', 'SL', 'EL', 'WO', 'PH', 'LWP', 'MATERNITY', 'PATERNITY', 'BEREAVEMENT', 'MARRIAGE', 'COMP_OFF', 'TRAINING']
    },
    days_per_year: {
      type: Number,
      required: true,
      min: 0
    },
    monthly_accrual: {
      type: Boolean,
      default: false
    },
    accrual_rate: {
      type: Number,
      default: 0,
      min: 0
    },
    carry_forward: {
      enabled: {
        type: Boolean,
        default: false
      },
      max_days: {
        type: Number,
        default: 0
      },
      expiry_months: {
        type: Number,
        default: 12
      }
    },
    encashment: {
      enabled: {
        type: Boolean,
        default: false
      },
      rate: {
        type: String,
        enum: ['BASIC', 'GROSS', 'FIXED'],
        default: 'BASIC'
      },
      applicable_at: {
        type: String,
        enum: ['SEPARATION', 'YEAR_END', 'BOTH'],
        default: 'SEPARATION'
      }
    },
    medical_certificate_required: {
      type: Boolean,
      default: false
    },
    medical_certificate_after_days: {
      type: Number,
      default: 0
    },
    requires_approval: {
      type: Boolean,
      default: true
    },
    approval_levels: {
      type: Number,
      default: 2,
      min: 1,
      max: 3
    },
    blackout_dates: [{
      start_date: Date,
      end_date: Date,
      reason: String,
      requires_area_manager_approval: {
        type: Boolean,
        default: false
      }
    }],
    special_rules: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],
  
  // Accrual Rules
  accrual_rules: {
    prorated_by_doj: {
      type: Boolean,
      default: true
    },
    prorated_by_attendance: {
      type: Boolean,
      default: false
    },
    negative_balance_allowed: {
      type: Boolean,
      default: false
    },
    negative_balance_requires_override: {
      type: Boolean,
      default: true
    },
    override_role: {
      type: String,
      enum: ['MANAGER', 'HR', 'ADMIN'],
      default: 'MANAGER'
    }
  },
  
  // Weekly Off Rules
  weekly_off: {
    roster_based: {
      type: Boolean,
      default: true
    },
    swap_allowed: {
      type: Boolean,
      default: true
    },
    swap_requires_approval: {
      type: Boolean,
      default: true
    },
    ot_eligibility: {
      type: Boolean,
      default: false
    }
  },
  
  // Public Holidays
  public_holidays: {
    regional_calendar: {
      type: Boolean,
      default: true
    },
    state_specific: {
      type: Boolean,
      default: true
    },
    custom_holidays: [{
      date: Date,
      name: String,
      state: String
    }]
  },
  
  // Comp-off Rules
  comp_off: {
    enabled: {
      type: Boolean,
      default: true
    },
    from_ot: {
      type: Boolean,
      default: true
    },
    from_extra_work: {
      type: Boolean,
      default: true
    },
    validity_days: {
      type: Number,
      default: 90
    },
    requires_approval: {
      type: Boolean,
      default: true
    }
  },
  
  // Status
  is_active: {
    type: Boolean,
    default: true,
    index: true
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
leavePolicySchema.index({ policy_id: 1, version: 1 });
leavePolicySchema.index({ role_group: 1, is_active: 1 });
leavePolicySchema.index({ applicable_from: 1, applicable_to: 1 });

// Pre-save middleware
leavePolicySchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

const LeavePolicy = mongoose.model('LeavePolicy', leavePolicySchema);

module.exports = LeavePolicy;

