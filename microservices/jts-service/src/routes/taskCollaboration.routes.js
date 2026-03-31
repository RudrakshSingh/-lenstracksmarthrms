const express = require('express');
const router = express.Router({ mergeParams: false });
const collaborationController = require('../controllers/taskCollaboration.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate, Joi } = require('../middleware/validate.middleware');

const objectIdSchema = Joi.string().length(24).hex();

const commentBody = Joi.object({
  message: Joi.string().trim().min(1).max(4000).optional(),
  body: Joi.string().trim().min(1).max(4000).optional(),
  mentions: Joi.array().items(objectIdSchema).optional(),
  is_internal: Joi.boolean().optional()
}).or('message', 'body');

const attachmentBody = Joi.object({
  file_key: Joi.string().trim().min(1).max(500).required(),
  file_name: Joi.string().trim().min(1).max(255).required(),
  mime_type: Joi.string().trim().max(120).required(),
  size_bytes: Joi.number().integer().min(1).max(200 * 1024 * 1024).required(),
  file_url: Joi.string().max(2000).allow('', null).optional(),
  attachment_type: Joi.string().max(64).optional(),
  is_evidence: Joi.boolean().optional(),
  storage_provider: Joi.string().valid('s3', 'external').optional()
});

const presignUploadBody = Joi.object({
  file_name: Joi.string().trim().min(1).max(255).required(),
  mime_type: Joi.string().trim().max(120).required()
});

const taskAttachmentParams = Joi.object({
  taskId: objectIdSchema.required(),
  attachmentId: objectIdSchema.required()
});

const qualityBody = Joi.object({
  quality_score: Joi.number().min(1).max(5).required(),
  timeliness_score: Joi.number().min(1).max(5).required(),
  thoroughness_score: Joi.number().min(1).max(5).required(),
  comments: Joi.string().max(2000).allow('', null).optional()
});

const approvalCreateBody = Joi.object({
  approver_employee_id: objectIdSchema.required(),
  approval_type: Joi.string()
    .valid(
      'CREATE_APPROVAL',
      'SELF_TASK_APPROVAL',
      'COMPLETION_APPROVAL',
      'EXTENSION_APPROVAL',
      'REASSIGN_APPROVAL'
    )
    .optional(),
  payload: Joi.object().optional()
});

const taskReviewBody = Joi.object({
  status: Joi.string().valid('APPROVED', 'REWORK_REQUIRED').required(),
  rating: Joi.number().min(1).max(5).optional(),
  checklist_score: Joi.number().min(0).max(100).optional(),
  remarks: Joi.string().max(4000).allow('', null).optional()
});

const approvalDecideBody = Joi.object({
  status: Joi.string().valid('APPROVED', 'REJECTED').required(),
  reason: Joi.string().max(1000).allow('', null).optional()
});

const taskIdParam = Joi.object({
  taskId: objectIdSchema.required()
});

const approvalIdParam = Joi.object({
  approvalId: objectIdSchema.required()
});

router.use(authenticate);

/** Static segments before /:taskId to avoid catching "approvals" as a task id */
router.get('/approvals/pending/me', (req, res) =>
  collaborationController.listMyApprovals(req, res)
);

router.patch(
  '/approvals/:approvalId',
  validate({ params: approvalIdParam, body: approvalDecideBody }),
  (req, res) => collaborationController.decideApproval(req, res)
);

router.get(
  '/:taskId/reviews',
  validate({ params: taskIdParam }),
  (req, res) => collaborationController.listReviews(req, res)
);

router.post(
  '/:taskId/reviews',
  validate({ params: taskIdParam, body: taskReviewBody }),
  (req, res) => collaborationController.createReview(req, res)
);

router.get(
  '/:taskId/comments',
  validate({ params: taskIdParam }),
  (req, res) => collaborationController.listComments(req, res)
);

router.post(
  '/:taskId/comments',
  validate({ params: taskIdParam, body: commentBody }),
  (req, res) => collaborationController.addComment(req, res)
);

router.get(
  '/:taskId/attachments',
  validate({ params: taskIdParam }),
  (req, res) => collaborationController.listAttachments(req, res)
);

router.post(
  '/:taskId/attachments/presign-upload',
  validate({ params: taskIdParam, body: presignUploadBody }),
  (req, res) => collaborationController.presignAttachmentUpload(req, res)
);

router.get(
  '/:taskId/attachments/:attachmentId/presign-download',
  validate({ params: taskAttachmentParams }),
  (req, res) => collaborationController.presignAttachmentDownload(req, res)
);

router.post(
  '/:taskId/attachments',
  validate({ params: taskIdParam, body: attachmentBody }),
  (req, res) => collaborationController.addAttachment(req, res)
);

router.get(
  '/:taskId/quality',
  validate({ params: taskIdParam }),
  (req, res) => collaborationController.listQuality(req, res)
);

router.put(
  '/:taskId/quality',
  validate({ params: taskIdParam, body: qualityBody }),
  (req, res) => collaborationController.upsertQuality(req, res)
);

router.get(
  '/:taskId/approvals',
  validate({ params: taskIdParam }),
  (req, res) => collaborationController.listApprovals(req, res)
);

router.post(
  '/:taskId/approvals',
  validate({ params: taskIdParam, body: approvalCreateBody }),
  (req, res) => collaborationController.createApproval(req, res)
);

module.exports = router;
