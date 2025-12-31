const mongoose = require('mongoose');

const performanceReviewSchema = new mongoose.Schema({
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  period: {
    type: String,
    required: true,
    enum: ['weekly', 'monthly', 'quarterly', 'yearly']
  },
  periodStart: {
    type: Date,
    required: true
  },
  periodEnd: {
    type: Date,
    required: true
  },
  overallScore: {
    type: Number,
    min: 0,
    max: 100
  },
  breakdown: {
    completion: {
      type: Number,
      min: 0,
      max: 100
    },
    sla: {
      type: Number,
      min: 0,
      max: 100
    },
    quality: {
      type: Number,
      min: 0,
      max: 100
    },
    efficiency: {
      type: Number,
      min: 0,
      max: 100
    },
    reliability: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  reviewer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['Draft', 'Submitted', 'Reviewed', 'Approved'],
    default: 'Draft'
  },
  comments: {
    type: String,
    trim: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
performanceReviewSchema.index({ employee_id: 1, period: 1, periodStart: -1 });
performanceReviewSchema.index({ status: 1 });

module.exports = mongoose.model('PerformanceReview', performanceReviewSchema);

