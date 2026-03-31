const Task = require('../models/Task.model');
const TaskType = require('../models/TaskType.model');
const OrgNode = require('../models/OrgNode.model');
const Employee = require('../models/Employee.model');
const TaskStatusHistory = require('../models/TaskStatusHistory.model');
const TaskAttachment = require('../models/TaskAttachment.model');
const TaskActivity = require('../models/TaskActivity.model');
const RecurrenceRule = require('../models/RecurrenceRule.model');
const slaCalculator = require('./slaCalculator.service');
const taskStatusService = require('./taskStatus.service');
const taskActivityService = require('./taskActivity.service');
const logger = require('../config/logger');

const taskPopulate = [
  { path: 'type_id', select: 'name code category default_priority' },
  { path: 'assigned_to_employee_id', select: 'name email code' },
  { path: 'created_by_employee_id', select: 'name email code' },
  { path: 'reviewer_employee_id', select: 'name email code' },
  { path: 'approver_employee_id', select: 'name email code' },
  { path: 'scope_org_node_id', select: 'name code type' }
];

function notDeleted(base = {}) {
  return { ...base, is_deleted: { $ne: true } };
}

/**
 * Next human-readable task code per tenant (JTS-YYYY-NNNNNN).
 */
async function allocateNextTaskCode(tenantId) {
  const year = new Date().getFullYear();
  const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const prefix = `JTS-${year}-`;
  const rows = await Task.find(
    notDeleted({
      tenant_id: tenantId,
      code: { $regex: new RegExp(`^${esc(prefix)}`) }
    })
  )
    .select('code')
    .lean();

  let max = 0;
  for (const r of rows) {
    const n = parseInt(String(r.code).slice(prefix.length), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const next = max + 1 + attempt;
    const code = `${prefix}${String(next).padStart(6, '0')}`;
    const clash = await Task.findOne(notDeleted({ tenant_id: tenantId, code }))
      .select('_id')
      .lean();
    if (!clash) return code;
  }
  throw new Error('TASK_CODE_ALLOCATION_FAILED');
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isPrivileged(role) {
  const r = String(role || '').toUpperCase();
  return [
    'TENANT_ADMIN',
    'COUNTRY_OPS',
    'SUPERADMIN',
    'ADMIN',
    'HOD',
    'CLUSTER_MANAGER',
    'MANAGER',
    'STORE_MANAGER'
  ].includes(r);
}

class TaskService {
  async hydrateAttachmentKeys(tenantId, tasks) {
    if (!tasks || tasks.length === 0) return tasks;
    const taskIds = tasks.map((t) => t._id);
    const rows = await TaskAttachment.find({
      tenant_id: tenantId,
      task_id: { $in: taskIds }
    }).select('_id task_id file_key created_at');

    const byTask = new Map();
    for (const row of rows) {
      const key = String(row.task_id);
      if (!byTask.has(key)) byTask.set(key, []);
      byTask.get(key).push({
        id: String(row._id),
        file_key: row.file_key
      });
    }
    for (const task of tasks) {
      const existing = task.metadata && typeof task.metadata === 'object' ? task.metadata : {};
      const refs = byTask.get(String(task._id)) || [];
      task.metadata = {
        ...existing,
        attachment_keys: refs.map((x) => x.file_key),
        attachment_refs: refs
      };
    }
    return tasks;
  }
  /**
   * Create a manager task
   */
  async createManagerTask(tenantId, actorId, dto) {
    // Validate inputs
    const taskType = await TaskType.findOne({ _id: dto.type_id, tenant_id: tenantId });
    if (!taskType) throw new Error('TASK_TYPE_001_NOT_FOUND');

    const orgNode = await OrgNode.findOne({ _id: dto.scope_org_node_id, tenant_id: tenantId });
    if (!orgNode) throw new Error('ORG_NODE_001_NOT_FOUND');

    if (dto.assigned_to_employee_id) {
      const assignee = await Employee.findOne({ _id: dto.assigned_to_employee_id, tenant_id: tenantId });
      if (!assignee) throw new Error('EMPLOYEE_001_NOT_FOUND');
    }

    if (dto.reviewer_employee_id) {
      const rev = await Employee.findOne({ _id: dto.reviewer_employee_id, tenant_id: tenantId });
      if (!rev) throw new Error('EMPLOYEE_001_NOT_FOUND');
    }
    if (dto.approver_employee_id) {
      const ap = await Employee.findOne({ _id: dto.approver_employee_id, tenant_id: tenantId });
      if (!ap) throw new Error('EMPLOYEE_001_NOT_FOUND');
    }

    const code = await allocateNextTaskCode(tenantId);

    // Calculate SLA
    const slaMinutes = await slaCalculator.resolveSlaMinutes(
      tenantId,
      dto.type_id,
      dto.priority || taskType.default_priority,
      dto.sla_minutes_override
    );

    // Calculate due date
    const dueAt = await slaCalculator.calculateDueDate(
      tenantId,
      dto.scope_org_node_id,
      slaMinutes,
      new Date()
    );

    const meta = { ...(dto.metadata && typeof dto.metadata === 'object' ? dto.metadata : {}) };
    if (dto.workday_id != null && meta.workday_id == null) {
      meta.workday_id = dto.workday_id;
    }

    // Create task
    const task = await Task.create({
      tenant_id: tenantId,
      code,
      title: dto.title,
      description: dto.description,
      category: dto.category != null ? dto.category : taskType.category || undefined,
      priority: dto.priority || taskType.default_priority,
      scope_org_node_id: dto.scope_org_node_id,
      created_by_employee_id: actorId,
      assigned_to_employee_id: dto.assigned_to_employee_id || null,
      reviewer_employee_id: dto.reviewer_employee_id || null,
      approver_employee_id: dto.approver_employee_id || null,
      type_id: dto.type_id,
      source: dto.source || 'MANAGER',
      requires_approval: dto.requires_approval || false,
      requires_review: dto.requires_review === true,
      requires_evidence: dto.requires_evidence === true,
      requires_timer: dto.requires_timer === true,
      status: dto.assigned_to_employee_id ? 'ASSIGNED' : 'DRAFT',
      sla_minutes: slaMinutes,
      due_at: dueAt,
      sla_started_at: new Date(),
      workday_id: dto.workday_id != null ? dto.workday_id : meta.workday_id || undefined,
      dependency_task_ids: Array.isArray(dto.dependency_task_ids) ? dto.dependency_task_ids : [],
      checklist_items: Array.isArray(dto.checklist_items) ? dto.checklist_items : [],
      checklist_completion_required: dto.checklist_completion_required === true,
      is_recurring: dto.is_recurring === true,
      recurrence_rule_id: dto.recurrence_rule_id || undefined,
      last_activity_at: new Date(),
      is_deleted: false,
      metadata: meta
    });

    // Log initial status without transition validation.
    await TaskStatusHistory.create({
      tenant_id: tenantId,
      task_id: task._id,
      from_status: null,
      to_status: task.status,
      changed_by_employee_id: actorId,
      changed_at: new Date(),
      reason: 'Task created'
    });

    try {
      await taskActivityService.record(tenantId, task._id, actorId, 'CREATED', {
        code: task.code,
        status: task.status
      });
    } catch (e) {
      logger.warn('task activity CREATED failed', { error: e.message });
    }

    return task;
  }

  /**
   * Get tasks with filters
   */
  async getTasks(tenantId, filters = {}) {
    const query = notDeleted({ tenant_id: tenantId });

    if (filters.status) {
      query.status = Array.isArray(filters.status) ? { $in: filters.status } : filters.status;
    }

    if (filters.priority) {
      query.priority = filters.priority;
    }

    if (filters.type_id) {
      query.type_id = filters.type_id;
    }

    if (filters.assigned_to_employee_id) {
      query.assigned_to_employee_id = filters.assigned_to_employee_id;
    }

    if (filters.created_by_employee_id) {
      query.created_by_employee_id = filters.created_by_employee_id;
    }

    if (filters.scope_org_node_id) {
      query.scope_org_node_id = filters.scope_org_node_id;
    }

    if (filters.search) {
      query.title = { $regex: escapeRegex(filters.search), $options: 'i' };
    }

    if (filters.workday_id) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [{ workday_id: filters.workday_id }, { 'metadata.workday_id': filters.workday_id }]
      });
    }

    if (typeof filters.requires_approval === 'boolean') {
      query.requires_approval = filters.requires_approval;
    }

    if (filters.date_from || filters.date_to) {
      query.due_at = {};
      if (filters.date_from) query.due_at.$gte = new Date(filters.date_from);
      if (filters.date_to) query.due_at.$lte = new Date(filters.date_to);
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const skip = (page - 1) * limit;

    const tasks = await Task.find(query)
      .populate('type_id', 'name code category default_priority')
      .populate('assigned_to_employee_id', 'name email code')
      .populate('created_by_employee_id', 'name email code')
      .populate('scope_org_node_id', 'name code type')
      .sort({ due_at: 1 })
      .skip(skip)
      .limit(limit);

    await this.hydrateAttachmentKeys(tenantId, tasks);
    const total = await Task.countDocuments(query);

    return {
      tasks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get task by ID
   */
  async getTaskById(tenantId, taskId) {
    const task = await Task.findOne(notDeleted({ _id: taskId, tenant_id: tenantId })).populate(taskPopulate);
    if (!task) return null;
    await this.hydrateAttachmentKeys(tenantId, [task]);
    return task;
  }

  /**
   * Partial update (PUT/PATCH). If dto.status is set, runs validated transition first.
   */
  async updateTask(tenantId, taskId, dto, actorId) {
    if (dto.status) {
      await taskStatusService.changeStatus(tenantId, taskId, dto.status, {
        actorId,
        reason: dto.reason || dto.notes || null
      });
    }

    const hasFieldPatch =
      dto.title != null ||
      dto.description != null ||
      !!dto.priority ||
      !!dto.due_at ||
      !!dto.assigned_to_employee_id ||
      dto.notes != null ||
      dto.estimated_hours != null ||
      dto.actual_hours != null ||
      dto.workday_id != null ||
      dto.reviewer_employee_id != null ||
      dto.approver_employee_id != null ||
      typeof dto.requires_review === 'boolean' ||
      typeof dto.requires_evidence === 'boolean' ||
      typeof dto.requires_timer === 'boolean' ||
      dto.estimated_minutes != null ||
      dto.actual_minutes != null ||
      dto.category != null ||
      dto.checklist_items != null ||
      typeof dto.checklist_completion_required === 'boolean' ||
      dto.dependency_task_ids != null ||
      typeof dto.is_recurring === 'boolean' ||
      dto.recurrence_rule_id != null ||
      (dto.metadata && typeof dto.metadata === 'object');

    if (!hasFieldPatch) {
      return this.getTaskById(tenantId, taskId);
    }

    const task = await Task.findOne(notDeleted({ _id: taskId, tenant_id: tenantId }));
    if (!task) throw new Error('TASK_001_NOT_FOUND');

    if (dto.title != null) task.title = dto.title;
    if (dto.description != null) task.description = dto.description;
    if (dto.priority) task.priority = dto.priority;
    if (dto.due_at) task.due_at = new Date(dto.due_at);

    if (dto.assigned_to_employee_id) {
      const assignee = await Employee.findOne({
        _id: dto.assigned_to_employee_id,
        tenant_id: tenantId
      });
      if (!assignee) throw new Error('EMPLOYEE_001_NOT_FOUND');
      task.assigned_to_employee_id = dto.assigned_to_employee_id;
    }

    const meta = { ...(task.metadata || {}) };
    if (dto.metadata && typeof dto.metadata === 'object') {
      Object.assign(meta, dto.metadata);
    }
    if (dto.notes != null) meta.notes = dto.notes;
    if (dto.estimated_hours != null) meta.estimated_hours = dto.estimated_hours;
    if (dto.actual_hours != null) meta.actual_hours = dto.actual_hours;
    if (dto.workday_id != null) {
      meta.workday_id = dto.workday_id;
      task.workday_id = dto.workday_id;
    }
    task.metadata = meta;

    if (dto.reviewer_employee_id != null) {
      const rev = await Employee.findOne({ _id: dto.reviewer_employee_id, tenant_id: tenantId });
      if (!rev) throw new Error('EMPLOYEE_001_NOT_FOUND');
      task.reviewer_employee_id = dto.reviewer_employee_id;
    }
    if (dto.approver_employee_id != null) {
      const ap = await Employee.findOne({ _id: dto.approver_employee_id, tenant_id: tenantId });
      if (!ap) throw new Error('EMPLOYEE_001_NOT_FOUND');
      task.approver_employee_id = dto.approver_employee_id;
    }
    if (typeof dto.requires_review === 'boolean') task.requires_review = dto.requires_review;
    if (typeof dto.requires_evidence === 'boolean') task.requires_evidence = dto.requires_evidence;
    if (typeof dto.requires_timer === 'boolean') task.requires_timer = dto.requires_timer;
    if (dto.estimated_minutes != null) task.estimated_minutes = dto.estimated_minutes;
    if (dto.actual_minutes != null) task.actual_minutes = dto.actual_minutes;
    if (dto.category != null) task.category = dto.category;
    if (Array.isArray(dto.checklist_items)) task.checklist_items = dto.checklist_items;
    if (typeof dto.checklist_completion_required === 'boolean') {
      task.checklist_completion_required = dto.checklist_completion_required;
    }
    if (Array.isArray(dto.dependency_task_ids)) task.dependency_task_ids = dto.dependency_task_ids;
    if (typeof dto.is_recurring === 'boolean') task.is_recurring = dto.is_recurring;
    if (dto.recurrence_rule_id != null) {
      const rr = await RecurrenceRule.findOne({ _id: dto.recurrence_rule_id, tenant_id: tenantId });
      if (!rr) throw new Error('JTS_RECURRENCE_RULE_NOT_FOUND');
      task.recurrence_rule_id = dto.recurrence_rule_id;
    }

    task.last_activity_at = new Date();
    await task.save();
    return this.getTaskById(tenantId, taskId);
  }

  async deleteTask(tenantId, taskId) {
    const task = await Task.findOne(notDeleted({ _id: taskId, tenant_id: tenantId }));
    if (!task) throw new Error('TASK_001_NOT_FOUND');
    task.is_deleted = true;
    task.deleted_at = new Date();
    await task.save();
    return { deleted: true, id: taskId, soft: true };
  }

  /**
   * Reassign task to another employee (assignee only; no status change).
   */
  async reassignTask(tenantId, taskId, newAssigneeId, actorId) {
    const task = await Task.findOne(notDeleted({ _id: taskId, tenant_id: tenantId }));
    if (!task) throw new Error('TASK_001_NOT_FOUND');

    const assignee = await Employee.findOne({ _id: newAssigneeId, tenant_id: tenantId });
    if (!assignee) throw new Error('EMPLOYEE_001_NOT_FOUND');

    task.assigned_to_employee_id = newAssigneeId;
    task.last_activity_at = new Date();
    await task.save();

    await TaskStatusHistory.create({
      tenant_id: tenantId,
      task_id: task._id,
      from_status: null,
      to_status: task.status,
      changed_by_employee_id: actorId,
      changed_at: new Date(),
      reason: `REASSIGN:${String(newAssigneeId)}`
    });

    try {
      await taskActivityService.record(tenantId, task._id, actorId, 'REASSIGNED', {
        assigneeId: String(newAssigneeId)
      });
    } catch (e) {
      logger.warn('task activity REASSIGNED failed', { error: e.message });
    }

    return this.getTaskById(tenantId, taskId);
  }

  async listTaskActivities(tenantId, taskId, { limit = 100 } = {}) {
    const lim = Math.min(Number(limit) || 100, 500);
    const exists = await Task.exists(notDeleted({ _id: taskId, tenant_id: tenantId }));
    if (!exists) return null;

    const [actRows, histRows] = await Promise.all([
      TaskActivity.find({ tenant_id: tenantId, task_id: taskId })
        .sort({ created_at: -1 })
        .limit(lim)
        .populate('actor_id', 'name email code')
        .lean(),
      TaskStatusHistory.find({ tenant_id: tenantId, task_id: taskId })
        .sort({ changed_at: -1 })
        .limit(lim)
        .populate('changed_by_employee_id', 'name email code')
        .lean()
    ]);

    const merged = [];
    for (const r of actRows) {
      const a = r.actor_id;
      merged.push({
        source: 'activity',
        id: String(r._id),
        action: r.action,
        metadata: r.metadata || {},
        createdAt: r.created_at,
        actorId: a ? String(a._id || a) : null,
        actor:
          a && a.name
            ? { id: String(a._id), name: a.name, employeeId: a.code }
            : null
      });
    }
    for (const r of histRows) {
      const a = r.changed_by_employee_id;
      merged.push({
        source: 'status_history',
        id: String(r._id),
        action: 'STATUS_CHANGED',
        fromStatus: r.from_status,
        toStatus: r.to_status,
        reason: r.reason || null,
        createdAt: r.changed_at,
        actorId: a ? String(a._id || a) : null,
        actor:
          a && a.name
            ? { id: String(a._id), name: a.name, employeeId: a.code }
            : null
      });
    }

    merged.sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt));
    return merged.slice(0, lim);
  }

  async completeTask(tenantId, taskId, actorId, notes, actorRole) {
    let task = await Task.findOne(notDeleted({ _id: taskId, tenant_id: tenantId }));
    if (!task) throw new Error('TASK_001_NOT_FOUND');

    // Privileged shortcut: ASSIGNED -> ACCEPTED -> IN_PROGRESS -> COMPLETED
    if (task.status === 'ASSIGNED' && isPrivileged(actorRole)) {
      await taskStatusService.changeStatus(tenantId, taskId, 'ACCEPTED', {
        actorId,
        reason: 'Privileged complete shortcut'
      });
      await taskStatusService.changeStatus(tenantId, taskId, 'IN_PROGRESS', {
        actorId,
        reason: 'Privileged complete shortcut'
      });
    } else if (task.status === 'ACCEPTED' && isPrivileged(actorRole)) {
      await taskStatusService.changeStatus(tenantId, taskId, 'IN_PROGRESS', {
        actorId,
        reason: 'Privileged complete shortcut'
      });
    }

    task = await Task.findOne(notDeleted({ _id: taskId, tenant_id: tenantId }));
    if (!task) throw new Error('TASK_001_NOT_FOUND');

    const reviewTarget =
      task.requires_review === true && ['IN_PROGRESS', 'ON_HOLD'].includes(task.status);
    const targetStatus = reviewTarget ? 'PENDING_REVIEW' : 'COMPLETED';

    await taskStatusService.changeStatus(tenantId, taskId, targetStatus, {
      actorId,
      reason: notes || null
    });

    if (notes) {
      const t2 = await Task.findOne(notDeleted({ _id: taskId, tenant_id: tenantId }));
      if (t2) {
        t2.metadata = { ...(t2.metadata || {}), notes };
        await t2.save();
      }
    }
    return this.getTaskById(tenantId, taskId);
  }

  async listSlaAlerts(tenantId, { employeeId, limit = 50 }) {
    const now = new Date();
    const warnUntil = new Date(now.getTime() + 60 * 60 * 1000); // next 60 min
    const query = notDeleted({
      tenant_id: tenantId,
      status: {
        $in: ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'ON_HOLD', 'PENDING_REVIEW', 'BLOCKED', 'REOPENED']
      },
      due_at: { $lte: warnUntil }
    });
    if (employeeId) query.assigned_to_employee_id = employeeId;

    const tasks = await Task.find(query)
      .populate('assigned_to_employee_id', 'name code')
      .sort({ due_at: 1 })
      .limit(Number(limit) || 50);

    return tasks.map((t) => {
      const due = new Date(t.due_at).getTime();
      const deltaMinutes = Math.floor((due - now.getTime()) / 60000);
      const breached = deltaMinutes < 0;
      return {
        taskId: String(t._id),
        title: t.title,
        status: breached ? 'BREACHED' : 'WARNING',
        dueAt: t.due_at,
        remainingMinutes: deltaMinutes,
        assignee: t.assigned_to_employee_id
          ? {
              id: String(t.assigned_to_employee_id._id),
              name: t.assigned_to_employee_id.name,
              employeeId: t.assigned_to_employee_id.code
            }
          : null
      };
    });
  }

  async getWorkdayTasks(tenantId, workdayId, query = {}) {
    return this.getTasks(tenantId, {
      ...query,
      workday_id: workdayId
    });
  }

  async getTaskSummary(tenantId, employeeId, date) {
    const query = notDeleted({ tenant_id: tenantId, assigned_to_employee_id: employeeId });
    if (date) {
      const d = new Date(date);
      if (!Number.isNaN(d.getTime())) {
        const start = new Date(d);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        query.created_at = { $gte: start, $lt: end };
      }
    }

    const rows = await Task.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const statusCounts = Object.fromEntries(rows.map((r) => [r._id, r.count]));
    const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const completed = statusCounts.COMPLETED || 0;
    const inProgress =
      (statusCounts.ASSIGNED || 0) +
      (statusCounts.ACCEPTED || 0) +
      (statusCounts.IN_PROGRESS || 0) +
      (statusCounts.ON_HOLD || 0) +
      (statusCounts.PENDING_APPROVAL || 0) +
      (statusCounts.PENDING_REVIEW || 0) +
      (statusCounts.BLOCKED || 0) +
      (statusCounts.REOPENED || 0);

    return {
      employeeId,
      date: date || null,
      total,
      completed,
      inProgress,
      pendingApproval: statusCounts.PENDING_APPROVAL || 0,
      rejected: statusCounts.REJECTED || 0,
      byStatus: statusCounts
    };
  }

  /** Allocate next display code (for self-task and other entry points outside createManagerTask). */
  async nextTaskCode(tenantId) {
    return allocateNextTaskCode(tenantId);
  }
}

module.exports = new TaskService();

