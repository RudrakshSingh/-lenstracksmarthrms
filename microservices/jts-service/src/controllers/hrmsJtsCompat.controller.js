const mongoose = require('mongoose');
const taskCollaborationService = require('../services/taskCollaboration.service');
const Task = require('../models/Task.model');
const Employee = require('../models/Employee.model');
const ReportingRelationship = require('../models/ReportingRelationship.model');
const OrgNode = require('../models/OrgNode.model');
const Tenant = require('../models/Tenant.model');
const ReviewGoal = require('../models/ReviewGoal.model');
const PerformanceScore = require('../models/PerformanceScore.model');
const logger = require('../config/logger');
const { buildErrorBody, actorUnresolvedBody } = require('../utils/apiError.util');
const { toErrorPayload } = require('../utils/errorResponse');
const { resolveEmployeeId } = require('../utils/actor.util');
const selfTaskController = require('./selfTask.controller');
const { normalizeSelfTaskBody } = require('../utils/taskRequest.normalize');
const performanceManagementService = require('../services/performanceManagement.service');
const jtsAdminService = require('../services/jtsAdmin.service');
const escalationService = require('../services/escalation.service');
const {
  resolveAnalyticsTaskScope,
  buildEmployeeTaskStatsLookupStages
} = require('../utils/analyticsScope.util');

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
        return res.status(404).json(buildErrorBody({ code: 'TENANT_001_NOT_FOUND' }));
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
        return res.status(403).json(actorUnresolvedBody());
      }

      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));
      const role = String(req.user?.role || '').toUpperCase();
      const managerScopedRoles = new Set([
        'MANAGER',
        'STORE_MANAGER',
        'CLUSTER_MANAGER',
        'COUNTRY_OPS',
        'TENANT_ADMIN',
        'HOD',
        'SUPERADMIN',
        'ADMIN'
      ]);

      let scopeIds = [employeeId];
      if (managerScopedRoles.has(role)) {
        const links = await ReportingRelationship.find({
          tenant_id,
          manager_id: employeeId
        })
          .select('reportee_id')
          .lean();
        const reporteeIds = links.map((l) => l.reportee_id).filter(Boolean);
        scopeIds = [employeeId, ...reporteeIds];
      }

      const filter = {
        tenant_id,
        $or: [
          { assigned_to_employee_id: { $in: scopeIds } },
          { created_by_employee_id: { $in: scopeIds } }
        ]
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
        return res.status(403).json(actorUnresolvedBody());
      }

      const requested = req.query.approverId;
      if (requested && requested !== myEmployeeId.toString() && !isPrivileged(req.user.role)) {
        return res.status(403).json(
          buildErrorBody({
            code: 'JTS_APPROVAL_QUERY_FORBIDDEN',
            message: 'Cannot list approvals for another approver without elevated role'
          })
        );
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
        return res.status(403).json(actorUnresolvedBody());
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
        return res.status(403).json(actorUnresolvedBody());
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
   * Shared analytics payload (full). Split routes return slices of this object.
   * Respects query: `timeRange`, `department`, `teamId` (see `analyticsScope.util.js`).
   */
  async _buildAnalyticsData(req) {
    const tenantId = req.user.tenant_id;
    const tid = new mongoose.Types.ObjectId(tenantId);

    const scope = await resolveAnalyticsTaskScope(req);
    const { match: taskMatch, employeeMatch, meta: filtersApplied, isEmpty, range } = scope;

    if (isEmpty) {
      return {
        overall: {
          avgRating: null,
          totalReviews: 0,
          completedTasks: 0,
          pendingTasks: 0,
          onTimeCompletion: null
        },
        byDepartment: [],
        byTeam: [],
        byEmployee: [],
        byTaskType: [],
        trends: {
          ratings: [],
          tasksCompleted: [],
          onTimeCompletion: [],
          monthlyPerformance: []
        },
        byStatus: {},
        openAlerts: 0,
        filtersApplied,
        filtersYieldedNoTasks: true
      };
    }

    const lookupTaskMatch = { ...taskMatch };
    delete lookupTaskMatch.assigned_to_employee_id;
    const taskLookupPipeline = buildEmployeeTaskStatsLookupStages(tid, lookupTaskMatch);

    const byStatus = await Task.aggregate([
      { $match: taskMatch },
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

    const reviewQuery = { limit: 200 };
    if (range) {
      reviewQuery.reviewPeriodOverlaps = { start: range.start, end: range.end };
    }
    const reviews = await performanceManagementService.listReviews(tenantId, reviewQuery);
    const ratings = reviews
      .map((r) => r.manager_rating)
      .filter((x) => typeof x === 'number');
    const avgRating = ratings.length
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : null;

    const onTimeCount = await Task.countDocuments({
      $and: [
        { ...taskMatch },
        { status: 'COMPLETED' },
        { $expr: { $lte: ['$completed_at', '$due_at'] } }
      ]
    });
    const completedCount = statusMap.COMPLETED || 0;
    const onTimeCompletion =
      completedCount > 0 ? Math.round((onTimeCount / completedCount) * 100) : null;

    const alertQuery = { limit: 50 };
    if (range) {
      alertQuery.created_at = { $gte: range.start, $lte: range.end };
    }
    const alerts = await performanceManagementService.listAlerts(tenantId, alertQuery);

    let deptAgg = [];
    try {
      deptAgg = await Employee.aggregate([
        { $match: employeeMatch },
        {
          $lookup: {
            from: 'tasks',
            let: { empId: '$_id' },
            pipeline: taskLookupPipeline,
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
        teamId: x._id ? String(x._id) : null,
        name: deptMap.get(String(x._id)) || 'Unknown',
        avgRating: null,
        tasksCompleted: completedDept,
        tasksPending: x.tasksPending || 0,
        onTime: completedDept > 0 ? Math.round(((x.onTimeCompleted || 0) / completedDept) * 100) : null
      };
    });

    let byEmployee = [];
    try {
      byEmployee = await Task.aggregate([
        {
          $match: {
            ...taskMatch,
            assigned_to_employee_id: { $ne: null }
          }
        },
        {
          $group: {
            _id: '$assigned_to_employee_id',
            total: { $sum: 1 },
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
                        'PENDING_REVIEW',
                        'BLOCKED',
                        'REOPENED'
                      ]
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        },
        { $lookup: { from: 'employees', localField: '_id', foreignField: '_id', as: 'emp' } },
        { $unwind: { path: '$emp', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            employeeId: '$_id',
            name: '$emp.name',
            code: '$emp.code',
            total: 1,
            completed: 1,
            pending: 1
          }
        },
        { $sort: { total: -1 } },
        { $limit: 200 }
      ]);
    } catch (e) {
      logger.warn('Analytics by-employee aggregation', { error: e.message });
    }

    let byTaskType = [];
    try {
      byTaskType = await Task.aggregate([
        { $match: taskMatch },
        {
          $group: {
            _id: '$type_id',
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] } }
          }
        },
        { $lookup: { from: 'tasktypes', localField: '_id', foreignField: '_id', as: 'tt' } },
        { $unwind: { path: '$tt', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            typeId: '$_id',
            name: '$tt.name',
            code: '$tt.code',
            total: 1,
            completed: 1
          }
        },
        { $sort: { total: -1 } }
      ]);
    } catch (e) {
      logger.warn('Analytics by-task-type aggregation', { error: e.message });
    }

    const scoreQ = {
      tenant_id: tenantId,
      period_type: 'MONTHLY'
    };
    if (range) {
      scoreQ.period_start_date = { $gte: range.start, $lte: range.end };
    }
    const monthlyScores = await PerformanceScore.find(scoreQ)
      .sort({ period_start_date: 1 })
      .limit(12)
      .select('total_performance_score period_start_date');

    return {
      overall: {
        avgRating,
        totalReviews: reviews.length,
        completedTasks: completed,
        pendingTasks: pending,
        onTimeCompletion
      },
      byDepartment,
      byTeam: byDepartment,
      byEmployee,
      byTaskType,
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
      openAlerts: alerts.filter((a) => !a.resolved_at).length,
      filtersApplied,
      filtersYieldedNoTasks: false
    };
  }

  async getAnalytics(req, res) {
    try {
      const raw = await this._buildAnalyticsData(req);
      const { filtersApplied, filtersYieldedNoTasks, ...data } = raw;
      res.json({
        success: true,
        data,
        meta: { view: 'full', filters: filtersApplied, filtersEmpty: !!filtersYieldedNoTasks },
        message: 'Analytics summary retrieved successfully'
      });
    } catch (error) {
      logger.error('JTS analytics compat', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_ANALYTICS_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async getAnalyticsOverview(req, res) {
    try {
      const raw = await this._buildAnalyticsData(req);
      const { filtersApplied, filtersYieldedNoTasks } = raw;
      res.json({
        success: true,
        data: {
          overall: raw.overall,
          byStatus: raw.byStatus,
          openAlerts: raw.openAlerts
        },
        meta: { view: 'overview', filters: filtersApplied, filtersEmpty: !!filtersYieldedNoTasks },
        message: 'Analytics overview retrieved successfully'
      });
    } catch (error) {
      logger.error('JTS analytics overview', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_ANALYTICS_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async getAnalyticsByEmployee(req, res) {
    try {
      const raw = await this._buildAnalyticsData(req);
      const { filtersApplied, filtersYieldedNoTasks } = raw;
      res.json({
        success: true,
        data: { byEmployee: raw.byEmployee },
        meta: { view: 'by-employee', filters: filtersApplied, filtersEmpty: !!filtersYieldedNoTasks },
        message: 'Analytics by employee retrieved successfully'
      });
    } catch (error) {
      logger.error('JTS analytics by employee', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_ANALYTICS_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async getAnalyticsByTeam(req, res) {
    try {
      const raw = await this._buildAnalyticsData(req);
      const { filtersApplied, filtersYieldedNoTasks } = raw;
      res.json({
        success: true,
        data: { byTeam: raw.byTeam, byDepartment: raw.byDepartment },
        meta: { view: 'by-team', filters: filtersApplied, filtersEmpty: !!filtersYieldedNoTasks },
        message: 'Analytics by team retrieved successfully'
      });
    } catch (error) {
      logger.error('JTS analytics by team', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_ANALYTICS_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async getAnalyticsByTaskType(req, res) {
    try {
      const raw = await this._buildAnalyticsData(req);
      const { filtersApplied, filtersYieldedNoTasks } = raw;
      res.json({
        success: true,
        data: { byTaskType: raw.byTaskType },
        meta: { view: 'by-task-type', filters: filtersApplied, filtersEmpty: !!filtersYieldedNoTasks },
        message: 'Analytics by task type retrieved successfully'
      });
    } catch (error) {
      logger.error('JTS analytics by task type', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_ANALYTICS_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  /** GET /api/jts/sla-policies — alias of catalog GET /api/jts/catalog/sla-rules */
  async listSlaPoliciesPublic(req, res) {
    try {
      const rows = await jtsAdminService.listSlaRules(req.user.tenant_id);
      res.json({
        success: true,
        data: rows,
        meta: { canonicalPath: '/api/jts/catalog/sla-rules' },
        message: 'SLA policies retrieved successfully'
      });
    } catch (error) {
      logger.error('listSlaPoliciesPublic', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async getSlaPolicyByIdPublic(req, res) {
    try {
      const row = await jtsAdminService.getSlaRule(req.user.tenant_id, req.params.id);
      res.json({
        success: true,
        data: row,
        meta: { canonicalPath: `/api/jts/catalog/sla-rules/${req.params.id}` },
        message: 'SLA policy retrieved successfully'
      });
    } catch (error) {
      logger.error('getSlaPolicyByIdPublic', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_ADMIN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  /** GET /api/jts/escalations/console — recent events + active rules + escalated task count */
  async getEscalationConsole(req, res) {
    try {
      const data = await escalationService.getConsoleSnapshot(req.user.tenant_id);
      res.json({
        success: true,
        data,
        meta: { view: 'escalation-console' },
        message: 'Escalation console snapshot retrieved successfully'
      });
    } catch (error) {
      logger.error('getEscalationConsole', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_ESCALATION_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  /**
   * GET /api/jts/reviews/queue — performance reviews + pending task approvals (same tenant).
   */
  async getUnifiedReviewQueue(req, res) {
    try {
      const { tenant_id } = req.user;
      const approverId = await resolveEmployeeId(tenant_id, req.user);
      const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
      const perfQuery = { limit, status: req.query.status };
      if (req.query.employeeId && mongoose.Types.ObjectId.isValid(String(req.query.employeeId))) {
        perfQuery.employee_id = req.query.employeeId;
      }
      const performanceReviews = await performanceManagementService.listReviews(tenant_id, perfQuery);
      let taskApprovalsPending = [];
      if (approverId) {
        taskApprovalsPending = await taskCollaborationService.listMyPendingApprovals(tenant_id, approverId);
      }
      res.json({
        success: true,
        data: {
          performanceReviews,
          taskApprovalsPending
        },
        meta: { view: 'unified-review-queue' },
        message: 'Unified review queue retrieved successfully'
      });
    } catch (error) {
      logger.error('getUnifiedReviewQueue', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_PERF_ERROR');
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
