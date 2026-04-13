# 📱 Frontend Developer Guide - Attendance API

**Last Updated:** March 9, 2026  
**API Base URL:** `http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com`

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Response Format](#response-format)
5. [Error Handling](#error-handling)
6. [Code Examples](#code-examples)
7. [Field Reference](#field-reference)
8. [Best Practices](#best-practices)

---

## 🚀 Quick Start

### Base Configuration

```javascript
const API_BASE_URL = 'http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com';
const TENANT_ID = 'upcapto'; // Get from user context

// Get token from login response
const token = localStorage.getItem('accessToken');
```

### Basic Request Example

```javascript
const response = await fetch(`${API_BASE_URL}/api/attendance?page=1&limit=10`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': TENANT_ID,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

---

## 🔐 Authentication

All attendance endpoints require authentication.

### Required Headers

```javascript
{
  'Authorization': 'Bearer <access_token>',
  'x-tenant-id': '<tenant_id>',
  'Content-Type': 'application/json'
}
```

### Getting Token

```javascript
// Login to get token
const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'employee@example.com',
    password: 'password123'
  })
});

const loginData = await loginResponse.json();
const token = loginData.data.accessToken;
const tenantId = loginData.data.user.tenantId;

// Store for future requests
localStorage.setItem('accessToken', token);
localStorage.setItem('tenantId', tenantId);
```

---

## 📡 API Endpoints

### 1. Get Attendance Records

**GET** `/api/attendance`

Get paginated list of attendance records for the logged-in employee.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number |
| `limit` | number | No | 25 | Records per page (max 100) |
| `startDate` | string | No | - | Filter from date (ISO 8601) |
| `endDate` | string | No | - | Filter to date (ISO 8601) |
| `status` | string | No | - | Filter by status: `present`, `absent`, `on_leave`, `holiday` |

#### Example Request

```javascript
const response = await fetch(
  `${API_BASE_URL}/api/attendance?page=1&limit=10&status=present`,
  {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
    }
  }
);
```

#### Response Format

```json
{
  "success": true,
  "data": [
    {
      "id": "69af14db10ab35dbb27cec5c",
      "employeeId": "EMP-001",
      "employeeName": "John Doe",
      "date": "2026-03-09T00:00:00.000Z",
      "isClockedIn": false,
      "clock_in_time": "2026-03-09T09:00:00.000Z",
      "clockInTime": "2026-03-09T09:00:00.000Z",
      "clock_out_time": "2026-03-09T18:00:00.000Z",
      "clockOutTime": "2026-03-09T18:00:00.000Z",
      "totalHours": 9.0,
      "total_hours": 9.0,
      "hours_worked": 9.0,
      "status": "present",
      "checkIn": {
        "time": "2026-03-09T09:00:00.000Z",
        "location": {
          "latitude": 19.0760,
          "longitude": 72.8777,
          "address": "Mumbai Office"
        },
        "selfie": "https://s3.amazonaws.com/..."
      },
      "checkOut": {
        "time": "2026-03-09T18:00:00.000Z",
        "location": {
          "latitude": 19.0760,
          "longitude": 72.8777,
          "address": "Mumbai Office"
        },
        "selfie": "https://s3.amazonaws.com/..."
      },
      "storeId": "69af12e634c339dbfad0f4f2",
      "storeCode": "STORE-001",
      "remarks": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5,
    "hasNext": true,
    "hasPrev": false
  },
  "message": "Attendance records retrieved successfully"
}
```

---

### 2. Clock In

**POST** `/api/attendance/clock-in`

Record employee clock-in with location and optional selfie.

#### Request Body

```json
{
  "latitude": 19.0760,
  "longitude": 72.8777,
  "notes": "Optional notes",
  "selfie": "data:image/jpeg;base64,/9j/4AAQ..." // Optional base64 image
}
```

#### Required Fields

- `latitude` (number): GPS latitude
- `longitude` (number): GPS longitude

#### Optional Fields

- `notes` (string): Additional notes
- `selfie` (string): Base64 encoded image (data URI format)
- `accuracy` (number): GPS accuracy in meters
- `altitude` (number): GPS altitude
- `heading` (number): GPS heading
- `speed` (number): GPS speed

#### Example Request

```javascript
const response = await fetch(`${API_BASE_URL}/api/attendance/clock-in`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': tenantId,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    latitude: 19.0760,
    longitude: 72.8777,
    notes: 'Clock in from office',
    selfie: base64Image // Optional
  })
});
```

#### Response Format

```json
{
  "success": true,
  "data": {
    "id": "69af14db10ab35dbb27cec5c",
    "employeeId": "EMP-001",
    "employeeName": "John Doe",
    "date": "2026-03-09T00:00:00.000Z",
    "isClockedIn": true,
    "clock_in_time": "2026-03-09T09:00:00.000Z",
    "clockInTime": "2026-03-09T09:00:00.000Z",
    "checkIn": {
      "time": "2026-03-09T09:00:00.000Z",
      "location": {
        "latitude": 19.0760,
        "longitude": 72.8777,
        "address": "Mumbai Office"
      },
      "selfie": "https://s3.amazonaws.com/..."
    },
    "status": "present",
    "storeId": "69af12e634c339dbfad0f4f2",
    "storeCode": "STORE-001"
  },
  "message": "Clocked in successfully"
}
```

#### Error Responses

**400 - Already Clocked In**
```json
{
  "success": false,
  "error": "ALREADY_CLOCKED_IN",
  "message": "Employee is already clocked in for today"
}
```

**403 - Security Violation**
```json
{
  "success": false,
  "error": "SECURITY_VIOLATION",
  "message": "Clock-in blocked due to security violation",
  "suspiciousScore": 85,
  "violations": ["Location mismatch", "Device tampering detected"]
}
```

---

### 3. Clock Out

**POST** `/api/attendance/clock-out`

Record employee clock-out with location and optional selfie.

#### Request Body

```json
{
  "latitude": 19.0760,
  "longitude": 72.8777,
  "notes": "Optional notes",
  "selfie": "data:image/jpeg;base64,/9j/4AAQ..." // Optional base64 image
}
```

#### Example Request

```javascript
const response = await fetch(`${API_BASE_URL}/api/attendance/clock-out`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': tenantId,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    latitude: 19.0760,
    longitude: 72.8777,
    notes: 'Clock out from office'
  })
});
```

#### Response Format

```json
{
  "success": true,
  "data": {
    "id": "69af14db10ab35dbb27cec5c",
    "employeeId": "EMP-001",
    "employeeName": "John Doe",
    "date": "2026-03-09T00:00:00.000Z",
    "isClockedIn": false,
    "clock_in_time": "2026-03-09T09:00:00.000Z",
    "clockInTime": "2026-03-09T09:00:00.000Z",
    "clock_out_time": "2026-03-09T18:00:00.000Z",
    "clockOutTime": "2026-03-09T18:00:00.000Z",
    "totalHours": 9.0,
    "total_hours": 9.0,
    "hours_worked": 9.0,
    "checkIn": {
      "time": "2026-03-09T09:00:00.000Z",
      "location": { ... }
    },
    "checkOut": {
      "time": "2026-03-09T18:00:00.000Z",
      "location": { ... }
    },
    "status": "present"
  },
  "message": "Clocked out successfully"
}
```

#### Error Responses

**400 - Not Clocked In**
```json
{
  "success": false,
  "error": "NOT_CLOCKED_IN",
  "message": "Employee is not clocked in. Please clock in first."
}
```

**400 - Insufficient Hours**
```json
{
  "success": false,
  "error": "INSUFFICIENT_HOURS",
  "message": "Total hours 5.5 is less than required 10 hours. Marked as absent."
}
```

---

## 📊 Response Format

### Standard Response Structure

All API responses follow this format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
  pagination?: Pagination;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

### Attendance Record Structure

```typescript
interface AttendanceRecord {
  // Basic Info
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // ISO 8601
  
