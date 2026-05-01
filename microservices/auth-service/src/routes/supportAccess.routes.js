const express = require('express');
const Joi = require('joi');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const { createGrant, listGrants, revokeGrant } = require('../controllers/supportAccessController');

const router = express.Router();

const createGrantSchema = {
  body: Joi.object({
    tenantId: Joi.string().trim().min(1).required(),
    grantedTo: Joi.string().optional(),
    grantedToEmail: Joi.string().email().optional(),
    scope: Joi.array().items(Joi.string().valid('finance', 'payroll', 'general', 'gst', 'customer')).min(1).required(),
    expiresAt: Joi.date().required(),
    requireExtraApproval: Joi.boolean().default(false)
  })
    .or('grantedTo', 'grantedToEmail')
    .messages({ 'object.missing': 'Either grantedTo or grantedToEmail is required' })
};

router.use(authenticate);
router.use(requireRole(['admin']));

router.post('/grants', validateRequest(createGrantSchema), createGrant);
router.get('/grants', listGrants);
router.post('/grants/:id/revoke', revokeGrant);

module.exports = router;
