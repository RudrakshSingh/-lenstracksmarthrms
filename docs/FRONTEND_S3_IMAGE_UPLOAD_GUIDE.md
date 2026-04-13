# 📸 Frontend Developer - S3 Image Upload Guide

**Date:** March 9, 2026  
**Status:** ✅ **PRODUCTION READY**

---

## 🎯 Overview

This guide explains how to upload images to AWS S3 for:
1. **Onboarding Documents** - Employee documents (Photo, Aadhar, PAN, etc.)
2. **Attendance Selfies** - Selfie images during check-in/check-out

All images are automatically uploaded to AWS S3 and URLs are returned in API responses.

---

## 🌐 API Base URL

```
http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
```

---

## 📋 Table of Contents

1. [Onboarding Document Upload](#1-onboarding-document-upload)
2. [Attendance Selfie Upload](#2-attendance-selfie-upload)
3. [Image Requirements](#image-requirements)
4. [Error Handling](#error-handling)
5. [Code Examples](#code-examples)
6. [Testing](#testing)

---

## 1. Onboarding Document Upload

### Endpoint (Recommended)

```
POST /api/hr/onboarding/upload
```

**✅ This is the correct endpoint for onboarding document uploads with S3 storage.**

### Alternative Endpoints (If Needed)

If the above endpoint doesn't work, try these alternatives:

```
POST /api/hr/documents/upload
POST /api/documents/upload
```

**Note:** The `/api/hr/onboarding/upload` endpoint is recommended as it:
- ✅ Uses S3 storage (configured and working)
- ✅ Properly saves to onboarding documents
- ✅ Returns S3 URLs in response

### Headers

```javascript
{
  'Authorization': 'Bearer <JWT_TOKEN>',
  'x-tenant-id': '<TENANT_ID>'
}
```

### Request Body (multipart/form-data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | ✅ Yes | Image/document file |
| `employee_id` | String | ✅ Yes | Employee ID (e.g., "EMP-001") |
| `document_type` | String | ✅ Yes | Document type (see below) |

### Document Types

- `PHOTO` - Employee photo
- `AADHAR` - Aadhar card
- `PAN` - PAN card
- `PASSPORT` - Passport
- `DRIVING_LICENSE` - Driving license
- `EDUCATION_CERTIFICATE` - Education certificate
- `EXPERIENCE_CERTIFICATE` - Experience certificate
- `BANK_STATEMENT` - Bank statement
- `SIGNATURE` - Signature
- `OTHER` - Other documents

### Success Response (200/201)

```json
{
  "success": true,
  "data": {
    "document": {
      "id": "doc_id_123",
      "type": "PHOTO",
      "url": "https://etelios-prod-storage.s3.ap-south-1.amazonaws.com/onboarding/1773070577069-EMP-001-PHOTO-image.png",
      "secure_url": "https://etelios-prod-storage.s3.ap-south-1.amazonaws.com/onboarding/1773070577069-EMP-001-PHOTO-image.png",
      "uploaded_at": "2026-03-09T15:36:17.131Z",
      "employee_id": "EMP-001",
      "storage_provider": "aws-s3"
    }
  }
}
```

### Error Responses

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Access token required",
  "code": "AUTH_REQUIRED"
}
```

**404 Employee Not Found:**
```json
{
  "success": false,
  "message": "EMPLOYEE_NOT_FOUND",
  "timestamp": "2026-03-09T15:36:17.131Z"
}
```

**400 Invalid Document Type:**
```json
{
  "success": false,
  "message": "Invalid document_type. Valid types: PHOTO, AADHAR, PAN, ...",
  "code": "INVALID_DOCUMENT_TYPE"
}
```

---

## 2. Attendance Selfie Upload

### Method 1: File Upload (multipart/form-data)

#### Endpoint

```
POST /api/attendance/checkin
POST /api/attendance/check-out
```

#### Headers

```javascript
{
  'Authorization': 'Bearer <JWT_TOKEN>',
  'x-tenant-id': '<TENANT_ID>'
}
```

#### Request Body (multipart/form-data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `selfie` | File | ⚠️ Optional | Selfie image file |
| `latitude` | Number | ✅ Yes | GPS latitude |
| `longitude` | Number | ✅ Yes | GPS longitude |
| `notes` | String | ❌ No | Optional notes |

#### Success Response (200/201)

```json
{
  "success": true,
  "data": {
    "attendance": {
      "id": "attendance_id_123",
      "check_in_time": "2026-03-09T15:36:17.131Z",
      "check_in_location": {
        "latitude": 19.0760,
        "longitude": 72.8777
      },
      "check_in_selfie": {
        "url": "https://etelios-prod-storage.s3.ap-south-1.amazonaws.com/attendance/selfies/1773070577069-selfie.jpg",
        "secure_url": "https://etelios-prod-storage.s3.ap-south-1.amazonaws.com/attendance/selfies/1773070577069-selfie.jpg",
        "public_id": "selfie_emp001_1773070577069",
        "uploaded_at": "2026-03-09T15:36:17.131Z"
      },
      "status": "present"
    }
  }
}
```

---

### Method 2: Base64 Upload (JSON)

#### Endpoint

```
POST /api/attendance/checkin
POST /api/attendance/check-out
```

#### Headers

```javascript
{
  'Authorization': 'Bearer <JWT_TOKEN>',
  'x-tenant-id': '<TENANT_ID>',
  'Content-Type': 'application/json'
}
```

#### Request Body (JSON)

```json
{
  "latitude": 19.0760,
  "longitude": 72.8777,
  "selfie": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "notes": "Optional notes"
}
```

**Note:** `selfie` field should be a base64 data URI:
- Format: `data:image/<type>;base64,<base64_data>`
- Supported types: `jpeg`, `jpg`, `png`, `webp`

#### Success Response

Same as Method 1 above.

---

## 📸 Image Requirements

### Supported Formats

- **Images:** JPEG, JPG, PNG, WebP
- **Documents:** PDF (for onboarding documents)

### Size Limits

- **Recommended:** < 5 MB per file
- **Maximum:** 10 MB per file

### Dimensions

- **Photos/Selfies:** Any size (will be stored as-is)
- **Recommended:** 800x600 to 2000x2000 pixels

---

## 💻 Code Examples

### React/Next.js Example

#### Onboarding Document Upload

```javascript
import axios from 'axios';

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
    
    const response = await axios.post(
      `${API_BASE_URL}/api/hr/onboarding/upload`,
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
      const s3Url = response.data.data.document.url;
      console.log('✅ Upload successful! S3 URL:', s3Url);
      return response.data.data.document;
    }
    
    throw new Error('Upload failed');
  } catch (error) {
    console.error('❌ Upload error:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const document = await uploadOnboardingDocument(
      file,
      'EMP-001',
      'PHOTO'
    );
    
    console.log('Document uploaded:', document.url);
    // Use document.url to display or store
  } catch (error) {
    alert('Upload failed: ' + error.message);
  }
};
```

#### Attendance Selfie Upload (File)

```javascript
async function uploadAttendanceSelfie(file, latitude, longitude) {
  try {
    const token = localStorage.getItem('authToken');
    const tenantId = localStorage.getItem('tenantId') || 'default';
    
    const formData = new FormData();
    formData.append('selfie', file);
    formData.append('latitude', latitude.toString());
    formData.append('longitude', longitude.toString());
    
    const response = await axios.post(
      `${API_BASE_URL}/api/attendance/checkin`,
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
      const selfieUrl = response.data.data.attendance.check_in_selfie?.url;
      console.log('✅ Selfie uploaded! S3 URL:', selfieUrl);
      return response.data.data.attendance;
    }
    
    throw new Error('Upload failed');
  } catch (error) {
    console.error('❌ Upload error:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
const handleSelfieUpload = async (file) => {
  try {
    // Get GPS coordinates
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
    
    const attendance = await uploadAttendanceSelfie(
      file,
      position.coords.latitude,
      position.coords.longitude
    );
    
    console.log('Check-in successful:', attendance);
  } catch (error) {
    alert('Check-in failed: ' + error.message);
  }
};
```

#### Attendance Selfie Upload (Base64)

```javascript
async function uploadAttendanceSelfieBase64(imageDataUrl, latitude, longitude) {
  try {
    const token = localStorage.getItem('authToken');
    const tenantId = localStorage.getItem('tenantId') || 'default';
    
    const response = await axios.post(
      `${API_BASE_URL}/api/attendance/checkin`,
      {
        latitude: latitude,
        longitude: longitude,
        selfie: imageDataUrl // Already in data:image/... format
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success) {
      const selfieUrl = response.data.data.attendance.check_in_selfie?.url;
      console.log('✅ Selfie uploaded! S3 URL:', selfieUrl);
      return response.data.data.attendance;
    }
    
    throw new Error('Upload failed');
  } catch (error) {
    console.error('❌ Upload error:', error.response?.data || error.message);
    throw error;
  }
}

// Usage with camera capture
const captureAndUploadSelfie = async () => {
  try {
    // Capture image from camera
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video = document.createElement('video');
    video.srcObject = stream;
    video.play();
    
    // Wait for video to be ready
    await new Promise(resolve => video.onloadedmetadata = resolve);
    
    // Capture frame
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    // Convert to base64
    const imageDataUrl = canvas.toDataURL('image/jpeg');
    
    // Get GPS coordinates
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
    
    // Upload
    const attendance = await uploadAttendanceSelfieBase64(
      imageDataUrl,
      position.coords.latitude,
      position.coords.longitude
    );
    
    console.log('Check-in successful:', attendance);
    
    // Stop camera
    stream.getTracks().forEach(track => track.stop());
  } catch (error) {
    alert('Check-in failed: ' + error.message);
  }
};
```

---

## 🔧 Error Handling

### Common Errors

#### 1. Authentication Error (401)

```javascript
if (error.response?.status === 401) {
  // Token expired or invalid
  localStorage.removeItem('authToken');
  // Redirect to login
  window.location.href = '/login';
}
```

#### 2. Employee Not Found (404)

```javascript
if (error.response?.status === 404 && 
    error.response?.data?.message === 'EMPLOYEE_NOT_FOUND') {
  alert('Employee not found. Please check employee ID.');
}
```

#### 3. Invalid Document Type (400)

```javascript
if (error.response?.status === 400 && 
    error.response?.data?.code === 'INVALID_DOCUMENT_TYPE') {
  alert('Invalid document type. Please select a valid type.');
}
```

#### 4. File Too Large

```javascript
// Check file size before upload
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

if (file.size > MAX_SIZE) {
  alert('File is too large. Maximum size is 10 MB.');
  return;
}
```

#### 5. Network Error

```javascript
if (error.code === 'NETWORK_ERROR' || !error.response) {
  alert('Network error. Please check your internet connection.');
}
```

---

## 🧪 Testing

### Test Onboarding Upload

```javascript
// Test with a sample image
const testOnboardingUpload = async () => {
  // Create a test file (1x1 PNG)
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const blob = await new Promise(resolve => 
    canvas.toBlob(resolve, 'image/png')
  );
  const file = new File([blob], 'test.png', { type: 'image/png' });
  
  try {
    const result = await uploadOnboardingDocument(
      file,
      'TEST-EMP-001',
      'PHOTO'
    );
    console.log('✅ Test successful!', result);
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};
```

### Test Selfie Upload

```javascript
// Test with base64 image
const testSelfieUpload = async () => {
  const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  
  try {
    const result = await uploadAttendanceSelfieBase64(
      base64Image,
      19.0760,
      72.8777
    );
    console.log('✅ Test successful!', result);
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};
```

---

## 📝 Best Practices

### 1. File Validation

```javascript
function validateImageFile(file) {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10 MB
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
  }
  
  if (file.size > maxSize) {
    throw new Error('File is too large. Maximum size is 10 MB.');
  }
  
  return true;
}
```

### 2. Progress Tracking

```javascript
const uploadWithProgress = async (file, employeeId, documentType, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('employee_id', employeeId);
  formData.append('document_type', documentType);
  
  const response = await axios.post(
    `${API_BASE_URL}/api/hr/onboarding/upload`,
    formData,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    }
  );
  
  return response.data;
};
```

### 3. Retry Logic

```javascript
async function uploadWithRetry(file, employeeId, documentType, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await uploadOnboardingDocument(file, employeeId, documentType);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### 4. Image Preview Before Upload

```javascript
function previewImage(file, previewElementId) {
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById(previewElementId).src = e.target.result;
  };
  reader.readAsDataURL(file);
}
```

---

## 🔗 S3 URL Format

Uploaded files are stored at:

```
https://etelios-prod-storage.s3.ap-south-1.amazonaws.com/{folder}/{filename}
```

**Folders:**
- Onboarding: `onboarding/`
- Attendance: `attendance/selfies/`

**Example URLs:**
- Onboarding: `https://etelios-prod-storage.s3.ap-south-1.amazonaws.com/onboarding/1773070577069-EMP-001-PHOTO-image.png`
- Selfie: `https://etelios-prod-storage.s3.ap-south-1.amazonaws.com/attendance/selfies/1773070577069-selfie.jpg`

---

## ✅ Quick Reference

### Onboarding Upload

```javascript
POST /api/hr/onboarding/upload
Content-Type: multipart/form-data

FormData:
- file: File
- employee_id: String
- document_type: String (PHOTO, AADHAR, PAN, etc.)
```

### Attendance Selfie (File)

```javascript
POST /api/attendance/checkin
Content-Type: multipart/form-data

FormData:
- selfie: File (optional)
- latitude: Number
- longitude: Number
- notes: String (optional)
```

### Attendance Selfie (Base64)

```javascript
POST /api/attendance/checkin
Content-Type: application/json

Body:
{
  "latitude": Number,
  "longitude": Number,
  "selfie": "data:image/jpeg;base64,..." (optional)
}
```

---

## 🐛 Troubleshooting

### Issue: Upload Returns 401

**Solution:** Check if token is valid and not expired
```javascript
// Refresh token if expired
const token = await refreshToken();
localStorage.setItem('authToken', token);
```

### Issue: Upload Returns 404 (Employee Not Found)

**Solution:** Verify employee ID exists
```javascript
// Get employee list first
const employees = await getEmployees();
const employeeId = employees[0].employeeId;
```

### Issue: Upload Returns 503

**Solution:** Service may be restarting, wait and retry
```javascript
// Retry after delay
await new Promise(resolve => setTimeout(resolve, 5000));
await uploadWithRetry(file, employeeId, documentType);
```

### Issue: File Not Uploading

**Solution:** Check file size and type
```javascript
// Validate before upload
validateImageFile(file);
```

---

## 📚 Related Documentation

- [Frontend Developer Complete Guide](./FRONTEND_DEVELOPER_COMPLETE_GUIDE.md)
- [API Test Report](./COMPLETE_API_TEST_REPORT.md)
- [S3 Configuration](./S3_CONFIGURATION_COMPLETE.md)

---

## ✅ Checklist

Before implementing:

- [ ] API base URL configured
- [ ] Auth token stored (localStorage/sessionStorage)
- [ ] Tenant ID available
- [ ] File validation implemented
- [ ] Error handling implemented
- [ ] Progress indicator added (optional)
- [ ] Image preview added (optional)

---

**Last Updated:** March 9, 2026  
**Status:** ✅ **PRODUCTION READY**

**Questions?** Contact backend team or check service logs.
