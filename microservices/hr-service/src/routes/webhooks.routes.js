const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const asyncHandler = require('../utils/asyncHandler');

// Webhooks don't require authentication (but should validate webhook secret)
// For now, we'll add a simple secret check
const validateWebhookSecret = (req, res, next) => {
  const secret = req.headers['x-webhook-secret'];
  const expectedSecret = process.env.WEBHOOK_SECRET || 'default-secret';
  
  if (secret !== expectedSecret) {
    return res.status(401).json({
      success: false,
      message: 'Invalid webhook secret'
    });
  }
  
  next();
};

// Routes
router.post(
  '/sales/closed',
  validateWebhookSecret,
  asyncHandler(webhookController.handleSalesClosed)
);

router.post(
  '/returns-remakes',
  validateWebhookSecret,
  asyncHandler(webhookController.handleReturnsRemakes)
);

router.post(
  '/stat/filing-status',
  validateWebhookSecret,
  asyncHandler(webhookController.handleStatFilingStatus)
);

module.exports = router;

