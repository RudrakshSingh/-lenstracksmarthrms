const TaskTimer = require('../models/TaskTimer.model');
const Task = require('../models/Task.model');
const AttendanceRecord = require('../models/AttendanceRecord.model');
const logger = require('../config/logger');

class TimerService {
  /**
   * Start timer for a task
   */
  async startTimer(tenantId, employeeId, taskId) {
    const now = new Date();
    
    // Validate task exists
    const task = await Task.findOne({ _id: taskId, tenant_id: tenantId });
    if (!task) {
      throw new Error('TASK_001_NOT_FOUND');
    }

    // Ensure employee is checked in
    await this.ensureAttendance(tenantId, employeeId, now);

    // Check for active timer
    const activeTimer = await TaskTimer.findOne({
      tenant_id: tenantId,
      employee_id: employeeId,
      stopped_at: null
    });

    if (activeTimer) {
      throw new Error('TIMER_002_TIMER_ALREADY_RUNNING');
    }

    // Validate task status
    if (!['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(task.status)) {
      throw new Error('TIMER_003_INVALID_TASK_STATUS');
    }

    // Create timer
    const timer = await TaskTimer.create({
      tenant_id: tenantId,
      task_id: task._id,
      employee_id: employeeId,
      started_at: now,
      auto_stopped: false
    });

    // Update task status if needed
    if (task.status === 'ASSIGNED' || task.status === 'ACCEPTED') {
      task.status = 'IN_PROGRESS';
      task.started_at = task.started_at || now;
      await task.save();
    }

    return timer;
  }

  /**
   * Stop timer for a task
   */
  async stopTimer(tenantId, employeeId, taskId) {
    const now = new Date();

    const timer = await TaskTimer.findOne({
      tenant_id: tenantId,
      task_id: taskId,
      employee_id: employeeId,
      stopped_at: null
    });

    if (!timer) {
      throw new Error('TIMER_001_NO_ACTIVE_TIMER');
    }

    timer.stopped_at = now;
    timer.duration_seconds = Math.floor((now.getTime() - timer.started_at.getTime()) / 1000);
    await timer.save();

    return timer;
  }

  /**
   * Handle employee checkout - auto-stop all active timers
   */
  async handleEmployeeCheckout(tenantId, employeeId) {
    const now = new Date();

    const activeTimers = await TaskTimer.find({
      tenant_id: tenantId,
      employee_id: employeeId,
      stopped_at: null
    });

    for (const timer of activeTimers) {
      timer.stopped_at = now;
      timer.duration_seconds = Math.floor((now.getTime() - timer.started_at.getTime()) / 1000);
      timer.auto_stopped = true;
      await timer.save();
    }

    logger.info(`Auto-stopped ${activeTimers.length} timers for employee ${employeeId} on checkout`);
    return activeTimers.length;
  }

  /**
   * Ensure employee has active attendance
   */
  async ensureAttendance(tenantId, employeeId, now) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);

    const attendance = await AttendanceRecord.findOne({
      tenant_id: tenantId,
      employee_id: employeeId,
      work_date: day
    });

    if (!attendance || !attendance.check_in_at || attendance.check_out_at) {
      throw new Error('TIMER_004_ATTENDANCE_NOT_ACTIVE');
    }
  }

  /**
   * Get active timers for employee
   */
  async getActiveTimers(tenantId, employeeId) {
    return TaskTimer.find({
      tenant_id: tenantId,
      employee_id: employeeId,
      stopped_at: null
    }).populate('task_id', 'title status');
  }
}

module.exports = new TimerService();

