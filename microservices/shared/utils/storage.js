const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const logger = require('../config/logger');
const encryptionService = require('./encryption');

class StorageService {
  constructor() {
    this.provider = process.env.STORAGE_PROVIDER || 'local';
    this.encryptionEnabled = process.env.ENCRYPTION_ENABLED === 'true';
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB default
    
    this.initializeProvider();
  }

  initializeProvider() {
    switch (this.provider) {
      case 'azure':
        this.initializeAzure();
        break;
      case 'cloudinary':
        this.initializeCloudinary();
        break;
      case 'local':
      default:
        this.initializeLocal();
        break;
    }
  }

  initializeAzure() {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    
    if (connectionString) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    } else if (accountName && accountKey) {
      const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
      this.blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        sharedKeyCredential
      );
    } else {
      throw new Error('Azure Storage credentials not provided. Set AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY');
    }

    this.containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'hrms-documents';
    this.encryptionKey = process.env.AZURE_STORAGE_ENCRYPTION_KEY;
    
    logger.info('Azure Blob Storage initialized', { 
      container: this.containerName,
      accountName: accountName || 'from-connection-string'
    });
  }

  initializeCloudinary() {
    const cloudinary = require('cloudinary').v2;
    
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    this.cloudinary = cloudinary;
    logger.info('Cloudinary storage initialized');
  }

  initializeLocal() {
    this.storagePath = process.env.LOCAL_STORAGE_PATH || './storage/documents';
    this.ensureStorageDirectory();
    logger.info('Local storage initialized', { path: this.storagePath });
  }

  async ensureStorageDirectory() {
    try {
      await fs.mkdir(this.storagePath, { recursive: true });
      await fs.mkdir(path.join(this.storagePath, 'encrypted'), { recursive: true });
      await fs.mkdir(path.join(this.storagePath, 'temp'), { recursive: true });
    } catch (error) {
      logger.error('Failed to create storage directories', { error: error.message });
      throw error;
    }
  }

  async uploadFile(file, options = {}) {
    try {
      // Validate file
      this.validateFile(file);
      
      // Generate unique filename
      const filename = this.generateFilename(file.originalname, options.documentId);
      const filePath = this.getFilePath(filename);
      
      // Prepare file data
      let fileData = file.buffer;
      let encryptionKey = null;
      
      // Encrypt if enabled
      if (this.encryptionEnabled) {
        encryptionKey = encryptionService.generateKey();
        const encrypted = encryptionService.encrypt(fileData, encryptionKey);
        fileData = Buffer.from(JSON.stringify(encrypted));
      }
      
      // Upload based on provider
      let uploadResult;
      switch (this.provider) {
        case 'azure':
          uploadResult = await this.uploadToAzure(fileData, filename, options);
          break;
        case 'cloudinary':
          uploadResult = await this.uploadToCloudinary(fileData, filename, options);
          break;
        case 'local':
        default:
          uploadResult = await this.uploadToLocal(fileData, filePath, options);
          break;
      }
      
      // Generate checksum
      const checksum = encryptionService.generateChecksum(file.buffer);
      
      return {
        ...uploadResult,
        filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        checksum,
        encrypted: this.encryptionEnabled,
        encryptionKey: encryptionKey ? encryptionKey.toString('hex') : null
      };
      
    } catch (error) {
      logger.error('File upload failed', { 
        filename: file.originalname, 
        error: error.message 
      });
      throw error;
    }
  }

  async downloadFile(storagePath, options = {}) {
    try {
      let fileData;
      
      // Download based on provider
      switch (this.provider) {
        case 'azure':
          fileData = await this.downloadFromAzure(storagePath, options);
          break;
        case 'cloudinary':
          fileData = await this.downloadFromCloudinary(storagePath, options);
          break;
        case 'local':
        default:
          fileData = await this.downloadFromLocal(storagePath, options);
          break;
      }
      
      // Decrypt if needed
      if (options.encrypted && options.encryptionKey) {
        const encryptedData = JSON.parse(fileData.toString());
        const encryptionKey = Buffer.from(options.encryptionKey, 'hex');
        fileData = Buffer.from(encryptionService.decrypt(encryptedData, encryptionKey), 'binary');
      }
      
      return fileData;
      
    } catch (error) {
      logger.error('File download failed', { 
        storagePath, 
        error: error.message 
      });
      throw error;
    }
  }

  async deleteFile(storagePath, options = {}) {
    try {
      switch (this.provider) {
        case 'azure':
          await this.deleteFromAzure(storagePath, options);
          break;
        case 'cloudinary':
          await this.deleteFromCloudinary(storagePath, options);
          break;
        case 'local':
        default:
          await this.deleteFromLocal(storagePath, options);
          break;
      }
      
      logger.info('File deleted successfully', { storagePath });
      
    } catch (error) {
      logger.error('File deletion failed', { 
        storagePath, 
        error: error.message 
      });
      throw error;
    }
  }

  // Azure Blob Storage Methods
  async uploadToAzure(fileData, filename, options = {}) {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      
      // Try to create container if it doesn't exist (may fail with SAS token if no write permission)
      try {
        await containerClient.createIfNotExists({
          access: 'blob' // Public read access for images
        });
      } catch (createError) {
        // Container may already exist or SAS token may not have create permission
        logger.warn('Container creation skipped', { error: createError.message });
      }

      // Determine folder based on file type (images vs documents)
      const folder = options.folder || (options.mimeType?.startsWith('image/') ? 'images' : 'documents');
      const blobName = `${folder}/${filename}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: options.mimeType || 'application/octet-stream'
        },
        metadata: {
          'document-id': options.documentId || '',
          'employee-id': options.employeeId || '',
          'uploaded-at': new Date().toISOString(),
          'encrypted': this.encryptionEnabled ? 'true' : 'false',
          'original-name': options.originalName || filename
        }
      };

      // Add encryption if key is provided
      if (this.encryptionKey) {
        uploadOptions.encryptionScope = this.encryptionKey;
      }

      const uploadResult = await blockBlobClient.upload(fileData, fileData.length, uploadOptions);
      
      // Get the blob URL (with SAS token if using SAS authentication)
      let blobUrl = blockBlobClient.url;
      
      // If using SAS token, the URL already includes it
      // Otherwise, generate a signed URL for access
      if (!blobUrl.includes('?')) {
        try {
          blobUrl = await this.generateAzureSignedUrl(blobName, { expiresIn: 365 * 24 * 60 }); // 1 year
        } catch (sasError) {
          logger.warn('Failed to generate signed URL, using base URL', { error: sasError.message });
        }
      }
      
      return {
        storagePath: blobName,
        storageUrl: blobUrl,
        etag: uploadResult.etag,
        container: this.containerName
      };
    } catch (error) {
      logger.error('Azure upload failed', { error: error.message, filename, container: this.containerName });
      throw error;
    }
  }

  async downloadFromAzure(storagePath, options = {}) {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(storagePath);

      const downloadResponse = await blockBlobClient.download();
      const chunks = [];
      
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(chunk);
      }
      
      return Buffer.concat(chunks);
    } catch (error) {
      logger.error('Azure download failed', { error: error.message, storagePath });
      throw error;
    }
  }

  async deleteFromAzure(storagePath, options = {}) {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(storagePath);

      await blockBlobClient.delete();
    } catch (error) {
      logger.error('Azure deletion failed', { error: error.message, storagePath });
      throw error;
    }
  }

  // Cloudinary Methods
  async uploadToCloudinary(fileData, filename, options = {}) {
    return new Promise((resolve, reject) => {
      const uploadOptions = {
        resource_type: 'raw',
        folder: 'hrms/documents',
        public_id: filename.replace(/\.[^/.]+$/, ''),
        tags: ['hrms', 'documents', options.documentType || 'contract']
      };

      this.cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              storagePath: result.public_id,
              storageUrl: result.secure_url,
              etag: result.etag
            });
          }
        }
      ).end(fileData);
    });
  }

  async downloadFromCloudinary(storagePath, options = {}) {
    const url = this.cloudinary.url(storagePath, { resource_type: 'raw' });
    const response = await fetch(url);
    return Buffer.from(await response.arrayBuffer());
  }

  async deleteFromCloudinary(storagePath, options = {}) {
    return new Promise((resolve, reject) => {
      this.cloudinary.uploader.destroy(
        storagePath,
        { resource_type: 'raw' },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
    });
  }

  // Local Methods
  async uploadToLocal(fileData, filePath, options = {}) {
    await fs.writeFile(filePath, fileData);
    
    return {
      storagePath: filePath,
      storageUrl: `/storage/documents/${path.basename(filePath)}`
    };
  }

  async downloadFromLocal(storagePath, options = {}) {
    return await fs.readFile(storagePath);
  }

  async deleteFromLocal(storagePath, options = {}) {
    if (options.secureDelete) {
      await encryptionService.secureDelete(storagePath);
    } else {
      await fs.unlink(storagePath);
    }
  }

  // Utility Methods
  validateFile(file) {
    if (!file || !file.buffer) {
      throw new Error('Invalid file data');
    }

    if (file.size > this.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${this.maxFileSize} bytes`);
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed`);
    }
  }

  generateFilename(originalName, documentId) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    
    return `${documentId}_${timestamp}_${random}${extension}`;
  }

  getFilePath(filename) {
    return path.join(this.storagePath, filename);
  }

  async generateSignedUrl(storagePath, options = {}) {
    switch (this.provider) {
      case 'azure':
        return this.generateAzureSignedUrl(storagePath, options);
      case 'cloudinary':
        return this.generateCloudinarySignedUrl(storagePath, options);
      case 'local':
      default:
        return this.generateLocalSignedUrl(storagePath, options);
    }
  }

  async generateAzureSignedUrl(storagePath, options = {}) {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(storagePath);

      const expiresOn = new Date();
      expiresOn.setMinutes(expiresOn.getMinutes() + (options.expiresIn || 60)); // Default 1 hour

      const sasUrl = await blockBlobClient.generateSasUrl({
        permissions: 'r', // Read permission
        expiresOn: expiresOn
      });

      return sasUrl;
    } catch (error) {
      logger.error('Azure signed URL generation failed', { error: error.message, storagePath });
      throw error;
    }
  }

  async generateCloudinarySignedUrl(storagePath, options = {}) {
    const expiresIn = options.expiresIn || 3600;
    return this.cloudinary.url(storagePath, {
      resource_type: 'raw',
      expires_at: Math.floor(Date.now() / 1000) + expiresIn,
      sign_url: true
    });
  }

  async generateLocalSignedUrl(storagePath, options = {}) {
    // For local storage, we can generate a temporary access token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + (options.expiresIn || 3600) * 1000);
    
    // Store token in memory or Redis for validation
    // This is a simplified implementation
    return `/api/documents/temp-access/${token}`;
  }

  // Cleanup methods
  async cleanupTempFiles() {
    try {
      const tempDir = path.join(this.storagePath, 'temp');
      const files = await fs.readdir(tempDir);
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        
        // Delete files older than 24 hours
        if (Date.now() - stats.mtime.getTime() > 24 * 60 * 60 * 1000) {
          await fs.unlink(filePath);
          logger.info('Cleaned up temp file', { file });
        }
      }
    } catch (error) {
      logger.error('Temp file cleanup failed', { error: error.message });
    }
  }

  async getStorageStats() {
    try {
      switch (this.provider) {
        case 'azure':
          return await this.getAzureStats();
        case 'cloudinary':
          return await this.getCloudinaryStats();
        case 'local':
        default:
          return await this.getLocalStats();
      }
    } catch (error) {
      logger.error('Failed to get storage stats', { error: error.message });
      throw error;
    }
  }

  async getLocalStats() {
    const stats = await fs.stat(this.storagePath);
    return {
      provider: 'local',
      totalSize: stats.size,
      path: this.storagePath,
      available: true
    };
  }

  async getAzureStats() {
    try {
      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      
      // Get container properties
      const properties = await containerClient.getProperties();
      
      // List blobs to get count and total size
      let blobCount = 0;
      let totalSize = 0;
      
      for await (const blob of containerClient.listBlobsFlat()) {
        blobCount++;
        totalSize += blob.properties.contentLength || 0;
      }

      return {
        provider: 'azure',
        container: this.containerName,
        blobCount,
        totalSize,
        lastModified: properties.lastModified,
        available: true
      };
    } catch (error) {
      logger.error('Failed to get Azure storage stats', { error: error.message });
      return {
        provider: 'azure',
        container: this.containerName,
        available: false,
        error: error.message
      };
    }
  }

  async getCloudinaryStats() {
    // Implement Cloudinary storage statistics
    return {
      provider: 'cloudinary',
      available: true
    };
  }
}

module.exports = new StorageService();
