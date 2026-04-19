/**
 * Derive per-calendar-day attendance classification from raw attendance rows
 * (same shape as attendance-service formatAttendance: status, date, employeeId).
 *
 * eligible_pay_days is used for pro-rata gross: sum of day weights where
 * paid leave and present count as 1, half_day as 0.5, absent/unknown as 0.
 */

const PRESENT_LIKE = new Set([
  'present',
  'late',
  'wfh',
  'work_from_home',
  'checked_in',
  'complete',
  'completed',
  'approved'
]);

const LEAVE_PAID = new Set([
  'leave',
  'paid_leave',
  'pl',
  'cl',
  'sl',
  'sick_leave',
  'on_leave',
  'approved_leave'
]);

const UNPAID_LEAVE = new Set(['lwp', 'leave_without_pay', 'unpaid_leave', 'absent_leave']);

const HALF = new Set(['half_day', 'halfday', 'half-day', 'half']);

const ABSENT_LIKE = new Set(['absent', 'absence', 'lop', 'no_show', 'missing']);

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
}

/**
 * Given all status strings recorded for one employee on one calendar day,
 * pick classification and pay weight for that day.
 */
function classifyDay(statuses) {
  const n = [...new Set((statuses || []).map(norm))].filter(Boolean);
  if (n.length === 0) {
    return { bucket: 'unknown', eligible_weight: 0 };
  }

  if (n.some((s) => UNPAID_LEAVE.has(s))) {
    return { bucket: 'unpaid_leave', eligible_weight: 0 };
  }
  if (n.some((s) => LEAVE_PAID.has(s))) {
    return { bucket: 'paid_leave', eligible_weight: 1 };
  }
  if (n.some((s) => PRESENT_LIKE.has(s))) {
    return { bucket: 'present', eligible_weight: 1 };
  }
  if (n.some((s) => HALF.has(s)) && !n.some((s) => ABSENT_LIKE.has(s))) {
    return { bucket: 'half_day', eligible_weight: 0.5 };
  }
  if (n.some((s) => HALF.has(s))) {
    return { bucket: 'half_day', eligible_weight: 0.5 };
  }
  if (n.some((s) => ABSENT_LIKE.has(s))) {
    return { bucket: 'absent', eligible_weight: 0 };
  }
  return { bucket: 'other', eligible_weight: 0 };
}

/**
 * @param {Array<Object>} rows - formatted attendance rows
 * @param {number} daysInMonth - calendar length of month
 * @returns {Map<string, Object>} employee_code -> summary
 */
function summarizePayrollDaysByEmployee(rows, daysInMonth) {
  /** emp -> date -> statuses[] */
  const nested = new Map();

  for (const r of rows || []) {
    const code = String(r.employeeId || '').toUpperCase().trim();
    if (!code) continue;
    const d = r.date ? String(r.date).slice(0, 10) : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    if (!nested.has(code)) nested.set(code, new Map());
    const byDate = nested.get(code);
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d).push(r.status);
  }

  const out = new Map();

  for (const [employee_code, byDate] of nested.entries()) {
    let present_days = 0;
    let paid_leave_days = 0;
    let unpaid_leave_days = 0;
    let half_days = 0;
    let absent_days = 0;
    let other_days = 0;
    let unknown_days = 0;
    let eligible_pay_days = 0;

    for (const [, statuses] of byDate.entries()) {
      const { bucket, eligible_weight } = classifyDay(statuses);
      eligible_pay_days += eligible_weight;
      if (bucket === 'present') present_days += 1;
      else if (bucket === 'paid_leave') paid_leave_days += 1;
      else if (bucket === 'unpaid_leave') unpaid_leave_days += 1;
      else if (bucket === 'half_day') half_days += 1;
      else if (bucket === 'absent') absent_days += 1;
      else if (bucket === 'other') other_days += 1;
      else unknown_days += 1;
    }

    const distinct_days_with_mark = byDate.size;
    const unmarked_calendar_days = Math.max(0, daysInMonth - distinct_days_with_mark);

    out.set(employee_code, {
      employee_code,
      days_in_calendar_month: daysInMonth,
      distinct_days_with_mark,
      unmarked_calendar_days,
      present_days,
      paid_leave_days,
      unpaid_leave_days,
      half_days,
      absent_days,
      other_days,
      unknown_days,
      eligible_pay_days
    });
  }

  return out;
}

module.exports = {
  summarizePayrollDaysByEmployee,
  classifyDay
};
