const taskService = require('../services/task.service');
const taskStatusService = require('../services/taskStatus.service');
const catalogDefaults = require('../services/catalogDefaults.service');
const logger = require('../config/logger');
const { toErrorPayload } = require('../utils/errorResponse');
const { resolveEmployeeId } = require('../utils/actor.util');
const { buildErrorBody } = require('../utils/apiError.util');
const {
  normalizeListQuery,
  normalizeManagerTaskBody,
  normalizeUpdateTaskBody,
  normalizeTaskStatus
} = require('../utils/taskRequest.normalize');
const { serializeTask, slaStatusFromTaskDoc } = require('../utils/taskFrontend.mapper');
const taskCollaborationService = require('../services/taskCollaboration.service');
const attachmentPresign = require('../services/attachmentPresign.service');
const {
  resolveEmployeeIdToObjectId,
  resolveListFilterEmployeeId
} = require('../utils/employeeRefResolve.util');

function emptyTasksListPayload(filters) {
  const page = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 20;
  return {
    success: true,
    data: [],
    total: 0,
    page,
    limit,
    pagination: { page, limit, total: 0, pages: 0 },
    message: 'Tasks retrieved successfully'
  };
}

async function applyListFiltersEmployeeRefs(tenant_id, filters) {
  if (filters.assigned_to_employee_id) {
    const r = await resolveListFilterEmployeeId(tenant_id, filters.assigned_to_employee_id);
    if (r.empty) return { empty: true };
    filters.assigned_to_employee_id = r.id;
  }
  if (filters.created_by_employee_id) {
    const r = await resolveListFilterEmployeeId(tenant_id, filters.created_by_employee_id);
    if (r.empty) return { empty: true };
    filters.created_by_employee_id = r.id;
  }
  return { empty: false };
}

async function maybeAttachSignedUrls(taskDto, taskDoc, includeSignedUrls) {
  if (!includeSignedUrls) return taskDto;
  if (!attachmentPresign.isS3PresignConfigured()) {
    return { ...taskDto, attachmentSignedUrls: [] };
  }
  const refs = Array.isArray(taskDoc?.metadata?.attachment_refs) ? taskDoc.metadata.attachment_refs : [];
  const signed = await Promise.all(
    refs.map(async (ref) => {
      const d = await attachmentPresign.getDownloadUrl({ file_key: ref.file_key });
      return d.download_url;
    })
  );
  return { ...taskDto, attachmentSignedUrls: signed };
}

