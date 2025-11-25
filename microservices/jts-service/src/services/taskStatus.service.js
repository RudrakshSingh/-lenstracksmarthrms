const Task = require('../models/Task.model');
const TaskStatusHistory = require('../models/TaskStatusHistory.model');
const logger = require('../config/logger');

class TaskStatusService {
  constructor() {
    // Valid status transitions
    this.validTransitions = {
      DRAFT: ['PENDING_APPROVAL', 'ASSIGNED', 'REJECTED'],
      PENDING_APPROVAL: ['ASSIGNED', 'REJECTED'],
      ASSIGNED: ['ACCEPTED', 'REJECTED'],
      ACCEPTED: ['IN_PROGRESS', 'REJECTED'],
      IN_PROGRESS: ['ON_HOLD', 'PENDING_REVIEW', 'COMPLETED'],
      ON_HOLD: ['IN_PROGRESS', 'REJECTED'],
      PENDING_REVIEW: ['COMPLETED', 'IN_PROGRESS', 'REJECTED'],
      COMPLETED: [],
      REJECTED: []
    };
  }

  /**
   * Check if transition is valid
   */
  isValidTransition(from, to) {
    return this.validTransitions[from]?.includes(to) ?? false;
  }

  /**
   * Change task status with validation and side effects
   */
  async changeStatus(tenantId, taskId, toStatus, context) {
    const session = await Task.db.startSession();
    session.startTransaction();

    try {
      const task = await Task.findOne({ _id: taskId, tenant_id: tenantId }).session(session);
      
      if (!task) {
        throw new Error('TASK_001_NOT_FOUND');
      }

      const fromStatus = task.status;

      if (!this.isValidTransition(fromStatus, toStatus)) {
        throw new Error('TASK_002_INVALID_STATUS_TRANSITION');
      }

      // Apply side effects
      await this.applySideEffects(task, fromStatus, toStatus, context, session);

      // Update task status
      task.status = toStatus;
      task.updated_at = new Date();
      await task.save({ session });

      // Log status history
      await TaskStatusHistory.create(
        [{
          tenant_id: task.tenant_id,
          task_id: task._id,
          from_status: fromStatus,
          to_status: toStatus,
          changed_by_employee_id: context.actorId,
          changed_at: new Date(),
          reason: context.reason || null
        }],
        { session }
      );

      await session.commitTransaction();
      return task;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Apply side effects based on status transition
   */
  async applySideEffects(task, from, to, context, session) {
    // Set accepted_at when transitioning to ACCEPTED
    if (from !== 'ACCEPTED' && to === 'ACCEPTED') {
      task.accepted_at = new Date();
    }

    // Set started_at when transitioning to IN_PROGRESS
    if (from !== 'IN_PROGRESS' && to === 'IN_PROGRESS') {
      task.started_at = task.started_at || new Date();
    }

    // Set completed_at when transitioning to COMPLETED
    if (to === 'COMPLETED') {
      task.completed_at = new Date();
    }
  }
}

module.exports = new TaskStatusService();

