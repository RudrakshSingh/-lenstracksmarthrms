const moment = require('moment-timezone');
const Task = require('../models/Task.model');
const Tenant = require('../models/Tenant.model');
const EmployeeRole = require('../models/EmployeeRole.model');
const Employee = require('../models/Employee.model');
const SlaBreachLog = require('../models/SlaBreachLog.model');
const notificationService = require('./notification.service');
const logger = require('../config/logger');

const ACTIVE_STATUSES = [
  'ASSIGNED',
  'ACCEPTED',
  'IN_PROGRESS',
  'ON_HOLD',
  'PENDING_REVIEW',
  'BLOCKED',
  'REOPENED'
];

/** Company / tenant admins who get every SLA breach (any team). */
const SLA_ADMIN_NOTIFY_ROLES = ['TENANT_ADMIN', 'SUPERADMIN', 'ADMIN', 'HOD'];

function envFlag(name, defaultTrue = true) {
  const v = process.env[name];
  if (v == null || v === '') return defaultTrue;
  return String(v).toLowerCase() !== 'false' && v !== '0';
}

function recipientKey(x) {
  if (x == null) return null;
  if (typeof x === 'object' && x._id) return String(x._id);
  return String(x);
}

function uniqRecipientIds(assigneeId, adminIds) {
  const set = new Set();
  const add = (x) => {
    const k = recipientKey(x);
    if (k) set.add(k);
  };
  add(assigneeId);
  for (const id of adminIds || []) add(id);
  return [...set];
}

function assigneeObjectId(task) {
  const a = task.assigned_to_employee_id;
  if (!a) return null;
  if (typeof a === 'object' && a._id) return a._id;
  return a;
}

function resolveSlaBreachWebhookUrl(tenant) {
  const u = tenant?.settings?.integrations?.sla_breach_webhook_url;
  if (u && String(u).trim()) return String(u).trim();
  const env = process.env.JTS_SLA_BREACH_WEBHOOK_URL;
  if (env && String(env).trim()) return String(env).trim();
  return '';
}

class SlaWorkflowService {
  async resolveTenantAdminRecipients(tenantId) {
    const roleRows = await EmployeeRole.find({
      tenant_id: tenantId,
      role: { $in: SLA_ADMIN_NOTIFY_ROLES.map((r) => String(r).toUpperCase()) }
    }).select('employee_id');
    if (!roleRows.length) return [];

    const employeeIds = [...new Set(roleRows.map((row) => String(row.employee_id)))];
    const activeEmployees = await Employee.find({
      tenant_id: tenantId,
      _id: { $in: employeeIds },
      status: 'ACTIVE'
    }).select('_id');

    return activeEmployees.map((e) => e._id);
  }

