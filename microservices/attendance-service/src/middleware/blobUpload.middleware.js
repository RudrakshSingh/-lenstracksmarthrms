const { uploadToS3, isS3StorageReady } = require('../config/s3Storage');
const logger = require('../config/logger');

/**
 * Middleware to upload file to AWS S3
 * Use after multer middleware (upload.single('fieldName'))
 */
const uploadToBlobStorage = async (req, res, next) => {
  try {
    // If no file uploaded, continue (selfie is optional)
    if (!req.file) {
      logger.info('No file uploaded, continuing without S3 upload');
      return next();
    }

    // Check if AWS S3 is ready
    if (!isS3StorageReady()) {
      logger.warn('AWS S3 not configured, skipping upload');
      req.file.blobUrl = null; // Mark as not uploaded
      return next();
    }

    // Upload to AWS S3
    const fileName = req.file.originalname || `selfie-${Date.now()}.jpg`;
    const contentType = req.file.mimetype || 'image/jpeg';
    const fileBuffer = req.file.buffer;

    const uploadResult = await uploadToS3(fileBuffer, fileName, contentType);

    // Attach S3 URL to req.file for controller to use
    req.file.blobUrl = uploadResult.url;
    req.file.blobName = uploadResult.fileKey || uploadResult.blobName;
    req.file.uploadedAt = uploadResult.uploadedAt;

    logger.info('File uploaded to S3 successfully', {
      fileName,
      blobUrl: uploadResult.url,
      userId: req.user?._id
    });

    next();
  } catch (error) {
    logger.error('S3 upload middleware error', {
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

