const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Try to get logger, fallback to console if not available
let logger;
try {
  logger = require('../../config/logger');
} catch (e) {
  logger = {
    info: (...args) => console.log('[INFO]', ...args),
    warn: (...args) => console.warn('[WARN]', ...args),
    error: (...args) => console.error('[ERROR]', ...args)
  };
}

class AwsS3StorageService {
  constructor() {
    this.region = process.env.AWS_REGION || 'ap-south-1';
    this.bucket = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME || 'etelios-prod-storage';
    this.s3Client = null;
    this.isConfigured = false;
    
    this.initialize();
  }

  initialize() {
    try {
      // Initialize S3 client
      // In EKS, IAM role is used automatically, no credentials needed
      this.s3Client = new S3Client({
        region: this.region
      });

      if (this.bucket) {
        this.isConfigured = true;
        logger.info('AWS S3 Storage initialized', {
          region: this.region,
          bucket: this.bucket
        });
      } else {
        logger.warn('AWS S3 bucket not configured. Set AWS_S3_BUCKET environment variable.');
      }
    } catch (error) {
      logger.error('Failed to initialize AWS S3 Storage', {
        error: error.message,
        region: this.region
      });
      this.isConfigured = false;
    }
  }

  /**
   * Check if S3 is configured
   * @returns {boolean}
   */
  isConfigured() {
    return this.isConfigured && !!this.s3Client && !!this.bucket;
  }

  /**
   * Upload file to AWS S3
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} filename - File name
   * @param {object} options - Upload options (mimeType, folder, metadata)
   * @returns {Promise<object>} Upload result with URL
   */
  async uploadFile(fileBuffer, filename, options = {}) {
    try {
      if (!this.isConfigured()) {
        throw new Error('AWS S3 is not configured. Set AWS_S3_BUCKET environment variable.');
      }

      if (!fileBuffer || !filename) {
        throw new Error('File buffer and filename are required');
      }

      // Determine folder based on file type or options
      const folder = options.folder || (options.mimeType?.startsWith('image/') ? 'images' : 'documents');
      const key = `${folder}/${filename}`;

      // Prepare metadata
      const metadata = {
        'uploaded-at': new Date().toISOString(),
        'original-name': options.originalName || filename,
        'file-size': fileBuffer.length.toString(),
        ...options.metadata
      };

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: options.mimeType || 'application/octet-stream',
        Metadata: metadata,
        CacheControl: 'public, max-age=31536000' // Cache for 1 year
      });

      await this.s3Client.send(command);

      // Generate S3 URL
      const s3Url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

      logger.info('File uploaded to AWS S3', {
        key,
        bucket: this.bucket,
        size: fileBuffer.length,
        url: s3Url.substring(0, 100) + '...' // Log partial URL for security
      });

      return {
        success: true,
        url: s3Url,
        key,
        bucket: this.bucket,
        region: this.region
      };

    } catch (error) {
      logger.error('AWS S3 upload failed', {
        filename,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get signed URL for file access (for private files)
   * @param {string} key - S3 object key
   * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
   * @returns {Promise<string>} Signed URL
   */
  async getSignedUrl(key, expiresIn = 3600) {
    try {
      if (!this.isConfigured()) {
        throw new Error('AWS S3 is not configured');
      }

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

      return signedUrl;
    } catch (error) {
      logger.error('Failed to generate S3 signed URL', {
        key,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Delete file from S3
   * @param {string} key - S3 object key
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(key) {
    try {
      if (!this.isConfigured()) {
        throw new Error('AWS S3 is not configured');
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      await this.s3Client.send(command);

      logger.info('File deleted from AWS S3', { key, bucket: this.bucket });
      return true;
    } catch (error) {
      logger.error('Failed to delete file from S3', {
        key,
        error: error.message
      });
      throw error;
    }
  }
}

// Export singleton instance
const awsS3Storage = new AwsS3StorageService();

module.exports = awsS3Storage;
