# Employee Onboarding - S3 Document Storage Setup

## Overview

Employee onboarding documents को AWS S3 में store करने के लिए configuration complete कर दी गई है।

---

## Implementation Details

### 1. S3 Storage Configuration

**File:** `microservices/hr-service/src/config/s3Storage.js`

- AWS S3 client initialization
- IAM role या access keys support
- Bucket verification
- Upload/Delete functions

### 2. S3 Upload Middleware

**File:** `microservices/hr-service/src/middleware/s3Upload.middleware.js`

- Multer के बाद file को S3 में upload करता है
- `req.file.s3Url` में S3 URL attach करता है
- Error handling with fallback

### 3. Onboarding Controller Update

**File:** `microservices/hr-service/src/controllers/onboardingController.js`

- S3 middleware से `req.file.s3Url` use करता है
- Fallback: Shared S3 utility use करता है अगर middleware fail हो
- Document types: AADHAR, PAN, PASSPORT, DRIVING_LICENSE, EDUCATION_CERTIFICATE, EXPERIENCE_CERTIFICATE, BANK_STATEMENT, PHOTO, SIGNATURE, OTHER

### 4. Route Configuration

**File:** `microservices/hr-service/src/routes/onboarding.routes.js`

```javascript
router.post(
  '/onboarding/upload',
  authenticate,
  validateTenantMiddleware(),
  extractTenantId,
  requireRole(['hr', 'admin', 'superadmin']),
  uploadSingle('file'),
  uploadToS3Storage, // S3 upload middleware
  asyncHandler(onboardingController.uploadOnboardingDocument)
);
```

### 5. Server Initialization

**File:** `microservices/hr-service/src/server.js`

- `initializeS3ForOnboarding()` function added
- Database connection के बाद S3 initialize होता है
- Service start होगा even if S3 fails (with warning)

---

## Environment Variables

```bash
# AWS S3 Configuration
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=etelios-prod-storage  # या कोई दूसरा bucket name
AWS_ACCESS_KEY_ID=your-access-key       # Optional: IAM role use करें production में
AWS_SECRET_ACCESS_KEY=your-secret-key    # Optional: IAM role use करें production में
AWS_S3_ENDPOINT=                         # Optional: S3-compatible services के लिए
```

---

## API Usage

### Upload Onboarding Document

```bash
POST /api/hr/onboarding/upload
Content-Type: multipart/form-data

Headers:
  Authorization: Bearer <token>
  X-Tenant-Id: <tenant-id>

Body (form-data):
  file: <file>
  employee_id: EMP-2026-969954
  document_type: AADHAR  # या PAN, PASSPORT, etc.
```

### Response

```json
{
  "success": true,
  "message": "Onboarding document uploaded successfully",
  "data": {
    "employee_id": "EMP-2026-969954",
    "document_type": "AADHAR",
    "file_name": "aadhar.pdf",
    "mime_type": "application/pdf",
    "file_size": 123456,
    "url": "https://etelios-prod-storage.s3.ap-south-1.amazonaws.com/onboarding/1234567890-aadhar.pdf",
    "storage_provider": "aws-s3",
    "onboarding": {
      "employee_id": "EMP-2026-969954",
      "documents": [...],
      "status": "documents_added"
    }
  }
}
```

---

## Document Types Supported

1. **AADHAR** - Aadhar card
2. **PAN** - PAN card
3. **PASSPORT** - Passport
4. **DRIVING_LICENSE** - Driving license
5. **EDUCATION_CERTIFICATE** - Education certificates
6. **EXPERIENCE_CERTIFICATE** - Experience certificates
7. **BANK_STATEMENT** - Bank statements
8. **PHOTO** - Employee photo
9. **SIGNATURE** - Employee signature
10. **OTHER** - Other documents

---

## File Storage Structure

```
S3 Bucket: etelios-prod-storage
├── onboarding/
│   ├── 1736620299000-EMP-2026-969954-AADHAR-aadhar.pdf
│   ├── 1736620300000-EMP-2026-969954-PAN-pan.pdf
│   ├── 1736620310000-EMP-2026-969954-PHOTO-photo.jpg
│   └── ...
```

---

## Frontend Integration

### React Example

```javascript
import React, { useState } from 'react';
import axios from 'axios';

const OnboardingDocumentUpload = ({ employeeId, documentType }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file || !employeeId || !documentType) {
      alert('Please select a file and provide employee ID and document type');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('employee_id', employeeId);
      formData.append('document_type', documentType);

      const response = await axios.post(
        '/api/hr/onboarding/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Id': tenantId
          }
        }
      );

      if (response.data.success) {
        setUploadedUrl(response.data.data.url);
        alert('Document uploaded successfully!');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" />
      <button onClick={handleUpload} disabled={uploading || !file}>
        {uploading ? 'Uploading...' : 'Upload Document'}
      </button>
      {uploadedUrl && (
        <div>
          <p>Uploaded: <a href={uploadedUrl} target="_blank" rel="noopener noreferrer">View Document</a></p>
        </div>
      )}
    </div>
  );
};

export default OnboardingDocumentUpload;
```

---

## Testing

### Test Upload

```bash
# Login first
TOKEN=$(curl -s -X POST "http://localhost:3002/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"Admin@lenstrack.com","password":"Kadarkhan@123"}' | jq -r '.data.accessToken')

# Upload document
curl -X POST "http://localhost:3002/api/hr/onboarding/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: default" \
  -F "file=@/path/to/document.pdf" \
  -F "employee_id=EMP-2026-969954" \
  -F "document_type=AADHAR"
```

---

## Troubleshooting

### Issue 1: S3 Not Configured

**Error:** `AWS S3 is not configured. Set AWS_S3_BUCKET_NAME environment variable.`

**Solution:**
1. Set `AWS_S3_BUCKET_NAME` environment variable
2. Ensure IAM role has S3 permissions (production)
3. Or set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` (dev)

### Issue 2: Upload Fails

**Error:** `Failed to upload document to AWS S3`

**Check:**
1. S3 bucket exists
2. IAM permissions: `s3:PutObject`, `s3:GetObject`
3. Bucket policy allows uploads
4. Network connectivity to S3

### Issue 3: File Too Large

**Error:** `File size too large`

**Solution:**
- Current limit: 10MB (configured in `upload.middleware.js`)
- Increase limit if needed:
  ```javascript
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB
  }
  ```

---

## Security Considerations

1. **IAM Roles:** Production में IAM roles use करें, access keys नहीं
2. **Bucket Policy:** S3 bucket policy restrict करें
3. **File Validation:** File type और size validation already implemented
4. **Tenant Isolation:** Tenant ID के साथ documents organize करें (future enhancement)

---

## Next Steps

1. ✅ S3 configuration complete
2. ✅ Upload middleware implemented
3. ✅ Onboarding controller updated
4. ✅ Routes configured
5. ⏳ **Test on production**
6. ⏳ **Monitor S3 usage and costs**
7. ⏳ **Add document deletion API** (if needed)

---

## Status

✅ **S3 Configuration Complete!**

- S3 storage configured
- Upload middleware ready
- Onboarding controller updated
- Routes configured
- Server initialization added

**Ready for testing!** 🎉
