const { BlobServiceClient } = require('@azure/storage-blob');
const logger = require('./logger');

// Azure Storage configuration
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'attendance-selfies';

let blobServiceClient = null;
let containerClient = null;

/**
 * Initialize Azure Blob Storage client
 */
const initializeBlobStorage = async () => {
  try {
    if (!AZURE_STORAGE_CONNECTION_STRING) {
      logger.warn('Azure Storage connection string not configured. Blob upload will be disabled.');
      return false;
    }

    // Create BlobServiceClient
    blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    
    // Get container client
    containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER_NAME);
    
    // Create container if it doesn't exist
    await containerClient.createIfNotExists({
      access: 'blob' // Public read access for blobs
    });
    
    logger.info('✅ Azure Blob Storage initialized successfully', {
      container: AZURE_STORAGE_CONTAINER_NAME
    });
    
    return true;
  } catch (error) {
    logger.error('Failed to initialize Azure Blob Storage', {
      error: error.message,
      stack: error.stack
    });
    return false;
  }
};

/**
 * Upload file to Azure Blob Storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - File name
 * @param {string} contentType - MIME type
 * @returns {Promise<Object>} Upload result with URL
 */
const uploadToBlob = async (fileBuffer, fileName, contentType) => {
  try {
    if (!containerClient) {
      throw new Error('Azure Blob Storage not initialized');
    }

    // Generate unique blob name with timestamp
    const timestamp = Date.now();
    const blobName = `${timestamp}-${fileName}`;
    
    // Get block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    // Upload buffer to blob
    const uploadResponse = await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
      blobHTTPHeaders: {
        blobContentType: contentType
      }
    });
    
    // Get blob URL
    const blobUrl = blockBlobClient.url;
    
    logger.info('File uploaded to Azure Blob Storage', {
      blobName,
      size: fileBuffer.length,
      url: blobUrl
    });
    
    return {
      success: true,
      blobName,
      url: blobUrl,
      contentType,
      size: fileBuffer.length,
      uploadedAt: new Date()
    };
  } catch (error) {
    logger.error('Azure Blob Storage upload error', {
      error: error.message,
      fileName,
      size: fileBuffer?.length
    });
    throw error;
  }
};

/**
 * Delete file from Azure Blob Storage
 * @param {string} blobName - Blob name to delete
 * @returns {Promise<boolean>} Success status
 */
const deleteFromBlob = async (blobName) => {
  try {
    if (!containerClient) {
      throw new Error('Azure Blob Storage not initialized');
    }

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.delete();
    
    logger.info('File deleted from Azure Blob Storage', { blobName });
    return true;
  } catch (error) {
    logger.error('Azure Blob Storage delete error', {
      error: error.message,
      blobName
    });
    return false;
  }
};

/**
 * Check if Azure Blob Storage is configured and ready
 * @returns {boolean}
 */
const isBlobStorageReady = () => {
  return containerClient !== null;
};

module.exports = {
  initializeBlobStorage,
  uploadToBlob,
  deleteFromBlob,
  isBlobStorageReady
};

