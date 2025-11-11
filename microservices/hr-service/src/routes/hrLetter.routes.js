const express = require('express');
const router = express.Router();
const hrLetterController = require('../controllers/hrLetterController');
const { requireRole, requirePermission } = require('../middleware/rbac.middleware');
const { validateRequest } = require('../middleware/validateRequest.wrapper');
const asyncHandler = require('../utils/asyncHandler');
const Joi = require('joi');

// Validation schemas
const createLetterSchema = {
  body: Joi.object({
    letterType: Joi.string().valid('OFFER', 'APPOINTMENT', 'PROMOTION', 'DEMOTION', 'TRANSFER', 'ROLE_CHANGE', 'TERMINATION', 'INTERNSHIP').required(),
    employeeId: Joi.string().required(),
    language: Joi.string().valid('en-IN', 'hi-IN').default('en-IN'),
    effectiveDate: Joi.date().required(),
    templateId: Joi.string(),
    overrides: Joi.object().default({}),
    annexures: Joi.array().items(Joi.object({
      title: Joi.string().required(),
      type: Joi.string().valid('HTML', 'PDF', 'DOCX').required(),
      content: Joi.string(),
      url: Joi.string()
    })).default([])
  })
};

const updateLetterSchema = {
  body: Joi.object({
    reason: Joi.string(),
    newDesignation: Joi.string(),
    newDepartment: Joi.string(),
    newLocation: Joi.object({
      storeId: Joi.string(),
      storeName: Joi.string(),
      city: Joi.string(),
      state: Joi.string(),
      pincode: Joi.string()
    }),
    annexures: Joi.array().items(Joi.object({
      title: Joi.string().required(),
      type: Joi.string().valid('HTML', 'PDF', 'DOCX').required(),
      content: Joi.string(),
      url: Joi.string()
    }))
  })
};

const approveLetterSchema = {
  body: Joi.object({
    stepNumber: Joi.number().required(),
    comments: Joi.string()
  })
};

const rejectLetterSchema = {
  body: Joi.object({
    stepNumber: Joi.number().required(),
    comments: Joi.string().required()
  })
};

const computeCompensationSchema = {
  body: Joi.object({
    employeeId: Joi.string().required(),
    salarySystem: Joi.string().valid('PERFORMANCE_DEBIT_CREDIT', 'FIXED_PLUS_TARGET_INCENTIVE', 'STANDARD_FIXED', 'WORKTRACK_PLUS_INCENTIVE').required()
  })
};

// Routes
router.post('/letters', 
  requireRole(['hr', 'admin']),
  requirePermission('hr.letters.create'),
  validateRequest(createLetterSchema),
  asyncHandler(hrLetterController.createLetter)
);

router.get('/letters',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.letters.read'),
  asyncHandler(hrLetterController.getLetters)
);

router.get('/letters/:letterId',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.letters.read'),
  asyncHandler(hrLetterController.getLetterById)
);

router.put('/letters/:letterId',
  requireRole(['hr', 'admin']),
  requirePermission('hr.letters.update'),
  validateRequest(updateLetterSchema),
  asyncHandler(hrLetterController.updateLetter)
);

router.post('/letters/:letterId/submit',
  requireRole(['hr', 'admin']),
  requirePermission('hr.letters.submit'),
  asyncHandler(hrLetterController.submitForApproval)
);

router.post('/letters/:letterId/approve',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.letters.approve'),
  validateRequest(approveLetterSchema),
  asyncHandler(hrLetterController.approveLetter)
);

router.post('/letters/:letterId/reject',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.letters.approve'),
  validateRequest(rejectLetterSchema),
  asyncHandler(hrLetterController.rejectLetter)
);

router.get('/letters/:letterId/preview',
  requireRole(['hr', 'admin', 'manager']),
  requirePermission('hr.letters.read'),
  asyncHandler(hrLetterController.generatePreview)
);

router.post('/helpers/compute-comp',
  requireRole(['hr', 'admin']),
  requirePermission('hr.letters.create'),
  validateRequest(computeCompensationSchema),
  asyncHandler(hrLetterController.computeCompensation)
);

router.get('/stats',
  requireRole(['hr', 'admin']),
  requirePermission('hr.letters.read'),
  asyncHandler(hrLetterController.getLetterStats)
);

module.exports = router;
