const mongoose = require('mongoose');

const statExportSchema = new mongoose.Schema({
  // Export Identification
  export_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  
  // Type
  type: {
    type: String,
    required: true,
    enum: ['EPF', 'ESIC', 'TDS', 'FORM16', 'FORM16A', 'FORM24Q', 'PT', 'OTHER'],
    index: true
  },
  
  // Period
  period: {
    month: {
      type: Number,
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: true,
      index: true
    },
    quarter: {
      type: Number,
      min: 1,
      max: 4
    },
    period_string: {
      type: String,
      required: true,
      index: true
    }
  },
  
  // File Details
  file_url: {
    type: String,
    required: true
  },
  file_name: {
    type: String,
    required: true
  },
  file_size: {
    type: Number,
    min: 0
  },
  file_format: {
    type: String,
    enum: ['PDF', 'EXCEL', 'CSV', 'XML', 'TXT'],
    default: 'EXCEL'
  },
  
  // Generation Details
  generated_at: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  generated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['GENERATING', 'COMPLETED', 'FAILED', 'VALIDATED', 'SIGNED', 'FILED'],
    default: 'GENERATING',
    index: true
  },
  
  // Validation
  validation: {
    validated: {
      type: Boolean,
      default: false
    },
    validated_at: Date,
    validated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    validation_errors: [{
      field: String,
      error: String,
      row_number: Number
    }],
    format_valid: {
      type: Boolean,
      default: false
    },
    totals_match: {
      type: Boolean,
      default: false
    }
  },
  
  // Digital Signature (DSC)
  digital_signature: {
    signed: {
      type: Boolean,
      default: false
    },
    signed_at: Date,
    signed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    signature_provider: {
      type: String,
      enum: ['DSC', 'E_SIGN', 'OTHER']
    },
    signature_certificate: String,
    signed_file_url: String
  },
  
  // Filing Details
  filing: {
    filed: {
      type: Boolean,
      default: false
    },
    filed_at: Date,
    filed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    filing_reference: String,
    filing_status: {
      type: String,
      enum: ['PENDING', 'SUBMITTED', 'ACCEPTED', 'REJECTED']
    },
    due_date: Date,
    filed_on_time: {
      type: Boolean,
      default: false
    }
  },
  
  // Summary Statistics
  summary: {
    total_employees: {
      type: Number,
      default: 0
    },
    total_amount: {
      type: Number,
      default: 0,
      min: 0
    },
    total_contribution: {
      type: Number,
      default: 0,
      min: 0
    },
    total_deduction: {
      type: Number,
      default: 0,
      min: 0
    },
    other_metrics: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  
  // EPF Specific
  epf_details: {
    uan_count: Number,
    total_epf_employee: Number,
    total_epf_employer: Number,
    total_edli: Number,
    total_fpf: Number,
    ecr_file_format: String
  },
  
  // ESIC Specific
  esic_details: {
    ip_count: Number,
    total_esic_employee: Number,
    total_esic_employer: Number,
    contribution_file_format: String
  },
  
  // TDS Specific
  tds_details: {
    tan: String,
    total_tds: Number,
    form_type: {
      type: String,
      enum: ['FORM24Q', 'FORM16', 'FORM16A']
    },
    quarter: Number
  },
  
  // Form-16/16A Specific
  form16_details: {
    employee_count: Number,
    total_tds: Number,
    part_a_completed: {
      type: Boolean,
      default: false
    },
    part_b_completed: {
      type: Boolean,
      default: false
    },
    tan: String
  },
  
  // Errors
  errors: [{
    error_type: String,
    error_message: String,
    error_details: mongoose.Schema.Types.Mixed,
    occurred_at: {
      type: Date,
      default: Date.now
    }
  }],
  
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
statExportSchema.index({ type: 1, 'period.year': 1, 'period.month': 1 });
statExportSchema.index({ status: 1, generated_at: 1 });
statExportSchema.index({ period_string: 1, type: 1 });

// Pre-save middleware
statExportSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  
  // Generate period_string
  if (!this.period.period_string) {
    if (this.period.quarter) {
      this.period.period_string = `Q${this.period.quarter}-${this.period.year}`;
    } else if (this.period.month) {
      this.period.period_string = `${this.period.year}-${String(this.period.month).padStart(2, '0')}`;
    } else {
      this.period.period_string = `${this.period.year}`;
    }
  }
  
  // Generate export_id if not provided
  if (!this.export_id) {
    this.export_id = `${this.type}-${this.period.period_string}-${Date.now()}`;
  }
  
  // Check if filed on time
  if (this.filing.filed_at && this.filing.due_date) {
    this.filing.filed_on_time = this.filing.filed_at <= this.filing.due_date;
  }
  
  next();
});

const StatExport = mongoose.model('StatExport', statExportSchema);

module.exports = StatExport;

