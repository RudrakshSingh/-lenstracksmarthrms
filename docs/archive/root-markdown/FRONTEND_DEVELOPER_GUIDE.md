# Frontend Developer Guide - HRMS APIs

## Table of Contents
1. [Authentication](#authentication)
2. [Attendance APIs](#attendance-apis)
3. [Roster APIs](#roster-apis)
4. [Error Handling](#error-handling)
5. [Best Practices](#best-practices)
6. [Code Examples](#code-examples)

---

## Authentication

### Base URL
```
Production: http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

### Login
```javascript
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here",
    "user": {
      "_id": "user_id",
      "email": "user@example.com",
      "employee_id": "EMP-2026-969954",
      "role": "employee",
      "tenantId": "default"
    }
  }
}
```

### Required Headers
All authenticated requests must include:
```javascript
{
  "Authorization": "Bearer <accessToken>",
  "X-Tenant-Id": "<tenantId>",  // Usually "default"
  "Content-Type": "application/json"
}
```

---

## Attendance APIs

### 1. Clock In

**Endpoint:** `POST /api/attendance/clock-in`

**Description:** Records employee clock-in with GPS location and optional selfie.

**Request:**
```javascript
// With selfie (multipart/form-data)
const formData = new FormData();
formData.append('latitude', 28.6139);
formData.append('longitude', 77.209);
formData.append('notes', 'Clock in from office');
formData.append('selfie', file); // Optional: File object

// Without selfie (application/json)
{
  "latitude": 28.6139,
  "longitude": 77.209,
  "notes": "Clock in from office"
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "_id": "attendance_id",
    "employee_id": "EMP-2026-969954",
    "employeeName": "John Doe",
    "date": "2026-02-24T00:00:00.000Z",
    "check_in_time": "2026-02-24T08:30:00.000Z",
    "check_in_location": {
      "latitude": 28.6139,
      "longitude": 77.209,
      "address": "Clock in from office"
    },
    "check_in_selfie": {
      "secure_url": "https://s3.amazonaws.com/...",
      "url": "https://s3.amazonaws.com/...",
      "public_id": "selfie_1234567890"
    },
    "status": "present",
    "geofence_status": "valid"
  },
  "message": "Clock-in recorded successfully"
}
```

**Error Responses:**
```javascript
// Already clocked in
{
  "success": false,
  "error": "Please clock out from your current session before clocking in again",
  "message": "Bad Request"
}

// Missing required fields
{
  "success": false,
  "error": "Validation failed",
  "message": "latitude and longitude are required"
}
```

**Important Notes:**
- ✅ **Multiple clock-ins per day are supported** (after clock-out)
- ✅ Performance optimized (< 2 seconds)
- ✅ Selfie is optional
- ⚠️ If employee is already clocked in, they must clock out first

---

### 2. Clock Out

**Endpoint:** `POST /api/attendance/clock-out`

**Description:** Records employee clock-out with GPS location and optional selfie.

**Request:**
```javascript
// With selfie (multipart/form-data)
const formData = new FormData();
formData.append('latitude', 28.6139);
formData.append('longitude', 77.209);
formData.append('notes', 'Clock out from office');
formData.append('selfie', file); // Optional: File object

// Without selfie (application/json)
{
  "latitude": 28.6139,
  "longitude": 77.209,
  "notes": "Clock out from office"
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "_id": "attendance_id",
    "employee_id": "EMP-2026-969954",
    "employeeName": "John Doe",
    "check_in_time": "2026-02-24T08:30:00.000Z",
    "check_out_time": "2026-02-24T18:00:00.000Z",
    "total_hours": 9.5,
    "status": "present"
  },
  "message": "Clock-out recorded successfully"
}
```

**Error Responses:**
```javascript
// No open clock-in session
{
  "success": false,
  "error": "No open clock-in session found.",
  "message": "Bad Request"
}
```

---

### 3. Get Today's Attendance

**Endpoint:** `GET /api/attendance/today`

**Description:** Get today's attendance record for the current employee.

**Query Parameters:**
- `employeeId` (optional): For admin/HR to query specific employee
- `date` (optional): Date in ISO format (defaults to today)

**Request:**
```javascript
GET /api/attendance/today?employeeId=EMP-2026-969954&date=2026-02-24
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "id": "attendance_id",
    "employeeId": "EMP-2026-969954",
    "employeeName": "John Doe",
    "date": "2026-02-24",
    "checkIn": {
      "time": "2026-02-24T08:30:00.000Z",
      "location": {
        "latitude": 28.6139,
        "longitude": 77.209,
        "address": "Office location"
      },
      "selfie": "https://s3.amazonaws.com/..." // or null if no selfie
    },
    "checkOut": {
      "time": "2026-02-24T18:00:00.000Z",
      "location": {
        "latitude": 28.6139,
        "longitude": 77.209,
        "address": "Office location"
      },
      "selfie": "https://s3.amazonaws.com/..." // or null if no selfie
    },
    "totalHours": 9.5,
    "status": "present"
  },
  "message": "Today's attendance retrieved successfully"
}
```

**No Attendance Response:**
```javascript
{
  "success": true,
  "data": null,
  "message": "No attendance for today"
}
```

**Important Notes:**
- Use this endpoint to check if employee is currently clocked in
- If `checkOut` is `null`, employee is still clocked in
- If both `checkIn` and `checkOut` are present, employee has completed the session

---

### 4. Get Attendance History

**Endpoint:** `GET /api/attendance`

**Description:** Get attendance records with pagination and filters.

**Query Parameters:**
- `employeeId` (optional): Filter by employee ID
- `startDate` (optional): Start date (ISO format)
- `endDate` (optional): End date (ISO format)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)

**Request:**
```javascript
GET /api/attendance?employeeId=EMP-2026-969954&startDate=2026-02-01&endDate=2026-02-28&page=1&limit=20
```

**Response:**
```javascript
{
  "success": true,
  "data": [
    {
      "id": "attendance_id",
      "employeeId": "EMP-2026-969954",
      "employeeName": "John Doe",
      "date": "2026-02-24",
      "checkIn": {
        "time": "2026-02-24T08:30:00.000Z",
        "location": { ... },
        "selfie": "https://..."
      },
      "checkOut": {
        "time": "2026-02-24T18:00:00.000Z",
        "location": { ... },
        "selfie": "https://..."
      },
      "totalHours": 9.5,
      "status": "present"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

---

## Roster APIs

### Base Route
**⚠️ Important:** Use `/api/hr/roster` (not `/api/roster`) - see [Known Issues](#known-issues)

### 1. Get Roster Entries

**Endpoint:** `GET /api/hr/roster`

**Description:** Get roster entries with filters and pagination.

**Query Parameters:**
- `employeeId` (optional): Filter by employee ID
- `storeId` (optional): Filter by store ID
- `startDate` (optional): Start date (ISO format: YYYY-MM-DD)
- `endDate` (optional): End date (ISO format: YYYY-MM-DD)
- `status` (optional): Filter by status (scheduled, confirmed, cancelled)
- `shift` (optional): Filter by shift (MORNING, AFTERNOON, EVENING, NIGHT)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 100, max: 100)

**Request:**
```javascript
GET /api/hr/roster?startDate=2026-02-24&endDate=2026-02-28&employeeId=EMP-2026-969954&page=1&limit=20
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "roster_id",
        "employeeId": "EMP-2026-969954",
        "employeeName": "John Doe",
        "storeId": "store_id",
        "storeName": "Store Name",
        "date": "2026-02-24",
        "shift": "MORNING",
        "shiftStart": "09:00",
        "shiftEnd": "18:00",
        "status": "scheduled"
      }
    ],
    "roster": [ /* same as data */ ],
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  },
  "message": "Roster entries retrieved successfully"
}
```

---

### 2. Create Roster Entry

**Endpoint:** `POST /api/hr/roster`

**Description:** Create a new roster entry.

**Required Role:** HR, Admin, Manager

**Request:**
```javascript
POST /api/hr/roster
Content-Type: application/json

{
  "employeeId": "EMP-2026-969954",
  "storeId": "store_id",  // or store code string
  "date": "2026-02-24",   // YYYY-MM-DD format
  "shift": "MORNING",     // MORNING, AFTERNOON, EVENING, NIGHT
  "shiftStart": "09:00",  // Optional: HH:mm format
  "shiftEnd": "18:00"     // Optional: HH:mm format
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "id": "roster_id",
    "employeeId": "EMP-2026-969954",
    "employeeName": "John Doe",
    "storeId": "store_id",
    "storeName": "Store Name",
    "date": "2026-02-24",
    "shift": "MORNING",
    "shiftStart": "09:00",
    "shiftEnd": "18:00",
    "status": "scheduled"
  },
  "message": "Roster entry created successfully"
}
```

**Error Responses:**
```javascript
// Missing required fields
{
  "success": false,
  "error": "Validation failed",
  "message": "Missing required fields: employeeId, storeId, date, shift"
}
```

---

### 3. Update Roster Entry

**Endpoint:** `PUT /api/hr/roster/:id`

**Description:** Update an existing roster entry.

**Required Role:** HR, Admin, Manager

**Request:**
```javascript
PUT /api/hr/roster/roster_id
Content-Type: application/json

{
  "shift": "AFTERNOON",
  "shiftStart": "14:00",
  "shiftEnd": "22:00",
  "status": "confirmed"
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "id": "roster_id",
    "employeeId": "EMP-2026-969954",
    "employeeName": "John Doe",
    "storeId": "store_id",
    "storeName": "Store Name",
    "date": "2026-02-24",
    "shift": "AFTERNOON",
    "shiftStart": "14:00",
    "shiftEnd": "22:00",
    "status": "confirmed"
  },
  "message": "Roster entry updated successfully"
}
```

**Note:** You can also pass `id` in the request body for backward compatibility:
```javascript
{
  "id": "roster_id",
  "shift": "AFTERNOON",
  ...
}
```

---

### 4. Delete Roster Entry

**Endpoint:** `DELETE /api/hr/roster/:id`

**Description:** Delete a roster entry.

**Required Role:** HR, Admin, Manager

**Request:**
```javascript
DELETE /api/hr/roster/roster_id
```

**Response:**
```javascript
{
  "success": true,
  "message": "Roster entry deleted successfully"
}
```

**Note:** You can also pass `id` as query parameter for backward compatibility:
```
DELETE /api/hr/roster?id=roster_id
```

---

### 5. Get Roster Settings

**Endpoint:** `GET /api/hr/roster/settings`

**Description:** Get roster settings for stores.

**Query Parameters:**
- `storeId` (optional): Filter by store ID or store code

**Request:**
```javascript
GET /api/hr/roster/settings?storeId=store_id
```

**Response:**
```javascript
{
  "success": true,
  "data": [
    {
      "_id": "settings_id",
      "storeId": "store_id",
      "store": {
        "_id": "store_id",
        "name": "Store Name",
        "code": "STORE-001"
      },
      "minimumRequired": 5,
      "maximumAllowed": 10,
      "createdAt": "2026-02-24T00:00:00.000Z",
      "updatedAt": "2026-02-24T00:00:00.000Z"
    }
  ],
  "message": "Roster settings retrieved successfully"
}
```

---

### 6. Create/Update Roster Settings

**Endpoint:** `POST /api/hr/roster/settings`

**Description:** Create or update roster settings for a store.

**Required Role:** HR, Admin, Manager

**Request:**
```javascript
POST /api/hr/roster/settings
Content-Type: application/json

{
  "storeId": "store_id",  // or store code string
  "minimumRequired": 5,   // Must be >= 1
  "maximumAllowed": 10
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "_id": "settings_id",
    "storeId": "store_id",
    "minimumRequired": 5,
    "maximumAllowed": 10
  },
  "message": "Roster settings saved successfully"
}
```

**Error Responses:**
```javascript
// Missing storeId
{
  "success": false,
  "error": "Validation failed",
  "message": "storeId is required"
}

// Invalid minimumRequired
{
  "success": false,
  "error": "Validation failed",
  "message": "minimumRequired must be >= 1"
}
```

---

### 7. Update Roster Settings

**Endpoint:** `PUT /api/hr/roster/settings/:storeId`

**Description:** Update roster settings for a specific store.

**Required Role:** HR, Admin, Manager

**Request:**
```javascript
PUT /api/hr/roster/settings/store_id
Content-Type: application/json

{
  "storeId": "store_id",  // or store code string
  "minimumRequired": 6,
  "maximumAllowed": 12
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "_id": "settings_id",
    "storeId": "store_id",
    "minimumRequired": 6,
    "maximumAllowed": 12
  },
  "message": "Roster settings saved successfully"
}
```

---

### 8. Get Weekly Roster

**Endpoint:** `GET /api/hr/roster/weekly`

**Description:** Get weekly roster for a store.

**Query Parameters:**
- `storeId` (required): Store ID or store code
- `weekStartDate` (required): Week start date (ISO format: YYYY-MM-DD)

**Request:**
```javascript
GET /api/hr/roster/weekly?storeId=store_id&weekStartDate=2026-02-24
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "weekStartDate": "2026-02-24",
    "weekEndDate": "2026-03-02",
    "roster": [ /* roster entries */ ]
  },
  "message": "Weekly roster retrieved successfully"
}
```

---

### 9. Get Enhanced Weekly Roster

**Endpoint:** `GET /api/hr/roster/weekly-enhanced`

**Description:** Get enhanced weekly roster with staffing summary.

**Required Role:** HR, Admin, Manager

**Query Parameters:**
- `storeId` (required): Store ID or store code
- `weekStartDate` (required): Week start date (ISO format: YYYY-MM-DD)

**Request:**
```javascript
GET /api/hr/roster/weekly-enhanced?storeId=store_id&weekStartDate=2026-02-24
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "weekStartDate": "2026-02-24",
    "weekEndDate": "2026-03-02",
    "roster": [ /* roster entries */ ],
    "summary": {
      "totalShifts": 35,
      "scheduled": 30,
      "confirmed": 25,
      "cancelled": 5
    }
  },
  "message": "Enhanced weekly roster retrieved successfully"
}
```

---

### 10. Bulk Create Roster

**Endpoint:** `POST /api/hr/roster/bulk`

**Description:** Create multiple roster entries at once.

**Required Role:** HR, Admin, Manager

**Request:**
```javascript
POST /api/hr/roster/bulk
Content-Type: application/json

{
  "entries": [
    {
      "employeeId": "EMP-2026-969954",
      "storeId": "store_id",
      "date": "2026-02-24",
      "shift": "MORNING",
      "shiftStart": "09:00",
      "shiftEnd": "18:00"
    },
    {
      "employeeId": "EMP-2026-969955",
      "storeId": "store_id",
      "date": "2026-02-24",
      "shift": "AFTERNOON",
      "shiftStart": "14:00",
      "shiftEnd": "22:00"
    }
  ]
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "created": 2,
    "failed": 0,
    "entries": [ /* created roster entries */ ]
  },
  "message": "Bulk roster creation completed"
}
```

---

## Error Handling

### Standard Error Response Format
```javascript
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": { /* optional additional details */ }
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error
- `503` - Service Unavailable

### Error Handling Example
```javascript
try {
  const response = await fetch('/api/attendance/clock-in', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      latitude: 28.6139,
      longitude: 77.209,
      notes: 'Clock in'
    })
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      // Handle unauthorized - redirect to login
      redirectToLogin();
    } else if (response.status === 403) {
      // Handle forbidden - show permission error
      showError('You do not have permission to perform this action');
    } else if (response.status === 400) {
      // Handle validation errors
      showError(data.message || 'Validation failed');
    } else {
      // Handle other errors
      showError(data.message || 'An error occurred');
    }
    return;
  }

  if (data.success) {
    // Handle success
    console.log('Clock-in successful:', data.data);
  }
} catch (error) {
  // Handle network errors
  console.error('Network error:', error);
  showError('Network error. Please check your connection.');
}
```

---

## Best Practices

### 1. Always Check Attendance Status Before Clock-in/out
```javascript
// Check current status
const todayAttendance = await fetch('/api/attendance/today', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId
  }
}).then(res => res.json());

