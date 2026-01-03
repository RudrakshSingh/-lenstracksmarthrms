/**
 * Azure Blob Storage Utility with SAS Token Support
 * Handles image and file uploads to Azure Blob Storage using SAS tokens
 */

const { BlobServiceClient } = require('@azure/storage-blob');
const logger = require('../config/logger');

class AzureBlobStorageService {
  constructor() {
    this.sasUrl = process.env.AZURE_STORAGE_SAS_URL;
    this.sasToken = process.env.AZURE_STORAGE_SAS_TOKEN;
    this.accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'hrms-images';
    
    this.initialize();
  }

  initialize() {
    try {
      if (this.sasUrl) {
        // Full SAS URL provided (includes account, container, and SAS token)
        this.blobServiceClient = new BlobServiceClient(this.sasUrl);
        // Extract container name from URL if possible
        const urlMatch = this.sasUrl.match(/https:\/\/([^\.]+)\.blob\.core\.windows\.net\/([^?]+)/);
        if (urlMatch) {
          this.containerName = urlMatch[2].split('/')[0];
        }
        logger.info('Azure Blob Storage initialized with SAS URL', { 
          container: this.containerName
        });
      } else if (this.sasToken && this.accountName) {
        // SAS Token with account name - construct URL
        // For container-level SAS, we need to include container in the URL
        const baseUrl = `https://${this.accountName}.blob.core.windows.net/${this.containerName}`;
        const sasUrl = `${baseUrl}?${this.sasToken}`;
        this.blobServiceClient = new BlobServiceClient(sasUrl);
        logger.info('Azure Blob Storage initialized with SAS Token', { 
          container: this.containerName,
          accountName: this.accountName,
          sasUrl: sasUrl.substring(0, 80) + '...' // Log partial URL for security
        });
      } else {
        throw new Error('Azure Storage SAS credentials not provided. Set AZURE_STORAGE_SAS_URL or AZURE_STORAGE_SAS_TOKEN with AZURE_STORAGE_ACCOUNT_NAME');
      }
    } catch (error) {
      logger.error('Failed to initialize Azure Blob Storage', { error: error.message });
      throw error;
    }
  }

  /**
   * Upload image/file to Azure Blob Storage
   * @param {Buffer} fileBuffer - File buffer
   * @param {string} filename - File name
   * @param {object} options - Upload options (mimeType, folder, metadata)
   * @returns {Promise<object>} Upload result with URL
   */
  async uploadFile(fileBuffer, filename, options = {}) {
    try {
      if (!fileBuffer || !filename) {
        throw new Error('File buffer and filename are required');
      }

      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      
      // Determine folder based on file type or options
      const folder = options.folder || (options.mimeType?.startsWith('image/') ? 'images' : 'documents');
      const blobName = `${folder}/${filename}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: options.mimeType || 'application/octet-stream',
          blobCacheControl: 'public, max-age=31536000' // Cache for 1 year
        },
        metadata: {
          'uploaded-at': new Date().toISOString(),
          'original-name': options.originalName || filename,
          'file-size': fileBuffer.length.toString(),
          ...options.metadata
        }
      };

      // Upload the file
      const uploadResult = await blockBlobClient.upload(fileBuffer, fileBuffer.length, uploadOptions);
      
      // Get the blob URL
      let blobUrl = blockBlobClient.url;
      
      // If URL doesn't have SAS token and we have one, append it
      if (!blobUrl.includes('?') && this.sasToken) {
        blobUrl = `${blobUrl}?${this.sasToken}`;
      }
      
      logger.info('File uploaded to Azure Blob Storage', {
        blobName,
        container: this.containerName,
        size: fileBuffer.length,
        url: blobUrl.substring(0, 100) + '...' // Log partial URL for security
      });

      return {
        success: true,
        url: blobUrl,
        blobName,
        container: this.containerName,
        etag: uploadResult.etag,
        size: fileBuffer.length,
        contentType: options.mimeType || 'application/octet-stream'
      };

    } catch (error) {
      logger.error('Azure Blob Storage upload failed', { 
        error: error.message,
        filename,
        container: this.containerName
      });
      throw new Error(`Failed to upload file to Azure Blob Storage: ${error.message}`);
    }
  }

  /**
   * Upload image to Azure Blob Storage (convenience method)
   * @param {Buffer} imageBuffer - Image buffer
   * @param {string} filename - Image filename
   * @param {object} options - Upload options
   * @returns {Promise<object>} Upload result
   */
  async uploadImage(imageBuffer, filename, options = {}) {
    return this.uploadFile(imageBuffer, filename, {
      ...options,
      folder: 'images',
      mimeType: options.mimeType || 'image/jpeg'
    });
  }

  /**
   * Delete file from Azure Blob Storage
   * @param {string} blobName - Blob name (with folder path)
   * @returns {Promise<boolean>} Success status
   */
  async deleteFile(blobName) {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      
      await blockBlobClient.delete();
      
      logger.info('File deleted from Azure Blob Storage', {
        blobName,
        container: this.containerName
      });

      return true;
    } catch (error) {
      logger.error('Azure Blob Storage delete failed', { 
        error: error.message,
        blobName,
        container: this.containerName
      });
      throw new Error(`Failed to delete file from Azure Blob Storage: ${error.message}`);
    }
  }

  /**
   * Get file URL (with SAS token if needed)
   * @param {string} blobName - Blob name
   * @returns {string} File URL
   */
  getFileUrl(blobName) {
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    let url = blockBlobClient.url;
    
    // Append SAS token if not present
    if (!url.includes('?') && this.sasToken) {
      url = `${url}?${this.sasToken}`;
    }
    
    return url;
  }

  /**
   * Check if Azure Blob Storage is configured
   * @returns {boolean} Configuration status
   */
  isConfigured() {
    return !!(this.sasUrl || (this.sasToken && this.accountName));
  }
}

// Export singleton instance
module.exports = new AzureBlobStorageService();

