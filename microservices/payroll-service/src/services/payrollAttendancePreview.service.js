const { fetchAttendanceRecordsForRange } = require('../utils/attendanceServiceClient');
const { fetchActiveEmployeeRoster } = require('../utils/hrServiceClient');
const { summarizePayrollDaysByEmployee } = require('../utils/attendancePayrollDaySummary');
const logger = require('../config/logger');

function monthDateBounds(month, year) {
  const m = Number(month);
  const y = Number(year);
  if (!m || m < 1 || m > 12 || !y || y < 1970 || y > 2100) {
    const err = new Error('Invalid month or year');
    err.status = 400;
    throw err;
  }
  const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const endDate = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate, daysInMonth: lastDay };
}

function aggregateByEmployee(rows, daysInMonth) {
  const by = new Map();

  for (const r of rows) {
    const code = String(r.employeeId || 'UNKNOWN').toUpperCase().trim();
    if (!by.has(code)) {
      by.set(code, {
        employee_code: code,
        employee_name: r.employeeName || '',
        record_count: 0,
        dates: new Set(),
        by_status: {},
        open_clock_in_records: 0
      });
    }
    const a = by.get(code);
    if (r.employeeName && !a.employee_name) a.employee_name = r.employeeName;
    a.record_count += 1;
    if (r.date) a.dates.add(String(r.date).slice(0, 10));
    const st = String(r.status || 'unknown').toLowerCase();
    a.by_status[st] = (a.by_status[st] || 0) + 1;
    if (r.isClockedIn) a.open_clock_in_records += 1;
  }

  const employees = [];
  for (const a of by.values()) {
    const distinctDays = a.dates.size;
    employees.push({
      employee_code: a.employee_code,
      employee_name: a.employee_name,
      record_count: a.record_count,
      distinct_days_with_mark: distinctDays,
      days_in_calendar_month: daysInMonth,
      /** Row-level status histogram (one employee can have multiple rows per day). */
      by_status: a.by_status,
      calendar_coverage_ratio: daysInMonth
        ? Math.round((distinctDays / daysInMonth) * 1000) / 1000
        : 0,
      anomalies: {
        open_clock_in_records: a.open_clock_in_records,
        multiple_rows_same_month: a.record_count > distinctDays
      }
    });
  }

  employees.sort((x, y) => x.employee_code.localeCompare(y.employee_code));
  return employees;
}

function emptyPayrollDaySummary(employeeCode, daysInMonth) {
  return {
    employee_code: employeeCode,
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
 * Payroll step-1 style preview: month attendance from attendance-service,
 * optional HR roster merge for employees with zero rows.
 */
async function buildPayrollAttendancePreview(ctx, {
  month,
  year,
  storeId,
  departmentId,
  includeRoster
}) {
  const { startDate, endDate, daysInMonth } = monthDateBounds(month, year);

  const maxRows = parseInt(process.env.PAYROLL_ATTENDANCE_PREVIEW_MAX_ROWS || '50000', 10);
  const pageSize = parseInt(process.env.PAYROLL_ATTENDANCE_PREVIEW_PAGE_SIZE || '500', 10);

  const { rows, truncated, pages_fetched } = await fetchAttendanceRecordsForRange(ctx, {
    startDate,
    endDate,
    storeId,
    departmentId,
    pageSize,
    maxRows
  });

  let employees = aggregateByEmployee(rows, daysInMonth);
  const warnings = [];
  if (truncated) {
    warnings.push(
      `Attendance fetch truncated at ${maxRows} rows; increase PAYROLL_ATTENDANCE_PREVIEW_MAX_ROWS or narrow filters.`
    );
  }

  let roster_size = 0;
  let roster_missing_attendance = 0;

  if (includeRoster) {
    try {
      const roster = await fetchActiveEmployeeRoster(ctx, { storeId, departmentId });
      roster_size = roster.size;
      const seen = new Set(employees.map((e) => e.employee_code));
      for (const [code, name] of roster.entries()) {
        if (seen.has(code)) continue;
        roster_missing_attendance += 1;
        employees.push({
          employee_code: code,
          employee_name: name,
          record_count: 0,
          distinct_days_with_mark: 0,
          days_in_calendar_month: daysInMonth,
          by_status: {},
          calendar_coverage_ratio: 0,
          anomalies: {
            open_clock_in_records: 0,
            multiple_rows_same_month: false
          },
          flags: { no_attendance_rows_in_period: true }
        });
      }
      employees.sort((x, y) => x.employee_code.localeCompare(y.employee_code));
    } catch (e) {
      logger.warn('payroll attendance preview: roster merge skipped', { message: e.message });
      warnings.push('HR roster merge failed; returned attendance-only employees.');
    }
  }

  const dayMap = summarizePayrollDaysByEmployee(rows, daysInMonth);
  employees = employees.map((emp) => ({
    ...emp,
    payroll_day_summary:
      dayMap.get(emp.employee_code) || emptyPayrollDaySummary(emp.employee_code, daysInMonth)
  }));

  const totals = {
    employees_in_response: employees.length,
    total_attendance_rows: rows.length,
    pages_fetched_from_attendance: pages_fetched
  };

  return {
    month: Number(month),
    year: Number(year),
    startDate,
    endDate,
    days_in_calendar_month: daysInMonth,
    source: 'attendance-service',
    filters: {
      storeId: storeId || null,
      departmentId: departmentId || null,
      include_roster: !!includeRoster
    },
    roster: includeRoster
      ? { roster_size, employees_without_any_attendance_row: roster_missing_attendance }
      : null,
    totals,
    truncated,
    warnings,
    employees
  };
}

module.exports = {
  monthDateBounds,
  buildPayrollAttendancePreview
};
