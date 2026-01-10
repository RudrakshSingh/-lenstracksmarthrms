# 📸 Attendance Selfie Upload Guide

## Overview
Selfies are automatically uploaded to **Azure Blob Storage** during clock-in and clock-out operations. They are stored securely and returned in attendance responses.

---

## 🔧 Azure Blob Storage Configuration

### Required Environment Variables

```bash
# Option 1: Connection String (Recommended)
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=YOUR_ACCOUNT;AccountKey=YOUR_KEY;EndpointSuffix=core.windows.net

# Option 2: SAS Token
AZURE_STORAGE_ACCOUNT_NAME=eteliosstorage
AZURE_STORAGE_SAS_TOKEN=?sv=2021-06-08&ss=b&srt=sco&sp=rwdlacup&se=2027-12-31&st=2026-01-01&spr=https&sig=YOUR_SAS_SIGNATURE

# Container Name
AZURE_STORAGE_CONTAINER_NAME=attendance-selfies
```

### How to Get Azure Storage Credentials

1. **Azure Portal** → Storage Accounts
2. Select your storage account (e.g., `eteliosstorage`)
3. **Option A - Connection String:**
   - Settings → Access Keys
   - Copy "Connection string"
   
4. **Option B - SAS Token:**
   - Settings → Shared access signature
   - Select: Blob service, Container & Object permissions
   - Set expiry date
   - Generate SAS

---

## 📤 API Endpoint - Clock In with Selfie

### Request

```http
POST https://98.70.245.87/api/attendance/clock-in
Authorization: Bearer <employee_token>
Content-Type: multipart/form-data

Body (Form Data):
- selfie: <image file> (optional but recommended)
- latitude: 19.0760
- longitude: 72.8777
- notes: "Morning shift"
```

### cURL Example

```bash
curl -k -X POST 'https://98.70.245.87/api/attendance/clock-in' \
  -H 'Authorization: Bearer YOUR_EMPLOYEE_TOKEN' \
  -F 'selfie=@/path/to/selfie.jpg' \
  -F 'latitude=19.0760' \
  -F 'longitude=72.8777' \
  -F 'notes=Morning shift'
```

### JavaScript/Fetch Example

```javascript
const clockIn = async (selfieFile, latitude, longitude) => {
  const formData = new FormData();
  formData.append('selfie', selfieFile); // File from input[type="file"]
  formData.append('latitude', latitude);
  formData.append('longitude', longitude);
  formData.append('notes', 'Morning shift');

  const response = await fetch('https://98.70.245.87/api/attendance/clock-in', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${employeeToken}`
    },
    body: formData
  });

  return await response.json();
};
```

### React Native Example

```javascript
import DocumentPicker from 'react-native-document-picker';
import { launchCamera } from 'react-native-image-picker';

const clockInWithSelfie = async () => {
  // 1. Capture selfie
  const cameraResult = await launchCamera({
    mediaType: 'photo',
    cameraType: 'front',
    quality: 0.7
  });

  if (cameraResult.didCancel) return;

  const { latitude, longitude } = await getCurrentLocation();

  // 2. Prepare form data
  const formData = new FormData();
  formData.append('selfie', {
    uri: cameraResult.assets[0].uri,
    type: 'image/jpeg',
    name: 'selfie.jpg'
  });
  formData.append('latitude', latitude.toString());
  formData.append('longitude', longitude.toString());
  formData.append('notes', 'Morning shift');

  // 3. Upload
  const response = await fetch('https://98.70.245.87/api/attendance/clock-in', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${employeeToken}`
    },
    body: formData
  });

  const data = await response.json();
  console.log('Clock-in successful:', data);
};
```

---

## 📥 Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "6960f123abc...",
    "employee_id": "EMP-TEST-001",
    "store": "6960e84bcd3ed63a3d68cee0",
    "store_code": "DEL-002",
    "date": "2026-01-10T00:00:00.000Z",
    "check_in_time": "2026-01-10T06:30:15.123Z",
    "check_in_location": {
      "latitude": 19.0760,
      "longitude": 72.8777,
      "address": "Morning shift"
    },
    "check_in_selfie": {
      "secure_url": "https://eteliosstorage.blob.core.windows.net/attendance-selfies/1736498415123-selfie.jpg",
      "public_id": "selfie_6960072c898c012e56a76ed7_1736498415123"
    },
    "is_geofence_valid": true,
    "status": "present",
    "createdAt": "2026-01-10T06:30:15.123Z",
    "updatedAt": "2026-01-10T06:30:15.123Z",
    "security": {
      "validated": true,
      "suspiciousScore": 15,
      "action": "ALLOW",
      "checks": {...}
    }
  },
  "message": "Clock-in recorded successfully"
}
```

### Key Fields in Response

| Field | Description |
|-------|-------------|
| `check_in_selfie.secure_url` | **Public URL** of the selfie in Azure Blob Storage |
| `check_in_selfie.public_id` | Unique identifier for the selfie |
| `is_geofence_valid` | Whether employee was within store geofence |
| `security.suspiciousScore` | Security risk score (0-100, lower is better) |

---

## 🔍 Retrieving Attendance with Selfies

### Get Attendance History

```bash
curl -k -X GET 'https://98.70.245.87/api/attendance/history?startDate=2026-01-01&endDate=2026-01-10&page=1&limit=10' \
  -H 'Authorization: Bearer YOUR_EMPLOYEE_TOKEN'
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "6960f123abc...",
      "employeeId": "EMP-TEST-001",
      "date": "2026-01-10",
      "checkIn": {
        "time": "2026-01-10T06:30:15.123Z",
        "location": {
          "latitude": 19.0760,
          "longitude": 72.8777,
          "address": "Morning shift"
        },
        "selfie": "https://eteliosstorage.blob.core.windows.net/attendance-selfies/1736498415123-selfie.jpg"
      },
      "checkOut": {
        "time": "2026-01-10T18:15:30.456Z",
        "location": {
          "latitude": 19.0762,
          "longitude": 72.8779
        },
        "selfie": "https://eteliosstorage.blob.core.windows.net/attendance-selfies/1736540130456-selfie-out.jpg"
      },
      "totalHours": 11.75,
      "status": "present",
      "isGeofenceValid": true
    }
  ],
  "message": "Attendance history retrieved successfully",
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

