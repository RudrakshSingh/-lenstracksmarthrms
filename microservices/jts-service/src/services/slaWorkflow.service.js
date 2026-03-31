const moment = require('moment-timezone');
const Task = require('../models/Task.model');
const Tenant = require('../models/Tenant.model');
const notificationService = require('./notification.service');
const logger = require('../config/logger');

const ACTIVE_STATUSES = ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'ON_HOLD', 'PENDING_REVIEW', 'BLOCKED'];

class SlaWorkflowService {
  businessMinutesBetween(tenant, fromDate, toDate) {
    if (!fromDate || !toDate) return 0;
    let start = moment(fromDate).tz(tenant.settings.timezone);
    const end = moment(toDate).tz(tenant.settings.timezone);
    if (!start.isValid() || !end.isValid() || !end.isAfter(start)) return 0;

    let minutes = 0;
    while (start.isBefore(end)) {
      const day = start.day();
      const isWorking = tenant.settings.working_days.includes(day);
      if (!isWorking) {
        start = start.add(1, 'day').startOf('day');
        continue;
      }

      const [sh, sm] = String(tenant.settings.working_hours.start || '10:00').split(':').map(Number);
      const [eh, em] = String(tenant.settings.working_hours.end || '21:00').split(':').map(Number);
      const dayStart = start.clone().hour(sh).minute(sm).second(0).millisecond(0);
      const dayEnd = start.clone().hour(eh).minute(em).second(0).millisecond(0);

      const windowStart = moment.max(start, dayStart);
      const windowEnd = moment.min(end, dayEnd);
      if (windowEnd.isAfter(windowStart)) {
        minutes += windowEnd.diff(windowStart, 'minutes');
      }
      start = start.add(1, 'day').startOf('day');
    }
    return Math.max(0, minutes);
  }

  async updateTaskSlaState(task, tenant, now = new Date()) {
    const t = task;
    if (!t.sla_started_at) {
      t.sla_started_at = t.created_at || now;
    }

    if (t.status === 'ON_HOLD' && !t.sla_paused_at) {
      t.sla_paused_at = now;
    } else if (t.status !== 'ON_HOLD' && t.sla_paused_at) {
      const pausedSec = Math.max(0, Math.floor((now.getTime() - new Date(t.sla_paused_at).getTime()) / 1000));
      t.sla_paused_seconds_total = (t.sla_paused_seconds_total || 0) + pausedSec;
      t.sla_paused_at = null;
    }

    const startedAt = new Date(t.sla_started_at);
    const pausedSecondsLive =
      t.sla_paused_at && t.status === 'ON_HOLD'
        ? Math.max(0, Math.floor((now.getTime() - new Date(t.sla_paused_at).getTime()) / 1000))
        : 0;
    const pausedSeconds = (t.sla_paused_seconds_total || 0) + pausedSecondsLive;

    let elapsedMinutes;
    if (tenant.settings.sla_basis_default === 'BUSINESS_HOURS') {
      const raw = this.businessMinutesBetween(tenant, startedAt, now);
      elapsedMinutes = Math.max(0, raw - Math.floor(pausedSeconds / 60));
    } else {
      const raw = Math.floor((now.getTime() - startedAt.getTime()) / 60000);
      elapsedMinutes = Math.max(0, raw - Math.floor(pausedSeconds / 60));
    }

    const remaining = (t.sla_minutes || 0) - elapsedMinutes;
    const warningThreshold = Math.floor((t.sla_minutes || 0) * 0.25);

    if (!t.warning_at && remaining <= warningThreshold) {
      t.warning_at = now;
      if (t.assigned_to_employee_id) {
        await notificationService.dispatch(t.tenant_id, {
          recipient_ids: [t.assigned_to_employee_id],
          type: 'TASK_DUE_SOON',
          title: 'Task due soon',
          message: `Task "${t.title}" is approaching SLA deadline.`,
          channels: ['in_app', 'email'],
          metadata: { task_id: t._id, due_at: t.due_at }
        });
      }
    }

    if (!t.breached_at && remaining < 0) {
      t.breached_at = now;
      if (t.assigned_to_employee_id) {
        await notificationService.dispatch(t.tenant_id, {
          recipient_ids: [t.assigned_to_employee_id],
          type: 'TASK_OVERDUE',
          title: 'Task overdue',
          message: `Task "${t.title}" has breached SLA.`,
          channels: ['in_app', 'email'],
          metadata: { task_id: t._id, breached_at: now }
        });
      }
    }

    return {
      elapsedMinutes,
      remainingMinutes: remaining
    };
  }

  async runForTenant(tenantId) {
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) return { updated: 0 };
    const now = new Date();
    const tasks = await Task.find({
      tenant_id: tenantId,
      is_deleted: { $ne: true },
      status: { $in: ACTIVE_STATUSES }
    });

    let updated = 0;
    for (const task of tasks) {
      try {
        await this.updateTaskSlaState(task, tenant, now);
        await task.save();
        updated += 1;
      } catch (e) {
        logger.error('SLA state update failed', { taskId: String(task._id), error: e.message });
      }
    }
    return { updated };
  }
}

module.exports = new SlaWorkflowService();

