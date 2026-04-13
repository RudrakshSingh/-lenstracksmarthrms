# 🔧 Frontend Developer - Document Upload Endpoint Fix

**Date:** March 9, 2026  
**Issue:** `ENDPOINT_NOT_FOUND` error for document upload  
**Status:** ✅ **FIXED**

---

## 🔍 Problem

Frontend was getting this error:
```json
{
  "success": false,
  "error": "ENDPOINT_NOT_FOUND",
  "message": "Document upload service is not available. You can skip document upload and continue with onboarding.",
  "_debug": {
    "originalError": "Document upload endpoint not found",
    "errorCode": "ENDPOINT_NOT_FOUND",
    "is404": true
  }
}
```

---

## ✅ Solution

### Correct Endpoint for Onboarding Document Upload

**Use this endpoint:**
```
POST /api/hr/onboarding/upload
```

**NOT these (they may not be configured):**
- ❌ `/api/documents/upload`
- ❌ `/api/document/upload`
- ❌ `/api/hr/documents/upload` (may work but not recommended)

---

## 📝 Correct Implementation

### React/Next.js Example

```javascript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 
  'http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com';

async function uploadOnboardingDocument(file, employeeId, documentType) {
  try {
    const token = localStorage.getItem('authToken');
    const tenantId = localStorage.getItem('tenantId') || 'default';
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('employee_id', employeeId);
    formData.append('document_type', documentType);
    
    // ✅ Use this endpoint
    const response = await axios.post(
      `${API_BASE_URL}/api/hr/onboarding/upload`,  // ✅ CORRECT
      formData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    if (response.data.success) {
      const s3Url = response.data.data.url;  // S3 URL is here
      console.log('✅ Upload successful! S3 URL:', s3Url);
      return response.data.data;
    }
    
    throw new Error('Upload failed');
  } catch (error) {
    console.error('❌ Upload error:', error.response?.data || error.message);
    
    // Handle specific errors
    if (error.response?.status === 404) {
      if (error.response?.data?.error === 'ENDPOINT_NOT_FOUND') {
        console.error('❌ Wrong endpoint! Use: POST /api/hr/onboarding/upload');
      }
    }
    
    throw error;
  }
}
```

---

## 📊 Response Format

### Success Response (201)

```json
{
  "success": true,
  "message": "Onboarding document uploaded successfully",
  "data": {
    "employee_id": "EMP-001",
    "document_type": "PHOTO",
    "file_name": "image.png",
    "mime_type": "image/png",
    "file_size": 12345,
    "url": "https://etelios-prod-storage.s3.ap-south-1.amazonaws.com/onboarding/1773070577069-EMP-001-PHOTO-image.png",
    "storage_provider": "aws-s3",
    "onboarding": {
      // Onboarding document record
    }
  }
}
```

**Key Field:** `data.url` - This is the S3 URL you need to store/display.

---

## 🔄 Migration Guide

### If You're Currently Using Wrong Endpoint

**Before (Wrong):**
```javascript
// ❌ Don't use this
const response = await axios.post(
  `${API_BASE_URL}/api/documents/upload`,  // ❌ Wrong
  formData
);
```

**After (Correct):**
```javascript
// ✅ Use this
const response = await axios.post(
  `${API_BASE_URL}/api/hr/onboarding/upload`,  // ✅ Correct
  formData,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
    }
  }
);
```

---

## ✅ Verification

### Test the Endpoint

```bash
# Get token first
TOKEN=$(curl -s -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"Admin@lenstrack.com","password":"AdminPass123!"}' | jq -r '.data.accessToken')

# Test upload
curl -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/api/hr/onboarding/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: lenstrack" \
  -F "file=@image.png" \
  -F "employee_id=EMP-001" \
  -F "document_type=PHOTO"
```

**Expected:** HTTP 201 with S3 URL in response

---

## 🐛 Troubleshooting

### Error: ENDPOINT_NOT_FOUND

**Cause:** Using wrong endpoint URL

**Solution:**
1. Check you're using `/api/hr/onboarding/upload`
2. Verify the endpoint in your code
3. Check API base URL is correct

### Error: 401 Unauthorized

**Cause:** Missing or invalid token

**Solution:**
```javascript
// Refresh token if expired
const token = await refreshToken();
localStorage.setItem('authToken', token);
```

### Error: 404 Employee Not Found

**Cause:** Employee ID doesn't exist

**Solution:**
```javascript
// Get valid employee ID first
const employees = await getEmployees();
const employeeId = employees[0].employeeId;
```

---

## 📚 Related Documentation

- [Frontend S3 Image Upload Guide](./FRONTEND_S3_IMAGE_UPLOAD_GUIDE.md) - Complete guide
- [S3 Configuration](./S3_CONFIGURATION_COMPLETE.md) - Backend setup
- [API Test Report](./COMPLETE_API_TEST_REPORT.md) - All endpoints

---

## ✅ Quick Reference

**Correct Endpoint:**
```
POST /api/hr/onboarding/upload
```

**Required Headers:**
```
Authorization: Bearer <JWT_TOKEN>
x-tenant-id: <TENANT_ID>
```

**Required Fields:**
- `file`: File object
- `employee_id`: String
- `document_type`: String (PHOTO, AADHAR, PAN, etc.)

**Response:**
- `data.url`: S3 URL (use this to display/store)

---

**Last Updated:** March 9, 2026  
**Status:** ✅ **FIXED - Use `/api/hr/onboarding/upload`**