  slaContextMeta(task, tenant) {
    const t = task;
    const org = t.scope_org_node_id;
    const assignee = t.assigned_to_employee_id;
    const orgName = org && typeof org === 'object' && org.name ? org.name : null;
    const orgCode = org && typeof org === 'object' && org.code ? org.code : null;
    const assigneeName =
      assignee && typeof assignee === 'object' && assignee.name ? assignee.name : null;
    return {
      task_id: t._id,
      task_code: t.code || null,
      due_at: t.due_at,
      tenant_name: tenant?.name || null,
      team_name: orgName,
      team_code: orgCode,
      scope_org_node_id: org && typeof org === 'object' && org._id ? org._id : t.scope_org_node_id,
      assignee_name: assigneeName,
      assignee_employee_id: assignee && typeof assignee === 'object' && assignee._id ? assignee._id : t.assigned_to_employee_id,
      priority: t.priority || null
    };
  }

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
      const meta = { ...this.slaContextMeta(t, tenant), at: now };
      const adminsOnWarn =
        envFlag('SLA_NOTIFY_ADMINS', true) && envFlag('SLA_NOTIFY_ADMINS_ON_WARNING', false)
          ? await this.resolveTenantAdminRecipients(t.tenant_id)
          : [];
      const warnRecipients = uniqRecipientIds(assigneeObjectId(t), adminsOnWarn);
      if (warnRecipients.length) {
        await notificationService.dispatch(t.tenant_id, {
          recipient_ids: warnRecipients,
          type: 'TASK_DUE_SOON',
          title: 'Task due soon',
          message: `Task "${t.title}" is approaching SLA deadline.`,
          channels: ['in_app', 'email'],
          metadata: meta
        });
      }
    }

    if (!t.breached_at && remaining < 0) {
      t.breached_at = now;
      const assigneeOid = assigneeObjectId(t);
      const delayMin = Math.max(
        0,
        Math.floor((now.getTime() - new Date(t.due_at).getTime()) / 60000)
      );

      let breachLogId = null;
      try {
        const log = await SlaBreachLog.create({
          tenant_id: t.tenant_id,
          task_id: t._id,
          employee_id: assigneeOid || undefined,
          due_at: t.due_at,
          breached_at: now,
          delay_minutes: delayMin,
          created_at: now
        });
        breachLogId = log._id;
      } catch (e) {
        logger.error('SlaBreachLog create failed', { taskId: String(t._id), error: e.message });
      }

      const meta = {
        ...this.slaContextMeta(t, tenant),
        breached_at: now,
        breach_log_id: breachLogId,
        delay_minutes: delayMin
      };

      const adminsOnBreach = envFlag('SLA_NOTIFY_ADMINS', true)
        ? await this.resolveTenantAdminRecipients(t.tenant_id)
        : [];
      const assigneeLabel =
        t.assigned_to_employee_id &&
        typeof t.assigned_to_employee_id === 'object' &&
        t.assigned_to_employee_id.name
          ? ` (${t.assigned_to_employee_id.name})`
          : '';
      const teamLabel =
        t.scope_org_node_id &&
        typeof t.scope_org_node_id === 'object' &&
        t.scope_org_node_id.name
          ? ` [${t.scope_org_node_id.name}]`
          : '';
      const breachRecipients = uniqRecipientIds(assigneeOid, adminsOnBreach);
      if (breachRecipients.length) {
        try {
          await notificationService.dispatch(t.tenant_id, {
            recipient_ids: breachRecipients,
            type: 'TASK_OVERDUE',
            title: 'SLA breached — action needed',
            message: `Task "${t.title}" has breached SLA.${teamLabel}${assigneeLabel}`,
            channels: ['in_app', 'email'],
            metadata: meta
          });
        } catch (e) {
          logger.error('SLA breach notification dispatch failed', {
            taskId: String(t._id),
            error: e.message
          });
        }
      }

      const hookUrl = resolveSlaBreachWebhookUrl(tenant);
      if (hookUrl && process.env.JTS_SLA_WEBHOOKS_ENABLED !== 'false') {
        const org = t.scope_org_node_id;
        const orgIsObj = org && typeof org === 'object';
        try {
          await notificationService.enqueueIntegrationWebhook(
            t.tenant_id,
            hookUrl,
            'jts.sla.breached',
            {
              event: 'jts.sla.breached',
              occurred_at: now.toISOString(),
              tenant_id: String(t.tenant_id),
              breach_log_id: breachLogId ? String(breachLogId) : null,
              delay_minutes: delayMin,
              task: {
                id: String(t._id),
                code: t.code || null,
                title: t.title,
                status: t.status,
                priority: t.priority,
                due_at: t.due_at
              },
              team: orgIsObj
                ? {
                    id: String(org._id || ''),
                    name: org.name || null,
                    code: org.code || null
                  }
                : null,
              assignee: assigneeOid
                ? {
                    id: String(assigneeOid),
                    name:
                      t.assigned_to_employee_id &&
                      typeof t.assigned_to_employee_id === 'object' &&
                      t.assigned_to_employee_id.name
                        ? t.assigned_to_employee_id.name
                        : null,
                    code:
                      t.assigned_to_employee_id &&
                      typeof t.assigned_to_employee_id === 'object' &&
                      t.assigned_to_employee_id.code
                        ? t.assigned_to_employee_id.code
                        : null
                  }
                : null
            }
          );
        } catch (e) {
          logger.warn('SLA breach webhook enqueue failed', { taskId: String(t._id), error: e.message });
        }
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
    })
      .populate('scope_org_node_id', 'name code type')
      .populate('assigned_to_employee_id', 'name code');

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

