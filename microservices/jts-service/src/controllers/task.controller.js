const taskService = require('../services/task.service');
const taskStatusService = require('../services/taskStatus.service');
const logger = require('../config/logger');

class TaskController {
  /**
   * Create manager task
   * POST /api/v1/tasks
   */
  async createTask(req, res) {
    try {
      const { tenant_id } = req.user;
      const actorId = req.user.id;

      const task = await taskService.createManagerTask(tenant_id, actorId, req.body);

      res.status(201).json({
        success: true,
        data: task,
        message: 'Task created successfully'
      });
    } catch (error) {
      logger.error('Create task error', { error: error.message, stack: error.stack });
      res.status(400).json({
        success: false,
        error: error.message,
        code: error.message
      });
    }
  }

  /**
   * Get tasks with filters
   * GET /api/v1/tasks
   */
  async getTasks(req, res) {
    try {
      const { tenant_id } = req.user;
      const filters = req.query;

      const result = await taskService.getTasks(tenant_id, filters);

      res.json({
        success: true,
        data: result.tasks,
        pagination: result.pagination,
        message: 'Tasks retrieved successfully'
      });
    } catch (error) {
      logger.error('Get tasks error', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'TASK_FETCH_ERROR'
      });
    }
  }

  /**
   * Get task by ID
   * GET /api/v1/tasks/:id
   */
  async getTaskById(req, res) {
    try {
      const { tenant_id } = req.user;
      const { id } = req.params;

      const task = await taskService.getTaskById(tenant_id, id);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found',
          code: 'TASK_001_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: task,
        message: 'Task retrieved successfully'
      });
    } catch (error) {
      logger.error('Get task by ID error', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
        code: 'TASK_FETCH_ERROR'
      });
    }
  }

  /**
   * Change task status
   * PATCH /api/v1/tasks/:id/status
   */
  async changeStatus(req, res) {
    try {
      const { tenant_id, id: actorId } = req.user;
      const { id } = req.params;
      const { status, reason } = req.body;

      const task = await taskStatusService.changeStatus(tenant_id, id, status, {
        actorId,
        reason
      });

      res.json({
        success: true,
        data: task,
        message: 'Task status updated successfully'
      });
    } catch (error) {
      logger.error('Change task status error', { error: error.message });
      res.status(400).json({
        success: false,
        error: error.message,
        code: error.message
      });
    }
  }
}

module.exports = new TaskController();

