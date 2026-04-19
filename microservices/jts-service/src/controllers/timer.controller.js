const timerService = require('../services/timer.service');
const logger = require('../config/logger');
const { toErrorPayload } = require('../utils/errorResponse');
const { resolveEmployeeId } = require('../utils/actor.util');
const { serializeTimer, serializeTimerSession, serializeTimerBundle } = require('../utils/taskFrontend.mapper');
const { buildErrorBody, actorUnresolvedBody } = require('../utils/apiError.util');

class TimerController {
  /**
   * Start timer
   * POST /api/v1/tasks/:id/timer/start
   */
  async startTimer(req, res) {
    try {
      const { tenant_id } = req.user;
      const { id: taskId } = req.params;

      const employeeId = await resolveEmployeeId(tenant_id, req.user);
      if (!employeeId) {
        return res.status(403).json(actorUnresolvedBody());
      }

      const started = await timerService.startTimer(tenant_id, employeeId, taskId, {
        authorization: req.headers.authorization,
        tenantHeader: req.user.tenant_id
      });

      res.json({
        success: true,
        data: serializeTimer(started.timer),
        attendance: started.attendance,
        message: started.attendance?.auto_clocked_in
          ? 'Timer started successfully (attendance auto clock-in applied)'
          : 'Timer started successfully'
      });
    } catch (error) {
      logger.error('Start timer error', { error: error.message });
      const mapped = toErrorPayload(error, 'TIMER_START_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  /**
   * Stop timer
   * POST /api/v1/tasks/:id/timer/stop
   */
  async stopTimer(req, res) {
    try {
      const { tenant_id } = req.user;
      const { id: taskId } = req.params;

      const employeeId = await resolveEmployeeId(tenant_id, req.user);
      if (!employeeId) {
        return res.status(403).json(actorUnresolvedBody());
      }

      const timer = await timerService.stopTimer(tenant_id, employeeId, taskId);

      res.json({
        success: true,
        data: serializeTimer(timer),
        message: 'Timer stopped successfully'
      });
    } catch (error) {
      logger.error('Stop timer error', { error: error.message });
      const mapped = toErrorPayload(error, 'TIMER_STOP_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  /**
   * Get active timers
   * GET /api/v1/timers/active
   */
  async pauseTimer(req, res) {
    try {
      const { tenant_id } = req.user;
      const { id: taskId } = req.params;

      const employeeId = await resolveEmployeeId(tenant_id, req.user);
      if (!employeeId) {
        return res.status(403).json(actorUnresolvedBody());
      }

      const timer = await timerService.stopTimer(tenant_id, employeeId, taskId, { stopReason: 'PAUSE' });

      res.json({
        success: true,
        data: serializeTimer(timer),
        message: 'Timer paused successfully'
      });
    } catch (error) {
      logger.error('Pause timer error', { error: error.message });
      const mapped = toErrorPayload(error, 'TIMER_PAUSE_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async getTaskTimer(req, res) {
    try {
      const { tenant_id } = req.user;
      const { id: taskId } = req.params;

      const employeeId = await resolveEmployeeId(tenant_id, req.user);
      if (!employeeId) {
        return res.status(403).json(actorUnresolvedBody());
      }

      const bundle = await timerService.getTimerBundleForTask(tenant_id, employeeId, taskId);
      if (bundle === null) {
        return res.status(404).json(buildErrorBody({ code: 'TASK_001_NOT_FOUND' }));
      }

      const data = serializeTimerBundle(bundle);
      res.json({
        success: true,
        data,
        message: data.activeTimer ? 'Timer retrieved successfully' : 'No active timer for this task'
      });
    } catch (error) {
      logger.error('Get task timer error', { error: error.message });
      const mapped = toErrorPayload(error, 'TIMER_FETCH_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async getTaskTimerSessions(req, res) {
    try {
      const { tenant_id } = req.user;
      const { id: taskId } = req.params;
      const limit = req.query.limit;

      const rows = await timerService.listTimerSessionsForTask(tenant_id, taskId, { limit });
      if (rows === null) {
        return res.status(404).json(buildErrorBody({ code: 'TASK_001_NOT_FOUND' }));
      }

      res.json({
        success: true,
        data: rows.map((r) => serializeTimerSession(r)),
        message: 'Timer sessions retrieved successfully'
      });
    } catch (error) {
      logger.error('Get task timer sessions error', { error: error.message });
      const mapped = toErrorPayload(error, 'TIMER_FETCH_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async getActiveTimers(req, res) {
    try {
      const { tenant_id } = req.user;

      const employeeId = await resolveEmployeeId(tenant_id, req.user);
      if (!employeeId) {
        return res.status(403).json(actorUnresolvedBody());
      }

      const timers = await timerService.getActiveTimers(tenant_id, employeeId);

      res.json({
        success: true,
        data: (timers || []).map((t) => serializeTimer(t)),
        message: 'Active timers retrieved successfully'
      });
    } catch (error) {
      logger.error('Get active timers error', { error: error.message });
      const mapped = toErrorPayload(error, 'TIMER_FETCH_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }
}

module.exports = new TimerController();

