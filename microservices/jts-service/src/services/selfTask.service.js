const Task = require('../models/Task.model');
const SelfTaskPolicy = require('../models/SelfTaskPolicy.model');
const TaskApproval = require('../models/TaskApproval.model');
const Employee = require('../models/Employee.model');
const ReportingRelationship = require('../models/ReportingRelationship.model');
const TaskType = require('../models/TaskType.model');
const TaskStatusHistory = require('../models/TaskStatusHistory.model');
const slaCalculator = require('./slaCalculator.service');
const catalogDefaults = require('./catalogDefaults.service');
const taskService = require('./task.service');
const logger = require('../config/logger');

class SelfTaskService {
  /**
   * Create a self-task
   */
  async createSelfTask(tenantId, employeeId, dto) {
    const session = await Task.db.startSession();
    session.startTransaction();

    try {
      // Get employee
      const employee = await Employee.findOne({ _id: employeeId, tenant_id: tenantId }).session(session);
      if (!employee) throw new Error('EMPLOYEE_001_NOT_FOUND');

      // Get self-task policy
      let policy = await SelfTaskPolicy.findOne({
        tenant_id: tenantId,
        role_key: employee.role_key
      }).session(session);

      if (!policy) {
        // Tenant bootstrap fallback: create a permissive policy if none exists yet.
        policy = await SelfTaskPolicy.create(
          [
            {
              tenant_id: tenantId,
              role_key: employee.role_key,
              auto_assign_to_self: true,
              mandatory_approval: false,
              max_tasks_per_day: 20
            }
          ],
          { session }
        ).then((rows) => rows[0]);
      }

      // Enforce limits
      await this.enforceLimits(tenantId, employeeId, policy, session);

      const dtoResolved = await catalogDefaults.applyTaskDefaults(tenantId, dto);

      const taskType = await TaskType.findOne({
        _id: dtoResolved.type_id,
        tenant_id: tenantId
      }).session(session);
      if (!taskType) throw new Error('TASK_TYPE_001_NOT_FOUND');

      const effectivePriority = dtoResolved.priority || taskType.default_priority;

      // Calculate SLA
      const slaMinutes = await slaCalculator.resolveSlaMinutes(
        tenantId,
        dtoResolved.type_id,
        effectivePriority,
        dtoResolved.sla_minutes_override
      );

      if (policy.max_minutes_per_task && slaMinutes > policy.max_minutes_per_task) {
        throw new Error('POLICY_003_MAX_TASK_DURATION_EXCEEDED');
      }

      // Calculate due date
      const dueAt = await slaCalculator.calculateDueDate(
        tenantId,
        dtoResolved.scope_org_node_id,
        slaMinutes,
        new Date()
      );

      // Determine status based on approval requirement
      const requiresApproval = policy.mandatory_approval;
      const status = requiresApproval ? 'PENDING_APPROVAL' : 'ASSIGNED';

      const code = await taskService.nextTaskCode(tenantId);

      // Create task
      const task = await Task.create([{
        tenant_id: tenantId,
        code,
        title: dtoResolved.title,
        description: dtoResolved.description,
        priority: effectivePriority,
        scope_org_node_id: dtoResolved.scope_org_node_id,
        created_by_employee_id: employeeId,
        assigned_to_employee_id: policy.auto_assign_to_self ? employeeId : null,
        type_id: dtoResolved.type_id,
        source: 'SELF',
        requires_approval: requiresApproval,
        status,
        sla_minutes: slaMinutes,
        due_at: dueAt,
        last_activity_at: new Date(),
        is_deleted: false,
        metadata: dtoResolved.metadata || {}
      }], { session }).then(res => res[0]);

      // Create approval if needed
      if (requiresApproval) {
        const manager = await this.getReportingManager(tenantId, employeeId, session);
        if (!manager) throw new Error('APPROVAL_003_NO_MANAGER_FOUND');

        await TaskApproval.create([{
          tenant_id: tenantId,
          task_id: task._id,
          requested_by_employee_id: employeeId,
          approver_employee_id: manager._id,
          approval_type: 'SELF_TASK_APPROVAL',
          payload: {},
          status: 'PENDING'
        }], { session });
      }

      await TaskStatusHistory.create([{
        tenant_id: tenantId,
        task_id: task._id,
        from_status: null,
        to_status: status,
        changed_by_employee_id: employeeId,
        changed_at: new Date(),
        reason: 'Self-task created'
      }], { session });

      await session.commitTransaction();

      try {
        const taskActivityService = require('./taskActivity.service');
        await taskActivityService.record(tenantId, task._id, employeeId, 'CREATED', {
          source: 'SELF',
          status
        });
      } catch (e) {
        /* non-fatal */
      }

      return task;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get reporting manager
   */
  async getReportingManager(tenantId, employeeId, session) {
    const relationship = await ReportingRelationship.findOne({
      tenant_id: tenantId,
      reportee_id: employeeId
    }).session(session);

    if (!relationship) return null;

    return Employee.findById(relationship.manager_id).session(session);
  }

  /**
   * Enforce self-task limits
   */
  async enforceLimits(tenantId, employeeId, policy, session) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count self-tasks today
    if (policy.max_tasks_per_day) {
      const todayTasks = await Task.countDocuments({
        tenant_id: tenantId,
        created_by_employee_id: employeeId,
        source: 'SELF',
        is_deleted: { $ne: true },
        created_at: { $gte: today }
      }).session(session);

      if (todayTasks >= policy.max_tasks_per_day) {
        throw new Error('POLICY_002_MAX_TASKS_PER_DAY_EXCEEDED');
      }
    }
  }
}

module.exports = new SelfTaskService();

