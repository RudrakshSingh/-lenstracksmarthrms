const express = require('express');
const Joi = require('joi');
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const controller = require('../controllers/lensMasterController');

const router = express.Router();

const rangeSchema = Joi.object({
  min: Joi.number().required(),
  max: Joi.number().required(),
  step: Joi.number().positive().default(0.25)
});

const lensMasterCreateSchema = {
  body: Joi.object({
    brand: Joi.string().required(),
    productType: Joi.string().required(),
    visionType: Joi.string().required(),
    index: Joi.number().required(),
    coating: Joi.array().items(Joi.string()).default([]),
    powerRange: rangeSchema.optional(),
    cylRange: rangeSchema.optional(),
    axisRange: Joi.object({ min: Joi.number().default(0), max: Joi.number().default(180) }).optional(),
    addRange: rangeSchema.optional(),
    gstPercent: Joi.number().min(0).max(100).default(0),
    hsnCode: Joi.string().allow('').optional(),
    vendorMapping: Joi.array()
      .items(
        Joi.object({
          vendorId: Joi.string().optional(),
          vendorSku: Joi.string().allow('').optional(),
          costPrice: Joi.number().min(0).default(0)
        })
      )
      .default([])
  })
};

const lensMasterUpdateSchema = { body: lensMasterCreateSchema.body.fork(['brand', 'productType', 'visionType', 'index'], (s) => s.optional()) };

const clMasterCreateSchema = {
  body: Joi.object({
    brand: Joi.string().required(),
    power: Joi.number().required(),
    cyl: Joi.number().default(0),
    axis: Joi.number().min(0).max(180).optional(),
    baseCurve: Joi.number().required(),
    diameter: Joi.number().required(),
    modality: Joi.string().valid('DAILY', 'FORTNIGHTLY', 'MONTHLY', 'QUARTERLY', 'YEARLY').required(),
    packSize: Joi.number().min(1).default(1),
    gstPercent: Joi.number().min(0).max(100).default(0),
    hsnCode: Joi.string().allow('').optional(),
    vendorMapping: Joi.array()
      .items(
        Joi.object({
          vendorId: Joi.string().optional(),
          costPrice: Joi.number().min(0).default(0),
          expiryMonths: Joi.number().min(0).default(0)
        })
      )
      .default([]),
    batchTracking: Joi.boolean().default(false)
  })
};

const clMasterUpdateSchema = { body: clMasterCreateSchema.body.fork(['brand', 'power', 'baseCurve', 'diameter', 'modality'], (s) => s.optional()) };

router.use(authenticate);

// Lens Master APIs
router.get('/lens-master', requireRole(['admin', 'manager', 'inventory_manager', 'store_manager']), controller.listLensMaster);
router.get('/lens-master/check-stock', requireRole(['admin', 'manager', 'inventory_manager', 'store_manager']), controller.checkLensMasterStock);
router.get('/lens-master/:id', requireRole(['admin', 'manager', 'inventory_manager', 'store_manager']), controller.getLensMaster);
router.post('/lens-master', requireRole(['admin', 'manager', 'inventory_manager']), validateRequest(lensMasterCreateSchema), controller.createLensMaster);
router.put('/lens-master/:id', requireRole(['admin', 'manager', 'inventory_manager']), validateRequest(lensMasterUpdateSchema), controller.updateLensMaster);
router.delete('/lens-master/:id', requireRole(['admin', 'manager', 'inventory_manager']), controller.deleteLensMaster);

// Contact Lens Master APIs
router.get('/cl-master', requireRole(['admin', 'manager', 'inventory_manager', 'store_manager']), controller.listContactLensMaster);
router.get('/cl-master/check-stock', requireRole(['admin', 'manager', 'inventory_manager', 'store_manager']), controller.checkContactLensMasterStock);
router.get('/cl-master/:id', requireRole(['admin', 'manager', 'inventory_manager', 'store_manager']), controller.getContactLensMaster);
router.post('/cl-master', requireRole(['admin', 'manager', 'inventory_manager']), validateRequest(clMasterCreateSchema), controller.createContactLensMaster);
router.put('/cl-master/:id', requireRole(['admin', 'manager', 'inventory_manager']), validateRequest(clMasterUpdateSchema), controller.updateContactLensMaster);
router.delete('/cl-master/:id', requireRole(['admin', 'manager', 'inventory_manager']), controller.deleteContactLensMaster);

module.exports = router;
