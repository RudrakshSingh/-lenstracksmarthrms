# Frontend Dashboard - Time Tracking Data Display Guide

## 📋 Overview

Yeh guide explain karta hai ki frontend dashboard par time tracking data kaise display karein aur kaunse APIs use karein.

---

## 🔌 APIs Used for Time Tracking Dashboard

### 1. **Get Time Tracking Entries**
**Main API for displaying time tracking data**

```http
GET /api/hr/time-tracking
GET /api/time-tracking  (alternative endpoint)
```

**Headers:**
```http
Authorization: Bearer <token>
x-tenant-id: <tenantId>
Content-Type: application/json
```

**Query Parameters:**
- `employeeId` (optional): Specific employee ke liye filter
- `date` (optional): Specific date ke liye filter (format: `YYYY-MM-DD`)
- `status` (optional): Filter by status (`Active`, `Completed`, `Paused`)
- `page` (optional): Pagination page number
- `limit` (optional): Items per page

**Example Request:**
```javascript
// Today's time tracking
const response = await fetch(
  `${API_BASE}/api/hr/time-tracking?date=2026-03-05&limit=10`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json'
    }
  }
);
```

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "id": "69a9373e7f3054713f9fb881",
      "employeeId": "EMP-344708",
      "employeeName": "Ravi",
      "startTime": "2026-03-05T07:57:11.375Z",
      "endTime": "2026-03-05T07:57:19.089Z",
      "duration": 0.1,  // hours (with 1 decimal)
      "status": "Completed",
      "project": null,
      "description": "Task description",
      "createdAt": "2026-03-05T07:57:11.375Z",
      "updatedAt": "2026-03-05T07:57:19.089Z"
    }
  ],
  "message": "Time tracking entries retrieved successfully",
  "total": 1,
  "page": 1,
  "limit": 10
}
```

---

### 2. **Get Today's Attendance (with Time)**
**Attendance data with clock in/out times**

```http
GET /api/attendance/today
```

**Headers:**
```http
Authorization: Bearer <token>
x-tenant-id: <tenantId>
```

**Example Request:**
```javascript
const response = await fetch(
  `${API_BASE}/api/attendance/today`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
    }
  }
);
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "check_in_time": "2026-03-05T07:57:11.375Z",
    "check_out_time": "2026-03-05T07:57:19.089Z",
    "status": "present",
    "isClockedIn": false,
    "store_code": "WH001",
    "store": {
      "name": "Main Warehouse"
    }
  }
}
```

---

### 3. **Get Attendance History**
**Historical attendance records with times**

```http
GET /api/attendance/history
```

**Query Parameters:**
- `limit` (optional): Number of records
- `page` (optional): Page number
- `startDate` (optional): Start date filter
- `endDate` (optional): End date filter

**Example Request:**
```javascript
const response = await fetch(
  `${API_BASE}/api/attendance/history?limit=10`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
    }
  }
);
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "attendances": [
      {
        "date": "2026-03-05T07:57:11.375Z",
        "check_in_time": "2026-03-05T07:57:11.375Z",
        "check_out_time": "2026-03-05T07:57:19.089Z",
        "store_code": "WH001",
        "status": "present",
        "geofence_status": "valid"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1,
      "itemsPerPage": 10
    }
  }
}
```

---

### 4. **Get Dashboard Data (Unified)**
**Complete dashboard with attendance widget**

```http
GET /api/hr/dashboard
```

**Example Request:**
```javascript
const response = await fetch(
  `${API_BASE}/api/hr/dashboard`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
    }
  }
);
```

**Response Format (Employee View):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "EMP-344708",
      "name": "Ravi",
      "role": "employee",
      "department": "Tagging",
      "store": null,
      "lastLogin": "2026-03-05T07:55:47.402Z"
    },
    "widgets": {
      "attendance": {
        "today": {
          "status": "present",
          "checkIn": "2026-03-05T07:57:11.375Z",
          "checkOut": "2026-03-05T07:57:19.089Z"
        },
        "weekly": {
          "present": 1,
          "total": 5
        }
      }
    }
  }
}
```

