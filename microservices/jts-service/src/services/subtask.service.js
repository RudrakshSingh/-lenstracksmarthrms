const Subtask = require('../models/Subtask.model');
const Task = require('../models/Task.model');
const taskActivityService = require('./taskActivity.service');

class SubtaskService {
  async ensureTask(tenantId, taskId) {
    const task = await Task.findOne({ _id: taskId, tenant_id: tenantId, is_deleted: { $ne: true } });
    if (!task) throw new Error('TASK_001_NOT_FOUND');
    return task;
  }

  async list(tenantId, taskId) {
    await this.ensureTask(tenantId, taskId);
    return Subtask.find({ tenant_id: tenantId, task_id: taskId, is_deleted: { $ne: true } }).sort({
      created_at: -1
    });
  }

  async create(tenantId, taskId, actorId, body) {
    await this.ensureTask(tenantId, taskId);
    const row = await Subtask.create({
      tenant_id: tenantId,
      task_id: taskId,
      title: body.title,
      description: body.description || null,
      assigned_to_employee_id: body.assigned_to_employee_id || null,
      due_at: body.due_at ? new Date(body.due_at) : null,
      created_by_employee_id: actorId
    });

    await Task.updateOne({ _id: taskId, tenant_id: tenantId }, { $addToSet: { child_task_ids: row._id } });
    await taskActivityService.record(tenantId, taskId, actorId, 'STATUS_CHANGED', {
      subtask_id: String(row._id),
      event: 'SUBTASK_CREATED'
    });
    return row;
  }

  async updateStatus(tenantId, taskId, subtaskId, actorId, status) {
    await this.ensureTask(tenantId, taskId);
    const row = await Subtask.findOne({
      _id: subtaskId,
      tenant_id: tenantId,
      task_id: taskId,
      is_deleted: { $ne: true }
    });
    if (!row) throw new Error('TASK_001_NOT_FOUND');
    row.status = status;
    if (status === 'DONE') row.completed_at = new Date();
    await row.save();
    await taskActivityService.record(tenantId, taskId, actorId, 'STATUS_CHANGED', {
      subtask_id: String(row._id),
      subtask_status: status
    });
    return row;
  }
}

module.exports = new SubtaskService();

