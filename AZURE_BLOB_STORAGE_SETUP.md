# Azure Blob Storage SAS Token Setup

## Overview

This document explains how to configure Azure Blob Storage with SAS (Shared Access Signature) tokens for storing images and files in the HRMS system.

## Configuration

### Option 1: Full SAS URL (Recommended)

Set the complete SAS URL including account name, container, and SAS token:

```bash
AZURE_STORAGE_SAS_URL=https://yourstorageaccount.blob.core.windows.net/hrms-images?sp=r&st=2026-01-02T05:06:06Z&se=2027-01-05T13:21:06Z&spr=https&sv=2024-11-04&sr=c&sig=YOUR_SIG_HERE
```

**Format**: `https://[accountname].blob.core.windows.net/[containername]?[sas-token]`

### Option 2: SAS Token with Account Name

Set the SAS token and account details separately:

```bash
AZURE_STORAGE_SAS_TOKEN=sp=r&st=2026-01-02T05:06:06Z&se=2027-01-05T13:21:06Z&spr=https&sv=2024-11-04&sr=c&sig=YOUR_SIG_HERE
AZURE_STORAGE_ACCOUNT_NAME=yourstorageaccount
AZURE_STORAGE_CONTAINER_NAME=hrms-images
```

## SAS Token Details

The provided SAS token has the following properties:
- **Permissions**: `r` (Read) - Container level
- **Start Time**: 2026-01-02T05:06:06Z
- **Expiry Time**: 2027-01-05T13:21:06Z (Valid for ~1 year)
- **Protocol**: HTTPS only
- **Service Version**: 2024-11-04
- **Resource**: Container (`sr=c`)

## Required SAS Token Permissions

For image uploads, the SAS token needs:
- **Write** (`w`) - To upload files
- **Create** (`c`) - To create new blobs
- **Read** (`r`) - To read/download files

**Recommended SAS Token**:
```
sp=rwc&st=2026-01-02T05:06:06Z&se=2027-01-05T13:21:06Z&spr=https&sv=2024-11-04&sr=c&sig=YOUR_SIG_HERE
```

Note: The provided token only has `r` (read) permission. You may need to generate a new token with write permissions for uploads to work.

## Environment Variables

Add to your `.env` file or Azure Key Vault:

```bash
# Azure Blob Storage for Images
AZURE_STORAGE_SAS_URL=https://yourstorageaccount.blob.core.windows.net/hrms-images?sp=rwc&st=2026-01-02T05:06:06Z&se=2027-01-05T13:21:06Z&spr=https&sv=2024-11-04&sr=c&sig=YOUR_SIG_HERE

# Or use separate variables
AZURE_STORAGE_SAS_TOKEN=sp=rwc&st=2026-01-02T05:06:06Z&se=2027-01-05T13:21:06Z&spr=https&sv=2024-11-04&sr=c&sig=YOUR_SIG_HERE
AZURE_STORAGE_ACCOUNT_NAME=yourstorageaccount
AZURE_STORAGE_CONTAINER_NAME=hrms-images
```

## Implementation

### Files Modified

1. **`microservices/shared/utils/azureBlobStorage.js`** (New)
   - Azure Blob Storage service with SAS token support
   - Handles image and file uploads
   - Provides URL generation with SAS token

2. **`microservices/shared/utils/storage.js`** (Updated)
   - Added SAS token support to existing storage service
   - Priority: SAS URL > SAS Token > Connection String > Account Key

3. **`microservices/shared/middleware/upload.middleware.js`** (Updated)
   - Updated `uploadToCloudinary` to check for Azure Blob Storage first
   - Falls back to Cloudinary if Azure is not configured

4. **`microservices/hr-service/src/controllers/documentController.js`** (Updated)
   - Now uploads documents to Azure Blob Storage when configured
   - Stores Azure URL in database instead of base64

## Usage

### Upload Image

```javascript
const azureBlobStorage = require('../../../shared/utils/azureBlobStorage');

// Upload image
const result = await azureBlobStorage.uploadImage(fileBuffer, filename, {
  mimeType: 'image/jpeg',
  folder: 'images',
  originalName: 'profile.jpg'
});

console.log(result.url); // Full URL with SAS token
```

### Upload File

```javascript
const result = await azureBlobStorage.uploadFile(fileBuffer, filename, {
  mimeType: 'application/pdf',
  folder: 'documents',
  metadata: {
    'employee-id': 'EMP001',
    'document-type': 'CONTRACT'
  }
});
```

## Storage Structure

Files are organized in folders:
- `images/` - Profile pictures, attendance selfies, etc.
- `documents/` - Contracts, certificates, etc.

Example blob path: `images/1234567890-profile.jpg`

## Security Notes

1. **SAS Token Expiry**: The provided token expires on 2027-01-05. Generate a new token before expiry.

2. **Token Permissions**: Ensure the SAS token has write permissions (`w`) for uploads.

3. **HTTPS Only**: The token is configured for HTTPS only (`spr=https`).

4. **Container Access**: The token is for container-level access (`sr=c`).

## Testing

1. Set environment variables:
   ```bash
   export AZURE_STORAGE_SAS_URL="https://..."
   ```

2. Test upload:
   ```javascript
   const azureBlobStorage = require('./shared/utils/azureBlobStorage');
   const result = await azureBlobStorage.uploadImage(buffer, 'test.jpg');
   console.log(result.url);
   ```

## Troubleshooting

### Error: "Failed to upload file to Azure Blob Storage"

**Possible causes**:
1. SAS token doesn't have write permissions - Generate new token with `w` permission
2. Container doesn't exist - Create container in Azure Portal
3. Token expired - Generate new token
4. Invalid account name - Verify account name in SAS URL

### Error: "Azure Storage SAS credentials not provided"

**Solution**: Set `AZURE_STORAGE_SAS_URL` or `AZURE_STORAGE_SAS_TOKEN` with `AZURE_STORAGE_ACCOUNT_NAME`

## Next Steps

1. Generate a new SAS token with write permissions (`rwc`)
2. Update environment variables in production
3. Test image upload functionality
4. Monitor storage usage and costs

