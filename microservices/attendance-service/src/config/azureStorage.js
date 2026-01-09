const { BlobServiceClient } = require('@azure/storage-blob');
const logger = require('./logger');

// Azure Storage configuration
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const AZURE_STORAGE_SAS_TOKEN = process.env.AZURE_STORAGE_SAS_TOKEN;
const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'attendance-selfies';

let blobServiceClient = null;
let containerClient = null;

/**
 * Initialize Azure Blob Storage client
 * Supports both connection string and SAS token authentication
 */
const initializeBlobStorage = async () => {
  try {
    // Option 1: Connection String (preferred for full access)
    if (AZURE_STORAGE_CONNECTION_STRING) {
      logger.info('Initializing Azure Blob Storage with connection string...');
      blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    }
    // Option 2: SAS Token (for limited access)
    else if (AZURE_STORAGE_ACCOUNT_NAME && AZURE_STORAGE_SAS_TOKEN) {
      logger.info('Initializing Azure Blob Storage with SAS token...');
      
      // Ensure SAS token starts with '?'
      const sasToken = AZURE_STORAGE_SAS_TOKEN.startsWith('?') 
        ? AZURE_STORAGE_SAS_TOKEN 
        : `?${AZURE_STORAGE_SAS_TOKEN}`;
      
      const blobServiceUrl = `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net${sasToken}`;
      blobServiceClient = new BlobServiceClient(blobServiceUrl);
    }
    else {
      logger.warn('Azure Storage credentials not configured. Blob upload will be disabled.');
      logger.warn('Required: AZURE_STORAGE_CONNECTION_STRING or (AZURE_STORAGE_ACCOUNT_NAME + AZURE_STORAGE_SAS_TOKEN)');
      return false;
    }
    
    // Get container client
    containerClient = blobServiceClient.getContainerClient(AZURE_STORAGE_CONTAINER_NAME);
    
    // Try to create container (will fail if using read-only SAS token)
    try {
      await containerClient.createIfNotExists({
        access: 'blob' // Public read access for blobs
      });
      logger.info('✅ Azure Blob Storage initialized successfully', {
        container: AZURE_STORAGE_CONTAINER_NAME,
        authMethod: AZURE_STORAGE_CONNECTION_STRING ? 'connection-string' : 'sas-token'
      });
    } catch (createError) {
      // Container might already exist or SAS token doesn't have create permission
      logger.warn('Container create skipped (may already exist or insufficient permissions)', {
        container: AZURE_STORAGE_CONTAINER_NAME,
        error: createError.message
      });
      logger.info('✅ Azure Blob Storage initialized (assuming container exists)', {
        container: AZURE_STORAGE_CONTAINER_NAME,
        authMethod: AZURE_STORAGE_CONNECTION_STRING ? 'connection-string' : 'sas-token'
      });
    }
    
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

