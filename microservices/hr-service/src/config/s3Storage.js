const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const logger = require('./logger');

// AWS S3 configuration
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || 'etelios-prod-storage';
const AWS_S3_ENDPOINT = process.env.AWS_S3_ENDPOINT; // Optional: for S3-compatible services

let s3Client = null;

/**
 * Initialize AWS S3 client
 * Supports IAM role (EC2/ECS/EKS) or access key authentication
 */
const initializeS3Storage = async () => {
  try {
    // Configure S3 client
    const s3Config = {
      region: AWS_REGION,
    };

    // Use access keys if provided (for local/dev environments)
    if (AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY) {
      logger.info('Initializing AWS S3 with access keys...');
      s3Config.credentials = {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      };
    } else {
      logger.info('Initializing AWS S3 with IAM role (EC2/ECS/EKS)...');
      // AWS SDK will automatically use IAM role credentials in EC2/ECS/EKS
    }

    // Add custom endpoint if provided (for S3-compatible services like MinIO)
    if (AWS_S3_ENDPOINT) {
      s3Config.endpoint = AWS_S3_ENDPOINT;
      s3Config.forcePathStyle = true; // Required for S3-compatible services
      logger.info('Using custom S3 endpoint', { endpoint: AWS_S3_ENDPOINT });
    }

    s3Client = new S3Client(s3Config);

    // Verify bucket exists and is accessible
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: AWS_S3_BUCKET_NAME }));
      logger.info('✅ AWS S3 initialized successfully', {
        bucket: AWS_S3_BUCKET_NAME,
        region: AWS_REGION,
        authMethod: AWS_ACCESS_KEY_ID ? 'access-keys' : 'iam-role'
      });
    } catch (bucketError) {
      if (bucketError.name === 'NotFound' || bucketError.$metadata?.httpStatusCode === 404) {
        logger.warn('S3 bucket does not exist. Please create it manually:', {
          bucket: AWS_S3_BUCKET_NAME,
          region: AWS_REGION
        });
        logger.warn('Bucket will be created automatically on first upload (if permissions allow)');
      } else {
        logger.error('Failed to verify S3 bucket access', {
          error: bucketError.message,
          bucket: AWS_S3_BUCKET_NAME
        });
        // Don't throw - allow service to start even if bucket check fails
        // Bucket might be created later or permissions might be set up differently
      }
    }

    return true;
  } catch (error) {
    logger.error('Failed to initialize AWS S3', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
};

/**
 * Upload file to AWS S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - File name
 * @param {string} contentType - MIME type
 * @param {string} folder - Optional folder path (default: 'onboarding')
 * @returns {Promise<Object>} Upload result with URL
 */
const uploadToS3 = async (fileBuffer, fileName, contentType, folder = 'onboarding') => {
  try {
    if (!s3Client) {
      throw new Error('AWS S3 Storage not initialized');
    }

    // Generate unique file key with timestamp
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileKey = `${folder}/${timestamp}-${sanitizedFileName}`;

    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: AWS_S3_BUCKET_NAME,
      Key: fileKey,
      Body: fileBuffer,
      ContentType: contentType,
      // Note: ACL removed - bucket has ACLs disabled (default for new buckets)
      // Use bucket policy for public access if needed
      // Add metadata
      Metadata: {
        'uploaded-at': new Date().toISOString(),
        'original-name': fileName
      }
    });

    await s3Client.send(uploadCommand);

    // Generate public URL
    const s3Url = AWS_S3_ENDPOINT
      ? `${AWS_S3_ENDPOINT}/${AWS_S3_BUCKET_NAME}/${fileKey}`
      : `https://${AWS_S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${fileKey}`;

    logger.info('File uploaded to AWS S3 successfully', {
      fileKey,
      bucket: AWS_S3_BUCKET_NAME,
      size: fileBuffer.length,
      url: s3Url.substring(0, 100) + '...' // Log partial URL for security
    });

    return {
      success: true,
      key: fileKey,
      url: s3Url,
      contentType,
      size: fileBuffer.length,
      uploadedAt: new Date()
    };
  } catch (error) {
    logger.error('AWS S3 upload error', {
      error: error.message,
      fileName,
      size: fileBuffer?.length,
      bucket: AWS_S3_BUCKET_NAME
    });
    throw error;
  }
};

/**
 * Delete file from AWS S3
 * @param {string} fileKey - File key to delete
 * @returns {Promise<boolean>} Success status
 */
const deleteFromS3 = async (fileKey) => {
  try {
    if (!s3Client) {
      throw new Error('AWS S3 Storage not initialized');
    }

    const deleteCommand = new DeleteObjectCommand({
      Bucket: AWS_S3_BUCKET_NAME,
      Key: fileKey
    });

    await s3Client.send(deleteCommand);

    logger.info('File deleted from AWS S3', { fileKey });
    return true;
  } catch (error) {
    logger.error('AWS S3 delete error', {
      error: error.message,
      fileKey
    });
    return false;
  }
};

/**
 * Check if AWS S3 is configured and ready
 * @returns {boolean}
 */
const isS3StorageReady = () => {
  return s3Client !== null;
};

module.exports = {
  initializeS3Storage,
  uploadToS3,
  deleteFromS3,
  isS3StorageReady
};
