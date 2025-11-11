const mongoose = require('mongoose');

const onboardingDraftSchema = new mongoose.Schema({
  employee_id: {
    type: String,
    required: true,
    index: true
  },
  step: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
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

// Index for quick lookup
onboardingDraftSchema.index({ employee_id: 1, step: 1 });

module.exports = mongoose.model('OnboardingDraft', onboardingDraftSchema);

