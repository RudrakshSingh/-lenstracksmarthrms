const EmployeeMaster = require('../models/EmployeeMaster.model');
const Salary = require('../models/Salary.model');
const { buildPayrollAttendancePreview } = require('./payrollAttendancePreview.service');

function gateEnvelope(gateType, ok, pending, blockers, details = {}) {
  return {
    gateType,
    ok: Boolean(ok),
    pending: Number(pending) || 0,
    blockers: Array.isArray(blockers) ? blockers : [],
    details,
    checkedAt: new Date().toISOString()
  };
}

/**
 * Employee master — payroll DB EmployeeMaster completeness (PAN/state/bank where applicable).
 */
async function evaluateEmployeeMasterGate(ctx) {
  const employees = await EmployeeMaster.find({ is_current: { $ne: false } }).lean();
  const blockers = [];
  const seen = new Set();
  for (const e of employees) {
    if (!e.pan_number) {
      blockers.push({ employee_code: e.employee_code, code: 'MISSING_PAN', message: 'PAN not captured' });
      seen.add(String(e.employee_code));
    }
    if (!e.state) {
      blockers.push({ employee_code: e.employee_code, code: 'MISSING_STATE', message: 'State not set' });
      seen.add(String(e.employee_code));
    }
  }
  const ok = blockers.length === 0;
  return gateEnvelope('employee-master', ok, seen.size, blockers.slice(0, 50), { totalEmployees: employees.length });
}

/**
 * Attendance & leave — uses attendance preview; fails soft if upstream unavailable.
 */
async function evaluateAttendanceLeaveGate(ctx, { month, year }) {
  try {
    const data = await buildPayrollAttendancePreview(ctx, {
      month: Number(month),
      year: Number(year),
      storeId: undefined,
      departmentId: undefined,
      includeRoster: false
    });
    const blockers = [];
    const emps = data?.employees || [];
    for (const e of emps) {
      const open = e?.anomalies?.open_clock_in_records || 0;
      if (open > 0) {
        blockers.push({
          employee_code: e.employee_code,
          code: 'OPEN_CLOCK_IN',
          message: `${open} open clock-in record(s) — finalize attendance first`
        });
      }
      if (e?.flags?.no_attendance_rows_in_period) {
        blockers.push({
          employee_code: e.employee_code,
          code: 'NO_ATTENDANCE',
          message: 'No attendance rows in period'
        });
      }
    }
    const ok = blockers.length === 0;
    return gateEnvelope('attendance-leave', ok, blockers.length, blockers.slice(0, 50), { preview: true });
  } catch (err) {
    return gateEnvelope(
      'attendance-leave',
      false,
      1,
      [{ code: 'ATTENDANCE_GATE_ERROR', message: err.message || 'Attendance preview failed' }],
      { upstream: true }
    );
  }
}

/**
 * Salary validation — active salary rows vs employees.
 */
async function evaluatePayrollValidationGate(ctx, { month, year }) {
  const salaries = await Salary.find({ is_active: true }).lean();
  const employees = await EmployeeMaster.find({ is_current: { $ne: false } }).lean();
  const salaryIds = new Set(salaries.map((s) => String(s.employee_id)));
  const blockers = [];
  for (const e of employees) {
    if (!salaryIds.has(String(e.employee_code))) {
      blockers.push({
        employee_code: e.employee_code,
        code: 'NO_ACTIVE_SALARY',
        message: 'No active salary structure for employee'
      });
    }
  }
  const ok = blockers.length === 0;
  return gateEnvelope('payroll-validation', ok, blockers.length, blockers.slice(0, 50), {
    activeSalaryRows: salaries.length,
    employees: employees.length
  });
}

async function evaluateAllGates(ctx, { month, year }) {
  const g1 = await evaluateEmployeeMasterGate(ctx);
  const g2 = await evaluateAttendanceLeaveGate(ctx, { month, year });
  const g3 = await evaluatePayrollValidationGate(ctx, { month, year });
  const allOk = g1.ok && g2.ok && g3.ok;
  return {
    allOk,
    gates: [g1, g2, g3],
    evaluatedAt: new Date().toISOString()
  };
}

module.exports = {
  evaluateEmployeeMasterGate,
  evaluateAttendanceLeaveGate,
  evaluatePayrollValidationGate,
  evaluateAllGates,
  gateEnvelope
};