  // Clock Status
  isClockedIn: boolean;
  
  // Clock Times (Multiple formats for compatibility)
  clock_in_time: string | null;      // ISO 8601
  clockInTime: string | null;        // ISO 8601 (camelCase)
  clock_out_time: string | null;     // ISO 8601
  clockOutTime: string | null;       // ISO 8601 (camelCase)
  
  // Hours Worked (Multiple formats)
  totalHours: number;                // e.g., 9.0
  total_hours: number;               // Same as totalHours
  hours_worked: number;              // Same as totalHours
  
  // Status
  status: 'present' | 'absent' | 'on_leave' | 'holiday';
  
  // Check In Details
  checkIn: {
    time: string;                    // ISO 8601
    location: {
      latitude: number;
      longitude: number;
      address: string | null;
    };
    selfie: string | null;           // S3 URL or null
  } | null;
  
  // Check Out Details
  checkOut: {
    time: string;                    // ISO 8601
    location: {
      latitude: number;
      longitude: number;
      address: string | null;
    };
    selfie: string | null;           // S3 URL or null
  } | null;
  
  // Store Info
  storeId: string;
  storeCode: string;
  
  // Additional
  remarks: string | null;
  isGeofenceValid: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## ⚠️ Error Handling

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Security violation or insufficient permissions |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

### Error Response Format

```json
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message"
}
```

### Common Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| `ALREADY_CLOCKED_IN` | Employee already clocked in today | Check `isClockedIn` before clock in |
| `NOT_CLOCKED_IN` | Employee not clocked in | Clock in first before clock out |
| `INSUFFICIENT_HOURS` | Less than 10 hours worked | Inform user about minimum hours |
| `SECURITY_VIOLATION` | Security check failed | Show security message to user |
| `VALIDATION_ERROR` | Invalid request data | Validate input before sending |
| `UNAUTHORIZED` | Invalid or expired token | Re-login to get new token |
| `SERVICE_UNAVAILABLE` | Service temporarily down | Show retry message, wait 2-3 minutes |

### Error Handling Example

```javascript
async function clockIn(latitude, longitude) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/attendance/clock-in`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ latitude, longitude })
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle specific errors
      if (data.error === 'ALREADY_CLOCKED_IN') {
        throw new Error('You are already clocked in for today');
      } else if (data.error === 'SECURITY_VIOLATION') {
        throw new Error('Clock-in blocked: ' + data.message);
      } else if (response.status === 401) {
        // Token expired, redirect to login
        window.location.href = '/login';
        return;
      } else if (response.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again in a few minutes.');
      } else {
        throw new Error(data.message || 'Clock-in failed');
      }
    }

    return data.data;
  } catch (error) {
    console.error('Clock-in error:', error);
    throw error;
  }
}
```

---

## 💻 Code Examples

### React Hook Example

```javascript
import { useState, useEffect } from 'react';

