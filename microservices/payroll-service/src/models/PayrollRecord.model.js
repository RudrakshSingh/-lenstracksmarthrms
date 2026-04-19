const mongoose = require('mongoose');

const payrollRecordSchema = new mongoose.Schema({
  // Employee Reference
  employee_code: {
    type: String,
    required: true,
    ref: 'EmployeeMaster'
  },
  
  // Payroll Period
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true,
    min: 2020
  },
  
  // Attendance Data
  total_days: {
    type: Number,
    required: true
  },
  present_days: {
    type: Number,
    required: true
  },
  eligible_days: {
    type: Number,
    required: true
  },
  
  // Base Salary Calculations
  base_salary: {
    type: Number,
    required: true,
    min: 0
  },
  adjusted_gross: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Performance Data (for Sales staff)
  target_sales: {
    type: Number,
    default: 0,
    min: 0
  },
  actual_sales: {
    type: Number,
    default: 0,
    min: 0
  },
  sales_percentage: {
    type: Number,
    default: 0,
    min: 0
  },
  sales_deduction: {
    type: Number,
    default: 0,
    min: 0
  },
  sales_incentive: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Salary Components
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
  da: {
    type: Number,
    default: 0,
    min: 0
  },
  special_allowance: {
    type: Number,
    required: true,
    min: 0
  },
  variable_pay: {
    type: Number,
    default: 0,
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
    required: true,
    min: 0
  },
  professional_tax: {
    type: Number,
    required: true,
    min: 0
  },
  tds: {
    type: Number,
    required: true,
    min: 0
  },
  total_employee_deductions: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Net Salary
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
    required: true,
    min: 0
  },
  gratuity: {
    type: Number,
    required: true,
    min: 0
  },
  total_employer_contributions: {
    type: Number,
    required: true,
    min: 0
  },
  
  // CTC Calculations
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
  
  // Performance Status
  performance_status: {
    type: String,
    enum: ['EXCELLENT', 'GOOD', 'AVERAGE', 'BELOW_AVERAGE', 'POOR'],
    default: 'AVERAGE'
  },
  performance_color: {
    type: String,
    enum: ['GREEN', 'YELLOW', 'RED'],
    default: 'YELLOW'
  },
  
  // Payroll Status
  status: {
    type: String,
    enum: [
      'DRAFT',
      'SUBMITTED',
      'APPROVED',
      'LOCKED',
      'PAID',
      'DRAFT_HR',
      'HR_APPROVED',
      'FINANCE_REVIEW',
      'FINANCE_APPROVED',
      'SLIP_FROZEN',
      'POSTED_TO_FINANCE',
      'COMPLETED',
      'PROCESSING',
      'FROZEN',
      'POSTED',
      'RECONCILED',
      'SENT_BACK_TO_HR'
    ],
    default: 'DRAFT'
  },
  external_ref_id: {
    type: String,
    index: true
  },
  finance_record_id: {
    type: String,
    index: true
  },
  company_id: {
    type: String,
    index: true
  },
  brand_id: {
    type: String,
    index: true
  },
  branch_id: {
    type: String,
    index: true
  },
  department_id: {
    type: String,
    index: true
  },
  
  // Approval Workflow
  submitted_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  submitted_at: {
    type: Date
  },
  approved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approved_at: {
    type: Date
  },
  locked_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  locked_at: {
    type: Date
  },
  
  // Audit Trail
  manual_adjustments: [{
    field: String,
    old_value: Number,
    new_value: Number,
    reason: String,
    adjusted_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    adjusted_at: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Payslip Generation
  payslip_generated: {
    type: Boolean,
    default: false
  },
  payslip_generated_at: {
    type: Date
  },
  payslip_url: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
payrollRecordSchema.index({ employee_code: 1, month: 1, year: 1 }, { unique: true });
payrollRecordSchema.index({ status: 1 });
payrollRecordSchema.index({ month: 1, year: 1 });

// Get payroll for employee
payrollRecordSchema.statics.getEmployeePayroll = function(employeeCode, month, year) {
  return this.findOne({
    employee_code: employeeCode,
    month: month,
    year: year
  });
};

// Get monthly payroll summary
payrollRecordSchema.statics.getMonthlyPayrollSummary = function(month, year) {
  return this.aggregate([
    {
      $match: {
        month: month,
        year: year,
        status: { $in: ['APPROVED', 'LOCKED', 'PAID'] }
      }
    },
    {
      $group: {
        _id: null,
        total_employees: { $sum: 1 },
        total_gross: { $sum: '$adjusted_gross' },
        total_net_pay: { $sum: '$net_take_home' },
        total_employer_cost: { $sum: '$total_employer_contributions' },
        total_ctc: { $sum: '$monthly_ctc' },
        total_epf_employee: { $sum: '$epf_employee' },
        total_epf_employer: { $sum: '$epf_employer' },
        total_esic_employee: { $sum: '$esic_employee' },
        total_esic_employer: { $sum: '$esic_employer' },
        total_gratuity: { $sum: '$gratuity' },
        total_pt: { $sum: '$professional_tax' },
        total_tds: { $sum: '$tds' }
      }
    }
  ]);
};

// Get performance analytics
payrollRecordSchema.statics.getPerformanceAnalytics = function(month, year) {
  return this.aggregate([
    {
      $match: {
        month: month,
        year: year,
        status: { $in: ['APPROVED', 'LOCKED', 'PAID'] }
      }
    },
    {
      $group: {
        _id: '$performance_status',
        count: { $sum: 1 },
        avg_sales_percentage: { $avg: '$sales_percentage' },
        avg_incentive: { $avg: '$sales_incentive' },
        avg_deduction: { $avg: '$sales_deduction' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

const PayrollRecord = mongoose.model('PayrollRecord', payrollRecordSchema);

module.exports = PayrollRecord;
