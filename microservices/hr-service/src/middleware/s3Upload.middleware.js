const { uploadToS3, isS3StorageReady } = require('../config/s3Storage');
const logger = require('../config/logger');

/**
 * Middleware to upload file to AWS S3
 * Attaches S3 URL to req.file.s3Url
 */
const uploadToS3Storage = async (req, res, next) => {
  try {
    if (!req.file) {
      logger.info('No file uploaded, continuing without S3 upload');
      return next();
    }

    if (!isS3StorageReady()) {
      logger.warn('AWS S3 Storage not configured, skipping upload');
      req.file.s3Url = null;
      return next();
    }

    const fileName = req.file.originalname || `document-${Date.now()}.pdf`;
    const contentType = req.file.mimetype || 'application/pdf';
    const fileBuffer = req.file.buffer;

    const uploadResult = await uploadToS3(fileBuffer, fileName, contentType);

    req.file.s3Url = uploadResult.url;
    req.file.s3Key = uploadResult.key;
    req.file.uploadedAt = uploadResult.uploadedAt;

    logger.info('File uploaded to S3 storage successfully', {
      fileName,
      s3Url: uploadResult.url,
      userId: req.user?._id,
      employeeId: req.body?.employee_id || req.body?.employeeId
    });

    next();
  } catch (error) {
    logger.error('S3 upload middleware error', {
      error: error.message,
      userId: req.user?._id,
      fileName: req.file?.originalname
    });

    req.file.s3Url = null;
    req.file.uploadError = error.message;
    next();
  }
};

module.exports = {
  uploadToS3Storage
};
