const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  // Basic Information
  expense_number: {
    type: String,
    required: true,
    unique: true
  },
  expense_date: {
    type: Date,
    required: true
  },
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  
  // Expense Details
  source_module: {
    type: String,
    enum: ['MANUAL', 'PAYROLL'],
    default: 'MANUAL',
    index: true
  },
  source_ref_id: {
    type: String,
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'RENT', 'UTILITIES', 'SALARIES', 'MARKETING', 'TRAVEL', 
      'OFFICE_SUPPLIES', 'MAINTENANCE', 'INSURANCE', 'PROFESSIONAL_SERVICES',
      'TELECOM', 'BANK_CHARGES', 'DEPRECIATION', 'OTHER'
    ]
  },
  sub_category: {
    type: String
  },
  description: {
    type: String,
    required: true
  },
  
  // Financial Details
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  tax_amount: {
    type: Number,
    default: 0,
    min: 0
  },
  total_amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  
  // Vendor Information
  vendor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor'
  },
  vendor_name: {
    type: String
  },
  invoice_number: {
    type: String
  },
  invoice_date: {
    type: Date
  },
  
  // Payment Information
  payment_method: {
    type: String,
    enum: ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'OTHER'],
    required: true
  },
  payment_reference: {
    type: String
  },
  payment_date: {
    type: Date
  },
  
  // Approval Workflow
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED'],
    default: 'PENDING'
  },
  approval_level: {
    type: String,
    enum: ['STORE_MANAGER', 'AREA_MANAGER', 'REGIONAL_MANAGER', 'ZONAL_MANAGER', 'HEAD_OFFICE'],
    default: 'STORE_MANAGER'
  },
  
  // Approvals
  requested_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approved_at: Date,
  rejection_reason: String,
  
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
  
  // Recurring Expense
  is_recurring: {
    type: Boolean,
    default: false
  },
  recurring_frequency: {
    type: String,
    enum: ['MONTHLY', 'QUARTERLY', 'YEARLY']
  },
  recurring_end_date: Date,
  
  // Budget Information
  budget_category: String,
  budget_amount: Number,
  budget_variance: Number,

  // Basic event logs
  logs: [{
    event: {
      type: String,
      required: true
    },
    actor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    details: mongoose.Schema.Types.Mixed,
    at: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Timestamps
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware
expenseSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Generate expense number if not provided
  if (!this.expense_number) {
    this.expense_number = `EXP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  }
  
  // Calculate total amount
  this.total_amount = this.amount + this.tax_amount;
  
  // Calculate budget variance if budget amount is provided
  if (this.budget_amount) {
    this.budget_variance = this.amount - this.budget_amount;
  }
  
  next();
});

// Indexes
expenseSchema.index({ expense_date: 1, store_id: 1 });
expenseSchema.index({ category: 1, expense_date: 1 });
expenseSchema.index({ status: 1, approval_level: 1 });
expenseSchema.index({ requested_by: 1, expense_date: 1 });
expenseSchema.index({ vendor_id: 1, expense_date: 1 });
expenseSchema.index({ source_module: 1, source_ref_id: 1 }, { unique: true, sparse: true });

const Expense = mongoose.model('Expense', expenseSchema);

module.exports = Expense;
