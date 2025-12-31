const mongoose = require('mongoose');

const benefitEnrollmentSchema = new mongoose.Schema({
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  benefit_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Benefit',
    required: true,
    index: true
  },
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  dependents: [{
    name: {
      type: String,
      required: true
    },
    relationship: {
      type: String,
      required: true,
      enum: ['Spouse', 'Child', 'Parent', 'Sibling', 'Other']
    },
    dateOfBirth: {
      type: Date
    }
  }],
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Cancelled'],
    default: 'Active'
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
benefitEnrollmentSchema.index({ employee_id: 1, benefit_id: 1 });
benefitEnrollmentSchema.index({ status: 1 });

module.exports = mongoose.model('BenefitEnrollment', benefitEnrollmentSchema);

