const Salary = require('../models/Salary.model');
const PayrollRecord = require('../models/PayrollRecord.model');
const logger = require('../config/logger');

/**
 * Generates month payroll records from active salaries (same logic as salaryController.generateMonthlySalaryRecords).
 */
async function generateMonthlyRecordsFromSalaries({ month, year, userId, cycleRef }) {
  const activeSalaries = await Salary.find({ is_active: true }).lean();
  if (activeSalaries.length === 0) {
    const err = new Error('No active salary structures found');
    err.code = 'NO_SALARY_STRUCTURES';
    throw err;
  }

  const payrollDocs = [];
  let totalGross = 0;
  let totalNet = 0;

  for (const salary of activeSalaries) {
    const payrollDoc = {
      employee_code: salary.employee_id,
      month: Number(month),
      year: Number(year),
      total_days: 30,
      present_days: 30,
      eligible_days: 30,
      base_salary: Number(salary.gross_monthly || 0),
      adjusted_gross: Number(salary.gross_monthly || 0),
      target_sales: 0,
      actual_sales: 0,
      sales_percentage: 0,
      sales_deduction: 0,
      sales_incentive: 0,
      basic_salary: Number(salary.basic_salary || 0),
      hra: Number(salary.hra || 0),
      da: 0,
      special_allowance: Number(salary.special_allowance || 0),
      variable_pay: Number(salary.variable_incentive || 0),
      epf_employee: Number(salary.epf_employee || 0),
      esic_employee: Number(salary.esic_employee || 0),
      professional_tax: Number(salary.professional_tax || 0),
      tds: Number(salary.tds || 0),
      total_employee_deductions: Number(salary.total_deductions || 0),
      net_take_home: Number(salary.net_take_home || 0),
      epf_employer: Number(salary.epf_employer || 0),
      esic_employer: Number(salary.esic_employer || 0),
      gratuity: Number(salary.gratuity || 0),
      total_employer_contributions: Number(salary.employer_contributions || 0),
      monthly_ctc: Number(salary.monthly_ctc || 0),
      annual_ctc: Number(salary.annual_ctc || 0),
      performance_status: 'AVERAGE',
      performance_color: 'YELLOW',
      status: 'DRAFT',
      external_ref_id: cycleRef
    };

    await PayrollRecord.findOneAndUpdate(
      { employee_code: salary.employee_id, month: Number(month), year: Number(year) },
      { $set: payrollDoc, $setOnInsert: { created_by: userId } },
      { upsert: true, new: true, runValidators: true }
    );

    totalGross += payrollDoc.adjusted_gross;
    totalNet += payrollDoc.net_take_home;
    payrollDocs.push(payrollDoc);
  }

  logger.info('payrollRunEngine: monthly records generated', {
    month, year, employees: payrollDocs.length, cycleRef
  });

  return {
    total_employees: payrollDocs.length,
    total_gross: totalGross,
    total_net: totalNet,
    payrollDocs
  };
}

module.exports = { generateMonthlyRecordsFromSalaries };
