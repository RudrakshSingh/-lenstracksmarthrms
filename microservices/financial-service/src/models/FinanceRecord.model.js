const mongoose = require('mongoose');

const financeRecordSchema = new mongoose.Schema({
  external_ref_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  source_module: {
    type: String,
    enum: ['PAYROLL', 'MANUAL', 'HR'],
    required: true
  },
  record_type: {
    type: String,
    enum: ['SALARY_EXPENSE', 'LEDGER_POSTING', 'MANUAL_EXPENSE'],
    required: true
  },
  record_status: {
    type: String,
    enum: ['CREATED', 'POSTED', 'FAILED', 'REVERSED'],
    default: 'CREATED',
    index: true
  },
  amount: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  expense_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense'
  },
  ledger_refs: [String],
  company_id: String,
  brand_id: String,
  branch_id: String,
  department_id: String,
  employee_id: String,
  tenant_id: String,
  metadata: mongoose.Schema.Types.Mixed,
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

module.exports = mongoose.model('FinanceRecord', financeRecordSchema);
