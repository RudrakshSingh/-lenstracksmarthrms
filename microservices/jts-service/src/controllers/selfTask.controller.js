const selfTaskService = require('../services/selfTask.service');
const logger = require('../config/logger');

class SelfTaskController {
  /**
   * Create self-task
   * POST /api/v1/tasks/self
   */
  async createSelfTask(req, res) {
    try {
      const { tenant_id, id: employeeId } = req.user;

      const task = await selfTaskService.createSelfTask(tenant_id, employeeId, req.body);

      res.status(201).json({
        success: true,
        data: task,
        message: 'Self-task created successfully'
      });
    } catch (error) {
      logger.error('Create self-task error', { error: error.message });
      res.status(400).json({
        success: false,
        error: error.message,
        code: error.message
      });
    }
  }
}

module.exports = new SelfTaskController();

