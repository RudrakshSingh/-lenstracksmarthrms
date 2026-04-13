# Attendance Service - Complete API Reference

## 🚀 Base URL
```
http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

## 📋 Available Endpoints

### Public Endpoints (No Auth Required)

#### 1. Health Check
```
GET /api/attendance/health
```

**Response:**
```json
{
  "service": "attendance-service",
  "status": "healthy",
  "timestamp": "2026-02-15T13:50:38.755Z",
  "businessLogic": "active"
}
```

#### 2. Status Check
```
GET /api/attendance/status
```

**Response:**
```json
{
  "service": "attendance-service",
  "status": "operational",
  "timestamp": "2026-02-15T13:50:38.811Z",
  "businessLogic": "active"
}
```

---

### Employee Endpoints (Auth Required - All Active Employees)

#### 3. Clock In
```
POST /api/attendance/clock-in
POST /api/attendance/check-in  (Alias)
```

**Headers:**
```
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
Content-Type: application/json
```

**Body:**
```json
{
  "latitude": 19.0760,
  "longitude": 72.8777,
  "notes": "Optional notes",
  "accuracy": 10.5,
  "altitude": 0,
  "heading": 0,
  "speed": 0,
  "timestamp": 1705312800000
}
```

**Optional Fields:**
- `deviceSecurity`: Device security info
- `appState`: App state info
- `networkLocation`: Network location data
- `ipLocation`: IP-based location
- `satelliteInfo`: GPS satellite info
- `selfie`: File upload (multipart/form-data) - Optional

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "employeeId": "...",
    "clockIn": "2026-02-15T13:50:45.571Z",
    "clockOut": null,
    "status": "checked-in",
    "location": {
      "latitude": 19.0760,
      "longitude": 72.8777
    },
    "selfieUrl": "https://...",
    "notes": "Optional notes"
  },
  "message": "Clock-in successful"
}
```

#### 4. Clock Out
```
POST /api/attendance/clock-out
POST /api/attendance/check-out  (Alias)
```

**Headers:**
```
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
Content-Type: application/json
```

**Body:**
```json
{
  "latitude": 19.0760,
  "longitude": 72.8777,
  "notes": "Optional notes",
  "accuracy": 10.5,
  "altitude": 0,
  "heading": 0,
  "speed": 0,
  "timestamp": 1705312800000
}
```

**Optional Fields:**
- `deviceSecurity`: Device security info
- `appState`: App state info
- `networkLocation`: Network location data
- `ipLocation`: IP-based location
- `satelliteInfo`: GPS satellite info
- `selfie`: File upload (multipart/form-data) - Optional

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "employeeId": "...",
    "clockIn": "2026-02-15T09:00:00.000Z",
    "clockOut": "2026-02-15T18:00:00.000Z",
    "status": "checked-out",
    "duration": 32400,
    "location": {
      "latitude": 19.0760,
      "longitude": 72.8777
    },
    "selfieUrl": "https://...",
    "notes": "Optional notes"
  },
  "message": "Clock-out successful"
}
```

#### 5. Get Attendance History (Own Records)
```
GET /api/attendance/history
```

**Headers:**
```
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
```

**Query Parameters:**
- `startDate` (optional): Start date (ISO format)
- `endDate` (optional): End date (ISO format)
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 10, max: 100): Records per page

**Example:**
```
GET /api/attendance/history?startDate=2024-01-01&endDate=2024-12-31&page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "employeeId": "...",
      "clockIn": "2026-02-15T09:00:00.000Z",
      "clockOut": "2026-02-15T18:00:00.000Z",
      "status": "checked-out",
      "duration": 32400,
      "location": {
        "latitude": 19.0760,
        "longitude": 72.8777
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 100,
    "itemsPerPage": 10
  }
}
```

#### 6. Track Location (Geofence)
```
POST /api/attendance/track-location
```

**Headers:**
```
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
Content-Type: application/json
```

**Body:**
```json
{
  "latitude": 19.0760,
  "longitude": 72.8777
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "location": {
      "latitude": 19.0760,
      "longitude": 72.8777
    },
    "withinGeofence": true,
    "distance": 0.5
  }
}
```

---

### HR/Admin Endpoints (Auth + Permissions Required)

**Required Permissions:**
- `attendance:read` - For viewing records
- `attendance:create` - For marking attendance

**Required Roles:**
- `HR`, `Admin`, `SuperAdmin`, `Manager`

#### 7. Get All Attendance Records
```
GET /api/attendance
```

**Headers:**
```
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
```

**Query Parameters:**
- `employeeId` (optional): Filter by employee ID
- `startDate` (optional): Start date
- `endDate` (optional): End date
- `status` (optional): Filter by status
- `page` (optional): Page number
- `limit` (optional): Records per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "employeeId": "...",
      "employeeName": "John Doe",
      "clockIn": "2026-02-15T09:00:00.000Z",
      "clockOut": "2026-02-15T18:00:00.000Z",
      "status": "checked-out",
      "duration": 32400
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 100
  }
}
```

