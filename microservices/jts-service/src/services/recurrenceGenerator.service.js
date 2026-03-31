const RecurrenceRule = require('../models/RecurrenceRule.model');
const TaskType = require('../models/TaskType.model');
const taskService = require('./task.service');
const logger = require('../config/logger');

function nextRunFrom(rule, fromDate = new Date()) {
  const d = new Date(fromDate);
  const interval = Math.max(1, Number(rule.interval || 1));
  if (rule.frequency === 'DAILY') d.setDate(d.getDate() + interval);
  else if (rule.frequency === 'WEEKLY') d.setDate(d.getDate() + 7 * interval);
  else d.setMonth(d.getMonth() + interval);
  return d;
}

class RecurrenceGeneratorService {
  async generateForTenant(tenantId) {
    const now = new Date();
    const rules = await RecurrenceRule.find({
      tenant_id: tenantId,
      is_active: true,
      next_run_at: { $lte: now }
    }).limit(200);

    let generated = 0;
    for (const rule of rules) {
      try {
        const tpl = rule.task_template || {};
        if (!tpl.title || !tpl.scope_org_node_id) continue;

        let typeId = tpl.type_id;
        if (!typeId) {
          const tt = await TaskType.findOne({ tenant_id: tenantId }).sort({ created_at: 1, _id: 1 });
          if (!tt) continue;
          typeId = tt._id;
        }

        const actorId = tpl.created_by_employee_id || tpl.assigned_to_employee_id;
        if (!actorId) continue;

        await taskService.createManagerTask(tenantId, actorId, {
          title: tpl.title,
          description: tpl.description || '',
          type_id: typeId,
          scope_org_node_id: tpl.scope_org_node_id,
          assigned_to_employee_id: tpl.assigned_to_employee_id || null,
          priority: tpl.priority || 'MEDIUM',
          source: 'SYSTEM',
          requires_approval: !!tpl.requires_approval,
          requires_review: !!tpl.requires_review,
          requires_evidence: !!tpl.requires_evidence,
          requires_timer: !!tpl.requires_timer,
          is_recurring: true,
          recurrence_rule_id: rule._id,
          metadata: { ...(tpl.metadata || {}), recurrence_rule_id: String(rule._id) }
        });

        rule.next_run_at = nextRunFrom(rule, now);
        await rule.save();
        generated += 1;
      } catch (e) {
        logger.error('Recurrence generation failed', { ruleId: String(rule._id), error: e.message });
      }
    }

    return { generated };
  }
}

module.exports = new RecurrenceGeneratorService();

