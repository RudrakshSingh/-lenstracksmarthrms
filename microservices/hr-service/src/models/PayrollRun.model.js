const mongoose = require('mongoose');

const payrollRunSchema = new mongoose.Schema({
  // Run Identification
  run_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
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
    unique: true,
    index: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['DRAFT', 'PROCESSING', 'REVIEW', 'LOCKED', 'POSTED', 'CANCELLED'],
    default: 'DRAFT',
    index: true
  },
  
  // Processing Details
  processing_started_at: {
    type: Date
  },
  processing_completed_at: {
    type: Date
  },
  processing_duration_seconds: {
    type: Number
  },
  
  // Lock Details
  lock_at: {
    type: Date
  },
  locked_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lock_date: {
    type: Date
  },
  lock_deadline: {
    type: Date
  },
  
  // Post Details
  posted_at: {
    type: Date
  },
  posted_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  post_jv_number: {
    type: String
  },
  post_jv_date: {
    type: Date
  },
  
  // Summary Statistics
  total_employees: {
    type: Number,
    default: 0
  },
  processed_employees: {
    type: Number,
    default: 0
  },
  failed_employees: {
    type: Number,
    default: 0
  },
  total_gross: {
    type: Number,
    default: 0,
    min: 0
  },
  total_deductions: {
    type: Number,
    default: 0,
    min: 0
  },
  total_net: {
    type: Number,
    default: 0,
    min: 0
  },
  total_employer_contributions: {
    type: Number,
    default: 0,
    min: 0
  },
  total_epf_employee: {
    type: Number,
    default: 0,
    min: 0
  },
  total_epf_employer: {
    type: Number,
    default: 0,
    min: 0
  },
  total_esic_employee: {
    type: Number,
    default: 0,
    min: 0
  },
  total_esic_employer: {
    type: Number,
    default: 0,
    min: 0
  },
  total_tds: {
    type: Number,
    default: 0,
    min: 0
  },
  total_incentives: {
    type: Number,
    default: 0,
    min: 0
  },
  total_clawback: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Data Sources
  attendance_imported: {
    type: Boolean,
    default: false
  },
  attendance_import_date: {
    type: Date
  },
  sales_imported: {
    type: Boolean,
    default: false
  },
  sales_import_date: {
    type: Date
  },
  returns_remakes_imported: {
    type: Boolean,
    default: false
  },
  returns_remakes_import_date: {
    type: Date
  },
  
  // Variance Report
  variance_report: {
    generated: {
      type: Boolean,
      default: false
    },
    generated_at: Date,
    total_variances: {
      type: Number,
      default: 0
    },
    high_value_variances: {
      type: Number,
      default: 0
    }
  },
  
  // Overrides
  total_overrides: {
    type: Number,
    default: 0
  },
  override_approvals_pending: {
    type: Number,
    default: 0
  },
  
  // Bank File
  bank_file_generated: {
    type: Boolean,
    default: false
  },
  bank_file_url: {
    type: String
  },
  bank_file_generated_at: {
    type: Date
  },
  
  // Payslips
  payslips_generated: {
    type: Boolean,
    default: false
  },
  payslips_generated_at: {
    type: Date
  },
  payslips_generated_count: {
    type: Number,
    default: 0
  },
  
  // Errors & Warnings
  errors: [{
    employee_code: String,
    employee_name: String,
    error_type: String,
    error_message: String,
    error_details: mongoose.Schema.Types.Mixed,
    occurred_at: {
      type: Date,
      default: Date.now
    }
  }],
  warnings: [{
    employee_code: String,
    employee_name: String,
    warning_type: String,
    warning_message: String,
    occurred_at: {
      type: Date,
      default: Date.now
    }
  }],
  
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
payrollRunSchema.index({ month: 1, year: 1 }, { unique: true });
payrollRunSchema.index({ status: 1, created_at: 1 });
payrollRunSchema.index({ period: 1 });

// Pre-save middleware
payrollRunSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Generate period string
  if (!this.period && this.month && this.year) {
    this.period = `${this.year}-${String(this.month).padStart(2, '0')}`;
  }
  
  // Generate run_id if not provided
  if (!this.run_id && this.month && this.year) {
    this.run_id = `PAYROLL-${this.year}-${String(this.month).padStart(2, '0')}`;
  }
  
  next();
});

const PayrollRun = mongoose.model('PayrollRun', payrollRunSchema);

module.exports = PayrollRun;

