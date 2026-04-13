# 📋 Complete Attendance API Guide for Frontend Developers

## 📊 Current Database Status

### Database Summary (as of 2026-02-16)

**Attendance Records**: `0` records  
**Employees**: `6` employees  
**Stores**: `1` store  

#### Employees in Database:
1. **SALES-1771164113** - Sales Man (salesman1771164113@upcapto.com) - Store: Mumbai Main Store
2. **SM-1771164120** - Store Manager (storemanager1771164120@upcapto.com) - Store: Mumbai Main Store
3. **ASM-1771164122** - Area Sales Manager (asm1771164122@upcapto.com) - Store: Mumbai Main Store
4. **RSM-1771164125** - Regional Sales Manager (rsm1771164125@upcapto.com) - Store: Mumbai Main Store
5. **EMP-TEST-177219** - Test Employee (employee.test@upcapto.com) - Store: Mumbai Main Store
6. **VAIBHAV-218926** - Vaibhav Dwivedi (vaibhav.dwivedi@upcapto.com) - Store: Mumbai Main Store

#### Stores in Database:
1. **Mumbai Main Store** (ID: `6991d1a31c60f69377f76a0c`, Code: `STORE-MUM-001`)

---

## 🔐 Authentication

All attendance APIs require authentication. Include the JWT token in the Authorization header:

```javascript
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'x-tenant-id': 'upcapto',  // Required for multi-tenant
  'Content-Type': 'application/json'
}
```

---

## 📍 Base URL

