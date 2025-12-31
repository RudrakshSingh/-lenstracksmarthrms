const mongoose = require('mongoose');

const recruitmentJobSchema = new mongoose.Schema({
  jobTitle: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  jobType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
    default: 'Full-time'
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  requirements: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Draft', 'Open', 'Closed', 'Cancelled'],
    default: 'Draft'
  },
  postedDate: {
    type: Date,
    default: Date.now
  },
  closingDate: {
    type: Date
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
recruitmentJobSchema.index({ status: 1, postedDate: -1 });
recruitmentJobSchema.index({ department: 1 });

module.exports = mongoose.model('RecruitmentJob', recruitmentJobSchema);

