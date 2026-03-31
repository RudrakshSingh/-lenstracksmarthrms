const mongoose = require('mongoose');
const taskCollaborationService = require('../services/taskCollaboration.service');
const Task = require('../models/Task.model');
const Employee = require('../models/Employee.model');
const OrgNode = require('../models/OrgNode.model');
const Tenant = require('../models/Tenant.model');
const ReviewGoal = require('../models/ReviewGoal.model');
const PerformanceScore = require('../models/PerformanceScore.model');
const logger = require('../config/logger');
const { toErrorPayload } = require('../utils/errorResponse');
const { resolveEmployeeId } = require('../utils/actor.util');
const selfTaskController = require('./selfTask.controller');
const { normalizeSelfTaskBody } = require('../utils/taskRequest.normalize');
const performanceManagementService = require('../services/performanceManagement.service');

function isPrivileged(role) {
  const r = (role || '').toUpperCase();
  return [
    'TENANT_ADMIN',
    'COUNTRY_OPS',
    'SUPERADMIN',
    'ADMIN',
    'HOD',
    'CLUSTER_MANAGER'
  ].includes(r);
}

function serializePendingApproval(row) {
  const a = row.toObject ? row.toObject() : row;
  const task = a.task_id;
  const requester = a.requested_by_employee_id;
  return {
    id: a._id.toString(),
    taskId: task?._id?.toString(),
    taskTitle: task?.title,
    requestedByEmployeeId: requester?._id?.toString() || String(a.requested_by_employee_id),
    approverEmployeeId: a.approver_employee_id?.toString(),
    status: a.status,
    reason: a.reason,
    createdAt: a.created_at,
    decidedAt: a.decided_at,
    priority: task?.priority,
    dueDate: task?.due_at,
    description: task?.description,
    employeeName: requester?.name,
    employeeId: requester?.code,
    submittedDate: a.created_at
  };
}