```
Production: http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

---

## 🎯 API Endpoints

### 1. Clock-In (Check-In)

**Endpoint**: `POST /api/attendance/clock-in`  
**Alias**: `POST /api/attendance/check-in`  
**Authentication**: Required (Active Employee)  
**Content-Type**: `multipart/form-data` (for selfie upload)

#### Request Body (FormData)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `latitude` | Number | ✅ Yes | GPS latitude (-90 to 90) |
| `longitude` | Number | ✅ Yes | GPS longitude (-180 to 180) |
| `selfie` | File | ❌ Optional | Selfie image (JPEG/PNG, max 10MB) |
| `notes` | String | ❌ Optional | Additional notes (max 1000 chars) |
| `accuracy` | Number | ❌ Optional | GPS accuracy in meters |
| `altitude` | Number | ❌ Optional | GPS altitude |
| `heading` | Number | ❌ Optional | GPS heading (0-360) |
| `speed` | Number | ❌ Optional | GPS speed (m/s) |
| `timestamp` | Number | ❌ Optional | Timestamp (milliseconds) |
| `deviceSecurity` | Object | ❌ Optional | Device security info |
| `appState` | Object | ❌ Optional | App state info |
| `networkLocation` | Object | ❌ Optional | Network-based location |
| `ipLocation` | Object | ❌ Optional | IP-based location |
| `satelliteInfo` | Object | ❌ Optional | Satellite/GPS info |

#### Request Example (JavaScript/React)

```javascript
// Using FormData for file upload
const clockIn = async (latitude, longitude, selfieFile, notes = '') => {
  const formData = new FormData();
  formData.append('latitude', latitude.toString());
  formData.append('longitude', longitude.toString());
  formData.append('notes', notes || '');
  
  // Selfie is optional
  if (selfieFile) {
    formData.append('selfie', selfieFile);
  }
  
  // Optional GPS metadata
  if (position?.coords?.accuracy) {
    formData.append('accuracy', position.coords.accuracy.toString());
  }
  if (position?.coords?.altitude) {
    formData.append('altitude', position.coords.altitude.toString());
  }
  if (position?.coords?.heading) {
    formData.append('heading', position.coords.heading.toString());
  }
  if (position?.coords?.speed) {
    formData.append('speed', position.coords.speed.toString());
  }
  
  const response = await fetch(`${API_BASE_URL}/api/attendance/clock-in`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-tenant-id': 'upcapto'
      // Don't set Content-Type - browser will set it with boundary for FormData
    },
    body: formData
  });
  
  return await response.json();
};
```

#### Response Example (Success - 201)

```json
{
  "success": true,
  "message": "Clock-in recorded successfully",
  "data": {
    "_id": "6992a91caff40adbd9e8fa49",
    "id": "6992a91caff40adbd9e8fa49",
    "employee": "6992a7ee675a809251aa8912",
    "employee_id": "VAIBHAV-218926",
    "employeeId": "VAIBHAV-218926",
    "store": "6991d1a31c60f69377f76a0c",
    "store_code": "STORE-MUM-001",
    "date": "2026-02-16T00:00:00.000Z",
    "check_in_time": "2026-02-16T05:20:28.510Z",
    "check_in_location": {
      "latitude": 19.0760,
      "longitude": 72.8777,
      "address": "Clock-in for Vaibhav Dwivedi",
      "accuracy": null
    },
    "check_in_selfie": {
      "public_id": "selfie_6992a7ee675a809251aa8912_1737001228510",
      "secure_url": "https://azure-blob-storage-url/selfie.jpg",
      "uploaded_at": "2026-02-16T05:20:28.510Z"
    },
    "status": "present",
    "geofence_status": "valid",
    "is_late": false,
    "is_geofence_violation": false,
    "is_selfie_verified": false,
    "total_hours": 0,
    "notes": "Clock-in for Vaibhav Dwivedi",
    "security": {
      "validated": true,
      "suspiciousScore": 0,
      "action": "ALLOW",
      "checks": {}
    },
    "createdAt": "2026-02-16T05:20:28.510Z",
    "updatedAt": "2026-02-16T05:20:28.510Z"
  }
}
```

#### Response Example (Error - 404)

```json
{
  "success": false,
  "error": "EMPLOYEE_NOT_FOUND",
  "message": "Employee not found in HR system. Please ensure the employee exists and is assigned to a store.",
  "details": {
    "userId": "6992a7ee675a809251aa8912",
    "employeeId": "VAIBHAV-218926",
    "email": "vaibhav.dwivedi@upcapto.com",
    "suggestion": "Ensure the logged-in user has a corresponding employee record in HR service with an assigned store."
  }
}
```

---

### 2. Clock-Out (Check-Out)

**Endpoint**: `POST /api/attendance/clock-out`  
**Alias**: `POST /api/attendance/check-out`  
**Authentication**: Required (Active Employee)  
**Content-Type**: `multipart/form-data` (for selfie upload)

#### Request Body (FormData)

Same as Clock-In - all fields are the same.

#### Request Example

```javascript
const clockOut = async (latitude, longitude, selfieFile, notes = '') => {
  const formData = new FormData();
  formData.append('latitude', latitude.toString());
  formData.append('longitude', longitude.toString());
  formData.append('notes', notes || '');
  
  if (selfieFile) {
    formData.append('selfie', selfieFile);
  }
  
  const response = await fetch(`${API_BASE_URL}/api/attendance/clock-out`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-tenant-id': 'upcapto'
    },
    body: formData
  });
  
  return await response.json();
};
```

#### Response Example (Success - 200)

```json
{
  "success": true,
  "message": "Clock-out recorded successfully",
  "data": {
    "_id": "6992a91caff40adbd9e8fa49",
    "id": "6992a91caff40adbd9e8fa49",
    "employee_id": "VAIBHAV-218926",
    "check_in_time": "2026-02-16T05:20:28.510Z",
    "check_out_time": "2026-02-16T13:30:15.220Z",
    "check_out_location": {
      "latitude": 19.0760,
      "longitude": 72.8777,
      "address": "Clock-out from office"
    },
    "check_out_selfie": {
      "secure_url": "https://azure-blob-storage-url/selfie-out.jpg",
      "uploaded_at": "2026-02-16T13:30:15.220Z"
    },
    "total_hours": 8.16,
    "status": "present",
    "is_early_departure": false,
    "security": {
      "validated": true,
      "suspiciousScore": 0,
      "action": "ALLOW"
    }
  }
}
```

---

### 3. Get Attendance Records

**Endpoint**: `GET /api/attendance`  
**Authentication**: Required (HR, Admin, Manager, Employee)  
**Query Parameters**: See below

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `employeeId` | String | ❌ Optional | Filter by employee ID (MongoDB ObjectId) |
| `date` | String | ❌ Optional | Filter by specific date (YYYY-MM-DD) |
| `startDate` | String | ❌ Optional | Start date for range (YYYY-MM-DD) |
| `endDate` | String | ❌ Optional | End date for range (YYYY-MM-DD) |
| `month` | Number | ❌ Optional | Filter by month (1-12) |
| `year` | Number | ❌ Optional | Filter by year (e.g., 2026) |
| `status` | String | ❌ Optional | Filter by status (present, absent, late, etc.) |
| `page` | Number | ❌ Optional | Page number (default: 1) |
| `limit` | Number | ❌ Optional | Items per page (default: 10, max: 100) |

#### Request Example

```javascript
// Get attendance for specific date
const getAttendanceByDate = async (date, employeeId = null) => {
  const params = new URLSearchParams({
    date: date,  // Format: YYYY-MM-DD
    ...(employeeId && { employeeId })
  });
  
  const response = await fetch(`${API_BASE_URL}/api/attendance?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-tenant-id': 'upcapto'
    }
  });
  
  return await response.json();
};

// Get attendance for date range
const getAttendanceByRange = async (startDate, endDate, employeeId = null) => {
  const params = new URLSearchParams({
    startDate,
    endDate,
    ...(employeeId && { employeeId })
  });
  
  const response = await fetch(`${API_BASE_URL}/api/attendance?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-tenant-id': 'upcapto'
    }
  });
  
  return await response.json();
};
```

#### Response Example

```json
{
  "success": true,
  "message": "Attendance retrieved successfully",
  "data": [
    {
      "id": "6992a91caff40adbd9e8fa49",
      "employeeId": "VAIBHAV-218926",
      "employeeName": "Vaibhav Dwivedi",
      "date": "2026-02-16",
      "checkIn": {
        "time": "2026-02-16T05:20:28.510Z",
        "location": {
          "latitude": 19.0760,
          "longitude": 72.8777,
          "address": "Clock-in for Vaibhav Dwivedi"
        },
        "selfie": "https://azure-blob-storage-url/selfie.jpg"
      },
      "checkOut": {
        "time": "2026-02-16T13:30:15.220Z",
        "location": {
          "latitude": 19.0760,
          "longitude": 72.8777,
          "address": "Clock-out from office"
        },
        "selfie": "https://azure-blob-storage-url/selfie-out.jpg"
      },
      "totalHours": 8.16,
      "status": "present",
      "isGeofenceValid": true,
      "storeId": "6991d1a31c60f69377f76a0c",
      "storeCode": "STORE-MUM-001",
      "remarks": "Clock-in for Vaibhav Dwivedi",
      "createdAt": "2026-02-16T05:20:28.510Z",
      "updatedAt": "2026-02-16T13:30:15.220Z"
    }
  ],
  "pagination": {
    "current": 1,
    "pages": 1,
    "total": 1,
    "limit": 10
  }
}
```

---

### 4. Get Attendance History

**Endpoint**: `GET /api/attendance/history`  
**Authentication**: Required (Active Employee)  
**Query Parameters**: `startDate`, `endDate`, `page`, `limit`

#### Request Example

```javascript
const getAttendanceHistory = async (startDate, endDate, page = 1, limit = 10) => {
  const params = new URLSearchParams({
    startDate,
    endDate,
    page: page.toString(),
    limit: limit.toString()
  });
  
  const response = await fetch(`${API_BASE_URL}/api/attendance/history?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-tenant-id': 'upcapto'
    }
  });
  
  return await response.json();
};
```

#### Response Example

```json
{
  "success": true,
  "message": "Attendance history retrieved successfully",
  "data": {
    "attendances": [
      {
        "id": "6992a91caff40adbd9e8fa49",
        "employeeId": "VAIBHAV-218926",
        "date": "2026-02-16",
        "checkIn": { /* ... */ },
        "checkOut": { /* ... */ },
        "status": "present",
        "totalHours": 8.16
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1,
      "itemsPerPage": 10,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

### 5. Get Attendance Summary

**Endpoint**: `GET /api/attendance/summary`  
**Authentication**: Required (with `attendance:read` permission)  
**Query Parameters**: `startDate` (required), `endDate` (required)

#### Request Example

```javascript
const getAttendanceSummary = async (startDate, endDate) => {
  const params = new URLSearchParams({
    startDate,
    endDate
  });
  
  const response = await fetch(`${API_BASE_URL}/api/attendance/summary?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-tenant-id': 'upcapto'
    }
  });
  
  return await response.json();
};
```

#### Response Example

```json
{
  "success": true,
  "message": "Attendance summary retrieved successfully",
  "data": {
    "totalDays": 30,
    "presentDays": 25,
    "absentDays": 2,
    "lateArrivals": 3,
    "totalHours": 200.5,
    "averageHoursPerDay": 8.02,
    "overtimeHours": 10.5
  }
}
```

---

### 6. Get Attendance Statistics

**Endpoint**: `GET /api/attendance/stats`  
**Authentication**: Required (HR, Admin, Manager)  
**Query Parameters**: `date`, `month`, `storeId`

#### Request Example

```javascript
const getAttendanceStats = async (date = null, month = null, storeId = null) => {
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  if (month) params.append('month', month.toString());
  if (storeId) params.append('storeId', storeId);
  
  const response = await fetch(`${API_BASE_URL}/api/attendance/stats?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-tenant-id': 'upcapto'
    }
  });
  
  return await response.json();
};
```

#### Response Example

```json
{
  "success": true,
  "message": "Attendance statistics retrieved successfully",
  "data": {
    "totalEmployees": 6,
    "presentToday": 4,
    "absentToday": 1,
    "lateArrivals": 1,
    "onLeave": 1,
    "attendanceRate": 66.67
  }
}
```

---

### 7. Track Location (Geofence Monitoring & Auto Check-In/Out)

**Endpoint**: `POST /api/attendance/track-location`  
**Authentication**: Required (Active Employee)  
**Purpose**: 
- Monitor employee location for auto-logout on geofence violation
- Enable auto check-in when employee returns to geofence

#### Request Body

```json
{
  "latitude": 19.0760,
  "longitude": 72.8777,
  "autoCheckIn": false  // Optional: Set to true to trigger auto check-in
}
```

#### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `latitude` | Number | ✅ Yes | GPS latitude |
| `longitude` | Number | ✅ Yes | GPS longitude |
| `autoCheckIn` | Boolean | ❌ Optional | Set to `true` to trigger auto check-in when back in geofence |

#### Request Example

```javascript
const trackLocation = async (latitude, longitude, autoCheckIn = false) => {
  const response = await fetch(`${API_BASE_URL}/api/attendance/track-location`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-tenant-id': 'upcapto',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      latitude,
      longitude,
      autoCheckIn
    })
  });
  
  return await response.json();
};
```

#### Response Scenarios

**1. Within Geofence (No Action)**:
```json
{
  "success": true,
  "data": {
    "action": "none",
    "withinGeofence": true,
    "distance": 45,
    "geofenceRadius": 100
  }
}
```

**2. Leaves Geofence (Auto Logout)**:
```json
{
  "success": true,
  "data": {
    "action": "auto_logout",
    "withinGeofence": false,
    "distance": 250,
    "geofenceRadius": 100,
    "message": "Auto-logged out: You are 250m away from store (limit: 100m)"
  }
}
```

**3. Returns to Geofence (Auto Check-In Available)**:
```json
{
  "success": true,
  "data": {
    "action": "auto_checkin_available",
    "withinGeofence": true,
    "distance": 45,
    "geofenceRadius": 100,
    "canAutoCheckIn": true,
    "message": "You are back within geofence. Auto check-in available."
  }
}
```

**4. Auto Check-In Triggered**:
```json
{
  "success": true,
  "data": {
    "action": "auto_checkin",
    "withinGeofence": true,
    "attendance": {
      "id": "6992a91caff40adbd9e8fa50",
      "checkInTime": "2026-02-16T10:45:00.000Z",
      "status": "present"
    },
    "message": "Auto check-in successful: You are back within geofence"
  }
}
```

#### Complete Flow Example

```javascript
// Start tracking when employee clocks in
const startGeofenceTracking = () => {
  const interval = setInterval(async () => {
    const position = await getCurrentPosition();
    
    const response = await trackLocation(
      position.coords.latitude,
      position.coords.longitude,
      false // Don't auto check-in automatically
    );
    
    if (response.data.action === 'auto_logout') {
      // Show notification
      showNotification('Auto-logged out due to geofence violation');
      clearInterval(interval);
    } else if (response.data.action === 'auto_checkin_available') {
      // Show prompt to user
      const shouldAutoCheckIn = await showConfirmDialog(
        'You are back within geofence. Auto check-in?'
      );
      
      if (shouldAutoCheckIn) {
        // Trigger auto check-in
        await trackLocation(
          position.coords.latitude,
          position.coords.longitude,
          true // Request auto check-in
        );
      }
    }
  }, 30000); // Every 30 seconds
  
  return interval;
};
```

**See `GEOFENCING_AUTO_CHECKIN_CHECKOUT.md` for complete documentation.**

---

## 📱 Complete Frontend Implementation Example

### React Component Example

```javascript
import React, { useState, useEffect } from 'react';
import { useGeolocation } from './hooks/useGeolocation';
import { useCamera } from './hooks/useCamera';

