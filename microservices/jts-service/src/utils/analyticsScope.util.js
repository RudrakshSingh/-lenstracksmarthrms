const mongoose = require('mongoose');
const OrgNode = require('../models/OrgNode.model');
const Employee = require('../models/Employee.model');

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Map compat query `timeRange` to [start, end] on **calendar** window ending now.
 * Filters tasks by **`created_at`** within this window when set.
 */
function timeRangeToDates(timeRange) {
  if (!timeRange || typeof timeRange !== 'string') return null;
  const end = new Date();
  const start = new Date(end);
  const v = timeRange.trim().toLowerCase();
  if (v === '3months') start.setMonth(start.getMonth() - 3);
  else if (v === '6months') start.setMonth(start.getMonth() - 6);
  else if (v === '1year') start.setFullYear(start.getFullYear() - 1);
  else return null;
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Build Mongo match for Task aggregates + metadata for responses.
 * @returns {{ match: object, employeeMatch: object, meta: object, isEmpty: boolean, range: { start: Date, end: Date } | null }}
 */
async function resolveAnalyticsTaskScope(req) {
  const tenantId = req.user.tenant_id;
  const tid = new mongoose.Types.ObjectId(tenantId);
  const q = req.query || {};

  const meta = {
    timeRange: q.timeRange || null,
    department: q.department || null,
    teamId: q.teamId || null,
    taskDateField: 'created_at',
    note:
      'When timeRange is set, task rows are restricted to created_at within the window. Performance reviews use overlapping review_period vs window.'
  };

  const range = timeRangeToDates(q.timeRange);
  const match = {
    tenant_id: tid,
    is_deleted: { $ne: true }
  };

  let employeeMatch = { tenant_id: tid };
  let departmentNodeIds = null;

  if (range) {
    match.created_at = { $gte: range.start, $lte: range.end };
  }

  if (q.teamId && mongoose.Types.ObjectId.isValid(String(q.teamId))) {
    match.scope_org_node_id = new mongoose.Types.ObjectId(String(q.teamId));
  }

  if (q.department && String(q.department).trim()) {
    const re = new RegExp(escapeRegex(String(q.department).trim()), 'i');
    const nodes = await OrgNode.find({ tenant_id: tid, name: re }).select('_id').lean();
    const nodeIds = nodes.map((n) => n._id);
    departmentNodeIds = nodeIds;
    if (nodeIds.length === 0) {
      return {
        match: { _id: { $in: [] } },
        employeeMatch: { _id: { $in: [] } },
        meta,
        isEmpty: true,
        range
      };
    }
    employeeMatch = { tenant_id: tid, org_node_id: { $in: nodeIds } };
    const emps = await Employee.find(employeeMatch).select('_id').lean();
    const empIds = emps.map((e) => e._id);
    if (empIds.length === 0) {
      return {
        match: { _id: { $in: [] } },
        employeeMatch: { _id: { $in: [] } },
        meta,
        isEmpty: true,
        range
      };
    }
    match.assigned_to_employee_id = { $in: empIds };
  }

  return { match, employeeMatch, departmentNodeIds, meta, isEmpty: false, range };
}

/**
 * $lookup subpipeline from employees → tasks for one assignee, respecting same filters as `taskMatch`.
 */
function buildEmployeeTaskStatsLookupStages(tid, taskMatch) {
  const and = [
    { $eq: ['$tenant_id', tid] },
    { $eq: ['$assigned_to_employee_id', '$$empId'] },
    { $ne: ['$is_deleted', true] }
  ];
  if (taskMatch.created_at) {
    and.push({ $gte: ['$created_at', taskMatch.created_at.$gte] });
    and.push({ $lte: ['$created_at', taskMatch.created_at.$lte] });
  }
  if (taskMatch.scope_org_node_id) {
    and.push({ $eq: ['$scope_org_node_id', taskMatch.scope_org_node_id] });
  }
  return [
    { $match: { $expr: { $and: and } } },
    {
      $group: {
        _id: null,
        completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
        pending: {
          $sum: {
            $cond: [
              {
                $in: [
                  '$status',
                  [
                    'ASSIGNED',
                    'ACCEPTED',
                    'IN_PROGRESS',
                    'ON_HOLD',
                    'PENDING_APPROVAL',
                    'PENDING_REVIEW'
                  ]
                ]
              },
              1,
              0
            ]
          }
        },
        onTime: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$status', 'COMPLETED'] }, { $lte: ['$completed_at', '$due_at'] }] },
              1,
              0
            ]
          }
        }
      }
    }
  ];
}

module.exports = {
  resolveAnalyticsTaskScope,
  timeRangeToDates,
  buildEmployeeTaskStatsLookupStages
};
