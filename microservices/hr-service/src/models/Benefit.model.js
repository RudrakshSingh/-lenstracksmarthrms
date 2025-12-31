const mongoose = require('mongoose');

const benefitSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Health', 'Insurance', 'Retirement', 'Wellness', 'Education', 'Other'],
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Mandatory', 'Optional'],
    default: 'Optional'
  },
  cost: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    trim: true
  },
  provider: {
    type: String,
    trim: true
  },
  coverage: {
    type: String,
    trim: true
  },
  eligibilityCriteria: {
    type: String,
    trim: true
  },
  enrollment: {
    type: Number,
    default: 0,
    min: 0
  },
  utilization: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
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
benefitSchema.index({ category: 1, status: 1 });
benefitSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('Benefit', benefitSchema);

