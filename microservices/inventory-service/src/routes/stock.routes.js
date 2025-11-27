const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const Joi = require('joi');

const {
  getStockMovements,
  adjustStock,
  getStockSummary,
  getLowStockItems
} = require('../controllers/stockController');

// Validation schemas
const adjustStockSchema = {
  body: Joi.object({
    product_id: Joi.string().required(),
    store_id: Joi.string().required(),
    quantity: Joi.number().required().min(0),
    type: Joi.string().valid('INCREASE', 'DECREASE', 'SET').required(),
    reason: Joi.string().optional().max(500)
  })
};

const getStockMovementsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(25),
    store_id: Joi.string().optional(),
    status: Joi.string().optional(),
    transfer_type: Joi.string().optional(),
    date_from: Joi.date().optional(),
    date_to: Joi.date().optional()
  })
};

const getLowStockItemsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(25),
    store_id: Joi.string().optional(),
    category: Joi.string().optional()
  })
};

// Routes
router.get(
  '/movements',
  authenticate,
  requireRole(['admin', 'manager', 'inventory_manager', 'store_manager']),
  validateRequest(getStockMovementsSchema),
  getStockMovements
);

router.post(
  '/adjust',
  authenticate,
  requireRole(['admin', 'manager', 'inventory_manager']),
  validateRequest(adjustStockSchema),
  adjustStock
);

router.get(
  '/summary',
  authenticate,
  requireRole(['admin', 'manager', 'inventory_manager', 'store_manager']),
  getStockSummary
);

// Low stock items route (also accessible via /api/inventory/items/low-stock)
router.get(
  '/low-stock',
  authenticate,
  requireRole(['admin', 'manager', 'inventory_manager', 'store_manager']),
  validateRequest(getLowStockItemsSchema),
  getLowStockItems
);

module.exports = router;