class HrmsJtsCompatController {
  async getCurrentTenant(req, res) {
    try {
      const tenant = await Tenant.findById(req.user.tenant_id).lean();
      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: 'TENANT_001_NOT_FOUND',
          code: 'TENANT_001_NOT_FOUND'
        });
      }
      res.json({ success: true, data: tenant, message: 'Current tenant retrieved successfully' });
    } catch (error) {
      logger.error('Current tenant (compat)', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_TENANT_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async getMyTasks(req, res) {
    try {
      const { tenant_id } = req.user;
      const employeeId = await resolveEmployeeId(tenant_id, req.user);
      if (!employeeId) {
        return res.status(403).json({
          success: false,
          error: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED',
          code: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED'
        });
      }

      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));
      const filter = {
        tenant_id,
        assigned_to_employee_id: employeeId
      };
      if (req.query.status) filter.status = req.query.status;

      const rows = await Task.find(filter)
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      const total = await Task.countDocuments(filter);

      res.json({
        success: true,
        data: rows,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        message: 'My tasks retrieved successfully'
      });
    } catch (error) {
      logger.error('List my tasks (compat)', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_TASKS_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  serializeReview(row) {
    const r = row.toObject ? row.toObject() : row;
    const totalTasks = r.total_tasks_completed || 0;
    return {
      id: String(r._id),
      employeeId: String(r.employee_id),
      employeeName: r.employee_id?.name || r.employee_name || null,
      reviewedBy: String(r.reviewer_employee_id),
      reviewedByName: r.reviewer_employee_id?.name || r.reviewer_name || null,
      department: r.employee_department || null,
      reviewPeriod: {
        start: r.review_period_start,
        end: r.review_period_end,
        type: r.review_type
      },
      overallRating: r.manager_rating || null,
      status: r.status,
      reviewDate: r.updated_at || r.created_at,
      goals: r.goals_next_period || '',
      goalsCompleted: r.goals_completed != null ? r.goals_completed : null,
      tasksCompleted: totalTasks,
      tasksTotal: r.tasks_total != null ? r.tasks_total : totalTasks
    };
  }

  /**
   * GET /api/jts/approvals/pending?approverId=
   * Same data as /tasks/approvals/pending/me when approverId omitted.
   */
  async listPendingApprovals(req, res) {
    try {
      const { tenant_id } = req.user;
      const myEmployeeId = await resolveEmployeeId(tenant_id, req.user);
      if (!myEmployeeId) {
        return res.status(403).json({
          success: false,
          error: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED',
          code: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED'
        });
      }

      const requested = req.query.approverId;
      if (requested && requested !== myEmployeeId.toString() && !isPrivileged(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Cannot list approvals for another approver',
          code: 'JTS_APPROVAL_QUERY_FORBIDDEN'
        });
      }

      const approverId = requested || myEmployeeId;
      const rows = await taskCollaborationService.listMyPendingApprovals(tenant_id, approverId);
      res.json({
        success: true,
        data: rows.map(serializePendingApproval),
        message: 'Pending approvals retrieved successfully'
      });
    } catch (error) {
      logger.error('List pending approvals (compat)', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_COLLAB_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async approveApproval(req, res) {
    try {
      const { tenant_id } = req.user;
      const employeeId = await resolveEmployeeId(tenant_id, req.user);
      if (!employeeId) {
        return res.status(403).json({
          success: false,
          error: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED',
          code: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED'
        });
      }

      const row = await taskCollaborationService.decideApproval(
        tenant_id,
        req.params.approvalId,
        employeeId,
        req.user.role,
        { status: 'APPROVED', reason: req.body?.notes || null }
      );
      res.json({ success: true, data: row, message: 'Approval granted' });
    } catch (error) {
      logger.error('Approve (compat)', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_COLLAB_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async rejectApproval(req, res) {
    try {
      const { tenant_id } = req.user;
      const employeeId = await resolveEmployeeId(tenant_id, req.user);
      if (!employeeId) {
        return res.status(403).json({
          success: false,
          error: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED',
          code: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED'
        });
      }

      const row = await taskCollaborationService.decideApproval(
        tenant_id,
        req.params.approvalId,
        employeeId,
        req.user.role,
        { status: 'REJECTED', reason: req.body?.reason }
      );
      res.json({ success: true, data: row, message: 'Approval rejected' });
    } catch (error) {
      logger.error('Reject (compat)', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_COLLAB_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  /**
   * GET /api/jts/analytics — lightweight tenant task stats (MFE can adopt)
   */
  async getAnalytics(req, res) {
    try {
      const tenantId = req.user.tenant_id;
      const tid = new mongoose.Types.ObjectId(tenantId);

      const byStatus = await Task.aggregate([
        { $match: { tenant_id: tid } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);

      const statusMap = Object.fromEntries(byStatus.map((x) => [x._id, x.count]));
      const completed =
        (statusMap.COMPLETED || 0) + (statusMap.PENDING_REVIEW || 0);
      const pending =
        (statusMap.ASSIGNED || 0) +
        (statusMap.ACCEPTED || 0) +
        (statusMap.IN_PROGRESS || 0) +
        (statusMap.ON_HOLD || 0) +
        (statusMap.PENDING_APPROVAL || 0);

      const reviews = await performanceManagementService.listReviews(tenantId, { limit: 200 });
      const ratings = reviews
        .map((r) => r.manager_rating)
        .filter((x) => typeof x === 'number');
      const avgRating = ratings.length
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : null;

      const onTimeCount = await Task.countDocuments({
        tenant_id: tenantId,
        status: 'COMPLETED',
        $expr: { $lte: ['$completed_at', '$due_at'] }
      });
      const completedCount = statusMap.COMPLETED || 0;
      const onTimeCompletion = completedCount > 0
        ? Math.round((onTimeCount / completedCount) * 100)
        : null;

      const alerts = await performanceManagementService.listAlerts(tenantId, { limit: 50 });
      let deptAgg = [];
      try {
        deptAgg = await Employee.aggregate([
          { $match: { tenant_id: tid } },
          {
            $lookup: {
              from: 'tasks',
              let: { empId: '$_id' },
              pipeline: [
                { $match: { $expr: { $and: [{ $eq: ['$tenant_id', tid] }, { $eq: ['$assigned_to_employee_id', '$$empId'] }] } } },
                {
                  $group: {
                    _id: null,
                    completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } },
                    pending: {
                      $sum: {
                        $cond: [
                          { $in: ['$status', ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'ON_HOLD', 'PENDING_APPROVAL', 'PENDING_REVIEW']] },
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
              ],
              as: 'taskStats'
            }
          },
          {
            $group: {
              _id: '$org_node_id',
              tasksCompleted: { $sum: { $ifNull: [{ $arrayElemAt: ['$taskStats.completed', 0] }, 0] } },
              tasksPending: { $sum: { $ifNull: [{ $arrayElemAt: ['$taskStats.pending', 0] }, 0] } },
              onTimeCompleted: { $sum: { $ifNull: [{ $arrayElemAt: ['$taskStats.onTime', 0] }, 0] } }
            }
          }
        ]);
      } catch (e) {
        logger.warn('Analytics department aggregation fallback', { error: e.message });
      }

      const deptIds = deptAgg.map((x) => x._id).filter(Boolean);
      const deptRows = await OrgNode.find({ _id: { $in: deptIds }, tenant_id: tenantId }).select('name');
      const deptMap = new Map(deptRows.map((d) => [String(d._id), d.name]));
      const byDepartment = deptAgg.map((x) => {
        const completedDept = x.tasksCompleted || 0;
        return {
          name: deptMap.get(String(x._id)) || 'Unknown',
          avgRating: null,
          tasksCompleted: completedDept,
          tasksPending: x.tasksPending || 0,
          onTime: completedDept > 0 ? Math.round(((x.onTimeCompleted || 0) / completedDept) * 100) : null
        };
      });

      const monthlyScores = await PerformanceScore.find({
        tenant_id: tenantId,
        period_type: 'MONTHLY'
      })
        .sort({ period_start_date: 1 })
        .limit(12)
        .select('total_performance_score period_start_date');

      res.json({
        success: true,
        data: {
          overall: {
            avgRating,
            totalReviews: reviews.length,
            completedTasks: completed,
            pendingTasks: pending,
            onTimeCompletion
          },
          byDepartment,
          trends: {
            ratings: ratings.slice(-12),
            tasksCompleted: byDepartment.map((d) => d.tasksCompleted),
            onTimeCompletion: byDepartment.map((d) => d.onTime || 0),
            monthlyPerformance: monthlyScores.map((s) => ({
              date: s.period_start_date,
              score: s.total_performance_score
            }))
          },
          byStatus: statusMap,
          openAlerts: alerts.filter((a) => !a.resolved_at).length
        },
        message: 'Analytics summary retrieved successfully'
      });
    } catch (error) {
      logger.error('JTS analytics compat', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_ANALYTICS_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  /** POST /api/jts/self-tasks — alias for POST /tasks/self */
  createSelfTask(req, res) {
    req.body = normalizeSelfTaskBody(req.body);
    return selfTaskController.createSelfTask(req, res);
  }

  async listReviews(req, res) {
    try {
      const tenantId = req.user.tenant_id;
      const rows = await performanceManagementService.listReviews(tenantId, {
        employee_id: req.query.employeeId,
        status: req.query.status,
        limit: req.query.limit
      });
      const reviewIds = rows.map((r) => r._id);
      const goalCounts = await ReviewGoal.aggregate([
        {
          $match: {
            tenant_id: new mongoose.Types.ObjectId(tenantId),
            review_id: { $in: reviewIds }
          }
        },
        { $group: { _id: '$review_id', count: { $sum: 1 } } }
      ]);
      const goalMap = new Map(goalCounts.map((g) => [String(g._id), g.count]));

      const empIds = [];
      for (const r of rows) {
        empIds.push(r.employee_id);
        empIds.push(r.reviewer_employee_id);
      }
      const employees = await Employee.find({ _id: { $in: empIds }, tenant_id: tenantId }).select(
        'name code org_node_id'
      );
      const empMap = new Map(employees.map((e) => [String(e._id), e]));
      const orgIds = [...new Set(employees.map((e) => String(e.org_node_id)).filter(Boolean))];
      const orgRows = await OrgNode.find({ _id: { $in: orgIds }, tenant_id: tenantId }).select('name');
      const orgMap = new Map(orgRows.map((o) => [String(o._id), o.name]));

      res.json({
        success: true,
        data: rows.map((r) => {
          const obj = r.toObject ? r.toObject() : r;
          const e = empMap.get(String(obj.employee_id));
          const rv = empMap.get(String(obj.reviewer_employee_id));
          return this.serializeReview({
            ...obj,
            employee_id: e ? { _id: e._id, name: e.name } : obj.employee_id,
            reviewer_employee_id: rv ? { _id: rv._id, name: rv.name } : obj.reviewer_employee_id,
            employee_department: e?.org_node_id ? orgMap.get(String(e.org_node_id)) || null : null,
            goals_completed: null,
            tasks_total: obj.total_tasks_completed || 0
          });
        }).map((row) => ({
          ...row,
          goalsTotal: goalMap.get(String(row.id)) || 0
        })),
        message: 'Reviews retrieved successfully'
      });
    } catch (error) {
      logger.error('Reviews compat', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_PERF_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }
}

module.exports = new HrmsJtsCompatController();