const AttendanceClockIn = ({ accessToken, tenantId = 'upcapto' }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  const { position, getCurrentPosition } = useGeolocation();
  const { captureSelfie, selfieFile } = useCamera();
  
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 
    'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';
  
  const handleClockIn = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get GPS location
      await getCurrentPosition();
      
      if (!position) {
        throw new Error('Unable to get GPS location');
      }
      
      // Capture selfie (optional)
      let selfie = null;
      try {
        selfie = await captureSelfie();
      } catch (selfieError) {
        console.warn('Selfie capture failed, continuing without selfie:', selfieError);
      }
      
      // Prepare FormData
      const formData = new FormData();
      formData.append('latitude', position.coords.latitude.toString());
      formData.append('longitude', position.coords.longitude.toString());
      formData.append('notes', 'Clock-in from mobile app');
      
      // Add GPS metadata
      if (position.coords.accuracy) {
        formData.append('accuracy', position.coords.accuracy.toString());
      }
      if (position.coords.altitude) {
        formData.append('altitude', position.coords.altitude.toString());
      }
      if (position.coords.heading) {
        formData.append('heading', position.coords.heading.toString());
      }
      if (position.coords.speed) {
        formData.append('speed', position.coords.speed.toString());
      }
      
      // Add selfie if captured
      if (selfie) {
        formData.append('selfie', selfie);
      }
      
      // Make API call
      const response = await fetch(`${API_BASE_URL}/api/attendance/clock-in`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': tenantId
          // Don't set Content-Type for FormData
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Clock-in failed');
      }
      
      setSuccess(true);
      console.log('Clock-in successful:', data.data);
      
    } catch (err) {
      setError(err.message);
      console.error('Clock-in error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <button 
        onClick={handleClockIn} 
        disabled={loading || !position}
      >
        {loading ? 'Clocking In...' : 'Clock In'}
      </button>
      
      {error && <div className="error">{error}</div>}
      {success && <div className="success">Clocked in successfully!</div>}
      
      {position && (
        <div>
          <p>Location: {position.coords.latitude}, {position.coords.longitude}</p>
          <p>Accuracy: {position.coords.accuracy}m</p>
        </div>
      )}
    </div>
  );
};

