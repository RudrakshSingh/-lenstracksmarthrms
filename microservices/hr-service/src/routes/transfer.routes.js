const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const asyncHandler = require('../utils/asyncHandler');
const Joi = require('joi');

const {
  createTransferRequest,
  getTransferRequests,
  approveTransferRequest,
  rejectTransferRequest,
  cancelTransferRequest
} = require('../controllers/transferController');

// Validation schemas
const createTransferRequestSchema = {
  body: Joi.object({
    requestedStoreId: Joi.string().required(),
    effectiveDate: Joi.date().required(),
    reason: Joi.string().optional()
  })
};

const getTransferRequestsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid('pending', 'approved', 'rejected', 'cancelled').optional(),
    currentStore: Joi.string().optional(),
    requestedStore: Joi.string().optional()
  })
};

const rejectTransferRequestSchema = {
  body: Joi.object({
    rejectionReason: Joi.string().required()
  })
};

// Routes
router.post('/',
  authenticate,
  requireRole([], ['transfer:request']),
  validateRequest(createTransferRequestSchema),
  asyncHandler(createTransferRequest)
);

router.get('/',
  authenticate,
  requireRole([], ['transfer:read']),
  validateRequest(getTransferRequestsSchema),
  asyncHandler(getTransferRequests)
);

router.post('/:id/approve',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['transfer:approve']),
  asyncHandler(approveTransferRequest)
);

router.post('/:id/reject',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['transfer:approve']),
  validateRequest(rejectTransferRequestSchema),
  asyncHandler(rejectTransferRequest)
);

router.post('/:id/cancel',
  authenticate,
  requireRole([], ['transfer:request']),
  asyncHandler(cancelTransferRequest)
);

module.exports = router;