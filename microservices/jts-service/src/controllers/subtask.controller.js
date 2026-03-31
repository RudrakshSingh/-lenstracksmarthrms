const subtaskService = require('../services/subtask.service');
const { toErrorPayload } = require('../utils/errorResponse');
const { resolveEmployeeId } = require('../utils/actor.util');
const { resolveEmployeeIdToObjectId } = require('../utils/employeeRefResolve.util');
const logger = require('../config/logger');

class SubtaskController {
  async list(req, res) {
    try {
      const { tenant_id } = req.user;
      const rows = await subtaskService.list(tenant_id, req.params.id);
      res.json({ success: true, data: rows, message: 'Subtasks retrieved' });
    } catch (error) {
      logger.error('Subtask list error', { error: error.message });
      const mapped = toErrorPayload(error, 'TASK_FETCH_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async create(req, res) {
    try {
      const { tenant_id } = req.user;
      const actorId = await resolveEmployeeId(tenant_id, req.user);
      if (!actorId) throw new Error('JTS_ACTOR_EMPLOYEE_NOT_RESOLVED');
      const body = { ...req.body };
      if (body.assigned_to_employee_id != null && body.assigned_to_employee_id !== '') {
        body.assigned_to_employee_id = await resolveEmployeeIdToObjectId(
          tenant_id,
          body.assigned_to_employee_id,
          { actorId }
        );
      }
      const row = await subtaskService.create(tenant_id, req.params.id, actorId, body);
      res.status(201).json({ success: true, data: row, message: 'Subtask created' });
    } catch (error) {
      logger.error('Subtask create error', { error: error.message });
      const mapped = toErrorPayload(error, 'TASK_UPDATE_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async updateStatus(req, res) {
    try {
      const { tenant_id } = req.user;
      const actorId = await resolveEmployeeId(tenant_id, req.user);
      if (!actorId) throw new Error('JTS_ACTOR_EMPLOYEE_NOT_RESOLVED');
      const row = await subtaskService.updateStatus(
        tenant_id,
        req.params.id,
        req.params.subtaskId,
        actorId,
        req.body.status
      );
      res.json({ success: true, data: row, message: 'Subtask updated' });
    } catch (error) {
      logger.error('Subtask update error', { error: error.message });
      const mapped = toErrorPayload(error, 'TASK_UPDATE_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }
}

module.exports = new SubtaskController();

