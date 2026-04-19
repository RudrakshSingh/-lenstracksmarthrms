const selfTaskService = require('../services/selfTask.service');
const taskService = require('../services/task.service');
const logger = require('../config/logger');
const { actorUnresolvedBody } = require('../utils/apiError.util');
const { toErrorPayload } = require('../utils/errorResponse');
const { resolveEmployeeId } = require('../utils/actor.util');
const { normalizeSelfTaskBody } = require('../utils/taskRequest.normalize');
const { serializeTask } = require('../utils/taskFrontend.mapper');

class SelfTaskController {
  /**
   * Create self-task
   * POST /api/v1/tasks/self
   */
  async createSelfTask(req, res) {
    try {
      const { tenant_id } = req.user;

      const employeeId = await resolveEmployeeId(tenant_id, req.user);
      if (!employeeId) {
        return res.status(403).json(actorUnresolvedBody());
      }

      const body = normalizeSelfTaskBody(req.body);
      const task = await selfTaskService.createSelfTask(tenant_id, employeeId, body);
      const full = await taskService.getTaskById(tenant_id, task._id);

      res.status(201).json({
        success: true,
        data: serializeTask(full),
        message: full?.requires_approval
          ? 'Self task created successfully, pending approval'
          : 'Self-task created successfully'
      });
    } catch (error) {
      logger.error('Create self-task error', { error: error.message });
      const mapped = toErrorPayload(error, 'SELF_TASK_CREATE_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }
}

module.exports = new SelfTaskController();

