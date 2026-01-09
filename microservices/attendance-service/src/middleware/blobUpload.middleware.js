const { uploadToBlob, isBlobStorageReady } = require('../config/azureStorage');
const logger = require('../config/logger');

/**
 * Middleware to upload file to Azure Blob Storage
 * Use after multer middleware (upload.single('fieldName'))
 */
const uploadToBlobStorage = async (req, res, next) => {
  try {
    // If no file uploaded, continue (selfie is optional)
    if (!req.file) {
      logger.info('No file uploaded, continuing without blob upload');
      return next();
    }

    // Check if Azure Blob Storage is ready
    if (!isBlobStorageReady()) {
      logger.warn('Azure Blob Storage not configured, skipping upload');
      req.file.blobUrl = null; // Mark as not uploaded
      return next();
    }

    // Upload to Azure Blob Storage
    const fileName = req.file.originalname || `selfie-${Date.now()}.jpg`;
    const contentType = req.file.mimetype || 'image/jpeg';
    const fileBuffer = req.file.buffer;

    const uploadResult = await uploadToBlob(fileBuffer, fileName, contentType);

    // Attach blob URL to req.file for controller to use
    req.file.blobUrl = uploadResult.url;
    req.file.blobName = uploadResult.blobName;
    req.file.uploadedAt = uploadResult.uploadedAt;

    logger.info('File uploaded to blob storage successfully', {
      fileName,
      blobUrl: uploadResult.url,
      userId: req.user?._id
    });

    next();
  } catch (error) {
    logger.error('Blob upload middleware error', {
      error: error.message,
      userId: req.user?._id,
      fileName: req.file?.originalname
    });

    // Don't block the request if upload fails
    // Just log the error and continue
    req.file.blobUrl = null;
    req.file.uploadError = error.message;
    next();
  }
};

module.exports = {
  uploadToBlobStorage
};