const API_BASE_URL = 'http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com';

export function useAttendance() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isClockedIn, setIsClockedIn] = useState(false);

  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');

  // Get attendance records
  const fetchAttendance = async (page = 1, limit = 25) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/attendance?page=${page}&limit=${limit}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenantId
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to fetch attendance');
      }

      const data = await response.json();
      setAttendance(data.data);
      
      // Check if currently clocked in
      const todayRecord = data.data.find(record => {
        const recordDate = new Date(record.date).toDateString();
        const today = new Date().toDateString();
        return recordDate === today && record.isClockedIn;
      });
      setIsClockedIn(!!todayRecord);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Clock in
  const clockIn = async (latitude, longitude, selfie = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const body = { latitude, longitude };
      if (selfie) body.selfie = selfie;

      const response = await fetch(`${API_BASE_URL}/api/attendance/clock-in`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'ALREADY_CLOCKED_IN') {
          throw new Error('You are already clocked in');
        }
        throw new Error(data.message || 'Clock-in failed');
      }

      setIsClockedIn(true);
      await fetchAttendance(); // Refresh list
      return data.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Clock out
  const clockOut = async (latitude, longitude, selfie = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const body = { latitude, longitude };
      if (selfie) body.selfie = selfie;

      const response = await fetch(`${API_BASE_URL}/api/attendance/clock-out`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'NOT_CLOCKED_IN') {
          throw new Error('You are not clocked in');
        }
        throw new Error(data.message || 'Clock-out failed');
      }

      setIsClockedIn(false);
      await fetchAttendance(); // Refresh list
      return data.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    attendance,
    loading,
    error,
    isClockedIn,
    fetchAttendance,
    clockIn,
    clockOut
  };
}
```

### Usage in Component

```javascript
import { useAttendance } from './hooks/useAttendance';

