const mongoose = require('mongoose');

const approvalWorkflowSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Workflow Type
  workflow_type: {
    type: String,
    enum: ['HR_LETTER', 'TRANSFER', 'LEAVE', 'PAYROLL', 'OTHER'],
    required: true,
    index: true
  },
  
  // Approval Levels
  levels: [{
    level: {
      type: Number,
      required: true,
      min: 1
    },
    approver_role: {
      type: String,
      required: true
    },
    approver_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    is_required: {
      type: Boolean,
      default: true
    },
    auto_approve: {
      type: Boolean,
      default: false
    },
    timeout_hours: {
      type: Number,
      default: 48
    }
  }],
  
  // Status
  is_active: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Default workflow flag
  is_default: {
    type: Boolean,
    default: false,
    index: true
  },
  
  // Audit
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
approvalWorkflowSchema.index({ workflow_type: 1, is_active: 1 });
approvalWorkflowSchema.index({ is_default: 1 });

// Static method to get default workflow for type
approvalWorkflowSchema.statics.getDefaultWorkflow = function(workflowType) {
  return this.findOne({ workflow_type: workflowType, is_default: true, is_active: true });
};

// Static method to get active workflows for type
approvalWorkflowSchema.statics.getActiveWorkflows = function(workflowType) {
  return this.find({ workflow_type: workflowType, is_active: true });
};

module.exports = mongoose.model('ApprovalWorkflow', approvalWorkflowSchema);

