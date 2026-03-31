const Task = require('../models/Task.model');
const TaskComment = require('../models/TaskComment.model');
const TaskAttachment = require('../models/TaskAttachment.model');
const TaskApproval = require('../models/TaskApproval.model');
const TaskQualityRating = require('../models/TaskQualityRating.model');
const TaskReview = require('../models/TaskReview.model');
const taskActivityService = require('./taskActivity.service');
const taskStatusService = require('./taskStatus.service');
const attachmentPresign = require('./attachmentPresign.service');

function isPrivileged(role) {
  const r = (role || '').toUpperCase();
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

async function loadTask(tenantId, taskId) {
  const task = await Task.findOne({
    _id: taskId,
    tenant_id: tenantId,
    is_deleted: { $ne: true }
  });
  if (!task) throw new Error('TASK_001_NOT_FOUND');
  return task;
}

async function assertCanAccessTask(task, employeeId, role) {
  if (isPrivileged(role)) return;
  const eid = employeeId.toString();
  const assignee = task.assigned_to_employee_id ? task.assigned_to_employee_id.toString() : null;
  const creator = task.created_by_employee_id ? task.created_by_employee_id.toString() : null;
  if (assignee === eid || creator === eid) return;
  throw new Error('JTS_TASK_ACCESS_DENIED');
}

class TaskCollaborationService {
  async listComments(tenantId, taskId, viewerEmployeeId, role) {
    const task = await loadTask(tenantId, taskId);
    await assertCanAccessTask(task, viewerEmployeeId, role);
    return TaskComment.find({ tenant_id: tenantId, task_id: taskId }).sort({ created_at: 1 });
  }

  async addComment(tenantId, taskId, authorEmployeeId, role, payload = {}) {
    const task = await loadTask(tenantId, taskId);
    await assertCanAccessTask(task, authorEmployeeId, role);
    const text = String(payload.message || payload.body || '').trim();
    if (!text) throw new Error('VALIDATION_ERROR');
    const row = await TaskComment.create({
      tenant_id: tenantId,
      task_id: taskId,
      author_id: authorEmployeeId,
      message: text,
      body: text,
      mentions: Array.isArray(payload.mentions) ? payload.mentions : [],
      is_internal: !!payload.is_internal
    });
    try {
      await taskActivityService.record(tenantId, taskId, authorEmployeeId, 'COMMENTED', {
        commentId: String(row._id)
      });
    } catch (e) {
      /* non-fatal */
    }
    return row;
  }

  async listAttachments(tenantId, taskId, viewerEmployeeId, role, options = {}) {
    const task = await loadTask(tenantId, taskId);
    await assertCanAccessTask(task, viewerEmployeeId, role);
    const rows = await TaskAttachment.find({ tenant_id: tenantId, task_id: taskId }).sort({ created_at: -1 });
    if (!options.includeSignedUrls) {
      return rows;
    }
    if (!attachmentPresign.isS3PresignConfigured()) {
      return rows.map((x) => ({ ...(x.toObject ? x.toObject() : x), download_url: null }));
    }

    return Promise.all(
      rows.map(async (row) => {
        const out = row.toObject ? row.toObject() : row;
        if (out.storage_provider && out.storage_provider !== 's3') {
          return { ...out, download_url: null };
        }
        const d = await attachmentPresign.getDownloadUrl({
          file_key: out.file_key,
          mime_type: out.mime_type,
          file_name: out.file_name
        });
        return {
          ...out,
          download_url: d.download_url,
          download_url_expires_in_seconds: d.expires_in_seconds
        };
      })
    );
  }

  async addAttachment(tenantId, taskId, uploaderEmployeeId, role, payload) {
    const task = await loadTask(tenantId, taskId);
    await assertCanAccessTask(task, uploaderEmployeeId, role);
    const row = await TaskAttachment.create({
      tenant_id: tenantId,
      task_id: taskId,
      uploader_id: uploaderEmployeeId,
      file_key: payload.file_key,
      file_name: payload.file_name,
      mime_type: payload.mime_type,
      size_bytes: payload.size_bytes,
      file_url: payload.file_url || undefined,
      attachment_type: payload.attachment_type || 'FILE',
      is_evidence: payload.is_evidence === true,
      storage_provider: payload.storage_provider || 's3'
    });
    try {
      await taskActivityService.record(tenantId, taskId, uploaderEmployeeId, 'FILE_UPLOADED', {
        attachmentId: String(row._id),
        isEvidence: row.is_evidence
      });
    } catch (e) {
      /* non-fatal */
    }
    return row;
  }

  async presignAttachmentUpload(tenantId, taskId, employeeId, role, { file_name, mime_type }) {
    const task = await loadTask(tenantId, taskId);
    await assertCanAccessTask(task, employeeId, role);
    if (!attachmentPresign.isS3PresignConfigured()) {
      throw new Error('JTS_ATTACHMENT_STORAGE_NOT_CONFIGURED');
    }
    return attachmentPresign.getUploadUrlForTask({
      tenantId: String(tenantId),
      taskId: String(taskId),
      file_name,
      mime_type
    });
  }

  async presignAttachmentDownload(tenantId, taskId, attachmentId, employeeId, role) {
    const task = await loadTask(tenantId, taskId);
    await assertCanAccessTask(task, employeeId, role);
    const att = await TaskAttachment.findOne({
      _id: attachmentId,
      tenant_id: tenantId,
      task_id: taskId
    });
    if (!att) throw new Error('JTS_ATTACHMENT_NOT_FOUND');
    if (!attachmentPresign.isS3PresignConfigured()) {
      throw new Error('JTS_ATTACHMENT_STORAGE_NOT_CONFIGURED');
    }
    return attachmentPresign.getDownloadUrl({
      file_key: att.file_key,
      mime_type: att.mime_type,
      file_name: att.file_name
    });
  }

  async upsertQualityRating(tenantId, taskId, raterEmployeeId, role, body) {
    const task = await loadTask(tenantId, taskId);
    await assertCanAccessTask(task, raterEmployeeId, role);
    return TaskQualityRating.findOneAndUpdate(
      { tenant_id: tenantId, task_id: taskId, rater_id: raterEmployeeId },
      {
        tenant_id: tenantId,
        task_id: taskId,
        rater_id: raterEmployeeId,
        quality_score: body.quality_score,
        timeliness_score: body.timeliness_score,
        thoroughness_score: body.thoroughness_score,
        comments: body.comments
      },
      { upsert: true, new: true }
    );
  }

  async getQualityRatings(tenantId, taskId, viewerEmployeeId, role) {
    const task = await loadTask(tenantId, taskId);
    await assertCanAccessTask(task, viewerEmployeeId, role);
    return TaskQualityRating.find({ tenant_id: tenantId, task_id: taskId });
  }

  async createApproval(tenantId, taskId, requesterEmployeeId, role, body) {
    const task = await loadTask(tenantId, taskId);
    await assertCanAccessTask(task, requesterEmployeeId, role);
    const row = await TaskApproval.create({
      tenant_id: tenantId,
      task_id: taskId,
      requested_by_employee_id: requesterEmployeeId,
      approver_employee_id: body.approver_employee_id,
      approval_type: body.approval_type || 'CREATE_APPROVAL',
      payload: body.payload && typeof body.payload === 'object' ? body.payload : {},
      status: 'PENDING'
    });
    try {
      await taskActivityService.record(tenantId, taskId, requesterEmployeeId, 'STATUS_CHANGED', {
        event: 'APPROVAL_REQUESTED',
        approvalId: String(row._id),
        approvalType: row.approval_type
      });
    } catch (e) {
      /* non-fatal */
    }
    return row;
  }

  async listApprovalsForTask(tenantId, taskId, viewerEmployeeId, role) {
    const task = await loadTask(tenantId, taskId);
    await assertCanAccessTask(task, viewerEmployeeId, role);
    return TaskApproval.find({ tenant_id: tenantId, task_id: taskId }).sort({ created_at: -1 });
  }

  async listMyPendingApprovals(tenantId, approverEmployeeId) {
    return TaskApproval.find({
      tenant_id: tenantId,
      approver_employee_id: approverEmployeeId,
      status: 'PENDING'
    })
      .populate('task_id', 'title priority due_at status description')
      .populate('requested_by_employee_id', 'name code email')
      .sort({ created_at: -1 });
  }

  async decideApproval(tenantId, approvalId, approverEmployeeId, role, { status, reason }) {
    const approval = await TaskApproval.findOne({ _id: approvalId, tenant_id: tenantId });
    if (!approval) throw new Error('JTS_APPROVAL_001_NOT_FOUND');
    if (approval.approver_employee_id.toString() !== approverEmployeeId.toString()) {
      if (!isPrivileged(role)) throw new Error('JTS_APPROVAL_002_FORBIDDEN');
    }
    approval.status = status;
    approval.reason = reason || approval.reason;
    approval.decided_at = new Date();
    await approval.save();
    try {
      await taskActivityService.record(
        tenantId,
        approval.task_id,
        approverEmployeeId,
        status === 'APPROVED' ? 'APPROVED' : 'REJECTED',
        {
          approvalId: String(approval._id),
          approval_type: approval.approval_type
        }
      );
    } catch (e) {
      /* non-fatal */
    }
    return approval;
  }

  async listTaskReviews(tenantId, taskId, viewerEmployeeId, role) {
    const task = await loadTask(tenantId, taskId);
    await assertCanAccessTask(task, viewerEmployeeId, role);
    return TaskReview.find({ tenant_id: tenantId, task_id: taskId }).sort({ reviewed_at: -1 });
  }

  async createTaskReview(tenantId, taskId, reviewerEmployeeId, role, body) {
    const task = await loadTask(tenantId, taskId);
    const isReviewer =
      task.reviewer_employee_id &&
      task.reviewer_employee_id.toString() === reviewerEmployeeId.toString();
    if (!isReviewer && !isPrivileged(role)) {
      throw new Error('JTS_REVIEW_ACK_FORBIDDEN');
    }

    const reviewStatus = body.status === 'REWORK_REQUIRED' ? 'REWORK_REQUIRED' : 'APPROVED';
    const row = await TaskReview.create({
      tenant_id: tenantId,
      task_id: taskId,
      reviewer_id: reviewerEmployeeId,
      rating: body.rating,
      checklist_score: body.checklist_score,
      remarks: body.remarks,
      status: reviewStatus,
      reviewed_at: new Date()
    });

    if (reviewStatus === 'REWORK_REQUIRED' && task.status === 'PENDING_REVIEW') {
      await taskStatusService.changeStatus(tenantId, taskId, 'IN_PROGRESS', {
        actorId: reviewerEmployeeId,
        reason: body.remarks || 'Rework required'
      });
    } else if (reviewStatus === 'APPROVED' && task.status === 'PENDING_REVIEW') {
      await taskStatusService.changeStatus(tenantId, taskId, 'COMPLETED', {
        actorId: reviewerEmployeeId,
        reason: body.remarks || 'Review approved'
      });
    }

    return row;
  }
}

module.exports = new TaskCollaborationService();
