const Task = require('../models/Task.model');
const SelfTaskPolicy = require('../models/SelfTaskPolicy.model');
const TaskApproval = require('../models/TaskApproval.model');
const Employee = require('../models/Employee.model');
const ReportingRelationship = require('../models/ReportingRelationship.model');
const slaCalculator = require('./slaCalculator.service');
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
      const policy = await SelfTaskPolicy.findOne({
        tenant_id: tenantId,
        role_key: employee.role_key
      }).session(session);

      if (!policy) {
        throw new Error('POLICY_001_SELF_TASK_NOT_ALLOWED');
      }

      // Enforce limits
      await this.enforceLimits(tenantId, employeeId, policy, session);

      // Calculate SLA
      const slaMinutes = await slaCalculator.resolveSlaMinutes(
        tenantId,
        dto.type_id,
        dto.priority,
        dto.sla_minutes_override
      );

      // Calculate due date
      const dueAt = await slaCalculator.calculateDueDate(
        tenantId,
        dto.scope_org_node_id,
        slaMinutes,
        new Date()
      );

      // Determine status based on approval requirement
      const requiresApproval = policy.mandatory_approval;
      const status = requiresApproval ? 'PENDING_APPROVAL' : 'ASSIGNED';

      // Create task
      const task = await Task.create([{
        tenant_id: tenantId,
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        scope_org_node_id: dto.scope_org_node_id,
        created_by_employee_id: employeeId,
        assigned_to_employee_id: policy.auto_assign_to_self ? employeeId : null,
        type_id: dto.type_id,
        source: 'SELF',
        requires_approval: requiresApproval,
        status,
        sla_minutes: slaMinutes,
        due_at: dueAt,
        metadata: dto.metadata || {}
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
          status: 'PENDING'
        }], { session });
      }

      await session.commitTransaction();
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
        created_at: { $gte: today }
      }).session(session);

      if (todayTasks >= policy.max_tasks_per_day) {
        throw new Error('POLICY_002_MAX_TASKS_PER_DAY_EXCEEDED');
      }
    }
  }
}

module.exports = new SelfTaskService();

