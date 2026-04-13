# AWS S3 Migration - Azure Blob Storage Replacement

## Overview
Azure Blob Storage has been replaced with AWS S3 for selfie uploads in the attendance service.

## Changes Made

### 1. New Files Created
- **`microservices/attendance-service/src/config/s3Storage.js`**
  - AWS S3 client initialization
  - Upload, delete, and status check functions
  - Supports IAM role (EC2/ECS) or access key authentication
  - Supports custom endpoints (for S3-compatible services like MinIO)

### 2. Files Updated

#### `microservices/attendance-service/src/middleware/blobUpload.middleware.js`
- Changed from `azureStorage` to `s3Storage`
- Updated function calls: `uploadToBlob` → `uploadToS3`
- Updated status check: `isBlobStorageReady` → `isS3StorageReady`

#### `microservices/attendance-service/src/server.js`
- Changed initialization from `initializeBlobStorage()` to `initializeS3Storage()`

#### `microservices/attendance-service/src/routes/attendance.routes.js`
- Updated comments to reflect AWS S3 instead of Azure Blob Storage

#### `microservices/attendance-service/src/controllers/attendanceController.js`
- Updated comments to reflect AWS S3 instead of Azure Blob Storage

#### `microservices/attendance-service/package.json`
- Removed: `@azure/storage-blob`
- Added: `@aws-sdk/client-s3`

## Environment Variables

### Required
- `AWS_REGION` - AWS region (default: `ap-south-1`)
- `AWS_S3_BUCKET_NAME` - S3 bucket name (default: `attendance-selfies`)

### Optional (for local/dev environments)
- `AWS_ACCESS_KEY_ID` - AWS access key ID (not needed if using IAM role)
- `AWS_SECRET_ACCESS_KEY` - AWS secret access key (not needed if using IAM role)
- `AWS_S3_ENDPOINT` - Custom S3 endpoint (for S3-compatible services like MinIO)

### Note
If running on EC2/ECS, the AWS SDK will automatically use IAM role credentials. No access keys needed.

## Migration Steps

### 1. Install Dependencies
```bash
cd microservices/attendance-service
npm install @aws-sdk/client-s3
npm uninstall @azure/storage-blob
```

### 2. Create S3 Bucket
```bash
aws s3 mb s3://attendance-selfies --region ap-south-1
```

### 3. Configure Bucket Permissions
Make sure the bucket has appropriate permissions:
- **Public Read** (if you want public URLs for selfies)
- **IAM Role/User** with `s3:PutObject` and `s3:DeleteObject` permissions

### 4. Set Environment Variables
Update Kubernetes secrets/configmap:
```yaml
env:
  - name: AWS_REGION
    value: "ap-south-1"
  - name: AWS_S3_BUCKET_NAME
    value: "attendance-selfies"
  # Optional: Only if not using IAM role
  - name: AWS_ACCESS_KEY_ID
    valueFrom:
      secretKeyRef:
        name: aws-credentials
        key: access-key-id
  - name: AWS_SECRET_ACCESS_KEY
    valueFrom:
      secretKeyRef:
        name: aws-credentials
        key: secret-access-key
```

### 5. Update IAM Role (if using EKS/EC2)
Ensure the IAM role has the following permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::attendance-selfies",
        "arn:aws:s3:::attendance-selfies/*"
      ]
    }
  ]
}
```

### 6. Deploy
```bash
# Build Docker image
docker build -t attendance-service:latest .

# Push to ECR
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <ECR_URL>
docker tag attendance-service:latest <ECR_URL>/attendance-service:latest
docker push <ECR_URL>/attendance-service:latest

# Update Kubernetes deployment
kubectl rollout restart deployment/attendance-service -n etelios-prod
```

## Features

### ✅ Supported Features
- File upload to S3
- File deletion from S3
- Public URL generation
- IAM role authentication (for EC2/ECS)
- Access key authentication (for local/dev)
- Custom endpoint support (for S3-compatible services)

### 🔄 Backward Compatibility
- The middleware function name remains `uploadToBlobStorage` (for backward compatibility)
- The `req.file.blobUrl` property is still used (even though it's now an S3 URL)
- Response format remains the same

## Testing

### Test S3 Upload
```bash
# Test with curl
curl -X POST http://localhost:3003/api/attendance/clock-in \
  -H "Authorization: Bearer <token>" \
  -F "latitude=28.6139" \
  -F "longitude=77.209" \
  -F "selfie=@/path/to/image.jpg"
```

### Verify Upload
```bash
# Check S3 bucket
aws s3 ls s3://attendance-selfies/selfies/
```

## Rollback Plan

If you need to rollback to Azure Blob Storage:
1. Revert the changes in git
2. Reinstall `@azure/storage-blob`
3. Remove `@aws-sdk/client-s3`
4. Update environment variables back to Azure credentials
5. Redeploy

## Notes

- The old `azureStorage.js` file is kept for reference but is no longer used
- All selfie URLs will now be S3 URLs instead of Azure Blob URLs
- Existing Azure Blob URLs in the database will still work (if they're accessible)
- New uploads will use S3 URLs

## Support

For issues or questions:
1. Check AWS CloudWatch logs for S3 errors
2. Verify IAM permissions
3. Check bucket exists and is accessible
4. Verify environment variables are set correctly
