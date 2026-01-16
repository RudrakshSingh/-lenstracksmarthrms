const onboardingService = require('../services/onboarding.service');
const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');
const httpStatusPkg = require('http-status');
const httpStatus = httpStatusPkg.default || httpStatusPkg;
const path = require('path');
const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');

/**
 * Step 1: Register basic information
 * @route POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const result = await onboardingService.registerBasicInfo(req.body);

    res.status(201).json({
      success: true,
      message: 'Basic information registered successfully',
      data: result
    });
  } catch (error) {
    logger.error('Registration error', { 
      error: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      code: error.code,
      body: req.body
    });
    
    // Handle ApiError properly
    if (error instanceof ApiError) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
        code: error.code || 'REGISTRATION_ERROR'
      });
    }
    
    // Handle other errors
    next(error);
  }
};

/**
 * Step 2: Add work details
 * @route POST /api/hr/employees
 */
const addWorkDetails = async (req, res, next) => {
  try {
    const { employeeId } = req.body;
    const createdBy = req.user?.id || req.user?._id;

    // Log request for debugging
    logger.info('Add work details request', {
      employeeId,
      hasJobTitle: !!req.body.jobTitle,
      hasDepartment: !!req.body.department,
      createdBy
    });

    if (!employeeId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Employee ID is required');
    }

    const result = await onboardingService.addWorkDetails(employeeId, req.body, createdBy);

    res.status(200).json({
      success: true,
      message: 'Work details added successfully',
      data: result
    });
  } catch (error) {
    logger.error('Add work details error', { 
      error: error.message,
      stack: error.stack,
      employeeId: req.body?.employeeId,
      statusCode: error.statusCode || error.status
    });
    next(error);
  }
};

/**
 * Step 3: Add statutory information
 * @route PATCH /api/hr/employees/:employeeId or POST /api/hr/onboarding/statutory-info
 */
const addStatutoryInfo = async (req, res, next) => {
  try {
    // Support both :employeeId param (PATCH) and employeeId in body (POST)
    const employeeId = req.params.employeeId || req.body.employeeId;
    const updatedBy = req.user?.id || req.user?._id;

    if (!employeeId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Employee ID is required');
    }

    const result = await onboardingService.addStatutoryInfo(employeeId, req.body, updatedBy);

    res.status(200).json({
      success: true,
      message: 'Statutory information added successfully',
      data: result
    });
  } catch (error) {
    logger.error('Add statutory info error', { error: error.message });
    next(error);
  }
};

/**
 * Step 5: Complete onboarding
 * @route POST /api/hr/employees/:employeeId/complete-onboarding
 */
const completeOnboarding = async (req, res, next) => {
  try {
    // Support both :id and :employeeId params
    const employeeId = req.params.employeeId || req.params.id;
    const completedBy = req.user?.id || req.user?._id;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required',
        error: 'EMPLOYEE_ID_REQUIRED'
      });
    }

    if (!completedBy) {
      logger.warn('Complete onboarding called without authenticated user', {
        employeeId,
        user: req.user
      });
    }

    logger.info('Completing onboarding', {
      employeeId,
      completedBy,
      hasBody: !!req.body
    });

    const result = await onboardingService.completeOnboarding(employeeId, req.body || {}, completedBy);

    res.status(200).json({
      success: true,
      message: 'Onboarding completed successfully',
      data: result
    });
  } catch (error) {
    logger.error('Complete onboarding error', { 
      error: error.message,
      stack: error.stack,
      employeeId: req.params.employeeId || req.params.id,
      userId: req.user?.id || req.user?._id
    });
    next(error);
  }
};

/**
 * Save onboarding draft
 * @route POST /api/hr/onboarding/draft
 */
const saveDraft = async (req, res, next) => {
  try {
    const { employee_id, step, data } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!employee_id || !step || !data) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'employee_id, step, and data are required');
    }

    const result = await onboardingService.saveDraft(employee_id, step, data, userId);

    res.status(200).json({
      success: true,
      message: 'Draft saved successfully',
      data: result
    });
  } catch (error) {
    logger.error('Save draft error', { error: error.message });
    next(error);
  }
};

/**
 * Get onboarding draft
 * @route GET /api/hr/onboarding/draft
 */
const getDraft = async (req, res, next) => {
  try {
    const { employee_id } = req.query;

    if (!employee_id) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'employee_id is required');
    }

    const result = await onboardingService.getDraft(employee_id);

    res.status(200).json({
      success: true,
      message: 'Draft retrieved successfully',
      data: result
    });
  } catch (error) {
    logger.error('Get draft error', { error: error.message });
    next(error);
  }
};

/**
 * Step 1: Add personal details (onboarding-specific)
 * @route POST /api/hr/onboarding/personal-details
 */
const addPersonalDetails = async (req, res, next) => {
  try {
    const createdBy = req.user?.id || req.user?._id;
    const result = await onboardingService.addPersonalDetails(req.body, createdBy);

    res.status(201).json({
      success: true,
      message: 'Personal details added successfully',
      data: result
    });
  } catch (error) {
    logger.error('Add personal details error', { error: error.message });
    next(error);
  }
};

/**
 * Step 4: Add onboarding documents
 * @route POST /api/hr/onboarding/documents
 */