function AttendanceComponent() {
  const { attendance, loading, error, isClockedIn, clockIn, clockOut } = useAttendance();

  useEffect(() => {
    fetchAttendance();
  }, []);

  const handleClockIn = async () => {
    try {
      // Get GPS location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      // Optional: Capture selfie
      const selfie = await captureSelfie(); // Your selfie capture function

      await clockIn(
        position.coords.latitude,
        position.coords.longitude,
        selfie
      );

      alert('Clocked in successfully!');
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  const handleClockOut = async () => {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const result = await clockOut(
        position.coords.latitude,
        position.coords.longitude
      );

      alert(`Clocked out! Total hours: ${result.totalHours}`);
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Attendance</h2>
      
      {isClockedIn ? (
        <button onClick={handleClockOut}>Clock Out</button>
      ) : (
        <button onClick={handleClockIn}>Clock In</button>
      )}

      <h3>Recent Records</h3>
      {attendance.map(record => (
        <div key={record.id}>
          <p>Date: {new Date(record.date).toLocaleDateString()}</p>
          <p>Clock In: {record.clock_in_time ? new Date(record.clock_in_time).toLocaleTimeString() : 'N/A'}</p>
          <p>Clock Out: {record.clock_out_time ? new Date(record.clock_out_time).toLocaleTimeString() : 'N/A'}</p>
          <p>Hours: {record.totalHours || 0}</p>
          <p>Status: {record.status}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 📝 Field Reference

### Clock Time Fields

The API provides multiple field names for compatibility. Use any of these:

| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `clock_in_time` | string \| null | ISO 8601 timestamp | `"2026-03-09T09:00:00.000Z"` |
| `clockInTime` | string \| null | Same as above (camelCase) | `"2026-03-09T09:00:00.000Z"` |
| `clock_out_time` | string \| null | ISO 8601 timestamp | `"2026-03-09T18:00:00.000Z"` |
| `clockOutTime` | string \| null | Same as above (camelCase) | `"2026-03-09T18:00:00.000Z"` |
| `checkIn.time` | string \| null | Nested format | `"2026-03-09T09:00:00.000Z"` |
| `checkOut.time` | string \| null | Nested format | `"2026-03-09T18:00:00.000Z"` |

**Recommendation:** Use `clock_in_time` and `clock_out_time` for consistency.

### Hours Fields

| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `totalHours` | number | Hours worked (decimal) | `9.5` |
| `total_hours` | number | Same as above (snake_case) | `9.5` |
| `hours_worked` | number | Same as above (alternative) | `9.5` |

**Recommendation:** Use `totalHours` for consistency.

### Status Values

| Status | Description |
|--------|-------------|
| `present` | Employee worked 10+ hours |
| `absent` | Employee worked less than 10 hours or didn't clock in/out |
| `on_leave` | Employee on leave |
| `holiday` | Public holiday |

---

## ✅ Best Practices

### 1. Always Check `isClockedIn`

```javascript
// Before clock in
if (isClockedIn) {
  alert('You are already clocked in');
  return;
}

// Before clock out
if (!isClockedIn) {
  alert('Please clock in first');
  return;
}
```

### 2. Handle GPS Errors

```javascript
function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      }),
      (error) => {
        if (error.code === 1) {
          reject(new Error('Location permission denied'));
        } else if (error.code === 2) {
          reject(new Error('Location unavailable'));
        } else {
          reject(new Error('Location timeout'));
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  });
}
```

### 3. Handle 503 Errors Gracefully

```javascript
async function clockInWithRetry(latitude, longitude, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/attendance/clock-in`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ latitude, longitude })
      });

      if (response.status === 503) {
        if (i < retries - 1) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
          continue;
        } else {
          throw new Error('Service temporarily unavailable. Please try again in a few minutes.');
        }
      }

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      return data.data;
    } catch (error) {
      if (i === retries - 1) throw error;
    }
  }
}
```

### 4. Format Dates Properly

```javascript
// Parse ISO date
const clockInTime = new Date(record.clock_in_time);

// Format for display
const formattedTime = clockInTime.toLocaleTimeString('en-IN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: true
});

// Format date
const formattedDate = new Date(record.date).toLocaleDateString('en-IN', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});
```

### 5. Handle Empty States

```javascript
if (attendance.length === 0) {
  return (
    <div className="empty-state">
      <p>No attendance records found</p>
      <p>Clock in to start tracking your attendance</p>
    </div>
  );
}
```

### 6. Show Loading States

```javascript
{loading ? (
  <div className="loading">
    <Spinner />
    <p>Processing...</p>
  </div>
) : (
  <AttendanceList records={attendance} />
)}
```

### 7. Validate Minimum Hours

```javascript
// After clock out
if (result.totalHours < 10) {
  alert(`Warning: You worked only ${result.totalHours} hours. Minimum 10 hours required for present status.`);
}
```

---

## 🔗 Related Documentation

- [Frontend Developer Complete Guide](./FRONTEND_DEVELOPER_COMPLETE_GUIDE.md)
- [S3 Image Upload Guide](./FRONTEND_S3_IMAGE_UPLOAD_GUIDE.md)
- [Error Handling Guide](./FRONTEND_ATTENDANCE_API_FIX.md)

---

## 📞 Support

For issues or questions:
1. Check error messages in API responses
2. Verify token and tenant ID are correct
3. Check network connectivity
4. Review this documentation

---

**Last Updated:** March 9, 2026  
**API Version:** 1.0.0
