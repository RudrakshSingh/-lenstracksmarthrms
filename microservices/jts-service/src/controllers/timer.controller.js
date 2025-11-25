const timerService = require('../services/timer.service');
const logger = require('../config/logger');

class TimerController {
  /**
   * Start timer
   * POST /api/v1/tasks/:id/timer/start
   */
  async startTimer(req, res) {
    try {
      const { tenant_id, id: employeeId } = req.user;
      const { id: taskId } = req.params;

      const timer = await timerService.startTimer(tenant_id, employeeId, taskId);

      res.json({
        success: true,
        data: timer,
        message: 'Timer started successfully'
      });
    } catch (error) {
      logger.error('Start timer error', { error: error.message });
      res.status(400).json({
        success: false,
        error: error.message,
        code: error.message
      });
    }
  }

  /**
   * Stop timer
   * POST /api/v1/tasks/:id/timer/stop
   */
  async stopTimer(req, res) {
    try {
      const { tenant_id, id: employeeId } = req.user;
      const { id: taskId } = req.params;

      const timer = await timerService.stopTimer(tenant_id, employeeId, taskId);

      res.json({
        success: true,
        data: timer,
        message: 'Timer stopped successfully'
      });
    } catch (error) {
      logger.error('Stop timer error', { error: error.message });
      res.status(400).json({
        success: false,
        error: error.message,
        code: error.message
      });
    }
  }

  /**
   * Get active timers
   * GET /api/v1/timers/active
   */
  async getActiveTimers(req, res) {
    try {
      const { tenant_id, id: employeeId } = req.user;

      const timers = await timerService.getActiveTimers(tenant_id, employeeId);

      res.json({
        success: true,
        data: timers,
        message: 'Active timers retrieved successfully'
      });
    } catch (error) {
      logger.error('Get active timers error', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'TIMER_FETCH_ERROR'
      });
    }
  }
}

module.exports = new TimerController();