#### 8. Mark Attendance (Manual Entry)
```
POST /api/attendance
```

**Headers:**
```
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
Content-Type: application/json
```

**Body:**
```json
{
  "employeeId": "EMP001",
  "date": "2026-02-15",
  "clockIn": "2026-02-15T09:00:00.000Z",
  "clockOut": "2026-02-15T18:00:00.000Z",
  "status": "present",
  "notes": "Manual entry"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "employeeId": "EMP001",
    "clockIn": "2026-02-15T09:00:00.000Z",
    "clockOut": "2026-02-15T18:00:00.000Z",
    "status": "present"
  },
  "message": "Attendance marked successfully"
}
```

#### 9. Get Attendance Summary
```
GET /api/attendance/summary
```

**Headers:**
```
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
```

**Query Parameters (Required):**
- `startDate`: Start date (ISO format)
- `endDate`: End date (ISO format)

**Example:**
```
GET /api/attendance/summary?startDate=2024-01-01&endDate=2024-12-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalDays": 365,
    "presentDays": 250,
    "absentDays": 50,
    "leaveDays": 30,
    "lateArrivals": 20,
    "earlyDepartures": 10,
    "averageHours": 8.5,
    "totalHours": 2125
  }
}
```

#### 10. Get Attendance Statistics
```
GET /api/attendance/stats
```

**Headers:**
```
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
```

**Query Parameters (Optional):**
- `employeeId`: Filter by employee
- `startDate`: Start date
- `endDate`: End date
- `department`: Filter by department

**Response:**
```json
{
  "success": true,
  "data": {
    "totalEmployees": 100,
    "checkedIn": 85,
    "checkedOut": 10,
    "absent": 5,
    "onLeave": 0,
    "lateArrivals": 5,
    "earlyDepartures": 2,
    "averageCheckInTime": "09:15:00",
    "averageCheckOutTime": "18:30:00"
  }
}
```

#### 11. Get Attendance Reports
```
GET /api/attendance/reports
```

**Headers:**
```
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
```

**Query Parameters (Optional):**
- `type`: Report type (daily, weekly, monthly, yearly)
- `startDate`: Start date
- `endDate`: End date
- `employeeId`: Filter by employee
- `department`: Filter by department
- `format`: Export format (json, csv, pdf)

**Example:**
```
GET /api/attendance/reports?type=monthly&startDate=2024-01-01&endDate=2024-01-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reportType": "monthly",
    "period": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    },
    "summary": {
      "totalEmployees": 100,
      "totalDays": 31,
      "presentDays": 2500,
      "absentDays": 100,
      "leaveDays": 200
    },
    "employees": [
      {
        "employeeId": "EMP001",
        "employeeName": "John Doe",
        "presentDays": 25,
        "absentDays": 1,
        "leaveDays": 5,
        "lateArrivals": 2
      }
    ]
  }
}
```

#### 12. Get Daily Attendance Timeline
```
GET /api/attendance/daily-timeline
```

**Headers:**
```
Authorization: Bearer <token>
x-tenant-id: <tenant_id>
```

**Query Parameters (Optional):**
- `date`: Date (default: today, ISO format)
- `department`: Filter by department

**Example:**
```
GET /api/attendance/daily-timeline?date=2026-02-15
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2026-02-15",
    "timeline": [
      {
        "time": "09:00:00",
        "employeeId": "EMP001",
        "employeeName": "John Doe",
        "action": "clock-in",
        "location": {
          "latitude": 19.0760,
          "longitude": 72.8777
        }
      },
      {
        "time": "18:00:00",
        "employeeId": "EMP001",
        "employeeName": "John Doe",
        "action": "clock-out",
        "location": {
          "latitude": 19.0760,
          "longitude": 72.8777
        }
      }
    ],
    "summary": {
      "totalCheckIns": 85,
      "totalCheckOuts": 10,
      "pendingCheckOuts": 75
    }
  }
}
```

---

## 🔐 Authentication

All protected endpoints require:
```javascript
headers: {
  'Authorization': `Bearer ${token}`,
  'x-tenant-id': tenantId
}
```

---

## 📊 Status Values

- `checked-in` - Employee has clocked in
- `checked-out` - Employee has clocked out
- `present` - Marked as present (manual)
- `absent` - Marked as absent
- `on-leave` - On leave
- `late` - Late arrival
- `early` - Early departure

---

## 💻 Frontend Implementation Examples

### React/TypeScript Example

