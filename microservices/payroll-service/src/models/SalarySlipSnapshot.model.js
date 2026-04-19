const mongoose = require('mongoose');

const salarySlipSnapshotSchema = new mongoose.Schema({
  cycle_ref: {
    type: String,
    required: true,
    index: true
  },
  employee_code: {
    type: String,
    required: true,
    index: true
  },
  month: {
    type: Number,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  frozen_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  frozen_at: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

salarySlipSnapshotSchema.index({ cycle_ref: 1, employee_code: 1 }, { unique: true });

module.exports = mongoose.model('SalarySlipSnapshot', salarySlipSnapshotSchema);