if (todayAttendance.data) {
  if (todayAttendance.data.checkOut === null) {
    // Employee is clocked in - show clock-out button
    showClockOutButton();
  } else {
    // Employee has clocked out - show clock-in button
    showClockInButton();
  }
} else {
  // No attendance today - show clock-in button
  showClockInButton();
}
```

### 2. Handle Multiple Clock-ins Per Day
```javascript
// After clock-out, employee can clock in again
async function handleClockOut() {
  const response = await clockOut();
  if (response.success) {
    // After successful clock-out, enable clock-in button
    enableClockInButton();
    showMessage('Clocked out successfully. You can clock in again.');
  }
}
```

### 3. Use Correct Roster API Routes
```javascript
// ✅ CORRECT - Use /api/hr/roster
const roster = await fetch('/api/hr/roster?startDate=2026-02-24&endDate=2026-02-28', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId
  }
});

// ❌ WRONG - Don't use /api/roster (gateway routing issue)
// const roster = await fetch('/api/roster?startDate=2026-02-24&endDate=2026-02-28', ...);
```

### 4. Handle Selfie Upload
```javascript
// Clock-in with selfie
async function clockInWithSelfie(latitude, longitude, selfieFile) {
  const formData = new FormData();
  formData.append('latitude', latitude);
  formData.append('longitude', longitude);
  formData.append('notes', 'Clock in with selfie');
  formData.append('selfie', selfieFile); // File object

  const response = await fetch('/api/attendance/clock-in', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId
      // Don't set Content-Type - browser will set it with boundary
    },
    body: formData
  });

  return response.json();
}
```

### 5. Store ID Handling
```javascript
// Roster APIs accept both ObjectId and store code strings
const storeId = 'store_id'; // MongoDB ObjectId
// OR
const storeId = 'STORE-001'; // Store code string

