const TaskActivity = require('../models/TaskActivity.model');
const Task = require('../models/Task.model');
const notificationService = require('./notification.service');
const logger = require('../config/logger');

function actionForTransition(fromStatus, toStatus) {
  if (toStatus === 'PENDING_REVIEW' && (fromStatus === 'IN_PROGRESS' || fromStatus === 'ON_HOLD')) {
    return 'SUBMITTED_FOR_REVIEW';
  }
  if (toStatus === 'COMPLETED') return 'COMPLETED';
  if (toStatus === 'ACCEPTED') return 'ACCEPTED';
  if (toStatus === 'IN_PROGRESS' && fromStatus === 'ACCEPTED') return 'STARTED';
  if (toStatus === 'IN_PROGRESS' && (fromStatus === 'COMPLETED' || fromStatus === 'REOPENED')) {
    return 'REOPENED';
  }
  if (toStatus === 'REJECTED') return 'REJECTED';
  if (toStatus === 'CANCELLED') return 'CANCELLED';
  if (toStatus === 'BLOCKED') return 'BLOCKED';
  if (fromStatus === 'BLOCKED' && toStatus === 'IN_PROGRESS') return 'RESUMED';
  if (toStatus === 'ASSIGNED' && (fromStatus === 'DRAFT' || fromStatus === 'PENDING_APPROVAL')) {
    return 'ASSIGNED';
  }
  if (toStatus === 'PENDING_APPROVAL' && fromStatus === 'DRAFT') {
    return 'STATUS_CHANGED';
  }
  if (toStatus === 'REOPENED' && fromStatus === 'COMPLETED') return 'REOPENED';
  return 'STATUS_CHANGED';
}

class TaskActivityService {
  async notifyForAction(tenantId, taskId, actorId, action, metadata = {}) {
    try {
      const task = await Task.findOne({ _id: taskId, tenant_id: tenantId })
        .select(
          'title assigned_to_employee_id created_by_employee_id reviewer_employee_id approver_employee_id'
        )
        .lean();
      if (!task) return;

      const audience = [
        task.assigned_to_employee_id,
        task.created_by_employee_id,
        task.reviewer_employee_id,
        task.approver_employee_id
      ]
        .filter(Boolean)
        .map(String);
      const recipientIds = [...new Set(audience.filter((id) => id !== String(actorId)))];
      if (!recipientIds.length) return;

      const messageByAction = {
        ASSIGNED: `Task "${task.title}" has been assigned.`,
        ACCEPTED: `Task "${task.title}" has been accepted.`,
        REJECTED: `Task "${task.title}" was rejected.`,
        SUBMITTED_FOR_REVIEW: `Task "${task.title}" is submitted for review.`,
        COMPLETED: `Task "${task.title}" has been completed.`,
        REOPENED: `Task "${task.title}" has been reopened.`,
        COMMENTED: `New comment on task "${task.title}".`,
        FILE_UPLOADED: `New file uploaded for task "${task.title}".`,
        BLOCKED: `Task "${task.title}" is blocked.`,
        CANCELLED: `Task "${task.title}" is cancelled.`
      };
      if (action === 'STATUS_CHANGED' && metadata.event === 'APPROVAL_REQUESTED') {
        await notificationService.dispatch(tenantId, {
          recipient_ids: [task.approver_employee_id].filter(Boolean),
          type: 'APPROVAL_REQUESTED',
          title: 'Approval requested',
          message: `Approval requested for task "${task.title}".`,
          channels: ['in_app', 'email'],
          metadata: { task_id: taskId, approval_id: metadata.approvalId }
        });
        return;
      }

      const msg = messageByAction[action];
      if (!msg) return;

      await notificationService.dispatch(tenantId, {
        recipient_ids: recipientIds,
        type: `TASK_${action}`,
        title: `Task update: ${action}`,
        message: msg,
        channels: ['in_app', 'email'],
        metadata: { task_id: taskId, action, ...metadata }
      });
    } catch (e) {
      logger.warn('taskActivity notification failed', { error: e.message, action });
    }
  }

  async record(tenantId, taskId, actorId, action, metadata = {}) {
    if (!actorId) {
      logger.warn('taskActivity.record skipped: no actorId');
      return null;
    }
    const row = await TaskActivity.create({
      tenant_id: tenantId,
      task_id: taskId,
      actor_id: actorId,
      action,
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
      created_at: new Date()
    });
    await this.notifyForAction(tenantId, taskId, actorId, action, metadata);
    return row;
  }

  async recordTransition(tenantId, taskId, actorId, fromStatus, toStatus, reason) {
    const action = actionForTransition(fromStatus, toStatus);
    return this.record(tenantId, taskId, actorId, action, {
      fromStatus,
      toStatus,
      reason: reason || null
    });
  }
}

module.exports = new TaskActivityService();
module.exports.actionForTransition = actionForTransition;
