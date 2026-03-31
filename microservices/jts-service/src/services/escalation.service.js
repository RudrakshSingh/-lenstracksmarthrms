const Task = require('../models/Task.model');
const EscalationRule = require('../models/EscalationRule.model');
const EscalationEvent = require('../models/EscalationEvent.model');
const SlaBreachLog = require('../models/SlaBreachLog.model');
const EmployeeRole = require('../models/EmployeeRole.model');
const Employee = require('../models/Employee.model');
const notificationService = require('./notification.service');
const logger = require('../config/logger');

const ACTIVE_STATUSES = ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'ON_HOLD', 'PENDING_REVIEW', 'BLOCKED'];
const DEFAULT_LADDER = ['L0', 'L1', 'L2', 'L3'];

class EscalationService {
  async checkAndEscalateForTenant(tenantId) {
    const now = new Date();
    const tasks = await Task.find({
      tenant_id: tenantId,
      is_deleted: { $ne: true },
      status: { $in: ACTIVE_STATUSES }
    }).sort({ due_at: 1 });

    for (const task of tasks) {
      try {
        await this.checkAndEscalateTask(tenantId, task, now);
      } catch (err) {
        logger.error('Error escalating task', { taskId: task._id, error: err.message });
      }
    }
  }

  detectTrigger(task, now) {
    if (task.breached_at || now > new Date(task.due_at)) {
      return 'SLA_BREACH';
    }

    if (task.status === 'ASSIGNED') {
      const acceptedAgeMin = Math.floor((now.getTime() - new Date(task.created_at).getTime()) / 60000);
      if (acceptedAgeMin >= 120) return 'NO_ACCEPTANCE';
    }

    if (task.last_activity_at) {
      const idleMin = Math.floor((now.getTime() - new Date(task.last_activity_at).getTime()) / 60000);
      if (idleMin >= 180) return 'NO_ACTIVITY';
    }

    if ((task.rejection_count || 0) >= 2) {
      return 'REPEATED_REJECTIONS';
    }

    return null;
  }

  async checkAndEscalateTask(tenantId, task, now) {
    const trigger = this.detectTrigger(task, now);
    if (!trigger) return;

    let rules = await EscalationRule.find({
      tenant_id: tenantId,
      is_active: true,
      trigger_type: trigger
    }).sort({ threshold: 1 });

    if (!rules.length) {
      // Fallback ladder if custom rules aren't configured yet.
      rules = DEFAULT_LADDER.map((level) => ({
        _id: null,
        threshold: level,
        trigger_type: trigger,
        notify_roles: this.defaultRolesForLevel(level)
      }));
    }

    const currentLevel = Number(task.escalation_level || 0);
    const nextLevel = Math.min(3, currentLevel + 1);
    const nextLabel = `L${nextLevel}`;
    const rule = rules.find((r) => r.threshold === nextLabel) || rules[rules.length - 1];
    if (!rule) return;

    const exists = await EscalationEvent.exists({
      tenant_id: tenantId,
      task_id: task._id,
      level: rule.threshold,
      trigger_type: trigger
    });
    if (exists) return;

    await this.raiseEvent(tenantId, task, rule, trigger, now);

    task.escalation_level = nextLevel;
    await task.save();

    if (trigger === 'SLA_BREACH') {
      const delayMin = Math.max(0, Math.floor((now.getTime() - new Date(task.due_at).getTime()) / 60000));
      await SlaBreachLog.create({
        tenant_id: tenantId,
        task_id: task._id,
        employee_id: task.assigned_to_employee_id,
        due_at: task.due_at,
        breached_at: now,
        delay_minutes: delayMin,
        created_at: now
      });
    }
  }

  defaultRolesForLevel(level) {
    if (level === 'L0') return ['EMPLOYEE'];
    if (level === 'L1') return ['MANAGER', 'STORE_MANAGER'];
    if (level === 'L2') return ['CLUSTER_MANAGER', 'COUNTRY_OPS'];
    return ['TENANT_ADMIN', 'SUPERADMIN'];
  }

  async raiseEvent(tenantId, task, rule, trigger, now) {
    const roles = Array.isArray(rule.notify_roles) ? rule.notify_roles : [];
    const recipients = await this.resolveRecipientsByRoles(tenantId, task, roles);

    await EscalationEvent.create({
      tenant_id: tenantId,
      task_id: task._id,
      rule_id: rule._id || undefined,
      level: rule.threshold,
      trigger_type: trigger,
      notified_roles: roles,
      notified_employee_ids: recipients,
      created_at: now
    });

    if (recipients.length) {
      await notificationService.dispatch(tenantId, {
        recipient_ids: recipients,
        type: `ESCALATION_${rule.threshold}`,
        title: `Task escalation ${rule.threshold}`,
        message: `Task "${task.title}" triggered escalation due to ${trigger}.`,
        channels: ['in_app', 'email'],
        metadata: {
          task_id: task._id,
          task_status: task.status,
          due_at: task.due_at,
          escalation_level: rule.threshold,
          trigger_type: trigger
        }
      });
    }
  }

  async resolveRecipientsByRoles(tenantId, task, roles) {
    if (!Array.isArray(roles) || roles.length === 0) return [];
    const normalizedRoles = roles.map((role) => String(role).toUpperCase());
    const roleRows = await EmployeeRole.find({
      tenant_id: tenantId,
      role: { $in: normalizedRoles }
    }).select('employee_id');
    if (!roleRows.length) return [];

    const employeeIds = [...new Set(roleRows.map((row) => String(row.employee_id)))];
    const activeEmployees = await Employee.find({
      tenant_id: tenantId,
      _id: { $in: employeeIds },
      status: 'ACTIVE'
    }).select('_id');

    return activeEmployees.map((employee) => employee._id);
  }
}

module.exports = new EscalationService();

