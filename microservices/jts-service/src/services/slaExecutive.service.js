const mongoose = require('mongoose');
const Task = require('../models/Task.model');
const SlaBreachLog = require('../models/SlaBreachLog.model');

const ACTIVE_SLA_STATUSES = [
  'ASSIGNED',
  'ACCEPTED',
  'IN_PROGRESS',
  'ON_HOLD',
  'PENDING_REVIEW',
  'BLOCKED',
  'REOPENED'
];

function notDeleted(base = {}) {
  return { ...base, is_deleted: { $ne: true } };
}

function toTenantOid(tenantId) {
  if (typeof tenantId === 'string' && mongoose.Types.ObjectId.isValid(tenantId)) {
    return new mongoose.Types.ObjectId(tenantId);
  }
  return tenantId;
}

class SlaExecutiveService {
  /**
   * Leadership / ops view: at-risk work, active breaches, team rollup, recent breach audit rows.
   */
  async getExecutiveSummary(tenantId, options = {}) {
    const tenantOid = toTenantOid(tenantId);

    const hours = Math.min(Math.max(Number(options.hours) || 24, 1), 168);
    const teamLimit = Math.min(Math.max(Number(options.teamLimit) || 30, 5), 100);
    const recentLimit = Math.min(Math.max(Number(options.recentLimit) || 25, 5), 100);
    const teamId =
      options.teamId && mongoose.Types.ObjectId.isValid(String(options.teamId))
        ? new mongoose.Types.ObjectId(String(options.teamId))
        : null;

    const now = new Date();
    const warnUntil = new Date(now.getTime() + 60 * 60 * 1000);
    const since = new Date(now.getTime() - hours * 60 * 60 * 1000);

    const baseMatch = notDeleted({
      tenant_id: tenantOid,
      status: { $in: ACTIVE_SLA_STATUSES },
      due_at: { $lte: warnUntil }
    });
    if (teamId) baseMatch.scope_org_node_id = teamId;

    let breachQuery = { tenant_id: tenantOid, created_at: { $gte: since } };
    let unackedQuery = {
      tenant_id: tenantOid,
      acknowledged_at: null,
      created_at: { $gte: since }
    };
    if (teamId) {
      const scopedTasks = await Task.find(
        notDeleted({ tenant_id: tenantOid, scope_org_node_id: teamId })
      )
        .select('_id')
        .lean();
      const ids = scopedTasks.map((r) => r._id);
      breachQuery.task_id = { $in: ids };
      unackedQuery.task_id = { $in: ids };
    }

    const [atRiskCount, breachedActiveCount, teamHeatmap, recentRaw, pendingAcknowledgments] =
      await Promise.all([
        Task.countDocuments(baseMatch),
        Task.countDocuments(
          notDeleted({
            tenant_id: tenantOid,
            status: { $in: ACTIVE_SLA_STATUSES },
            due_at: { $lt: now },
            ...(teamId ? { scope_org_node_id: teamId } : {})
          })
        ),
        Task.aggregate([
          { $match: baseMatch },
          {
            $group: {
              _id: '$scope_org_node_id',
              atRisk: { $sum: 1 },
              breached: {
                $sum: {
                  $cond: [{ $lt: ['$due_at', now] }, 1, 0]
                }
              }
            }
          },
          { $sort: { breached: -1, atRisk: -1 } },
          { $limit: teamLimit },
          {
            $lookup: {
              from: 'orgnodes',
              localField: '_id',
              foreignField: '_id',
              as: 'org'
            }
          },
          { $unwind: { path: '$org', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              teamId: { $toString: '$_id' },
              name: '$org.name',
              code: '$org.code',
              type: '$org.type',
              atRisk: 1,
              breached: 1
            }
          }
        ]),
        SlaBreachLog.find(breachQuery)
          .sort({ created_at: -1 })
          .limit(recentLimit)
          .populate('task_id', 'title code status priority due_at scope_org_node_id')
          .populate('employee_id', 'name code')
          .populate('acknowledged_by_employee_id', 'name code')
          .lean(),
        SlaBreachLog.countDocuments(unackedQuery)
      ]);

    const recentBreaches = recentRaw.map((row) => ({
      id: String(row._id),
      taskId: row.task_id ? String(row.task_id._id || row.task_id) : null,
      task: row.task_id && row.task_id.title
        ? {
            title: row.task_id.title,
            code: row.task_id.code,
            status: row.task_id.status,
            priority: row.task_id.priority,
            dueAt: row.task_id.due_at
          }
        : null,
      assignee: row.employee_id
        ? {
            id: String(row.employee_id._id),
            name: row.employee_id.name,
            code: row.employee_id.code
          }
        : null,
      dueAt: row.due_at,
      breachedAt: row.breached_at,
      delayMinutes: row.delay_minutes,
      breachReasonCode: row.breach_reason_code || null,
      acknowledgedAt: row.acknowledged_at || null,
      acknowledgedBy: row.acknowledged_by_employee_id
        ? {
            id: String(row.acknowledged_by_employee_id._id),
            name: row.acknowledged_by_employee_id.name,
            code: row.acknowledged_by_employee_id.code
          }
        : null,
      acknowledgmentNote: row.acknowledgment_note || null,
      loggedAt: row.created_at
    }));

    return {
      generatedAt: now.toISOString(),
      windowHours: hours,
      summary: {
        atRiskCount: atRiskCount,
        breachedActiveCount: breachedActiveCount,
        pendingAcknowledgments
      },
      teamHeatmap,
      recentBreaches
    };
  }
}

module.exports = new SlaExecutiveService();
