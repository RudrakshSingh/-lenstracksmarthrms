const Task = require('../models/Task.model');
const EscalationRule = require('../models/EscalationRule.model');
const EscalationEvent = require('../models/EscalationEvent.model');
const SlaBreachLog = require('../models/SlaBreachLog.model');
const logger = require('../config/logger');

class EscalationService {
  /**
   * Check and escalate tasks for a tenant
   */
  async checkAndEscalateForTenant(tenantId) {
    const now = new Date();
    const pageSize = 500;
    let skip = 0;

    while (true) {
      const tasks = await Task.find({
        tenant_id: tenantId,
        status: { $in: ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'ON_HOLD'] }
      })
        .sort({ due_at: 1 })
        .skip(skip)
        .limit(pageSize);

      if (!tasks.length) break;

      for (const task of tasks) {
        try {
          await this.checkAndEscalateTask(tenantId, task, now);
        } catch (err) {
          logger.error('Error escalating task', { taskId: task._id, error: err.message });
        }
      }

      skip += pageSize;
    }
  }

  /**
   * Check and escalate a single task
   */
  async checkAndEscalateTask(tenantId, task, now) {
    const rules = await EscalationRule.find({
      tenant_id: tenantId,
      is_active: true
    });

    const timeRemaining = (task.due_at.getTime() - now.getTime()) / 60000; // minutes
    const elapsedFromStart = (now.getTime() - task.created_at.getTime()) / 60000;

    for (const rule of rules) {
      // Skip if rule is for specific task type and doesn't match
      if (rule.task_type_id && rule.task_type_id.toString() !== task.type_id.toString()) {
        continue;
      }

      // Check if already escalated at this level
      const alreadyEscalated = await EscalationEvent.exists({
        tenant_id: tenantId,
        task_id: task._id,
        level: rule.threshold
      });

      if (alreadyEscalated) continue;

      let shouldEscalate = false;

      if (rule.threshold === 'PRE_SLA') {
        // Escalate when 25% of SLA time remaining
        if (timeRemaining <= (task.sla_minutes * 0.25)) {
          shouldEscalate = true;
        }
      } else if (rule.threshold === 'SLA_BREACH') {
        // Escalate when past due date
        if (now > task.due_at) {
          shouldEscalate = true;
        }
      } else if (rule.threshold === 'EXTRA_DELAY') {
        // Escalate when delay exceeds SLA * factor
        const breachMinutes = (now.getTime() - task.due_at.getTime()) / 60000;
        if (now > task.due_at && rule.extra_delay_factor &&
            breachMinutes >= task.sla_minutes * (rule.extra_delay_factor - 1)) {
          shouldEscalate = true;
        }
      }

      if (shouldEscalate) {
        await this.raiseEvent(tenantId, task, rule, now);
        
        // Log SLA breach if applicable
        if (rule.threshold === 'SLA_BREACH') {
          await SlaBreachLog.create({
            tenant_id: tenantId,
            task_id: task._id,
            employee_id: task.assigned_to_employee_id,
            due_at: task.due_at,
            breached_at: now,
            delay_minutes: (now.getTime() - task.due_at.getTime()) / 60000,
            created_at: now
          });
        }
      }
    }
  }

  /**
   * Raise escalation event
   */
  async raiseEvent(tenantId, task, rule, now) {
    // Resolve recipients by roles (simplified - would need employee lookup)
    const recipients = await this.resolveRecipientsByRoles(tenantId, task, rule.notify_roles);

    await EscalationEvent.create({
      tenant_id: tenantId,
      task_id: task._id,
      rule_id: rule._id,
      level: rule.threshold,
      notified_roles: rule.notify_roles,
      notified_employee_ids: recipients,
      created_at: now
    });

    // TODO: Send notifications via notification service
    logger.info('Escalation event raised', {
      tenantId,
      taskId: task._id,
      level: rule.threshold,
      recipients: recipients.length
    });
  }

  /**
   * Resolve recipients by roles (simplified - would need proper employee/role lookup)
   */
  async resolveRecipientsByRoles(tenantId, task, roles) {
    // TODO: Implement proper role-based recipient resolution
    // This would query Employee and EmployeeRole collections
    return [];
  }
}

module.exports = new EscalationService();

