const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/rbac.middleware');
const documentController = require('../controllers/documentController');

// Health check route for documents (no auth required for testing)
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'document-routes',
    status: 'active',
    timestamp: new Date().toISOString()
  });
});

// IMPORTANT: Specific routes must come BEFORE parameterized routes
// Document upload - MUST be before /:employeeId route
router.post('/upload',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['document:upload']),
  documentController.upload.single('file'),
  documentController.uploadDocument
);

// Get all documents (for HR/Admin) or documents for current user
router.get('/',
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], ['document:read']),
  documentController.getAllDocuments
);

// Get documents for employee - MUST be after /upload
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

