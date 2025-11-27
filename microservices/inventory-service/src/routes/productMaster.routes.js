const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const Joi = require('joi');

const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  deleteProductImage,
  setPrimaryImage,
  upload
} = require('../controllers/productMasterController');

const { getLowStockItems } = require('../controllers/stockController');

// Validation schemas
const createProductSchema = {
  body: Joi.object({
    name: Joi.string().required().trim().min(1).max(200),
    sku: Joi.string().required().trim().min(1).max(50),
    category: Joi.string().required().trim().min(1).max(100),
    subcategory: Joi.string().optional().trim().max(100),
    brand: Joi.string().required().trim().min(1).max(100),
    price: Joi.number().required().min(0),
    cost: Joi.number().optional().min(0),
    description: Joi.string().optional().trim().max(1000),
    specifications: Joi.object().optional(),
    status: Joi.string().valid('active', 'inactive', 'discontinued').default('active'),
    tags: Joi.array().items(Joi.string()).optional(),
    weight: Joi.number().optional().min(0),
    dimensions: Joi.object({
      length: Joi.number().min(0),
      width: Joi.number().min(0),
      height: Joi.number().min(0),
      unit: Joi.string().valid('cm', 'in', 'mm').default('cm')
    }).optional(),
    supplier: Joi.string().optional().trim().max(200),
    hsnCode: Joi.string().optional().trim().max(20),
    gstRate: Joi.number().optional().min(0).max(100)
  })
};

const updateProductSchema = {
  body: Joi.object({
    name: Joi.string().optional().trim().min(1).max(200),
    sku: Joi.string().optional().trim().min(1).max(50),
    category: Joi.string().optional().trim().min(1).max(100),
    subcategory: Joi.string().optional().trim().max(100),
    brand: Joi.string().optional().trim().min(1).max(100),
    price: Joi.number().optional().min(0),
    cost: Joi.number().optional().min(0),
    description: Joi.string().optional().trim().max(1000),
    specifications: Joi.object().optional(),
    status: Joi.string().valid('active', 'inactive', 'discontinued').optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    weight: Joi.number().optional().min(0),
    dimensions: Joi.object({
      length: Joi.number().min(0),
      width: Joi.number().min(0),
      height: Joi.number().min(0),
      unit: Joi.string().valid('cm', 'in', 'mm').default('cm')
    }).optional(),
    supplier: Joi.string().optional().trim().max(200),
    hsnCode: Joi.string().optional().trim().max(20),
    gstRate: Joi.number().optional().min(0).max(100)
  })
};

const getProductsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    category: Joi.string().optional(),
    brand: Joi.string().optional(),
    status: Joi.string().valid('active', 'inactive', 'discontinued').optional(),
    search: Joi.string().optional()
  })
};

const uploadImageSchema = {
  body: Joi.object({
    alt: Joi.string().optional().trim().max(200),
    isPrimary: Joi.boolean().optional()
  })
};

// Routes

// Get all products
router.get('/',
  authenticate,
  requireRole(['admin', 'manager', 'inventory_manager', 'store_manager']),
  validateRequest(getProductsSchema),
  getProducts
);

// Get single product
router.get('/:id',
  authenticate,
  requireRole(['admin', 'manager', 'inventory_manager', 'store_manager']),
  getProduct
);

// Create new product
router.post('/',
  authenticate,
  requireRole(['admin', 'manager', 'inventory_manager']),
  validateRequest(createProductSchema),
  createProduct
);

// Update product
router.put('/:id',
  authenticate,
  requireRole(['admin', 'manager', 'inventory_manager']),
  validateRequest(updateProductSchema),
  updateProduct
);

// Delete product
router.delete('/:id',
  authenticate,
  requireRole(['admin', 'manager']),
  deleteProduct
);

// Upload product image
router.post('/:id/image',
  authenticate,
  requireRole(['admin', 'manager', 'inventory_manager']),
  upload.single('image'),
  validateRequest(uploadImageSchema),
  uploadProductImage
);

// Delete product image
router.delete('/:id/image/:imageId',
  authenticate,
  requireRole(['admin', 'manager', 'inventory_manager']),
  deleteProductImage
);

// Set primary image
router.put('/:id/image/:imageId/primary',
  authenticate,
  requireRole(['admin', 'manager', 'inventory_manager']),
  setPrimaryImage
);

// Low stock items (also accessible via /api/inventory/stock/low-stock)
const getLowStockItemsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(25),
    store_id: Joi.string().optional(),
    category: Joi.string().optional()
  })
};

router.get('/low-stock',
  authenticate,
  requireRole(['admin', 'manager', 'inventory_manager', 'store_manager']),
  validateRequest(getLowStockItemsSchema),
  getLowStockItems
);

module.exports = router;
