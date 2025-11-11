const mongoose = require('mongoose');

const returnsRemakesFeedSchema = new mongoose.Schema({
  // Feed Identification
  feed_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  
  // Invoice Reference
  invoice_id: {
    type: String,
    required: true,
    index: true
  },
  invoice_number: {
    type: String,
    required: true
  },
  invoice_date: {
    type: Date,
    required: true,
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
  
  // Type
  type: {
    type: String,
    required: true,
    enum: ['RETURN', 'REMAKE'],
    index: true
  },
  
  // Amount Details
  invoice_amount: {
    type: Number,
    required: true,
    min: 0
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Dates
  date: {
    type: Date,
    required: true,
    index: true
  },
  original_sale_date: {
    type: Date,
    required: true
  },
  days_since_sale: {
    type: Number,
    required: true
  },
  
  // Policy Applicability
  policy_applicable: {
    type: Boolean,
    required: true,
    default: true,
    index: true
  },
  policy_window_days: {
    type: Number,
    default: 30
  },
  within_policy_window: {
    type: Boolean,
    required: true,
    default: true
  },
  
  // Exemption
  exemption: {
    type: Boolean,
    default: false,
    index: true
  },
  exemption_reason: {
    type: String,
    trim: true,
    maxlength: 500
  },
  exemption_category: {
    type: String,
    enum: ['PRODUCT_DEFECT', 'CUSTOMER_FAULT', 'SYSTEM_ERROR', 'OTHER']
  },
  
  // Approval
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approved_at: {
    type: Date
  },
  approval_status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
    index: true
  },
  
  // Claw-back Details
  clawback_applicable: {
    type: Boolean,
    default: true
  },
  clawback_applied: {
    type: Boolean,
    default: false
  },
  clawback_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  clawback_method: {
    type: String,
    enum: ['OFFSET_NEXT_MONTH', 'POOL_PENALTY', 'EXEMPTED'],
    default: 'OFFSET_NEXT_MONTH'
  },
  clawback_applied_in_run_id: {
    type: String,
    ref: 'PayrollRun'
  },
  clawback_applied_at: {
    type: Date
  },
  
  // Pool Penalty Details (if applicable)
  pool_penalty: {
    enabled: {
      type: Boolean,
      default: false
    },
    percentage: {
      type: Number,
      default: 0
    },
    distributed_amount: {
      type: Number,
      default: 0
    },
    distributed_to: [{
      employee_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
      },
      employee_code: String,
      amount: Number
    }]
  },
  
  // Reason Details
  reason: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  reason_category: {
    type: String,
    enum: ['VISION_ISSUE', 'FIT_ISSUE', 'QUALITY_ISSUE', 'CUSTOMER_REQUEST', 'OTHER']
  },
  
  // Attachments
  attachments: [{
    file_name: String,
    file_url: String,
    file_type: String,
    uploaded_at: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Product Details
  product_details: {
    sku: String,
    product_name: String,
    quantity: Number,
    unit_price: Number
  },
  
  // Customer Details
  customer_id: {
    type: String
  },
  customer_name: {
    type: String
  },
  
  // Source
  source: {
    type: String,
    enum: ['SALES_SERVICE', 'MANUAL', 'IMPORT'],
    default: 'SALES_SERVICE'
  },
  imported_at: {
    type: Date
  },
  
  // Flag for Next Cycle
  flagged_for_next_cycle: {
    type: Boolean,
    default: false
  },
  next_cycle_run_id: {
    type: String,
    ref: 'PayrollRun'
  },
  
  // Metadata
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
returnsRemakesFeedSchema.index({ employee_id: 1, date: 1 });
returnsRemakesFeedSchema.index({ invoice_id: 1 });
returnsRemakesFeedSchema.index({ policy_applicable: 1, clawback_applied: 1 });
returnsRemakesFeedSchema.index({ type: 1, date: 1 });

// Pre-save middleware
returnsRemakesFeedSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Calculate days since sale
  if (this.original_sale_date && this.date) {
    const diffTime = Math.abs(this.date - this.original_sale_date);
    this.days_since_sale = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Check if within policy window
    this.within_policy_window = this.days_since_sale <= this.policy_window_days;
    
    // Determine if claw-back applicable
    if (this.within_policy_window && this.policy_applicable && !this.exemption) {
      this.clawback_applicable = true;
    } else {
      this.clawback_applicable = false;
    }
  }
  
  // Generate feed_id if not provided
  if (!this.feed_id) {
    this.feed_id = `RR-${this.invoice_id}-${this.type}-${Date.now()}`;
  }
  
  next();
});

const ReturnsRemakesFeed = mongoose.model('ReturnsRemakesFeed', returnsRemakesFeedSchema);

module.exports = ReturnsRemakesFeed;

