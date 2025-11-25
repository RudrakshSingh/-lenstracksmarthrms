const Task = require('../models/Task.model');
const TaskType = require('../models/TaskType.model');
const OrgNode = require('../models/OrgNode.model');
const Employee = require('../models/Employee.model');
const slaCalculator = require('./slaCalculator.service');
const taskStatusService = require('./taskStatus.service');
const logger = require('../config/logger');

class TaskService {
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

    // Create task
    const task = await Task.create({
      tenant_id: tenantId,
      title: dto.title,
      description: dto.description,
      priority: dto.priority || taskType.default_priority,
      scope_org_node_id: dto.scope_org_node_id,
      created_by_employee_id: actorId,
      assigned_to_employee_id: dto.assigned_to_employee_id || null,
      type_id: dto.type_id,
      source: 'MANAGER',
      requires_approval: dto.requires_approval || false,
      status: dto.assigned_to_employee_id ? 'ASSIGNED' : 'DRAFT',
      sla_minutes: slaMinutes,
      due_at: dueAt,
      metadata: dto.metadata || {}
    });

    // Log initial status
    await taskStatusService.changeStatus(tenantId, task._id, task.status, {
      actorId,
      reason: 'Task created'
    });

    return task;
  }

  /**
   * Get tasks with filters
   */
  async getTasks(tenantId, filters = {}) {
    const query = { tenant_id: tenantId };

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

    if (filters.scope_org_node_id) {
      query.scope_org_node_id = filters.scope_org_node_id;
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
      .populate('type_id', 'name code')
      .populate('assigned_to_employee_id', 'name email code')
      .populate('created_by_employee_id', 'name email code')
      .populate('scope_org_node_id', 'name code type')
      .sort({ due_at: 1 })
      .skip(skip)
      .limit(limit);

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
    return Task.findOne({ _id: taskId, tenant_id: tenantId })
      .populate('type_id')
      .populate('assigned_to_employee_id')
      .populate('created_by_employee_id')
      .populate('scope_org_node_id');
  }
}

module.exports = new TaskService();

