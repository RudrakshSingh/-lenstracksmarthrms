const mongoose = require('mongoose');

const hrTemplateSchema = new mongoose.Schema({
  templateId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  letterType: {
    type: String,
    enum: ['OFFER', 'APPOINTMENT', 'PROMOTION', 'DEMOTION', 'TRANSFER', 'ROLE_CHANGE', 'TERMINATION', 'INTERNSHIP'],
    required: true,
    index: true
  },
  version: {
    type: String,
    required: true
  },
  brand: {
    type: String,
    required: true,
    trim: true
  },
  language: {
    type: String,
    enum: ['en-IN', 'hi-IN'],
    required: true
  },
  salarySystem: {
    type: String,
    enum: ['PERFORMANCE_DEBIT_CREDIT', 'FIXED_PLUS_TARGET_INCENTIVE', 'STANDARD_FIXED', 'WORKTRACK_PLUS_INCENTIVE', 'ALL'],
    default: 'ALL'
  },
  bodyHtml: {
    type: String,
    required: true
  },
  bodyText: {
    type: String
  },
  placeholders: [{
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      trim: true
    },
    required: {
      type: Boolean,
      default: false
    },
    defaultValue: {
      type: String,
      trim: true
    }
  }],
  samples: [{
    name: {
      type: String,
      required: true
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  }],
  approvalWorkflowRef: {
    type: String,
    ref: 'ApprovalWorkflow'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  created_by: {
    type: String,
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

// Indexes (remove duplicates of field-level indexes)
hrTemplateSchema.index({ letterType: 1, language: 1, isActive: 1 });
hrTemplateSchema.index({ brand: 1, letterType: 1 });
hrTemplateSchema.index({ salarySystem: 1 });

module.exports = mongoose.model('HRTemplate', hrTemplateSchema);
