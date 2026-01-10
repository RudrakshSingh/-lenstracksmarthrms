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

    // For now, store file info in memory/database
    // In production, upload to Azure Blob Storage
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
      file_data: req.file.buffer.toString('base64') // Store as base64 temporarily
    };

    // TODO: Upload to Azure Blob Storage
    // const blobUrl = await uploadToAzureBlob(req.file.buffer, req.file.originalname);
    // documentData.file_url = blobUrl;

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
 * Get documents for employee
 * GET /api/documents/:employeeId
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
  getDocuments,
  deleteDocument
};