**Response Format (Admin/HR View):**
```json
{
  "success": true,
  "data": {
    "widgets": {
      "attendance": {
        "overall": {
          "totalEmployees": 71,
          "presentToday": 7,
          "absentToday": 64,
          "lateArrivals": 0,
          "onLeave": 0,
          "attendanceRate": 9.86,
          "averageHours": 0
        },
        "type": "admin_view"
      }
    }
  }
}
```

---

### 5. **Get Time Tracking Statistics**
**Summary statistics for time tracking**

```http
GET /api/hr/time-tracking/stats
GET /api/time-tracking/stats
```

**Query Parameters:**
- `employeeId` (optional): Specific employee
- `startDate` (optional): Start date for period
- `endDate` (optional): End date for period

**Example Request:**
```javascript
const response = await fetch(
  `${API_BASE}/api/hr/time-tracking/stats?startDate=2026-03-01&endDate=2026-03-05`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
    }
  }
);
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "totalHours": 8.5,
    "totalEntries": 5,
    "avgSessionDuration": 1.7,
    "period": "2026-03-01 to 2026-03-05"
  }
}
```

---

### 6. **Get Timesheets**
**Timesheet data for date range**

```http
GET /api/hr/time-tracking/timesheets
```

**Query Parameters:**
- `startDate` (optional): Start date
- `endDate` (optional): End date
- `employeeId` (optional): Specific employee

**Example Request:**
```javascript
const response = await fetch(
  `${API_BASE}/api/hr/time-tracking/timesheets?startDate=2026-03-01&endDate=2026-03-05`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
    }
  }
);
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "timesheets": [],
    "startDate": "2026-02-04T00:00:00.000Z",
    "endDate": "2026-03-05T00:00:00.000Z",
    "total": 0
  }
}
```

---

## 🎨 Frontend Implementation Examples

### React/Next.js Example

```typescript
// hooks/useTimeTracking.ts
import { useState, useEffect } from 'react';

interface TimeTrackingEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  startTime: string;
  endTime: string | null;
  duration: number; // hours
  status: 'Active' | 'Completed' | 'Paused';
  project: string | null;
  description: string | null;
}

export const useTimeTracking = (date?: string) => {
  const [data, setData] = useState<TimeTrackingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimeTracking = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        const tenantId = localStorage.getItem('tenantId');
        
        const url = date 
          ? `${API_BASE}/api/hr/time-tracking?date=${date}`
          : `${API_BASE}/api/hr/time-tracking`;
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenantId || '',
            'Content-Type': 'application/json'
          }
        });

        const result = await response.json();
        
        if (result.success) {
          setData(result.data || []);
        } else {
          setError(result.message || 'Failed to fetch time tracking');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchTimeTracking();
  }, [date]);

  return { data, loading, error };
};
```

### Dashboard Component Example

```tsx
// components/TimeTrackingDashboard.tsx
import React from 'react';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { format, parseISO } from 'date-fns';

export const TimeTrackingDashboard: React.FC = () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data, loading, error } = useTimeTracking(today);

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(parseISO(dateString), 'HH:mm:ss');
  };

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="time-tracking-dashboard">
      <h2>Time Tracking - Today</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Sessions</h3>
          <p>{data.length}</p>
        </div>
        
        <div className="stat-card">
          <h3>Total Hours</h3>
          <p>
            {formatDuration(
              data.reduce((sum, entry) => sum + entry.duration, 0)
            )}
          </p>
        </div>
        
        <div className="stat-card">
          <h3>Active Sessions</h3>
          <p>
            {data.filter(entry => entry.status === 'Active').length}
          </p>
        </div>
      </div>

      <div className="time-tracking-list">
        <h3>Today's Sessions</h3>
        <table>
          <thead>
            <tr>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Duration</th>
              <th>Status</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry) => (
              <tr key={entry.id}>
                <td>{formatTime(entry.startTime)}</td>
                <td>
                  {entry.endTime ? formatTime(entry.endTime) : 'Active'}
                </td>
                <td>{formatDuration(entry.duration)}</td>
                <td>
                  <span className={`status-${entry.status.toLowerCase()}`}>
                    {entry.status}
                  </span>
                </td>
                <td>{entry.description || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

### Attendance Widget Component

```tsx
// components/AttendanceWidget.tsx
import React, { useEffect, useState } from 'react';