export default AttendanceClockIn;
```

---

## 📋 Complete Field Reference

### Clock-In/Clock-Out Request Fields

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `latitude` | Number | ✅ Yes | -90 to 90 | GPS latitude |
| `longitude` | Number | ✅ Yes | -180 to 180 | GPS longitude |
| `selfie` | File | ❌ Optional | JPEG/PNG, max 10MB | Selfie image file |
| `notes` | String | ❌ Optional | Max 1000 chars | Additional notes |
| `accuracy` | Number | ❌ Optional | Positive number | GPS accuracy in meters |
| `altitude` | Number | ❌ Optional | Any number | GPS altitude |
| `heading` | Number | ❌ Optional | 0-360 | GPS heading (degrees) |
| `speed` | Number | ❌ Optional | Positive number | GPS speed (m/s) |
| `timestamp` | Number | ❌ Optional | Unix timestamp (ms) | Timestamp |
| `deviceSecurity` | Object | ❌ Optional | - | Device security info |
| `appState` | Object | ❌ Optional | - | App state info |
| `networkLocation` | Object | ❌ Optional | - | Network-based location |
| `ipLocation` | Object | ❌ Optional | - | IP-based location |
| `satelliteInfo` | Object | ❌ Optional | - | Satellite/GPS info |

### Attendance Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Attendance record ID |
| `employeeId` | String | Employee ID (e.g., "VAIBHAV-218926") |
| `employeeName` | String | Employee full name |
| `date` | String | Date (YYYY-MM-DD) |
| `checkIn` | Object | Check-in details |
| `checkIn.time` | String | Check-in timestamp (ISO 8601) |
| `checkIn.location` | Object | Check-in location |
| `checkIn.location.latitude` | Number | Latitude |
| `checkIn.location.longitude` | Number | Longitude |
| `checkIn.location.address` | String | Address string |
| `checkIn.selfie` | String | Selfie image URL |
| `checkOut` | Object | Check-out details (same structure as checkIn) |
| `totalHours` | Number | Total working hours |
| `status` | String | Status (present, absent, late, etc.) |
| `isGeofenceValid` | Boolean | Whether location is within geofence |
| `storeId` | String | Store ID |
| `storeCode` | String | Store code |
| `remarks` | String | Notes/remarks |
| `createdAt` | String | Creation timestamp |
| `updatedAt` | String | Update timestamp |

---

## 🔒 Security & Validation

### Geofencing
- Employees must be within the store's geofence radius to clock in/out
- Geofence violation is logged but doesn't block attendance (flagged for review)

### Selfie Verification
- Selfie is optional but recommended
- Uploaded to Azure Blob Storage
- Used for face verification (future feature)

### Location Validation
- GPS coordinates are validated
- Location accuracy is checked
- Suspicious patterns are flagged

---

## ⚠️ Error Handling

### Common Errors

1. **404 - Employee Not Found**
```json
{
  "success": false,
  "error": "EMPLOYEE_NOT_FOUND",
  "message": "Employee not found in HR system...",
  "details": {
    "userId": "...",
    "employeeId": "...",
    "email": "...",
    "suggestion": "..."
  }
}
```

2. **400 - Validation Error**
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "latitude is required"
}
```