const addDocuments = async (req, res, next) => {
  try {
    const { employeeId } = req.body;
    const uploadedBy = req.user?.id || req.user?._id;

    if (!employeeId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Employee ID is required');
    }

    const result = await onboardingService.addDocuments(employeeId, req.body, uploadedBy);

    res.status(200).json({
      success: true,
      message: 'Documents added successfully',
      data: result
    });
  } catch (error) {
    logger.error('Add documents error', { error: error.message });
    next(error);
  }
};

/**
 * Upload onboarding image/document (PHOTO, SIGNATURE, etc.) and save to onboardingDocuments
 * @route POST /api/hr/onboarding/upload
 * @access Private (HR, Admin, SuperAdmin)
 */
const uploadOnboardingDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      // ApiError signature: (statusCode, message, isOperational, stack, errorCode)
      throw new ApiError(httpStatus.BAD_REQUEST, 'No file uploaded', true, '', 'NO_FILE');
    }

    const employee_id = req.body.employee_id || req.body.employeeId;
    const document_type = (req.body.document_type || req.body.type || 'PHOTO').toUpperCase();

    if (!employee_id) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'employee_id is required', true, '', 'EMPLOYEE_ID_REQUIRED');
    }

    const allowedTypes = [
      'AADHAR',
      'PAN',
      'PASSPORT',
      'DRIVING_LICENSE',
      'EDUCATION_CERTIFICATE',
      'EXPERIENCE_CERTIFICATE',
      'BANK_STATEMENT',
      'PHOTO',
      'SIGNATURE',
      'OTHER'
    ];
    if (!allowedTypes.includes(document_type)) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Invalid document_type. Valid types: ${allowedTypes.join(', ')}`,
        true,
        '',
        'INVALID_DOCUMENT_TYPE'
      );
    }

    // Upload to Azure Blob Storage.
    // Primary: shared SAS-based uploader (used by document upload).
    // Fallback: connection string / account+key credentials if provided.
    let blobUrl = null;
    try {
      const azureBlobStorage = require('../../../shared/utils/azureBlobStorage');
      if (azureBlobStorage.isConfigured()) {
        // (SAS URL/token mode)
        // We'll upload later once filename is built.
      }
    } catch (e) {
      // Ignore: fallback handled below
    }

    const safeExt = path.extname(req.file.originalname || '').toLowerCase() || '';
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${safeExt}`;
    const filename = `${employee_id.toUpperCase()}-${document_type}-${safeName}`;

    // 1) Try shared SAS uploader
    try {
      const azureBlobStorage = require('../../../shared/utils/azureBlobStorage');
      if (azureBlobStorage.isConfigured()) {
        const uploadResult = await azureBlobStorage.uploadFile(req.file.buffer, filename, {
          mimeType: req.file.mimetype,
          folder: 'onboarding',
          originalName: req.file.originalname,
          metadata: {
            'employee-id': employee_id.toUpperCase(),
            'document-type': document_type
          }
        });
        blobUrl = uploadResult.url;
      }
    } catch (e) {
      logger.warn('SAS-based Azure upload failed, will try connection-string credentials', { error: e.message });
    }

    // 2) Fallback: connection string / account key credentials
    if (!blobUrl) {
      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
      const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
      const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
      const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'hrms-images';

      if (!connectionString && !(accountName && accountKey)) {
        throw new ApiError(
          httpStatus.SERVICE_UNAVAILABLE,
          'AZURE_BLOB_NOT_CONFIGURED',
          'Azure Blob Storage is not configured. Set AZURE_STORAGE_SAS_URL/SAS_TOKEN or AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT_NAME+AZURE_STORAGE_ACCOUNT_KEY'
        );
      }

      const blobServiceClient = connectionString
        ? BlobServiceClient.fromConnectionString(connectionString)
        : new BlobServiceClient(
            `https://${accountName}.blob.core.windows.net`,
            new StorageSharedKeyCredential(accountName, accountKey)
          );

      const containerClient = blobServiceClient.getContainerClient(containerName);
      await containerClient.createIfNotExists();
      const blobName = `onboarding/${filename}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.upload(req.file.buffer, req.file.buffer.length, {
        blobHTTPHeaders: {
          blobContentType: req.file.mimetype
        },
        metadata: {
          'employee-id': employee_id.toUpperCase(),
          'document-type': document_type,
          'original-name': req.file.originalname
        }
      });
      blobUrl = blockBlobClient.url;
    }

    const uploadedBy = req.user?.id || req.user?._id;
    const saveResult = await onboardingService.addDocuments(
      employee_id,
      {
        documents: [
          {
            type: document_type,
            file_name: req.file.originalname,
            url: blobUrl
          }
        ]
      },
      uploadedBy
    );

    return res.status(201).json({
      success: true,
      message: 'Onboarding document uploaded successfully',
      data: {
        employee_id: employee_id.toUpperCase(),
        document_type,
        file_name: req.file.originalname,
        mime_type: req.file.mimetype,
        file_size: req.file.size,
        url: blobUrl,
        storage_provider: 'azure',
        onboarding: saveResult
      }
    });
  } catch (error) {
    logger.error('Upload onboarding document error', { error: error.message, stack: error.stack });
    next(error);
  }
};

module.exports = {
  register,
  addPersonalDetails,
  addWorkDetails,
  addStatutoryInfo,
  uploadOnboardingDocument,
  addDocuments,
  completeOnboarding,
  saveDraft,
  getDraft
};

