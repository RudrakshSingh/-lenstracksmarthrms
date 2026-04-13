const logger = require('../config/logger');
const { getMyTaskSummary } = require('./jtsServiceClient');

function isSelfAttendanceRequest(req, queryEmployeeId) {
  if (!queryEmployeeId) return true;
  const self = (req.user?.employee_id || req.user?.employeeId || '').toUpperCase().trim();
  return self && queryEmployeeId.toUpperCase().trim() === self;
}

function buildJtsTasksPayload(jtsBody) {
  if (!jtsBody?.success || !jtsBody.data) return null;
  const d = jtsBody.data;
  return {
    total: typeof d.total === 'number' ? d.total : 0,
    pending: typeof d.inProgress === 'number' ? d.inProgress : 0,
    completed: typeof d.completed === 'number' ? d.completed : 0,
    linked: d.linked !== false
  };
}

/**
 * Adds jtsTasks for the current user when enrichment is enabled and request is self-scoped.
 */
async function attachJtsTasksToTodayPayload(req, queryEmployeeId, formattedAttendance) {
  if (process.env.ATTENDANCE_JTS_ENRICHMENT === 'false') {
    return formattedAttendance;
  }
  if (!isSelfAttendanceRequest(req, queryEmployeeId)) {
    return formattedAttendance;
  }
  const auth = req.headers.authorization;
  if (!auth) return formattedAttendance;
  const tenantId = req.user?.tenantId || req.get('X-Tenant-Id') || req.get('x-tenant-id');

  let jtsBody;
  try {
    jtsBody = await getMyTaskSummary({ authorization: auth, tenantId });
  } catch (e) {
    logger.warn('JTS today enrichment error', { error: e.message });
    return formattedAttendance;
  }

  const jtsTasks = buildJtsTasksPayload(jtsBody);
  if (!jtsTasks) return formattedAttendance;

  if (formattedAttendance && typeof formattedAttendance === 'object') {
    return { ...formattedAttendance, jtsTasks };
  }

  if (process.env.ATTENDANCE_JTS_ENRICH_WHEN_EMPTY !== 'false' && !formattedAttendance) {
    return { attendance: null, jtsTasks };
  }

  return formattedAttendance;
}

module.exports = { attachJtsTasksToTodayPayload, isSelfAttendanceRequest };
