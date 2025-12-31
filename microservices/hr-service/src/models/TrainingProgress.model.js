const mongoose = require('mongoose');

const trainingProgressSchema = new mongoose.Schema({
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  program_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainingProgram',
    required: true,
    index: true
  },
  employee: {
    type: String,
    required: true
  },
  store: {
    type: String
  },
  role: {
    type: String
  },
  watchPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  quizScore: {
    type: Number,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: ['Assigned', 'In Progress', 'Certified', 'Failed'],
    default: 'Assigned'
  },
  lastEvent: {
    type: String,
    trim: true
  },
  completedAt: {
    type: Date
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
trainingProgressSchema.index({ employee_id: 1, program_id: 1 });
trainingProgressSchema.index({ status: 1 });

module.exports = mongoose.model('TrainingProgress', trainingProgressSchema);

