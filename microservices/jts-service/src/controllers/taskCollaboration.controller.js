const taskCollaborationService = require('../services/taskCollaboration.service');
const logger = require('../config/logger');
const { toErrorPayload } = require('../utils/errorResponse');
const { resolveEmployeeId } = require('../utils/actor.util');

async function employeeOr403(req, res) {
  const employeeId = await resolveEmployeeId(req.user.tenant_id, req.user);
  if (!employeeId) {
    res.status(403).json({
      success: false,
      error: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED',
      code: 'JTS_ACTOR_EMPLOYEE_NOT_RESOLVED'
    });
    return null;
  }
  return employeeId;
}

class TaskCollaborationController {
  async listComments(req, res) {
    try {
      const { tenant_id } = req.user;
      const employeeId = await employeeOr403(req, res);
      if (!employeeId) return;

      const rows = await taskCollaborationService.listComments(
        tenant_id,
        req.params.taskId,
        employeeId,
        req.user.role
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      logger.error('List comments error', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_COLLAB_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async addComment(req, res) {
    try {
      const { tenant_id } = req.user;
      const employeeId = await employeeOr403(req, res);
      if (!employeeId) return;

      const row = await taskCollaborationService.addComment(
        tenant_id,
        req.params.taskId,
        employeeId,
        req.user.role,
        req.body
      );
      res.status(201).json({ success: true, data: row });
    } catch (error) {
      logger.error('Add comment error', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_COLLAB_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async listAttachments(req, res) {
    try {
      const { tenant_id } = req.user;
      const employeeId = await employeeOr403(req, res);
      if (!employeeId) return;

      const rows = await taskCollaborationService.listAttachments(
        tenant_id,
        req.params.taskId,
        employeeId,
        req.user.role,
        {
          includeSignedUrls:
            String(req.query.include_signed_urls || req.query.includeSignedUrls || 'false').toLowerCase() ===
            'true'
        }
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      logger.error('List attachments error', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_COLLAB_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async addAttachment(req, res) {
    try {
      const { tenant_id } = req.user;
      const employeeId = await employeeOr403(req, res);
      if (!employeeId) return;

      const row = await taskCollaborationService.addAttachment(
        tenant_id,
        req.params.taskId,
        employeeId,
        req.user.role,
        req.body
      );
      res.status(201).json({ success: true, data: row });
    } catch (error) {
      logger.error('Add attachment error', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_COLLAB_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async presignAttachmentUpload(req, res) {
    try {
      const { tenant_id } = req.user;
      const employeeId = await employeeOr403(req, res);
      if (!employeeId) return;

      const data = await taskCollaborationService.presignAttachmentUpload(
        tenant_id,
        req.params.taskId,
        employeeId,
        req.user.role,
        req.body
      );
      res.json({
        success: true,
        data,
        instructions: {
          step1: 'HTTP PUT file bytes to upload_url using upload_headers (Content-Type required).',
          step2: 'POST /api/v1/tasks/:taskId/attachments with file_key, file_name, mime_type, size_bytes.'
        }
      });
    } catch (error) {
      logger.error('Presign upload error', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_COLLAB_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async presignAttachmentDownload(req, res) {
    try {
      const { tenant_id } = req.user;
      const employeeId = await employeeOr403(req, res);
      if (!employeeId) return;

      const data = await taskCollaborationService.presignAttachmentDownload(
        tenant_id,
        req.params.taskId,
        req.params.attachmentId,
        employeeId,
        req.user.role
      );
      res.json({ success: true, data });
    } catch (error) {
      logger.error('Presign download error', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_COLLAB_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async upsertQuality(req, res) {
    try {
      const { tenant_id } = req.user;
      const employeeId = await employeeOr403(req, res);
      if (!employeeId) return;

      const row = await taskCollaborationService.upsertQualityRating(
        tenant_id,
        req.params.taskId,
        employeeId,
        req.user.role,
        req.body
      );
      res.json({ success: true, data: row });
    } catch (error) {
      logger.error('Quality rating error', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_COLLAB_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async listQuality(req, res) {
    try {
      const { tenant_id } = req.user;
      const employeeId = await employeeOr403(req, res);
      if (!employeeId) return;

      const rows = await taskCollaborationService.getQualityRatings(
        tenant_id,
        req.params.taskId,
        employeeId,
        req.user.role
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      logger.error('List quality error', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_COLLAB_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async createApproval(req, res) {
    try {
      const { tenant_id } = req.user;
      const employeeId = await employeeOr403(req, res);
      if (!employeeId) return;

      const row = await taskCollaborationService.createApproval(
        tenant_id,
        req.params.taskId,
        employeeId,
        req.user.role,
        req.body
      );
      res.status(201).json({ success: true, data: row });
    } catch (error) {
      logger.error('Create approval error', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_COLLAB_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async listApprovals(req, res) {
    try {
      const { tenant_id } = req.user;
      const employeeId = await employeeOr403(req, res);
      if (!employeeId) return;

      const rows = await taskCollaborationService.listApprovalsForTask(
        tenant_id,
        req.params.taskId,
        employeeId,
        req.user.role
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      logger.error('List approvals error', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_COLLAB_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async listMyApprovals(req, res) {
    try {
      const { tenant_id } = req.user;
      const employeeId = await employeeOr403(req, res);
      if (!employeeId) return;

      const rows = await taskCollaborationService.listMyPendingApprovals(tenant_id, employeeId);
      res.json({ success: true, data: rows });
    } catch (error) {
      logger.error('List my approvals error', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_COLLAB_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async listReviews(req, res) {
    try {
      const { tenant_id } = req.user;
      const employeeId = await employeeOr403(req, res);
      if (!employeeId) return;

      const rows = await taskCollaborationService.listTaskReviews(
        tenant_id,
        req.params.taskId,
        employeeId,
        req.user.role
      );
      res.json({ success: true, data: rows });
    } catch (error) {
      logger.error('List reviews error', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_COLLAB_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async createReview(req, res) {
    try {
      const { tenant_id } = req.user;
      const employeeId = await employeeOr403(req, res);
      if (!employeeId) return;

      const row = await taskCollaborationService.createTaskReview(
        tenant_id,
        req.params.taskId,
        employeeId,
        req.user.role,
        req.body
      );
      res.status(201).json({ success: true, data: row });
    } catch (error) {
      logger.error('Create review error', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_COLLAB_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }

  async decideApproval(req, res) {
    try {
      const { tenant_id } = req.user;
      const employeeId = await employeeOr403(req, res);
      if (!employeeId) return;

      const row = await taskCollaborationService.decideApproval(
        tenant_id,
        req.params.approvalId,
        employeeId,
        req.user.role,
        req.body
      );
      res.json({ success: true, data: row });
    } catch (error) {
      logger.error('Decide approval error', { error: error.message });
      const mapped = toErrorPayload(error, 'JTS_COLLAB_ERROR');
      res.status(mapped.status).json(mapped.body);
    }
  }
}

module.exports = new TaskCollaborationController();
