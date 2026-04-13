const Task = require('../models/Task.model');
const TaskStatusHistory = require('../models/TaskStatusHistory.model');
const taskActivityService = require('./taskActivity.service');
const logger = require('../config/logger');
const {
  assertDependenciesSatisfied,
  assertChecklistIfNeeded,
  assertTimerProofIfNeeded
} = require('../utils/taskWorkflowGuard');

function buildTransitionsWithCancelFromAny() {
  const raw = {
    DRAFT: ['PENDING_APPROVAL', 'ASSIGNED', 'REJECTED'],
    PENDING_APPROVAL: ['ASSIGNED', 'REJECTED'],
    ASSIGNED: ['ACCEPTED', 'REJECTED'],
    ACCEPTED: ['IN_PROGRESS', 'REJECTED'],
    IN_PROGRESS: ['ON_HOLD', 'PENDING_REVIEW', 'COMPLETED', 'BLOCKED'],
    ON_HOLD: ['IN_PROGRESS', 'PENDING_REVIEW', 'REJECTED', 'BLOCKED'],
    BLOCKED: ['IN_PROGRESS', 'REJECTED'],
    PENDING_REVIEW: ['COMPLETED', 'IN_PROGRESS', 'REJECTED'],
    COMPLETED: ['IN_PROGRESS', 'REOPENED'],
    REOPENED: ['IN_PROGRESS'],
    REJECTED: [],
    CANCELLED: []
  };

  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k === 'CANCELLED') {
      out[k] = v;
      continue;
    }
    const merged = [...v];
    if (!merged.includes('CANCELLED')) merged.push('CANCELLED');
    out[k] = merged;
  }
  out.REJECTED = ['CANCELLED'];
  return out;
}

class TaskStatusService {
  constructor() {
    this.validTransitions = buildTransitionsWithCancelFromAny();
  }

  isValidTransition(from, to) {
    return this.validTransitions[from]?.includes(to) ?? false;
  }

  async changeStatus(tenantId, taskId, toStatus, context) {
    const session = await Task.db.startSession();
    session.startTransaction();

    try {
      const task = await Task.findOne({ _id: taskId, tenant_id: tenantId }).session(session);

      if (!task) {
        throw new Error('TASK_001_NOT_FOUND');
      }

      if (task.is_deleted) {
        throw new Error('TASK_005_DELETED');
      }

      const fromStatus = task.status;
      const bypass = context.bypassWorkflowGuards === true;

      if (!this.isValidTransition(fromStatus, toStatus)) {
        throw new Error('TASK_002_INVALID_STATUS_TRANSITION');
      }

      if (!bypass) {
        assertChecklistIfNeeded(task, toStatus);
      }

      if (
        !bypass &&
        toStatus === 'IN_PROGRESS' &&
        ['ACCEPTED', 'COMPLETED', 'REOPENED'].includes(fromStatus)
      ) {
        await assertDependenciesSatisfied(tenantId, task);
      }

      if (!bypass) {
        await assertTimerProofIfNeeded(task, toStatus);
      }

      await this.applySideEffects(task, fromStatus, toStatus, context);

      task.status = toStatus;
      task.last_activity_at = new Date();
      task.updated_at = new Date();
      await task.save({ session });

      await TaskStatusHistory.create(
        [
          {
            tenant_id: task.tenant_id,
            task_id: task._id,
            from_status: fromStatus,
            to_status: toStatus,
            changed_by_employee_id: context.actorId,
            changed_at: new Date(),
            reason: context.reason || null
          }
        ],
        { session }
      );

      await session.commitTransaction();

      try {
        await taskActivityService.recordTransition(
          tenantId,
          task._id,
          context.actorId,
          fromStatus,
          toStatus,
          context.reason
        );
      } catch (e) {
        logger.warn('Task activity log failed', { error: e.message, taskId });
      }

      return task;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async applySideEffects(task, from, to, context) {
    if (from !== 'ACCEPTED' && to === 'ACCEPTED') {
      task.accepted_at = new Date();
    }

    if (from !== 'IN_PROGRESS' && to === 'IN_PROGRESS') {
      task.started_at = task.started_at || new Date();
    }

    if (to === 'COMPLETED') {
      task.completed_at = new Date();
    }

    if ((to === 'REOPENED' && from === 'COMPLETED') || (to === 'IN_PROGRESS' && from === 'COMPLETED')) {
      task.reopened_count = (task.reopened_count || 0) + 1;
      task.completed_at = undefined;
    }

    if (to === 'BLOCKED') {
      task.is_blocked = true;
      task.blocked_at = new Date();
      task.blocked_reason = context.reason || context.blockedReason || null;
    }

    if (from === 'BLOCKED' && to === 'IN_PROGRESS') {
      task.is_blocked = false;
      task.unblocked_at = new Date();
      task.blocked_reason = undefined;
    }

    if (to === 'CANCELLED') {
      task.cancelled_at = new Date();
    }

    if (to === 'REJECTED') {
      task.rejection_count = (task.rejection_count || 0) + 1;
    }

    if (to === 'PENDING_REVIEW' && (from === 'IN_PROGRESS' || from === 'ON_HOLD')) {
      task.submitted_for_review_at = new Date();
    }
  }
}

module.exports = new TaskStatusService();
