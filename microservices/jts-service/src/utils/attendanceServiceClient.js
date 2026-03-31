const axios = require('axios');
const logger = require('../config/logger');

/**
 * Returns true if attendance-service reports employee is clocked in today.
 * Uses the same JWT as the user so req.user.employee_id resolves in attendance.
 */
async function isClockedInViaAttendanceService(authorization, tenantIdHeader) {
  const base = process.env.ATTENDANCE_SERVICE_URL || process.env.JTS_ATTENDANCE_SERVICE_URL;
  if (!base || process.env.JTS_ATTENDANCE_CHECK === 'false') {
    return null;
  }

  const url = `${base.replace(/\/$/, '')}/api/attendance/today`;
  const headers = {
    Authorization: authorization,
    'Content-Type': 'application/json'
  };
  if (tenantIdHeader) {
    headers['x-tenant-id'] = tenantIdHeader;
    headers['X-Tenant-Id'] = tenantIdHeader;
  }

  try {
    const { data } = await axios.get(url, { headers, timeout: 10000 });
    if (!data || !data.success) {
      return false;
    }
    const payload = data.data;
    if (!payload) {
      return false;
    }
    if (typeof payload.isClockedIn === 'boolean') {
      return payload.isClockedIn;
    }
    const ci = payload.checkIn || payload.check_in_time || payload.clockInTime;
    const co = payload.checkOut || payload.check_out_time || payload.clockOutTime;
    return !!ci && !co;
  } catch (error) {
    logger.warn('JTS: attendance-service /today call failed', { error: error.message });
    return null;
  }
}

module.exports = { isClockedInViaAttendanceService };
