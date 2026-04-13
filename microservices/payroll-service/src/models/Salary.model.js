const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({
  employee_id: {
    type: String,
    required: true,
    ref: 'User'
  },
  gross_monthly: {
    type: Number,
    required: true,
    min: 0
  },
  variable_incentive: {
    type: Number,
    default: 0,
    min: 0
  },
  basic_salary: {
    type: Number,
    required: true,
    min: 0
  },
  hra: {
    type: Number,
    required: true,
    min: 0
  },
  special_allowance: {
    type: Number,
    required: true,
    min: 0
  },
  total_earnings: {
    type: Number,
    required: true,
    min: 0
  },
  // Employee Deductions
  epf_employee: {
    type: Number,
    required: true,
    min: 0
  },
  esic_employee: {
    type: Number,
    default: 0,
    min: 0
  },
  professional_tax: {
    type: Number,
    default: 0,
    min: 0
  },
  tds: {
    type: Number,
    default: 0,
    min: 0
  },
  total_deductions: {
    type: Number,
    required: true,
    min: 0
  },
  net_take_home: {
    type: Number,
    required: true,
    min: 0
  },
  // Employer Contributions
  epf_employer: {
    type: Number,
    required: true,
    min: 0
  },
  esic_employer: {
    type: Number,
    default: 0,
    min: 0
  },
  gratuity: {
    type: Number,
    required: true,
    min: 0
  },
  employer_contributions: {
    type: Number,
    required: true,
    min: 0
  },
  monthly_ctc: {
    type: Number,
    required: true,
    min: 0
  },
  annual_ctc: {
    type: Number,
    required: true,
    min: 0
  },
  effective_date: {
    type: Date,
    default: Date.now
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient queries
salarySchema.index({ employee_id: 1, effective_date: -1 });
salarySchema.index({ is_active: 1 });

// Virtual for calculating total cost to company
salarySchema.virtual('total_cost_to_company').get(function() {
  return this.monthly_ctc * 12;
});

// Method to calculate salary components
salarySchema.statics.calculateSalary = function(grossMonthly, variableIncentive = 0, professionalTax = 0, tds = 0) {
  // Basic salary calculation (50% of gross)
  const basicSalary = grossMonthly * 0.5;
  
  // HRA calculation (50% of basic)
  const hra = basicSalary * 0.5;
  
  // Special allowance (remaining amount)
  const specialAllowance = grossMonthly - basicSalary - hra;
  
  // Total earnings
  const totalEarnings = grossMonthly + variableIncentive;
  
  // EPF calculation (12% of basic, capped at ₹1,800)
  const epfEmployee = Math.min(basicSalary * 0.12, 1800);
  const epfEmployer = Math.min(basicSalary * 0.12, 1800);
  
  // ESIC calculation (only if gross <= ₹21,000)
  const esicEmployee = grossMonthly <= 21000 ? grossMonthly * 0.0075 : 0;
  const esicEmployer = grossMonthly <= 21000 ? grossMonthly * 0.0325 : 0;
  
  // Gratuity calculation (4.81% of basic)
  const gratuity = basicSalary * 0.0481;
  
  // Total deductions
  const totalDeductions = epfEmployee + esicEmployee + professionalTax + tds;
  
  // Net take home
  const netTakeHome = grossMonthly - totalDeductions;
  
  // Employer contributions
  const employerContributions = epfEmployer + esicEmployer + gratuity;
  
  // CTC calculations
  const monthlyCTC = grossMonthly + employerContributions;
  const annualCTC = monthlyCTC * 12;
  
  return {
    basic_salary: basicSalary,
    hra: hra,
    special_allowance: specialAllowance,
    total_earnings: totalEarnings,
    epf_employee: epfEmployee,
    esic_employee: esicEmployee,
    professional_tax: professionalTax,
    tds: tds,
    total_deductions: totalDeductions,
    net_take_home: netTakeHome,
    epf_employer: epfEmployer,
    esic_employer: esicEmployer,
    gratuity: gratuity,
    employer_contributions: employerContributions,
    monthly_ctc: monthlyCTC,
    annual_ctc: annualCTC
  };
};

// Method to get current salary for an employee
salarySchema.statics.getCurrentSalary = function(employeeId) {
  return this.findOne({ 
    employee_id: employeeId, 
    is_active: true 
  }).sort({ effective_date: -1 });
};

// Method to get salary history for an employee
salarySchema.statics.getSalaryHistory = function(employeeId, limit = 12) {
  return this.find({ 
    employee_id: employeeId 
  }).sort({ effective_date: -1 }).limit(limit);
};

module.exports = mongoose.model('Salary', salarySchema);

// Performance indexes
salarySchema.index({ employee_id: 1, month: -1, year: -1 }); // Fast salary lookup
salarySchema.index({ tenantId: 1, month: -1, year: -1 }); // Tenant payroll