---

## 🛠️ Frontend Implementation Tips

### 1. Display Selfie Thumbnail

```javascript
const AttendanceCard = ({ attendance }) => {
  return (
    <div className="attendance-card">
      <div className="check-in">
        <p>Clock In: {new Date(attendance.checkIn.time).toLocaleTimeString()}</p>
        {attendance.checkIn.selfie && (
          <img 
            src={attendance.checkIn.selfie} 
            alt="Clock-in selfie"
            className="selfie-thumbnail"
            style={{ width: 50, height: 50, borderRadius: '50%' }}
          />
        )}
      </div>
    </div>
  );
};
```

### 2. Lazy Load Selfies

```javascript
const SelfieImage = ({ src, alt }) => {
  return (
    <img 
      src={src} 
      alt={alt}
      loading="lazy" // Browser will lazy load
      onError={(e) => {
        e.target.src = '/placeholder-avatar.png'; // Fallback
      }}
    />
  );
};
```

### 3. Image Optimization

**Backend automatically handles:**
- ✅ Unique filenames with timestamps
- ✅ Public blob access (no authentication needed for viewing)
- ✅ MIME type preservation

**Frontend recommendations:**
- Use `<img loading="lazy">` for performance
- Cache images in browser
- Show placeholder while loading

---

## 🔐 Security Features

### Blob Storage Security

1. **Public Read Access:** Images are accessible via direct URL (no auth needed for viewing)
2. **Private Write Access:** Only authenticated employees can upload
3. **Unique Filenames:** Prevents overwriting and collision
4. **Blob Naming:** `timestamp-originalfilename.ext`

### Attendance Security

1. **Geofence Validation:** Checks if employee is within store radius
2. **Security Score:** Flags suspicious patterns
3. **Face Verification (Future):** Compare selfie with employee photo
4. **Tamper Detection:** Tracks location spoofing attempts

---

## 📊 Testing Attendance with Selfie

### Test Script

```bash
#!/bin/bash

# Get employee token
EMP_TOKEN=$(curl -k -s -X POST 'https://98.70.245.87/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"emailOrEmployeeId":"rajesh.test@etelios.com","password":"Test@123456"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

echo "Token: $EMP_TOKEN"

# Clock in with selfie
curl -k -X POST 'https://98.70.245.87/api/attendance/clock-in' \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -F 'selfie=@./test-selfie.jpg' \
  -F 'latitude=19.0760' \
  -F 'longitude=72.8777' \
  -F 'notes=Test attendance with selfie' \
  | python3 -m json.tool

echo ""
echo "✅ Check the response for check_in_selfie.secure_url"
```

### Expected Response

```json
{
  "success": true,
  "data": {
    "check_in_selfie": {
      "secure_url": "https://eteliosstorage.blob.core.windows.net/attendance-selfies/1736498415123-test-selfie.jpg",
      "public_id": "selfie_6960072c898c012e56a76ed7_1736498415123"
    },
    ...
  },
  "message": "Clock-in recorded successfully"
}
```

---

## ❌ Troubleshooting

### Issue 1: Selfie not uploading

**Symptoms:** `check_in_selfie.secure_url` is `null`

**Solutions:**
1. Check Azure Storage env vars are set:
   ```bash
   kubectl get secret hrms-secrets -n etelios-backend-prod -o jsonpath='{.data.AZURE_STORAGE_CONNECTION_STRING}' | base64 --decode
   ```
2. Verify container exists: `attendance-selfies`
3. Check attendance-service logs:
   ```bash
   kubectl logs -n etelios-backend-prod -l app=attendance-service --tail=50
   ```

### Issue 2: 403 Forbidden on blob URL

**Cause:** Blob container doesn't have public read access

**Fix:**
```bash
az storage container set-permission \
  --name attendance-selfies \
  --public-access blob \
  --account-name eteliosstorage
```

### Issue 3: Selfie image too large

**Recommended:** Compress before upload
```javascript
// React Native: Use react-native-image-resizer
import ImageResizer from 'react-native-image-resizer';

const compressedImage = await ImageResizer.createResizedImage(
  imageUri,
  800,  // Max width
  800,  // Max height
  'JPEG',
  70    // Quality 0-100
);
```

---

## 🎯 Best Practices

1. **Compress images on client-side** before upload (target: < 500 KB)
2. **Use front camera** for selfies (better for face verification)
3. **Handle upload failures gracefully** (allow clock-in even if selfie fails)
4. **Show preview** before uploading
5. **Cache blob URLs** in frontend to reduce API calls
6. **Add loading states** while uploading selfies

---

## 📝 Summary

✅ **Selfies are automatically uploaded to Azure Blob Storage**  
✅ **Returned in attendance responses with public URLs**  
✅ **No additional API calls needed to retrieve selfies**  
✅ **Secure, scalable, and production-ready**

**Next Steps:**
- Configure Azure Storage credentials
- Test clock-in with selfie
- Display selfies in frontend
- Implement face verification (future enhancement)

---

**Last Updated:** January 10, 2026  
**Version:** 1.0  
**Status:** ✅ Production Ready

