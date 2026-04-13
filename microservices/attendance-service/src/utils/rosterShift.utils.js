/**
 * Roster shift parsing for auto clock-out, minimum present hours, and validation.
 * Uses the same local-date semantics as clock-in (server local midnight anchor).
 */

const MS_PER_HOUR = 60 * 60 * 1000;

const DEFAULT_FALLBACK_SHIFT_HOURS = (() => {
  const n = parseFloat(process.env.DEFAULT_SHIFT_HOURS_WHEN_NO_ROSTER || '10', 10);
  return Number.isFinite(n) && n > 0 ? n : 10;
})();

function parseHm(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.trim().split(':').map((p) => parseInt(p, 10));
  if (parts.length < 2 || parts.some((x) => Number.isNaN(x))) return null;
  return { h: parts[0], m: parts[1] || 0, s: parts[2] || 0 };
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Roster window for a calendar anchor day (start of local day).
 * Handles overnight shifts (end time on or before start time → end +1 day).
 */
function getRosterShiftWindow(anchorDate, shiftStartStr, shiftEndStr) {
  const s = parseHm(shiftStartStr);
  const e = parseHm(shiftEndStr);
  if (!s || !e) return null;

  const day = startOfDay(anchorDate);
  const shiftStartAt = new Date(day);
  shiftStartAt.setHours(s.h, s.m, s.s || 0, 0);
  const shiftEndAt = new Date(day);
  shiftEndAt.setHours(e.h, e.m, e.s || 0, 0);
  if (shiftEndAt.getTime() <= shiftStartAt.getTime()) {
    shiftEndAt.setDate(shiftEndAt.getDate() + 1);
  }

  const durationMs = shiftEndAt.getTime() - shiftStartAt.getTime();
  return {
    shiftStartAt,
    shiftEndAt,
    durationMs,
    durationHours: Math.round((durationMs / MS_PER_HOUR) * 100) / 100
  };
}

function computeShiftMetadata(anchorDate, shiftStartStr, shiftEndStr) {
  const win = getRosterShiftWindow(anchorDate, shiftStartStr, shiftEndStr);
  if (!win) return null;
  return {
    required_shift_hours: win.durationHours,
    expected_shift_end_at: win.shiftEndAt
  };
}

/**
 * Minimum hours required for "present" on manual clock-out / daily validation.
 */
function getMinimumHoursForPresent(attendanceLike) {
  if (!attendanceLike) return DEFAULT_FALLBACK_SHIFT_HOURS;
  const stored = attendanceLike.required_shift_hours;
  if (stored != null && Number.isFinite(stored) && stored > 0) {
    return stored;
  }
  const anchor =
    attendanceLike.check_in_time != null
      ? new Date(attendanceLike.check_in_time)
      : attendanceLike.date != null
        ? new Date(attendanceLike.date)
        : new Date();
  if (attendanceLike.shiftStart && attendanceLike.shiftEnd) {
    const win = getRosterShiftWindow(anchor, attendanceLike.shiftStart, attendanceLike.shiftEnd);
    if (win) return win.durationHours;
  }
  return DEFAULT_FALLBACK_SHIFT_HOURS;
}

/**
 * When to auto clock-out (wall-clock roster end, or check-in + fallback duration).
 */
function resolveAutoClockOutCutoff(session) {
  const checkInTime = new Date(session.check_in_time);
  const anchor = startOfDay(checkInTime);

  if (session.expected_shift_end_at) {
    const endAt = new Date(session.expected_shift_end_at);
    const minH = getMinimumHoursForPresent(session);
    return { cutoffAt: endAt, minHoursForPresent: minH, source: 'stored_end' };
  }

  if (session.shiftStart && session.shiftEnd) {
    const win = getRosterShiftWindow(anchor, session.shiftStart, session.shiftEnd);
    if (win) {
      return {
        cutoffAt: win.shiftEndAt,
        minHoursForPresent: win.durationHours,
        source: 'roster'
      };
    }
  }

  const fallbackMs = DEFAULT_FALLBACK_SHIFT_HOURS * MS_PER_HOUR;
  return {
    cutoffAt: new Date(checkInTime.getTime() + fallbackMs),
    minHoursForPresent: DEFAULT_FALLBACK_SHIFT_HOURS,
    source: 'fallback_duration'
  };
}

/**
 * Open session: should we auto clock-out now, and at what time?
 */
function resolveOpenSessionAutoClockOut(session, now = new Date()) {
  const checkInTime = new Date(session.check_in_time);
  const { cutoffAt, minHoursForPresent, source } = resolveAutoClockOutCutoff(session);

  if (now.getTime() < cutoffAt.getTime()) {
    return {
      shouldClockOut: false,
      cutoffAt,
      minHoursForPresent,
      source
    };
  }

  const totalHours =
    Math.round(((cutoffAt.getTime() - checkInTime.getTime()) / MS_PER_HOUR) * 100) / 100;

  return {
    shouldClockOut: true,
    checkOutAt: cutoffAt,
    totalHours,
    minHoursForPresent,
    source
  };
}

/**
 * Remaining ms until auto cutoff (for hourly warning logs).
 */
function getRemainingMsUntilCutoff(session, now = new Date()) {
  const { cutoffAt } = resolveAutoClockOutCutoff(session);
  return cutoffAt.getTime() - now.getTime();
}

module.exports = {
  DEFAULT_FALLBACK_SHIFT_HOURS,
  getRosterShiftWindow,
  computeShiftMetadata,
  getMinimumHoursForPresent,
  resolveAutoClockOutCutoff,
  resolveOpenSessionAutoClockOut,
  getRemainingMsUntilCutoff
};