class TaskController {
  /**
   * Create manager task
   * POST /api/v1/tasks
   */
  async createTask(req, res) {
    try {
      const { tenant_id } = req.user;
      const actorId = await resolveEmployeeId(tenant_id, req.user);
      if (!actorId) {
        return res.status(403).json(buildErrorBody({ code: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED' }));
      }

      let body = normalizeManagerTaskBody(req.body);
      body = await catalogDefaults.applyTaskDefaults(tenant_id, body);
      // Admin/self flow: allow explicit self-assignment without exposing employee _id.
      if (
        !body.assigned_to_employee_id &&
        (req.body?.selfAssign === true || req.body?.self_assign === true || req.body?.assignToSelf === true)
      ) {
        body.assigned_to_employee_id = actorId;
      }

      for (const key of ['assigned_to_employee_id', 'reviewer_employee_id', 'approver_employee_id']) {
        if (body[key] != null && body[key] !== '') {
          body[key] = await resolveEmployeeIdToObjectId(tenant_id, body[key], { actorId });
        }
      }

      const task = await taskService.createManagerTask(tenant_id, actorId, body);
      const full = await taskService.getTaskById(tenant_id, task._id);

      res.status(201).json({
        success: true,
        data: serializeTask(full),
        message: 'Task created successfully'
      });
    } catch (error) {
      logger.error('Create task error', { error: error.message, stack: error.stack });
      const mapped = toErrorPayload(error, 'TASK_CREATE_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  /**
   * Get tasks with filters
   * GET /api/v1/tasks
   */
  async getTasks(req, res) {
    try {
      const { tenant_id } = req.user;
      const raw = normalizeListQuery(req.query);
      const includeSignedUrls =
        String(req.query.include_attachment_signed_urls || req.query.includeAttachmentSignedUrls || 'false')
          .toLowerCase() === 'true';
      const filters = {
        ...raw,
        status:
          typeof raw.status === 'string' && raw.status.includes(',')
            ? raw.status.split(',').map((s) => s.trim()).filter(Boolean).map(normalizeTaskStatus)
            : raw.status
      };

      const listRef = await applyListFiltersEmployeeRefs(tenant_id, filters);
      if (listRef.empty) {
        return res.json(emptyTasksListPayload(filters));
      }

      const result = await taskService.getTasks(tenant_id, filters);
      const { page, limit, total } = result.pagination;

      const data = await Promise.all(
        result.tasks.map(async (t) => maybeAttachSignedUrls(serializeTask(t), t, includeSignedUrls))
      );

      res.json({
        success: true,
        data,
        total,
        page,
        limit,
        pagination: result.pagination,
        message: 'Tasks retrieved successfully'
      });
    } catch (error) {
      logger.error('Get tasks error', { error: error.message });
      const mapped = toErrorPayload(error, 'TASK_FETCH_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  /**
   * Get task by ID
   * GET /api/v1/tasks/:id
   */
  async getTaskById(req, res) {
    try {
      const { tenant_id } = req.user;
      const { id } = req.params;

      const task = await taskService.getTaskById(tenant_id, id);
      const includeSignedUrls =
        String(req.query.include_attachment_signed_urls || req.query.includeAttachmentSignedUrls || 'false')
          .toLowerCase() === 'true';

      if (!task) {
        return res.status(404).json(buildErrorBody({ code: 'TASK_001_NOT_FOUND', message: 'Task not found' }));
      }

      res.json({
        success: true,
        data: await maybeAttachSignedUrls(serializeTask(task), task, includeSignedUrls),
        message: 'Task retrieved successfully'
      });
    } catch (error) {
      logger.error('Get task by ID error', { error: error.message });
      const mapped = toErrorPayload(error, 'TASK_FETCH_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  /**
   * GET /api/v1/tasks/:id/sla
   */
  async getTaskSla(req, res) {
    try {
      const { tenant_id } = req.user;
      const task = await taskService.getTaskById(tenant_id, req.params.id);
      if (!task) {
        return res.status(404).json(buildErrorBody({ code: 'TASK_001_NOT_FOUND', message: 'Task not found' }));
      }
      res.json({
        success: true,
        data: slaStatusFromTaskDoc(task),
        message: 'SLA status retrieved successfully'
      });
    } catch (error) {
      logger.error('Get task SLA error', { error: error.message });
      const mapped = toErrorPayload(error, 'TASK_FETCH_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async getSlaAlerts(req, res) {
    try {
      const { tenant_id } = req.user;
      let employeeId = req.query.employeeId || req.query.employee_id || null;
      if (employeeId) {
        const r = await resolveListFilterEmployeeId(tenant_id, employeeId);
        if (r.empty) {
          return res.json({ success: true, data: [], message: 'SLA alerts retrieved successfully' });
        }
        employeeId = r.id;
      }
      const data = await taskService.listSlaAlerts(tenant_id, {
        employeeId,
        limit: req.query.limit
      });
      res.json({ success: true, data, message: 'SLA alerts retrieved successfully' });
    } catch (error) {
      logger.error('Get SLA alerts error', { error: error.message });
      const mapped = toErrorPayload(error, 'TASK_FETCH_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async getWorkdayTasks(req, res) {
    try {
      const { tenant_id } = req.user;
      const raw = normalizeListQuery(req.query);
      const listRef = await applyListFiltersEmployeeRefs(tenant_id, raw);
      if (listRef.empty) {
        return res.json(emptyTasksListPayload(raw));
      }
      const result = await taskService.getWorkdayTasks(tenant_id, req.params.workdayId, raw);
      const { page, limit, total } = result.pagination;
      res.json({
        success: true,
        data: result.tasks.map((t) => serializeTask(t)),
        total,
        page,
        limit,
        pagination: result.pagination,
        message: 'Workday tasks retrieved successfully'
      });
    } catch (error) {
      logger.error('Get workday tasks error', { error: error.message });
      const mapped = toErrorPayload(error, 'TASK_FETCH_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async getTaskSummary(req, res) {
    try {
      const { tenant_id } = req.user;
      const employeeOid = await resolveEmployeeIdToObjectId(tenant_id, req.params.employeeId);
      const data = await taskService.getTaskSummary(tenant_id, employeeOid, req.query.date);
      res.json({
        success: true,
        data: { ...data, employeeId: req.params.employeeId },
        message: 'Task summary retrieved successfully'
      });
    } catch (error) {
      logger.error('Get task summary error', { error: error.message });
      const mapped = toErrorPayload(error, 'TASK_FETCH_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  /**
   * GET .../tasks/summary/me — task counts for the authenticated user (JTS Employee resolved from JWT).
   * Used by hr-service and other callers that forward the user Bearer token (no JTS employee ObjectId in URL).
   */
  async getMyTaskSummary(req, res) {
    try {
      const { tenant_id } = req.user;
      const employeeId = await resolveEmployeeId(tenant_id, req.user);
      if (!employeeId) {
        return res.status(200).json({
          success: true,
          data: {
            employeeId: null,
            date: req.query.date || null,
            total: 0,
            completed: 0,
            inProgress: 0,
            pendingApproval: 0,
            rejected: 0,
            byStatus: {},
            linked: false
          },
          message: 'No JTS employee linked to this user; task counts are zero.'
        });
      }
      const data = await taskService.getTaskSummary(tenant_id, employeeId, req.query.date);
      res.json({
        success: true,
        data: { ...data, linked: true },
        message: 'Task summary retrieved successfully'
      });
    } catch (error) {
      logger.error('Get my task summary error', { error: error.message });
      const mapped = toErrorPayload(error, 'TASK_FETCH_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  /**
   * PUT /api/v1/tasks/:id — HRMS board / jts-client update
   */
  async updateTask(req, res) {
    try {
      const { tenant_id } = req.user;
      const actorId = await resolveEmployeeId(tenant_id, req.user);
      if (!actorId) {
        return res.status(403).json(buildErrorBody({ code: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED' }));
      }

      const b = normalizeUpdateTaskBody(req.body);
      const patch = {
        title: b.title,
        description: b.description,
        priority: b.priority,
        status: b.status,
        due_at: b.due_at || b.dueAt,
        assigned_to_employee_id: b.assigned_to_employee_id || b.assignedToEmployeeId,
        notes: b.notes,
        reason: b.reason,
        estimated_hours: b.estimated_hours != null ? b.estimated_hours : b.estimatedHours,
        workday_id: b.workday_id != null ? b.workday_id : b.workdayId,
        reviewer_employee_id: b.reviewer_employee_id || b.reviewerEmployeeId,
        approver_employee_id: b.approver_employee_id || b.approverEmployeeId,
        requires_review: b.requires_review,
        requires_evidence: b.requires_evidence,
        requires_timer: b.requires_timer,
        estimated_minutes: b.estimated_minutes != null ? b.estimated_minutes : b.estimatedMinutes,
        actual_minutes: b.actual_minutes != null ? b.actual_minutes : b.actualMinutes,
        metadata: b.metadata,
        category: b.category,
        checklist_items: b.checklist_items != null ? b.checklist_items : b.checklistItems,
        checklist_completion_required:
          b.checklist_completion_required != null
            ? b.checklist_completion_required
            : b.checklistCompletionRequired,
        dependency_task_ids: b.dependency_task_ids != null ? b.dependency_task_ids : b.dependencyTaskIds,
        is_recurring: b.is_recurring != null ? b.is_recurring : b.isRecurring,
        recurrence_rule_id: b.recurrence_rule_id != null ? b.recurrence_rule_id : b.recurrenceRuleId
      };

      for (const key of ['assigned_to_employee_id', 'reviewer_employee_id', 'approver_employee_id']) {
        if (patch[key] != null && patch[key] !== '') {
          patch[key] = await resolveEmployeeIdToObjectId(tenant_id, patch[key], { actorId });
        }
      }

      const task = await taskService.updateTask(tenant_id, req.params.id, patch, actorId);

      res.json({
        success: true,
        data: serializeTask(task),
        message: 'Task updated successfully'
      });
    } catch (error) {
      logger.error('Update task error', { error: error.message });
      const mapped = toErrorPayload(error, 'TASK_UPDATE_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async deleteTask(req, res) {
    try {
      const { tenant_id } = req.user;
      await taskService.deleteTask(tenant_id, req.params.id);
      res.status(204).send();
    } catch (error) {
      logger.error('Delete task error', { error: error.message });
      const mapped = toErrorPayload(error, 'TASK_DELETE_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async acceptTask(req, res) {
    try {
      const { tenant_id } = req.user;
      const actorId = await resolveEmployeeId(tenant_id, req.user);
      if (!actorId) {
        return res.status(403).json({
          success: false,
          error: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED',
          code: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED'
        });
      }
      await taskStatusService.changeStatus(tenant_id, req.params.id, 'ACCEPTED', {
        actorId,
        reason: null
      });
      const task = await taskService.getTaskById(tenant_id, req.params.id);
      res.json({ success: true, data: serializeTask(task), message: 'Task accepted' });
    } catch (error) {
      logger.error('Accept task error', { error: error.message });
      const mapped = toErrorPayload(error, 'TASK_ACCEPT_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async rejectTask(req, res) {
    try {
      const { tenant_id } = req.user;
      const actorId = await resolveEmployeeId(tenant_id, req.user);
      if (!actorId) {
        return res.status(403).json({
          success: false,
          error: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED',
          code: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED'
        });
      }
      await taskStatusService.changeStatus(tenant_id, req.params.id, 'REJECTED', {
        actorId,
        reason: req.body?.reason || null
      });
      const task = await taskService.getTaskById(tenant_id, req.params.id);
      res.json({ success: true, data: serializeTask(task), message: 'Task rejected' });
    } catch (error) {
      logger.error('Reject task error', { error: error.message });
      const mapped = toErrorPayload(error, 'TASK_REJECT_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async completeTask(req, res) {
    try {
      const { tenant_id } = req.user;
      const actorId = await resolveEmployeeId(tenant_id, req.user);
      if (!actorId) {
        return res.status(403).json({
          success: false,
          error: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED',
          code: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED'
        });
      }

      const task = await taskService.completeTask(
        tenant_id,
        req.params.id,
        actorId,
        req.body?.notes,
        req.user.role
      );

      res.json({
        success: true,
        data: serializeTask(task),
        message: 'Task completed successfully'
      });
    } catch (error) {
      logger.error('Complete task error', { error: error.message });
      const mapped = toErrorPayload(error, 'TASK_COMPLETE_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  /**
   * Change task status
   * PATCH /api/v1/tasks/:id/status
   */
  async changeStatus(req, res) {
    try {
      const { tenant_id } = req.user;
      const { id } = req.params;
      const status = normalizeTaskStatus(req.body.status);
      const { reason } = req.body;

      const actorId = await resolveEmployeeId(tenant_id, req.user);
      if (!actorId) {
        return res.status(403).json({
          success: false,
          error: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED',
          code: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED'
        });
      }

      await taskStatusService.changeStatus(tenant_id, id, status, {
        actorId,
        reason
      });

      const task = await taskService.getTaskById(tenant_id, id);

      res.json({
        success: true,
        data: serializeTask(task),
        message: 'Task status updated successfully'
      });
    } catch (error) {
      logger.error('Change task status error', { error: error.message });
      const mapped = toErrorPayload(error, 'TASK_STATUS_UPDATE_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async startTask(req, res) {
    try {
      const { tenant_id } = req.user;
      const actorId = await resolveEmployeeId(tenant_id, req.user);
      if (!actorId) {
        return res.status(403).json({
          success: false,
          error: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED',
          code: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED'
        });
      }
      await taskStatusService.changeStatus(tenant_id, req.params.id, 'IN_PROGRESS', {
        actorId,
        reason: req.body?.reason || null
      });
      const task = await taskService.getTaskById(tenant_id, req.params.id);
      res.json({ success: true, data: serializeTask(task), message: 'Task started' });
    } catch (error) {
      logger.error('Start task error', { error: error.message });
      const mapped = toErrorPayload(error, 'TASK_START_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async submitForReview(req, res) {
    try {
      const { tenant_id } = req.user;
      const actorId = await resolveEmployeeId(tenant_id, req.user);
      if (!actorId) {
        return res.status(403).json({
          success: false,
          error: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED',
          code: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED'
        });
      }
      await taskStatusService.changeStatus(tenant_id, req.params.id, 'PENDING_REVIEW', {
        actorId,
        reason: req.body?.reason || null
      });
      const task = await taskService.getTaskById(tenant_id, req.params.id);
      res.json({ success: true, data: serializeTask(task), message: 'Submitted for review' });
    } catch (error) {
      logger.error('Submit for review error', { error: error.message });
      const mapped = toErrorPayload(error, 'TASK_REVIEW_SUBMIT_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async reopenTask(req, res) {
    try {
      const { tenant_id } = req.user;
      const actorId = await resolveEmployeeId(tenant_id, req.user);
      if (!actorId) {
        return res.status(403).json({
          success: false,
          error: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED',
          code: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED'
        });
      }
      await taskStatusService.changeStatus(tenant_id, req.params.id, 'IN_PROGRESS', {
        actorId,
        reason: req.body?.reason || 'Reopened from completed'
      });
      const task = await taskService.getTaskById(tenant_id, req.params.id);
      res.json({ success: true, data: serializeTask(task), message: 'Task reopened' });
    } catch (error) {
      logger.error('Reopen task error', { error: error.message });
      const mapped = toErrorPayload(error, 'TASK_REOPEN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async cancelTask(req, res) {
    try {
      const { tenant_id } = req.user;
      const actorId = await resolveEmployeeId(tenant_id, req.user);
      if (!actorId) {
        return res.status(403).json({
          success: false,
          error: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED',
          code: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED'
        });
      }
      await taskStatusService.changeStatus(tenant_id, req.params.id, 'CANCELLED', {
        actorId,
        reason: req.body?.reason || null
      });
      const task = await taskService.getTaskById(tenant_id, req.params.id);
      res.json({ success: true, data: serializeTask(task), message: 'Task cancelled' });
    } catch (error) {
      logger.error('Cancel task error', { error: error.message });
      const mapped = toErrorPayload(error, 'TASK_CANCEL_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async blockTask(req, res) {
    try {
      const { tenant_id } = req.user;
      const actorId = await resolveEmployeeId(tenant_id, req.user);
      if (!actorId) {
        return res.status(403).json({
          success: false,
          error: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED',
          code: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED'
        });
      }
      const reason = req.body?.reason || req.body?.blockedReason || null;
      await taskStatusService.changeStatus(tenant_id, req.params.id, 'BLOCKED', {
        actorId,
        reason,
        blockedReason: reason
      });
      const task = await taskService.getTaskById(tenant_id, req.params.id);
      res.json({ success: true, data: serializeTask(task), message: 'Task blocked' });
    } catch (error) {
      logger.error('Block task error', { error: error.message });
      const mapped = toErrorPayload(error, 'TASK_BLOCK_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async unblockTask(req, res) {
    try {
      const { tenant_id } = req.user;
      const actorId = await resolveEmployeeId(tenant_id, req.user);
      if (!actorId) {
        return res.status(403).json({
          success: false,
          error: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED',
          code: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED'
        });
      }
      await taskStatusService.changeStatus(tenant_id, req.params.id, 'IN_PROGRESS', {
        actorId,
        reason: req.body?.reason || null
      });
      const task = await taskService.getTaskById(tenant_id, req.params.id);
      res.json({ success: true, data: serializeTask(task), message: 'Task unblocked' });
    } catch (error) {
      logger.error('Unblock task error', { error: error.message });
      const mapped = toErrorPayload(error, 'TASK_UNBLOCK_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async reassignTask(req, res) {
    try {
      const { tenant_id } = req.user;
      const actorId = await resolveEmployeeId(tenant_id, req.user);
      if (!actorId) {
        return res.status(403).json({
          success: false,
          error: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED',
          code: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED'
        });
      }
      const newAssignee =
        req.body?.assigned_to_employee_id || req.body?.assignedToEmployeeId || req.body?.assigneeId;
      if (!newAssignee) {
        return res.status(400).json({
          success: false,
          error: 'assignedToEmployeeId is required',
          code: 'VALIDATION_ERROR'
        });
      }
      const newAssigneeOid = await resolveEmployeeIdToObjectId(tenant_id, newAssignee, { actorId });
      const task = await taskService.reassignTask(tenant_id, req.params.id, newAssigneeOid, actorId);
      res.json({ success: true, data: serializeTask(task), message: 'Task reassigned' });
    } catch (error) {
      logger.error('Reassign task error', { error: error.message });
      const mapped = toErrorPayload(error, 'TASK_REASSIGN_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async getTaskActivities(req, res) {
    try {
      const { tenant_id } = req.user;
      const data = await taskService.listTaskActivities(tenant_id, req.params.id, {
        limit: req.query.limit
      });
      if (data === null) {
        return res.status(404).json({
          success: false,
          error: 'Task not found',
          code: 'TASK_001_NOT_FOUND'
        });
      }
      res.json({ success: true, data, message: 'Task activities retrieved successfully' });
    } catch (error) {
      logger.error('Get task activities error', { error: error.message });
      const mapped = toErrorPayload(error, 'TASK_FETCH_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async rateTask(req, res) {
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

      const rating = Number(req.body.rating);
      const comments = req.body.comments || null;

      const row = await taskCollaborationService.upsertQualityRating(
        tenant_id,
        req.params.id,
        employeeId,
        req.user.role,
        {
          quality_score: rating,
          timeliness_score: rating,
          thoroughness_score: rating,
          comments
        }
      );

      res.status(201).json({
        success: true,
        data: row,
        message: 'Task rated successfully'
      });
    } catch (error) {
      logger.error('Rate task error', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_COLLAB_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }
}

module.exports = new TaskController();