// Both work:
await fetch(`/api/hr/roster/settings?storeId=${storeId}`, ...);
```

---

## Code Examples

### React Hook for Attendance
```javascript
import { useState, useEffect } from 'react';

function useAttendance(token, tenantId) {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTodayAttendance();
  }, []);

  const fetchTodayAttendance = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/attendance/today', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setAttendance(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to fetch attendance');
    } finally {
      setLoading(false);
    }
  };

  const clockIn = async (latitude, longitude, notes = '', selfie = null) => {
    try {
      const formData = new FormData();
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      formData.append('notes', notes);
      if (selfie) {
        formData.append('selfie', selfie);
      }

      const response = await fetch('/api/attendance/clock-in', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId
        },
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchTodayAttendance(); // Refresh attendance
        return { success: true, data: data.data };
      } else {
        return { success: false, error: data.message };
      }
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  };

  const clockOut = async (latitude, longitude, notes = '', selfie = null) => {
    try {
      const formData = new FormData();
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      formData.append('notes', notes);
      if (selfie) {
        formData.append('selfie', selfie);
      }

      const response = await fetch('/api/attendance/clock-out', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId
        },
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchTodayAttendance(); // Refresh attendance
        return { success: true, data: data.data };
      } else {
        return { success: false, error: data.message };
      }
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  };

  return {
    attendance,
    loading,
    error,
    clockIn,
    clockOut,
    refresh: fetchTodayAttendance,
    isClockedIn: attendance?.checkOut === null && attendance?.checkIn !== null
  };
}

