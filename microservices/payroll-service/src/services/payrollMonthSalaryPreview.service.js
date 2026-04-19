const Salary = require('../models/Salary.model');
const User = require('../models/User.model');
const { fetchAttendanceRecordsForRange } = require('../utils/attendanceServiceClient');
const { monthDateBounds } = require('./payrollAttendancePreview.service');
const { summarizePayrollDaysByEmployee } = require('../utils/attendancePayrollDaySummary');
const logger = require('../config/logger');

function computeProRataGross(baseMonthly, calendarDaysInMonth, eligiblePayDays) {
  const base = Number(baseMonthly) || 0;
  const td = Number(calendarDaysInMonth) || 0;
  const ed = Number(eligiblePayDays) || 0;
  if (td <= 0) return 0;
  return (base / td) * ed;
}

function emptyAttendanceSummary(code, daysInMonth) {
  return {
    employee_code: code,
    days_in_calendar_month: daysInMonth,
    distinct_days_with_mark: 0,
    unmarked_calendar_days: daysInMonth,
    present_days: 0,
    paid_leave_days: 0,
    unpaid_leave_days: 0,
    half_days: 0,
    absent_days: 0,
    other_days: 0,
    unknown_days: 0,
    eligible_pay_days: 0
  };
}

/**
 * Month-level salary preview: day-type counts from attendance rows +
 * pro-rata gross (leave/absent reduce pay days) + deductions from Salary.calculateSalary.
 */
async function buildMonthSalaryPreview(ctx, {
  month,
  year,
  storeId,
  departmentId,
  employee_code
}) {
  const { startDate, endDate, daysInMonth } = monthDateBounds(month, year);

  const maxRows = parseInt(process.env.PAYROLL_ATTENDANCE_PREVIEW_MAX_ROWS || '50000', 10);
  const pageSize = parseInt(process.env.PAYROLL_ATTENDANCE_PREVIEW_PAGE_SIZE || '500', 10);

  const { rows, truncated } = await fetchAttendanceRecordsForRange(ctx, {
    startDate,
    endDate,
    storeId,
    departmentId,
    pageSize,
    maxRows
  });

  const daySummary = summarizePayrollDaysByEmployee(rows, daysInMonth);

  const salaryQuery = { is_active: true };
  if (employee_code) {
    salaryQuery.employee_id = String(employee_code).toUpperCase().trim();
  }

  const salaries = await Salary.find(salaryQuery).lean().exec();

  const codes = salaries.map((s) => String(s.employee_id || '').toUpperCase().trim()).filter(Boolean);
  const nameByCode = new Map();
  if (codes.length) {
    try {
      const users = await User.find({ employee_id: { $in: codes } })
        .select('employee_id name')
        .lean();
      for (const u of users) {
        nameByCode.set(String(u.employee_id).toUpperCase().trim(), u.name || '');
      }
    } catch (e) {
      logger.warn('month salary preview: batch user lookup failed', { message: e.message });
    }
  }

  const warnings = [];
  if (truncated) {
    warnings.push(
      'Attendance fetch hit row cap; day counts and salary preview may be incomplete. Narrow filters or raise PAYROLL_ATTENDANCE_PREVIEW_MAX_ROWS.'
    );
  }

  const employees = [];

  for (const sal of salaries) {
    const code = String(sal.employee_id || '').toUpperCase().trim();
    const att = daySummary.get(code) || emptyAttendanceSummary(code, daysInMonth);

    const gross = Number(sal.gross_monthly) || 0;
    const variable = Number(sal.variable_incentive) || 0;
    const pt = Number(sal.professional_tax) || 0;
    const tds = Number(sal.tds) || 0;

    const eligible = Number(att.eligible_pay_days) || 0;
    const proRataGross = computeProRataGross(gross, daysInMonth, eligible);

    const baseline = Salary.calculateSalary(gross, variable, pt, tds);
    const adjusted = Salary.calculateSalary(proRataGross, variable, pt, tds);

    const employee_name = nameByCode.get(code) || code;

    employees.push({
      employee_code: code,
      employee_name,
      attendance: {
        ...att,
        formula: {
          eligible_pay_days:
            'Per calendar day in attendance: paid_leave=1, present-like=1, half_day=0.5, absent/unpaid/unknown=0 (see attendancePayrollDaySummary.js).'
        }
      },
      salary_contract: {
        gross_monthly: gross,
        variable_incentive: variable,
        professional_tax: pt,
        tds,
        baseline_net_take_home: baseline.net_take_home,
        baseline_total_deductions: baseline.total_deductions
      },
      after_attendance_pro_rata: {
        adjusted_gross_monthly: Math.round(proRataGross * 100) / 100,
        net_take_home: adjusted.net_take_home,
        total_deductions: adjusted.total_deductions,
        basic_salary: adjusted.basic_salary,
        hra: adjusted.hra,
        special_allowance: adjusted.special_allowance,
        epf_employee: adjusted.epf_employee,
        esic_employee: adjusted.esic_employee,
        monthly_ctc: adjusted.monthly_ctc
      },
      deltas: {
        gross_monthly_delta: Math.round((proRataGross - gross) * 100) / 100,
        net_take_home_delta: Math.round((adjusted.net_take_home - baseline.net_take_home) * 100) / 100
      }
    });
  }

  employees.sort((a, b) => a.employee_code.localeCompare(b.employee_code));

  return {
    month: Number(month),
    year: Number(year),
    startDate,
    endDate,
    calculation_notes: [
      'Calendar month length = days_in_calendar_month.',
      'Pro-rata gross = gross_monthly / days_in_calendar_month * eligible_pay_days (same shape as unified payroll attendance adjustment).',
      'Salary.calculateSalary is run on contract gross (baseline) and on adjusted gross; PT and TDS copied from the active salary row (simplified vs full tax engine).'
    ],
    warnings,
    employees
  };
}

module.exports = {
  buildMonthSalaryPreview,
  computeProRataGross
};