3. **403 - Security Violation**
```json
{
  "success": false,
  "error": "Security violation",
  "message": "Clock-in blocked due to security violation",
  "suspiciousScore": 85,
  "violations": ["location_mismatch", "device_tampering"]
}
```

4. **503 - Service Unavailable**
```json
{
  "success": false,
  "error": "Backend API is unavailable",
  "message": "Backend API is unavailable. Please try again later."
}
```

---

## 🧪 Testing

### Test Clock-In

```bash
# Using curl
curl -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/clock-in" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: upcapto" \
  -F "latitude=19.0760" \
  -F "longitude=72.8777" \
  -F "notes=Test clock-in" \
  -F "selfie=@/path/to/selfie.jpg"
```

### Test Get Attendance

```bash
curl -X GET "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance?date=2026-02-16" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "x-tenant-id: upcapto"
```

---

## 📝 Important Notes

1. **Selfie is Optional**: Clock-in/out works without selfie, but selfie is recommended for verification
2. **GPS is Required**: Latitude and longitude are mandatory
3. **Store Assignment**: Employee must be assigned to a store in HR system
4. **Multi-tenant**: Always include `x-tenant-id` header
5. **FormData**: Use `FormData` for clock-in/out (not JSON) to support file upload
6. **Content-Type**: Don't set `Content-Type` header when using FormData - browser sets it automatically with boundary

---

## 🚀 Quick Start Checklist

- [ ] Get access token from login API
- [ ] Ensure employee is assigned to a store
- [ ] Request GPS permissions
- [ ] Capture selfie (optional)
- [ ] Call clock-in API with FormData
- [ ] Handle success/error responses
- [ ] Display attendance records

---

**Last Updated**: 2026-02-16  
**API Version**: 1.0  
**Status**: ✅ Production Ready
