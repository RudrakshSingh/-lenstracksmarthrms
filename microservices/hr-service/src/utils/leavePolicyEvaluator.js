/**
 * Tenant leave policy evaluation (pure helpers + async holiday overlap check).
 * Used by leaveManagement.service when creating leave requests.
 */

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function diffCalendarDaysInclusive(from, to) {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.floor((b - a) / (1000 * 60 * 60 * 24)) + 1;
}

function eachDateInclusive(from, to) {
  const out = [];
  let cur = startOfDay(from);
  const end = startOfDay(to);
  while (cur.getTime() <= end.getTime()) {
    out.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function isWeekendDay(date, weekendDefinition) {
  const dow = date.getDay(); // 0 Sun .. 6 Sat
  if (weekendDefinition === 'SUN') return dow === 0;
  if (weekendDefinition === 'SAT_SUN') return dow === 0 || dow === 6;
  return dow === 0 || dow === 6;
}

function defaultTenantCriteria() {
  return {
    working_day_calculation: 'CALENDAR_DAYS',
    weekend_definition: 'SAT_SUN',
    sandwich_rule: false,
    allow_leave_on_weekly_off: true,
    allow_leave_on_public_holiday: true,
    // If set (>0), employee is treated as "in probation" until DOJ + N calendar days unless confirmationDate exists.
    probation_days_from_doj: 0,
    probation_block_all_leave: false,
    probation_allowed_leave_types: []
  };
}

function mergeTenantCriteria(policyDoc) {
  const base = defaultTenantCriteria();
  const incoming = policyDoc && policyDoc.tenant_criteria && typeof policyDoc.tenant_criteria === 'object'
    ? policyDoc.tenant_criteria
    : {};
  return { ...base, ...incoming };
}

function mergeLeaveTypeRules(leaveTypeConfig) {
  const sr = (leaveTypeConfig && leaveTypeConfig.special_rules) || {};
  const defaults = {
    half_day_allowed: true,
    min_notice_days: 0,
    max_continuous_days: null,
    active: true
  };
  return {
    ...defaults,
    ...sr,
    // explicit top-level flags win if present
    half_day_allowed: leaveTypeConfig.half_day_allowed != null ? !!leaveTypeConfig.half_day_allowed : defaults.half_day_allowed,
    min_notice_days: leaveTypeConfig.min_notice_days != null ? Number(leaveTypeConfig.min_notice_days) : Number(sr.min_notice_days || 0),
    max_continuous_days:
      leaveTypeConfig.max_continuous_days != null
        ? leaveTypeConfig.max_continuous_days
        : sr.maxContinuous != null
          ? sr.maxContinuous
          : defaults.max_continuous_days
  };
}

function isProbation(employee, tenantCriteria) {
  const confirm = employee.confirmationDate ? new Date(employee.confirmationDate) : null;
  if (confirm) return new Date() < confirm;
  const n = Number(tenantCriteria.probation_days_from_doj || 0);
  if (!n || n <= 0) return false;
  const doj = employee.doj || employee.joining_date;
  if (!doj) return false;
  const end = startOfDay(doj);
  end.setDate(end.getDate() + n);
  return startOfDay(new Date()).getTime() < end.getTime();
}

async function assertNoOverlappingLeave({
  LeaveRequestModel,
  tenantId,
  employeeObjectId,
  fromDate,
  toDate,
  excludeRequestId
}) {
  const from = startOfDay(fromDate);
  const to = startOfDay(toDate);
  const q = {
    tenantId,
    employee_id: employeeObjectId,
    status: { $in: ['PENDING', 'APPROVED'] },
    $or: [{ from_date: { $lte: to }, to_date: { $gte: from } }]
  };
  if (excludeRequestId) q._id = { $ne: excludeRequestId };
  const qy = LeaveRequestModel.findOne(q);
  async function execFindOneQuery(query) {
    if (query && typeof query.then === 'function') {
      return query;
    }
    if (query && typeof query.lean === 'function') {
      return query.lean();
    }
    if (query && typeof query.exec === 'function') {
      return query.exec();
    }
    return query;
  }

  let clash = null;
  if (qy && typeof qy.select === 'function') {
    const chained = qy.select('_id request_id status from_date to_date');
    clash = await execFindOneQuery(chained);
  } else {
    clash = await execFindOneQuery(qy);
  }
  if (clash) {
    const err = new Error(`Overlapping leave exists (${clash.status}) for this period`);
    err.statusCode = 400;
    err.code = 'LEAVE_OVERLAP';
    throw err;
  }
}

/**
 * @param {object} params
 * @param {object} params.employee mongoose doc
 * @param {object} params.request { leave_type, from_date, to_date, half_day, half_day_type, attachments }
 * @param {object} params.policy mongoose doc OR plain object with leave_types + tenant_criteria
 * @param {string} params.tenantId
 * @param {typeof import('../models/Holiday.model')} params.HolidayModel
 * @param {typeof import('../models/LeaveRequest.model')} params.LeaveRequestModel
 */
async function evaluateLeaveRequestForCreate(params) {
  const { employee, request, policy, tenantId, HolidayModel, LeaveRequestModel } = params;
  const leaveType = String(request.leave_type || '').toUpperCase();
  const from = new Date(request.from_date);
  const to = new Date(request.to_date);
  const halfDay = !!request.half_day;
  const halfDayType = request.half_day_type || null;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    const err = new Error('Invalid from_date/to_date');
    err.statusCode = 400;
    err.code = 'INVALID_DATES';
    throw err;
  }
  if (from.getTime() > to.getTime()) {
    const err = new Error('from_date cannot be after to_date');
    err.statusCode = 400;
    err.code = 'INVALID_RANGE';
    throw err;
  }

  const tenantCriteria = mergeTenantCriteria(policy);
  const leaveTypes = policy.leave_types || [];
  const lt = leaveTypes.find((x) => x.leave_type === leaveType);
  if (!lt) {
    const err = new Error(`Leave type ${leaveType} is not configured for this tenant`);
    err.statusCode = 400;
    err.code = 'LEAVE_TYPE_DISABLED';
    throw err;
  }

  const rules = mergeLeaveTypeRules(lt);
  if (rules.active === false) {
    const err = new Error(`Leave type ${leaveType} is disabled by policy`);
    err.statusCode = 400;
    err.code = 'LEAVE_TYPE_INACTIVE';
    throw err;
  }

  if (halfDay) {
    if (!rules.half_day_allowed) {
      const err = new Error('Half-day leave is not allowed for this leave type');
      err.statusCode = 400;
      err.code = 'HALF_DAY_NOT_ALLOWED';
      throw err;
    }
    if (startOfDay(from).getTime() !== startOfDay(to).getTime()) {
      const err = new Error('Half-day leave must be on a single calendar date');
      err.statusCode = 400;
      err.code = 'HALF_DAY_RANGE';
      throw err;
    }
    if (!halfDayType || !['FIRST_HALF', 'SECOND_HALF'].includes(String(halfDayType))) {
      const err = new Error('half_day_type is required for half-day leave (FIRST_HALF or SECOND_HALF)');
      err.statusCode = 400;
      err.code = 'HALF_DAY_TYPE_REQUIRED';
      throw err;
    }
  }

  // Probation rules (best-effort; confirmationDate drives if present)
  if (tenantCriteria.probation_block_all_leave && isProbation(employee, tenantCriteria)) {
    const err = new Error('Leave not allowed during probation for this tenant');
    err.statusCode = 400;
    err.code = 'PROBATION_BLOCKED';
    throw err;
  }
  if (
    Array.isArray(tenantCriteria.probation_allowed_leave_types) &&
    tenantCriteria.probation_allowed_leave_types.length > 0 &&
    isProbation(employee, tenantCriteria) &&
    !tenantCriteria.probation_allowed_leave_types.map(String).includes(leaveType)
  ) {
    const err = new Error(`Only ${tenantCriteria.probation_allowed_leave_types.join(', ')} is allowed during probation`);
    err.statusCode = 400;
    err.code = 'PROBATION_LEAVE_TYPE';
    throw err;
  }

  // Notice period
  const noticeDays = Number(rules.min_notice_days || 0);
  if (noticeDays > 0) {
    const today = startOfDay(new Date());
    const start = startOfDay(from);
    const daysUntil = Math.floor((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil < noticeDays) {
      const err = new Error(`Minimum notice period is ${noticeDays} day(s)`);
      err.statusCode = 400;
      err.code = 'MIN_NOTICE';
      throw err;
    }
  }

  // Overlap
  await assertNoOverlappingLeave({
    LeaveRequestModel,
    tenantId,
    employeeObjectId: employee._id,
    fromDate: from,
    toDate: to
  });

  // Holidays in range
  const holidayDates = await HolidayModel.find({
    tenantId,
    isActive: true,
    date: { $gte: startOfDay(from), $lte: startOfDay(to) }
  })
    .select('date')
    .lean();

  const holidayDaySet = new Set(holidayDates.map((h) => startOfDay(h.date).getTime()));

  // Weekly off / holiday leave allowance
  for (const d of eachDateInclusive(from, to)) {
    const isHol = holidayDaySet.has(startOfDay(d).getTime());
    const isWo = isWeekendDay(d, tenantCriteria.weekend_definition);
    if (isHol && tenantCriteria.allow_leave_on_public_holiday === false) {
      const err = new Error('Leave on public holiday is not allowed by tenant policy');
      err.statusCode = 400;
      err.code = 'HOLIDAY_LEAVE_NOT_ALLOWED';
      throw err;
    }
    if (!isHol && isWo && tenantCriteria.allow_leave_on_weekly_off === false) {
      const err = new Error('Leave on weekly off is not allowed by tenant policy');
      err.statusCode = 400;
      err.code = 'WEEKLYOFF_LEAVE_NOT_ALLOWED';
      throw err;
    }
  }

  // Compute requested days according to tenant working-day mode
  let days = 0;
  if (halfDay) {
    days = 0.5;
  } else if (tenantCriteria.working_day_calculation === 'WORKING_DAYS_EX_WEEKENDS_AND_HOLIDAYS') {
    for (const d of eachDateInclusive(from, to)) {
      const isHol = holidayDaySet.has(startOfDay(d).getTime());
      const isWo = isWeekendDay(d, tenantCriteria.weekend_definition);
      if (!isHol && !isWo) days += 1;
    }
    if (days <= 0) {
      const err = new Error('No working days in selected date range');
      err.statusCode = 400;
      err.code = 'NO_WORKING_DAYS';
      throw err;
    }
  } else {
    days = diffCalendarDaysInclusive(from, to);
  }

  // Sandwich rule (simple): if enabled, disallow leave ranges that contain only weekly-offs/holidays between working days
  // For v1 we only enforce "cannot book pure weekend/holiday gap inside range unless allowed flags permit those days".
  // More advanced sandwich counting can be layered later.

  // Max continuous (calendar span)
  if (rules.max_continuous_days != null && Number(rules.max_continuous_days) > 0) {
    const span = diffCalendarDaysInclusive(from, to);
    if (span > Number(rules.max_continuous_days)) {
      const err = new Error(`Maximum continuous leave allowed is ${rules.max_continuous_days} calendar day(s)`);
      err.statusCode = 400;
      err.code = 'MAX_CONTINUOUS';
      throw err;
    }
  }

  // Medical certificate requirement (based on computed days)
  const medicalRequired =
    !!lt.medical_certificate_required && days > Number(lt.medical_certificate_after_days || 0);
  if (medicalRequired) {
    const atts = Array.isArray(request.attachments) ? request.attachments : [];
    const hasMedical = atts.some((a) => a && String(a.file_type || '').toUpperCase() === 'MEDICAL_CERTIFICATE');
    if (!hasMedical) {
      const err = new Error('Medical certificate attachment is required for this leave duration');
      err.statusCode = 400;
      err.code = 'MEDICAL_CERT_REQUIRED';
      throw err;
    }
  }

  return {
    days,
    medicalCertificateRequired: medicalRequired,
    tenantCriteria,
    leaveTypeRules: rules
  };
}

module.exports = {
  evaluateLeaveRequestForCreate,
  mergeTenantCriteria,
  mergeLeaveTypeRules,
  defaultTenantCriteria
};
