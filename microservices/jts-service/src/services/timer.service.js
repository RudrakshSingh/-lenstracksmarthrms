const TaskTimer = require('../models/TaskTimer.model');
const TaskTimerSession = require('../models/TaskTimerSession.model');
const Task = require('../models/Task.model');
const AttendanceRecord = require('../models/AttendanceRecord.model');
const taskStatusService = require('./taskStatus.service');
const taskActivityService = require('./taskActivity.service');
const { isClockedInViaAttendanceService } = require('../utils/attendanceServiceClient');
const logger = require('../config/logger');

class TimerService {
  getAttendanceMode() {
    const mode = String(process.env.JTS_TIMER_ATTENDANCE_MODE || '').trim().toLowerCase();
    if (mode === 'strict' || mode === 'auto') return mode;
    const legacy = String(process.env.JTS_TIMER_AUTO_CLOCKIN || 'true').toLowerCase();
    return ['1', 'true', 'yes', 'on'].includes(legacy) ? 'auto' : 'strict';
  }

  async _finalizeTimer(timer, { stopReason = 'MANUAL', autoStopped = false } = {}) {
    const now = new Date();
    timer.stopped_at = now;
    timer.duration_seconds = Math.floor((now.getTime() - timer.started_at.getTime()) / 1000);
    timer.auto_stopped = autoStopped;
    await timer.save();

    const sess = await TaskTimerSession.findOne({ timer_id: timer._id, stopped_at: null })
      .sort({ started_at: -1 });
    if (sess) {
      sess.stopped_at = now;
      sess.duration_seconds = timer.duration_seconds;
      sess.stop_reason = stopReason;
      await sess.save();
    }

    return timer;
  }

  /**
   * Start timer for a task
   */
  async startTimer(tenantId, employeeId, taskId, httpContext = {}) {
    const now = new Date();

    const task = await Task.findOne({
      _id: taskId,
      tenant_id: tenantId,
      is_deleted: { $ne: true }
    });
    if (!task) {
      throw new Error('TASK_001_NOT_FOUND');
    }

    if (task.is_blocked) {
      throw new Error('TIMER_005_TASK_BLOCKED');
    }

    const attendance = await this.ensureAttendance(tenantId, employeeId, now, httpContext);

    const activeTimer = await TaskTimer.findOne({
      tenant_id: tenantId,
      employee_id: employeeId,
      stopped_at: null
    });

    if (activeTimer) {
      throw new Error('TIMER_002_TIMER_ALREADY_RUNNING');
    }

    if (!['ACCEPTED', 'IN_PROGRESS'].includes(task.status)) {
      throw new Error('TIMER_003_INVALID_TASK_STATUS');
    }

    if (task.status === 'ACCEPTED') {
      await taskStatusService.changeStatus(tenantId, taskId, 'IN_PROGRESS', {
        actorId: employeeId,
        reason: 'Timer start (execution)'
      });
    }

    const timer = await TaskTimer.create({
      tenant_id: tenantId,
      task_id: task._id,
      employee_id: employeeId,
      started_at: now,
      auto_stopped: false
    });

    await TaskTimerSession.create({
      tenant_id: tenantId,
      task_id: task._id,
      employee_id: employeeId,
      timer_id: timer._id,
      started_at: now
    });

    return { timer, attendance };
  }

  /**
   * Stop timer for a task
   */
  async stopTimer(tenantId, employeeId, taskId, options = {}) {
    const stopReason = options.stopReason || 'MANUAL';

    const timer = await TaskTimer.findOne({
      tenant_id: tenantId,
      task_id: taskId,
      employee_id: employeeId,
      stopped_at: null
    });

    if (!timer) {
      throw new Error('TIMER_001_NO_ACTIVE_TIMER');
    }

    await this._finalizeTimer(timer, { stopReason, autoStopped: false });
    if (stopReason === 'PAUSE') {
      try {
        await taskActivityService.record(tenantId, taskId, employeeId, 'PAUSED', {
          timerId: String(timer._id)
        });
      } catch (e) {
        /* non-fatal */
      }
    }
    return timer;
  }

