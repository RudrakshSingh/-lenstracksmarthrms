const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validate, Joi } = require('../middleware/validate.middleware');

const objectIdSchema = Joi.string().length(24).hex();

const inboxQuerySchema = Joi.object({
  read: Joi.string().valid('true', 'false').optional(),
  type: Joi.string().max(100).optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(200).optional()
});

const idParamSchema = Joi.object({
  id: objectIdSchema.required()
});

const preferenceBodySchema = Joi.object({
  channel_in_app: Joi.boolean().optional(),
  channel_email: Joi.boolean().optional(),
  channel_sms: Joi.boolean().optional(),
  channel_push: Joi.boolean().optional(),
  quiet_hours: Joi.object().optional()
}).min(1);

const dispatchBodySchema = Joi.object({
  recipient_ids: Joi.array().items(objectIdSchema).min(1).required(),
  type: Joi.string().max(100).required(),
  title: Joi.string().max(200).required(),
  message: Joi.string().max(2000).required(),
  channels: Joi.array().items(Joi.string().valid('in_app', 'email', 'sms', 'webhook')).min(1).required(),
  event_type: Joi.string().max(100).optional(),
  webhook_url: Joi.string().uri().optional(),
  metadata: Joi.object().optional()
});

const processQueueBodySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(1000).optional()
});

const testEmailBodySchema = Joi.object({
  to_email: Joi.string().email().max(320).required(),
  subject: Joi.string().max(200).optional(),
  message: Joi.string().max(2000).optional()
});

router.use(authenticate);

// Backward-compatible aliases used by existing API test scripts.
router.get('/', validate({ query: inboxQuerySchema }), (req, res) => notificationController.getMyInbox(req, res));
router.get('/health', (req, res) => notificationController.providerHealth(req, res));

router.get(
  '/me',
  validate({ query: inboxQuerySchema }),
  (req, res) => notificationController.getMyInbox(req, res)
);

router.patch(
  '/:id/read',
  validate({ params: idParamSchema }),
  (req, res) => notificationController.markAsRead(req, res)
);

router.patch(
  '/me/read-all',
  (req, res) => notificationController.markAllAsRead(req, res)
);

router.get(
  '/preferences/me',
  (req, res) => notificationController.getMyPreferences(req, res)
);

router.put(
  '/preferences/me',
  validate({ body: preferenceBodySchema }),
  (req, res) => notificationController.updateMyPreferences(req, res)
);

router.post(
  '/dispatch',
  requireRole(['MANAGER', 'STORE_MANAGER', 'CLUSTER_MANAGER', 'COUNTRY_OPS', 'TENANT_ADMIN', 'HOD']),
  validate({ body: dispatchBodySchema }),
  (req, res) => notificationController.dispatch(req, res)
);

router.post(
  '/process-queues',
  requireRole(['TENANT_ADMIN', 'COUNTRY_OPS']),
  validate({ body: processQueueBodySchema }),
  (req, res) => notificationController.processQueues(req, res)
);

router.get(
  '/providers/health',
  requireRole(['TENANT_ADMIN', 'COUNTRY_OPS']),
  (req, res) => notificationController.providerHealth(req, res)
);

router.post(
  '/test-email',
  requireRole(['TENANT_ADMIN', 'COUNTRY_OPS']),
  validate({ body: testEmailBodySchema }),
  (req, res) => notificationController.sendTestEmail(req, res)
);

module.exports = router;
