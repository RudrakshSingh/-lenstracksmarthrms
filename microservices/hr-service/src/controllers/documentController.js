const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../config/logger');
const { sendSuccess, sendError } = require('../../../shared/utils/response.util');

// Configure multer for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;
  
  if (allowedTypes.includes(mimeType) && allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, JPEG, PNG allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

/**
 * Upload document
 * POST /api/documents/upload or /api/hr/documents/upload
 */
const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded', 'Please provide a file', 400);
    }

    const {
      employee_id,
      document_type,
      category,
      compliance_required
    } = req.body;

    if (!employee_id) {
      return sendError(res, 'Validation failed', 'employee_id is required', 400);
    }

    if (!document_type) {
      return sendError(res, 'Validation failed', 'document_type is required', 400);
    }

    // Upload to Azure Blob Storage or Cloudinary
    let fileUrl = null;
    let storageProvider = 'local';
    
    try {
      const azureBlobStorage = require('../../../shared/utils/azureBlobStorage');
      if (azureBlobStorage.isConfigured()) {
        // Upload to Azure Blob Storage
        const filename = `${Date.now()}-${req.file.originalname}`;
        const uploadResult = await azureBlobStorage.uploadFile(req.file.buffer, filename, {
          mimeType: req.file.mimetype,
          folder: 'documents',
          originalName: req.file.originalname,
          metadata: {
            'employee-id': employee_id,
            'document-type': document_type
          }
        });
        fileUrl = uploadResult.url;
        storageProvider = 'azure';
        logger.info('Document uploaded to Azure Blob Storage', {
          documentId: `doc-${Date.now()}`,
          blobName: uploadResult.blobName,
          url: fileUrl.substring(0, 100) + '...'
        });
      } else {
        // Fallback to local storage (base64 in database)
        logger.warn('Azure Blob Storage not configured, storing file as base64 in database');
        storageProvider = 'local';
      }
    } catch (uploadError) {
      logger.error('Failed to upload to Azure Blob Storage, falling back to local storage', {
        error: uploadError.message
      });
      storageProvider = 'local';
    }

    const documentData = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      document_type: document_type.toUpperCase(),
      file_name: req.file.originalname,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      upload_date: new Date().toISOString(),
      employee_id: employee_id,
      category: category || 'OTHER',
      compliance_required: compliance_required === 'true' || compliance_required === true,
      status: 'uploaded',
      uploaded_by: req.user?._id || req.user?.id,
      file_url: fileUrl, // Azure Blob Storage URL if uploaded
      storage_provider: storageProvider,
      file_data: storageProvider === 'local' ? req.file.buffer.toString('base64') : null // Only store base64 if local
    };

    logger.info('Document uploaded successfully', {
      documentId: documentData.id,
      employeeId: employee_id,
      documentType: document_type,
      fileSize: req.file.size
    });

    return sendSuccess(res, {
      id: documentData.id,
      document_type: documentData.document_type,
      file_name: documentData.file_name,
      file_size: documentData.file_size,
      upload_date: documentData.upload_date,
      employee_id: documentData.employee_id,
      status: documentData.status,
      category: documentData.category
    }, 'Document uploaded successfully', null, 201);

  } catch (error) {
    logger.error('Error uploading document', { error: error.message });
    
    if (error.message.includes('file type') || error.message.includes('File too large')) {
      return sendError(res, 'Upload failed', error.message, 400);
    }
    
    next(error);
  }
};

/**
 * Get all documents (for HR/Admin) or documents for current user
 * GET /api/documents or /api/hr/documents
 */
const getAllDocuments = async (req, res, next) => {
  try {
    // If user is HR/Admin, return all documents
    // Otherwise, return documents for current user
    const userRole = req.user?.role;
    const userId = req.user?.id || req.user?._id;
    
    // TODO: Fetch from database based on role
    const documents = [];

    return sendSuccess(res, documents, 'Documents retrieved successfully');
  } catch (error) {
    logger.error('Error getting all documents', { error: error.message });
    next(error);
  }
};

/**
 * Get documents for employee
 * GET /api/documents/:employeeId or /api/hr/documents/:employeeId
 */
const getDocuments = async (req, res, next) => {
  try {
    const { employeeId } = req.params;

    // TODO: Fetch from database
    const documents = [];

    return sendSuccess(res, documents, 'Documents retrieved successfully');
  } catch (error) {
    logger.error('Error getting documents', { error: error.message });
    next(error);
  }
};

/**
 * Delete document
 * DELETE /api/documents/:documentId
 */
const deleteDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    // TODO: Delete from Azure Blob and database

    return sendSuccess(res, { id: documentId }, 'Document deleted successfully');
  } catch (error) {
    logger.error('Error deleting document', { error: error.message });
    next(error);
  }
};

module.exports = {
  upload,
  uploadDocument,
  getAllDocuments,
  getDocuments,
  deleteDocument
};