```typescript
// attendance.ts
const API_BASE = 'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';

export const clockIn = async (
  token: string,
  tenantId: string,
  data: {
    latitude: number;
    longitude: number;
    notes?: string;
    selfie?: File;
  }
) => {
  const formData = new FormData();
  formData.append('latitude', data.latitude.toString());
  formData.append('longitude', data.longitude.toString());
  if (data.notes) formData.append('notes', data.notes);
  if (data.selfie) formData.append('selfie', data.selfie);

  const response = await fetch(`${API_BASE}/api/attendance/clock-in`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
    },
    body: formData
  });
  return await response.json();
};

export const clockOut = async (
  token: string,
  tenantId: string,
  data: {
    latitude: number;
    longitude: number;
    notes?: string;
    selfie?: File;
  }
) => {
  const formData = new FormData();
  formData.append('latitude', data.latitude.toString());
  formData.append('longitude', data.longitude.toString());
  if (data.notes) formData.append('notes', data.notes);
  if (data.selfie) formData.append('selfie', data.selfie);

  const response = await fetch(`${API_BASE}/api/attendance/clock-out`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
    },
    body: formData
  });
  return await response.json();
};

export const getAttendanceHistory = async (
  token: string,
  tenantId: string,
  params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }
) => {
  const queryParams = new URLSearchParams();
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const response = await fetch(
    `${API_BASE}/api/attendance/history?${queryParams.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId
      }
    }
  );
  return await response.json();
};

export const getAttendanceStats = async (
  token: string,
  tenantId: string
) => {
  const response = await fetch(`${API_BASE}/api/attendance/stats`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
    }
  });
  return await response.json();
};

export const getDailyTimeline = async (
  token: string,
  tenantId: string,
  date?: string
) => {
  const queryParams = date ? `?date=${date}` : '';
  const response = await fetch(
    `${API_BASE}/api/attendance/daily-timeline${queryParams}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId
      }
    }
  );
  return await response.json();
};
```

### Usage in Component

```typescript
import { useState, useEffect } from 'react';
import { clockIn, clockOut, getAttendanceHistory } from './attendance';

export default function AttendanceComponent() {
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    // Get current location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      }
    );

    // Load attendance history
    const token = localStorage.getItem('token');
    const tenantId = localStorage.getItem('tenantId');
    if (token && tenantId) {
      getAttendanceHistory(token, tenantId, {
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      }).then(response => {
        if (response.success) {
          setHistory(response.data);
        }
      });
    }
  }, []);

  const handleClockIn = async () => {
    if (!location) {
      alert('Location not available');
      return;
    }

    const token = localStorage.getItem('token');
    const tenantId = localStorage.getItem('tenantId');
    
    const result = await clockIn(token, tenantId, {
      latitude: location.lat,
      longitude: location.lng,
      notes: 'Clock in from mobile app'
    });

    if (result.success) {
      alert('Clock in successful!');
    } else {
      alert('Clock in failed: ' + result.message);
    }
  };

  const handleClockOut = async () => {
    if (!location) {
      alert('Location not available');
      return;
    }

    const token = localStorage.getItem('token');
    const tenantId = localStorage.getItem('tenantId');
    
    const result = await clockOut(token, tenantId, {
      latitude: location.lat,
      longitude: location.lng,
      notes: 'Clock out from mobile app'
    });

    if (result.success) {
      alert('Clock out successful!');
    } else {
      alert('Clock out failed: ' + result.message);
    }
  };

  return (
    <div>
      <h1>Attendance</h1>
      <button onClick={handleClockIn}>Clock In</button>
      <button onClick={handleClockOut}>Clock Out</button>
      
      <h2>History</h2>
      {history.map(record => (
        <div key={record.id}>
          <p>Date: {new Date(record.clockIn).toLocaleDateString()}</p>
          <p>In: {new Date(record.clockIn).toLocaleTimeString()}</p>
          {record.clockOut && (
            <p>Out: {new Date(record.clockOut).toLocaleTimeString()}</p>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## ✅ Available Features

- ✅ Clock In/Out with location tracking
- ✅ Selfie upload (optional)
- ✅ Geofence validation
- ✅ Security checks (location validation, device security)
- ✅ Attendance history (own records)
- ✅ Attendance summary and statistics
- ✅ Attendance reports (daily, weekly, monthly, yearly)
- ✅ Daily timeline for HR dashboard
- ✅ Manual attendance marking (HR/Admin)
- ✅ Multi-tenant support

---

## 🧪 Quick Test Commands

```bash
# 1. Health Check
curl http://API_URL/api/attendance/health

# 2. Clock In
curl -X POST http://API_URL/api/attendance/clock-in \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: upcapto" \
  -H "Content-Type: application/json" \
  -d '{"latitude":19.0760,"longitude":72.8777}'

# 3. Clock Out
curl -X POST http://API_URL/api/attendance/clock-out \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: upcapto" \
  -H "Content-Type: application/json" \
  -d '{"latitude":19.0760,"longitude":72.8777}'

# 4. Get History
curl -X GET "http://API_URL/api/attendance/history?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: upcapto"

# 5. Get Stats (HR/Admin)
curl -X GET http://API_URL/api/attendance/stats \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: upcapto"
```

---

**All Attendance APIs are ready to use!** 🎉
