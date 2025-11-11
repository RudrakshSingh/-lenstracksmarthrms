const mongoose = require('mongoose');

const compensationProfileSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  employeeId: {
    type: String,
    required: true,
    index: true
  },
  
  // Basic Compensation
  baseSalary: {
    type: Number,
    min: 0
  },
  targetSales: {
    type: Number,
    min: 0
  },
  ctc: {
    type: Number,
    min: 0
  },
  
  // Allowances
  hra: {
    type: Number,
    default: 0,
    min: 0
  },
  transport_allowance: {
    type: Number,
    default: 0,
    min: 0
  },
  medical_allowance: {
    type: Number,
    default: 0,
    min: 0
  },
  special_allowance: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Statutory Applicability
  pfApplicable: {
    type: Boolean,
    default: false
  },
  esicApplicable: {
    type: Boolean,
    default: false
  },
  ptApplicable: {
    type: Boolean,
    default: false
  },
  tdsApplicable: {
    type: Boolean,
    default: false
  },
  
  // Statutory Components
  pf_contribution: {
    type: Number,
    default: 0,
    min: 0
  },
  esic_contribution: {
    type: Number,
    default: 0,
    min: 0
  },
  professional_tax: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Tax Information
  panNumber: {
    type: String,
    uppercase: true,
    match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format']
  },
  taxState: {
    type: String
  },
  tax_slab: {
    type: String,
    enum: ['OLD', 'NEW']
  },
  
  // Bank Account
  bankAccount: {
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    accountType: {
      type: String,
      enum: ['Savings', 'Current', 'Salary']
    }
  },
  
  // UAN and ESI
  uan: {
    type: String,
    match: [/^\d{12}$/, 'UAN must be 12 digits']
  },
  esiNo: {
    type: String,
    match: [/^\d{15}$/, 'ESI number must be 15 digits']
  },
  
  // Previous Employment
  previousEmployment: {
    hasPreviousEmployment: Boolean,
    employerName: String,
    fromDate: Date,
    toDate: Date
  },
  
  // Work Details
  joiningDate: Date,
  confirmationDate: Date,
  roleFamily: String,
  
  // Leave and Incentives
  leaveEntitlements: mongoose.Schema.Types.Mixed,
  incentiveSlabs: mongoose.Schema.Types.Mixed,
  
  // Effective Dates
  effective_from: {
    type: Date,
    required: true,
    default: Date.now
  },
  effective_to: {
    type: Date
  },
  
  // Status
  is_active: {
    type: Boolean,
    default: true,
    index: true
  },
  
  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
compensationProfileSchema.index({ employee: 1 });
compensationProfileSchema.index({ employeeId: 1 });
compensationProfileSchema.index({ is_active: 1 });
compensationProfileSchema.index({ effective_from: 1, effective_to: 1 });

// Virtual for total allowances
compensationProfileSchema.virtual('total_allowances').get(function() {
  return (this.hra || 0) + 
         (this.transport_allowance || 0) + 
         (this.medical_allowance || 0) + 
         (this.special_allowance || 0);
});

// Virtual for net salary
compensationProfileSchema.virtual('net_salary').get(function() {
  return this.base_salary + this.total_allowances - 
         (this.pf_contribution || 0) - 
         (this.esic_contribution || 0) - 
         (this.professional_tax || 0);
});

module.exports = mongoose.model('CompensationProfile', compensationProfileSchema);

