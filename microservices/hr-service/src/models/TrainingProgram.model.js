const mongoose = require('mongoose');

const trainingProgramSchema = new mongoose.Schema({
  programName: {
    type: String,
    required: true,
    trim: true
  },
  programCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Technical', 'Soft Skills', 'Compliance', 'Safety', 'Product Knowledge', 'Other'],
    trim: true
  },
  duration: {
    type: String,
    trim: true
  },
  targetAudience: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    trim: true
  },
  instructor: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Draft', 'Active', 'Completed', 'Cancelled'],
    default: 'Draft'
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
trainingProgramSchema.index({ category: 1, status: 1 });
trainingProgramSchema.index({ programCode: 1 });

module.exports = mongoose.model('TrainingProgram', trainingProgramSchema);

