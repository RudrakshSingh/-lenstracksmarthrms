const express = require('express');
const router = express.Router();
const crmController = require('../controllers/crmController');
const opportunityController = require('../controllers/opportunityController');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.middleware');
const Joi = require('joi');

// Apply authentication to all routes
router.use(authenticate);

// Customer 360° View
router.get('/customers/:id/360', requirePermission('view_customers'), crmController.getCustomer360);

// Customer Management
router.get('/customers', requirePermission('view_customers'), crmController.getCustomers);
router.post('/customers', requirePermission('manage_customers'), crmController.createCustomer);
router.get('/customers/:id', requirePermission('view_customers'), crmController.getCustomer);
router.patch('/customers/:id', requirePermission('manage_customers'), crmController.updateCustomer);
router.delete('/customers/:id', requirePermission('manage_customers'), crmController.deleteCustomer);

// Lead Management
router.get('/leads', requirePermission('view_leads'), crmController.getLeads);
router.post('/leads', requirePermission('manage_leads'), crmController.createLead);
router.get('/leads/:id', requirePermission('view_leads'), crmController.getLead);
router.patch('/leads/:id', requirePermission('manage_leads'), crmController.updateLead);
router.delete('/leads/:id', requirePermission('manage_leads'), crmController.deleteLead);
router.post('/leads/:id/convert', requirePermission('manage_leads'), crmController.convertLead);

// Interaction Management
router.get('/interactions', requirePermission('view_interactions'), crmController.getInteractions);
router.post('/interactions', requirePermission('manage_interactions'), crmController.createInteraction);
router.get('/interactions/:id', requirePermission('view_interactions'), crmController.getInteraction);
router.patch('/interactions/:id', requirePermission('manage_interactions'), crmController.updateInteraction);
router.delete('/interactions/:id', requirePermission('manage_interactions'), crmController.deleteInteraction);

// Family Management
router.post('/families', requirePermission('manage_customers'), crmController.createFamily);
router.post('/families/:family_id/members', requirePermission('manage_customers'), crmController.addFamilyMember);

// Communication
router.post('/send', requirePermission('send_messages'), crmController.sendMessage);

// Loyalty Management
router.get('/loyalty/policy/current', requirePermission('view_loyalty'), crmController.getCurrentLoyaltyRule);
router.post('/loyalty/earn', requirePermission('manage_loyalty'), crmController.earnLoyaltyPoints);
router.post('/loyalty/burn', requirePermission('manage_loyalty'), crmController.burnLoyaltyPoints);

// Wallet Management
router.post('/wallet/credit', requirePermission('manage_wallet'), crmController.creditWallet);
router.post('/wallet/debit', requirePermission('manage_wallet'), crmController.debitWallet);

// Subscription Management
router.post('/subscriptions', requirePermission('manage_subscriptions'), crmController.createSubscription);
router.post('/subscriptions/redeem', requirePermission('manage_subscriptions'), crmController.redeemSubscription);

// Analytics
router.get('/customers/:id/analytics', requirePermission('view_analytics'), crmController.getCustomerAnalytics);

// Opportunity Management
const createOpportunitySchema = {
  body: Joi.object({
    name: Joi.string().required().trim(),
    customer_id: Joi.string().required(),
    lead_id: Joi.string().optional(),
    stage: Joi.string().valid('PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST').optional(),
    probability: Joi.number().min(0).max(100).optional(),
    value: Joi.number().required().min(0),
    currency: Joi.string().default('INR'),
    expected_close_date: Joi.date().optional(),
    description: Joi.string().optional().max(2000),
    source: Joi.string().valid('WEBSITE', 'REFERRAL', 'WALK_IN', 'CALL', 'EMAIL', 'SOCIAL_MEDIA', 'OTHER').optional(),
    assigned_to: Joi.string().optional(),
    store_id: Joi.string().optional(),
    products: Joi.array().items(Joi.object({
      product_id: Joi.string().required(),
      quantity: Joi.number().min(1).required(),
      unit_price: Joi.number().min(0).required()
    })).optional()
  })
};

const updateOpportunitySchema = {
  body: Joi.object({
    name: Joi.string().optional().trim(),
    stage: Joi.string().valid('PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST').optional(),
    probability: Joi.number().min(0).max(100).optional(),
    value: Joi.number().optional().min(0),
    expected_close_date: Joi.date().optional(),
    description: Joi.string().optional().max(2000),
    assigned_to: Joi.string().optional()
  })
};

const closeOpportunitySchema = {
  body: Joi.object({
    reason: Joi.string().valid('WON', 'LOST', 'CANCELLED', 'ON_HOLD').required(),
    notes: Joi.string().optional()
  })
};

router.get('/opportunities', requirePermission('view_opportunities'), opportunityController.getOpportunities);
router.post('/opportunities', requirePermission('manage_opportunities'), validateRequest(createOpportunitySchema), opportunityController.createOpportunity);
router.get('/opportunities/stats', requirePermission('view_opportunities'), opportunityController.getOpportunityStats);
router.get('/opportunities/:id', requirePermission('view_opportunities'), opportunityController.getOpportunityById);
router.put('/opportunities/:id', requirePermission('manage_opportunities'), validateRequest(updateOpportunitySchema), opportunityController.updateOpportunity);
router.post('/opportunities/:id/close', requirePermission('manage_opportunities'), validateRequest(closeOpportunitySchema), opportunityController.closeOpportunity);

module.exports = router;
