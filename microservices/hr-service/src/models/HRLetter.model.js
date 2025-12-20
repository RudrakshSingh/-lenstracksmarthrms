const mongoose = require('mongoose');

const hrLetterSchema = new mongoose.Schema({
  letterId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  letterType: {
    type: String,
    enum: ['OFFER', 'APPOINTMENT', 'PROMOTION', 'DEMOTION', 'TRANSFER', 'ROLE_CHANGE', 'TERMINATION', 'INTERNSHIP'],
    required: true,
    index: true
  },
  language: {
    type: String,
    enum: ['en-IN', 'hi-IN'],
    default: 'en-IN'
  },
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SIGNED', 'ISSUED', 'VOID'],
    default: 'DRAFT',
    index: true
  },
  templateId: {
    type: String,
    required: true,
    ref: 'HRTemplate'
  },
  templateVersion: {
    type: String,
    required: true
  },
  dataBinding: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  serialNo: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  issueDate: {
    type: Date,
    required: true
  },
  effectiveDate: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    trim: true
  },
  newDesignation: {
    type: String,
    trim: true
  },
  newDepartment: {
    type: String,
    trim: true
  },
  newLocation: {
    storeId: String,
    storeName: String,
    city: String,
    state: String,
    pincode: String
  },
  signatories: [{
    name: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    eSignProvider: {
      type: String,
      trim: true
    },
    signedAt: {
      type: Date
    },
    signatureUrl: {
      type: String,
      trim: true
    }
  }],
  delivery: {
    emailedTo: [String],
    whatsappTo: [String],
    cc: [String],
    bcc: [String],
    deliveredAt: Date
  },
  files: {
    pdfUrl: {
      type: String,
      trim: true
    },
    htmlUrl: {
      type: String,
      trim: true
    },
    docxUrl: {
      type: String,
      trim: true
    }
  },
  annexures: [{
    title: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['HTML', 'PDF', 'DOCX'],
      required: true
    },
    content: {
      type: String
    },
    url: {
      type: String,
      trim: true
    }
  }],
  approvalWorkflow: {
    workflowId: {
      type: String,
      ref: 'ApprovalWorkflow'
    },
    currentStep: {
      type: Number,
      default: 0
    },
    steps: [{
      stepNumber: Number,
      role: String,
      userId: String,
      status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING'
      },
      approvedAt: Date,
      approvedBy: String,
      comments: String,
      slaHours: Number,
      escalated: {
        type: Boolean,
        default: false
      }
    }]
  },
  audit: [{
    action: {
      type: String,
      required: true
    },
    user: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    ip: String,
    userAgent: String,
    changes: mongoose.Schema.Types.Mixed
  }],
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
hrLetterSchema.index({ letterType: 1, status: 1 });
hrLetterSchema.index({ 'dataBinding.employee.employeeId': 1 });
hrLetterSchema.index({ issueDate: 1 });
hrLetterSchema.index({ effectiveDate: 1 });
hrLetterSchema.index({ created_by: 1 });

module.exports = mongoose.model('HRLetter', hrLetterSchema);