interface AttendanceData {
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  isClockedIn: boolean;
  store_code: string | null;
}

export const AttendanceWidget: React.FC = () => {
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const tenantId = localStorage.getItem('tenantId');
        
        const response = await fetch(
          `${API_BASE}/api/attendance/today`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'x-tenant-id': tenantId || ''
            }
          }
        );

        const result = await response.json();
        
        if (result.success && result.data) {
          setAttendance(result.data);
        }
      } catch (err) {
        console.error('Failed to fetch attendance:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
    // Refresh every minute
    const interval = setInterval(fetchAttendance, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '--:--:--';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) return <div>Loading attendance...</div>;

  return (
    <div className="attendance-widget">
      <h3>Today's Attendance</h3>
      
      <div className="attendance-card">
        <div className="status-badge status-{attendance?.status}">
          {attendance?.status || 'Unknown'}
        </div>
        
        <div className="time-display">
          <div className="time-row">
            <span className="label">Clock In:</span>
            <span className="time">{formatTime(attendance?.check_in_time)}</span>
          </div>
          
          <div className="time-row">
            <span className="label">Clock Out:</span>
            <span className="time">
              {attendance?.check_out_time 
                ? formatTime(attendance.check_out_time)
                : attendance?.isClockedIn 
                  ? 'In Progress...' 
                  : '--:--:--'
              }
            </span>
          </div>
        </div>
        
        {attendance?.store_code && (
          <div className="store-info">
            Store: {attendance.store_code}
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## 📊 Data Display Best Practices

### 1. **Time Formatting**
```typescript
// Format ISO date to readable time
const formatTime = (isoString: string | null): string => {
  if (!isoString) return 'N/A';
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

// Format duration (hours to HH:MM)
const formatDuration = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};
```

### 2. **Real-time Updates**
```typescript
// Polling for real-time updates
useEffect(() => {
  const interval = setInterval(() => {
    fetchTimeTracking();
  }, 30000); // Update every 30 seconds
  
  return () => clearInterval(interval);
}, []);
```

### 3. **Error Handling**
```typescript
try {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  // Handle data
} catch (error) {
  console.error('API Error:', error);
  // Show user-friendly error message
}
```

---

## 🔑 Key Points

1. **API Base URL:**
   ```
   http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api
   ```

2. **Required Headers:**
   - `Authorization: Bearer <token>`
   - `x-tenant-id: <tenantId>`

3. **Time Format:**
   - All times are in ISO 8601 format (UTC)
   - Frontend me local timezone me convert karein

4. **Duration:**
   - Time tracking duration hours me hai (decimal)
   - Example: `0.1` = 6 minutes, `1.5` = 1 hour 30 minutes

5. **Status Values:**
   - `Active`: Currently tracking
   - `Completed`: Session finished
   - `Paused`: Temporarily paused

---

## 📝 Summary

**Main APIs for Time Tracking Dashboard:**

1. ✅ `GET /api/hr/time-tracking` - Time tracking entries
2. ✅ `GET /api/attendance/today` - Today's attendance with times
3. ✅ `GET /api/attendance/history` - Historical attendance
4. ✅ `GET /api/hr/dashboard` - Unified dashboard data
5. ✅ `GET /api/hr/time-tracking/stats` - Statistics
6. ✅ `GET /api/hr/time-tracking/timesheets` - Timesheets

**Frontend me display karte waqt:**
- Time format properly karein (HH:mm:ss)
- Duration ko readable format me show karein
- Real-time updates ke liye polling use karein
- Error handling implement karein
- Loading states show karein

---

**Last Updated:** 2026-03-05
