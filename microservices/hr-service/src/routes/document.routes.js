const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const documentController = require('../controllers/documentController');

// Get all documents (for HR/Admin) or documents for current user
router.get('/',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], ['document:read']),
  documentController.getAllDocuments
);

// Document upload
router.post('/upload',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['document:upload']),
  documentController.upload.single('file'),
  documentController.uploadDocument
);

// Get documents for employee
router.get('/:employeeId',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager', 'Employee'], ['document:read']),
  documentController.getDocuments
);

// Delete document
router.delete('/:documentId',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['document:delete']),
  documentController.deleteDocument
);

module.exports = router;