  /**
   * Handle employee checkout - auto-stop all active timers
   */
  async handleEmployeeCheckout(tenantId, employeeId) {
    const activeTimers = await TaskTimer.find({
      tenant_id: tenantId,
      employee_id: employeeId,
      stopped_at: null
    });

    for (const timer of activeTimers) {
      await this._finalizeTimer(timer, { stopReason: 'SHIFT_END', autoStopped: true });
    }

    logger.info(`Auto-stopped ${activeTimers.length} timers for employee ${employeeId} on checkout`);
    return activeTimers.length;
  }

  /**
   * Ensure employee has active attendance
   */
  async ensureAttendance(tenantId, employeeId, now, httpContext = {}) {
    const { authorization, tenantHeader } = httpContext;
    const mode = this.getAttendanceMode();
    const meta = {
      mode,
      source: 'local_mirror',
      remote_checked: false,
      auto_clocked_in: false
    };

    if (authorization) {
      meta.remote_checked = true;
      const remote = await isClockedInViaAttendanceService(authorization, tenantHeader);
      if (remote === true) {
        meta.source = 'attendance_service';
        return meta;
      }
      if (remote === false && mode === 'strict') {
        throw new Error('TIMER_004_ATTENDANCE_NOT_ACTIVE');
      }
    }

    const day = new Date(now);
    day.setHours(0, 0, 0, 0);

    const attendance = await AttendanceRecord.findOne({
      tenant_id: tenantId,
      employee_id: employeeId,
      work_date: day
    });

    if (!attendance || !attendance.check_in_at || attendance.check_out_at) {
      if (mode === 'auto') {
        await AttendanceRecord.findOneAndUpdate(
          { tenant_id: tenantId, employee_id: employeeId, work_date: day },
          {
            $set: {
              tenant_id: tenantId,
              employee_id: employeeId,
              work_date: day,
              check_in_at: now,
              check_out_at: null
            }
          },
          { upsert: true, new: true }
        );
        meta.auto_clocked_in = true;
        return meta;
      }
      throw new Error('TIMER_004_ATTENDANCE_NOT_ACTIVE');
    }
    return meta;
  }

  async getActiveTimerForTask(tenantId, employeeId, taskId) {
    return TaskTimer.findOne({
      tenant_id: tenantId,
      employee_id: employeeId,
      task_id: taskId,
      stopped_at: null
    });
  }

  async getActiveTimers(tenantId, employeeId) {
    return TaskTimer.find({
      tenant_id: tenantId,
      employee_id: employeeId,
      stopped_at: null
    }).populate('task_id', 'title status');
  }

  async listTimerSessionsForTask(tenantId, taskId, { limit = 100 } = {}) {
    const task = await Task.findOne({
      _id: taskId,
      tenant_id: tenantId,
      is_deleted: { $ne: true }
    }).select('_id');
    if (!task) return null;

    const rows = await TaskTimerSession.find({ tenant_id: tenantId, task_id: taskId })
      .sort({ started_at: -1 })
      .limit(Math.min(Number(limit) || 100, 500))
      .lean();

    return rows;
  }

  /**
   * Session-based timer view: active segment + history + rolling total seconds (completed segments).
   */
  async getTimerBundleForTask(tenantId, employeeId, taskId) {
    const task = await Task.findOne({
      _id: taskId,
      tenant_id: tenantId,
      is_deleted: { $ne: true }
    }).select('_id');
    if (!task) return null;

    const [activeTimer, sessions] = await Promise.all([
      this.getActiveTimerForTask(tenantId, employeeId, taskId),
      TaskTimerSession.find({ tenant_id: tenantId, task_id: taskId })
        .sort({ started_at: -1 })
        .limit(200)
        .lean()
    ]);

    const totalDurationSeconds = sessions.reduce((sum, s) => sum + (Number(s.duration_seconds) || 0), 0);

    return { activeTimer, sessions, totalDurationSeconds };
  }
}

module.exports = new TimerService();