// Usage
function AttendanceComponent() {
  const { attendance, loading, clockIn, clockOut, isClockedIn } = useAttendance(token, tenantId);

  const handleClockIn = async () => {
    navigator.geolocation.getCurrentPosition(async (position) => {
      const result = await clockIn(
        position.coords.latitude,
        position.coords.longitude,
        'Clock in from app'
      );
      
      if (result.success) {
        alert('Clocked in successfully!');
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {isClockedIn ? (
        <button onClick={handleClockOut}>Clock Out</button>
      ) : (
        <button onClick={handleClockIn}>Clock In</button>
      )}
      
      {attendance && (
        <div>
          <p>Check-in: {new Date(attendance.checkIn?.time).toLocaleString()}</p>
          {attendance.checkOut && (
            <p>Check-out: {new Date(attendance.checkOut.time).toLocaleString()}</p>
          )}
        </div>
      )}
    </div>
  );
}
```

### React Hook for Roster
```javascript
import { useState, useEffect } from 'react';

function useRoster(token, tenantId) {
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRoster = async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams({
        page: filters.page || 1,
        limit: filters.limit || 20,
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.employeeId && { employeeId: filters.employeeId }),
        ...(filters.storeId && { storeId: filters.storeId })
      });

      const response = await fetch(`/api/hr/roster?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setRoster(data.data.data || data.data.roster || []);
        return { success: true, pagination: data.data };
      } else {
        setError(data.message);
        return { success: false, error: data.message };
      }
    } catch (err) {
      setError('Failed to fetch roster');
      return { success: false, error: 'Network error' };
    } finally {
      setLoading(false);
    }
  };

  const createRoster = async (rosterData) => {
    try {
      const response = await fetch('/api/hr/roster', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(rosterData)
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchRoster(); // Refresh roster
        return { success: true, data: data.data };
      } else {
        return { success: false, error: data.message };
      }
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  };

  return {
    roster,
    loading,
    error,
    fetchRoster,
    createRoster
  };
}
```

---

## Known Issues

### 1. `/api/roster` Route Not Working
**Issue:** `/api/roster` returns 404 (gateway routing issue)

**Solution:** Use `/api/hr/roster` instead (already working)

**Example:**
```javascript
// ❌ Don't use this
fetch('/api/roster', ...)

// ✅ Use this instead
fetch('/api/hr/roster', ...)
```

---

## Support

For issues or questions:
1. Check API response for error messages
2. Verify authentication token is valid
3. Ensure `X-Tenant-Id` header is set correctly
4. Check network connectivity
5. Review error logs in browser console

---

## Changelog

### 2026-02-24
- ✅ Clock-in performance optimized (< 2 seconds)
- ✅ Multiple clock-ins per day supported (after clock-out)
- ✅ Roster API routes working at `/api/hr/roster`
- ✅ Store ID accepts both ObjectId and store code strings

---

## Additional Resources

- API Base URL: `http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com`
- Authentication: JWT tokens
- Date Format: ISO 8601 (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ)
- Time Format: 24-hour format (HH:mm)
