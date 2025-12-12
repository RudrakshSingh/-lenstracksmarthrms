const mongoose = require('mongoose');

const employeeMasterSchema = new mongoose.Schema({
  employee_code: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  designation: {
    type: String,
    required: true
  },
  store_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  },
  joining_date: {
    type: Date,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['SALES', 'BACKEND', 'LAB', 'HR', 'MANAGEMENT', 'TECH'],
    default: 'BACKEND'
  },
  base_salary: {
    type: Number,
    required: true,
    min: 0
  },
  target_sales: {
    type: Number,
    default: 0,
    min: 0
  },
  pf_applicable: {
    type: Boolean,
    default: true
  },
  esic_applicable: {
    type: Boolean,
    default: true
  },
  pt_applicable: {
    type: Boolean,
    default: true
  },
  tds_applicable: {
    type: Boolean,
    default: true
  },
  state: {
    type: String,
    required: true
  },
  pan_number: {
    type: String,
    uppercase: true
  },
  version: {
    type: Number,
    default: 1
  },
  is_current: {
    type: Boolean,
    default: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  effective_date: {
    type: Date,
    default: Date.now
  },
  end_date: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
employeeMasterSchema.index({ employee_code: 1, is_current: 1 });
employeeMasterSchema.index({ category: 1 });
employeeMasterSchema.index({ store_id: 1 });

module.exports = mongoose.model('EmployeeMaster', employeeMasterSchema);

