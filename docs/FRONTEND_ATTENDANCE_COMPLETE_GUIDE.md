# 📱 Frontend Developer Guide: Attendance System

**Complete Guide for Integrating Attendance Features in Frontend Applications**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [API Base URL](#api-base-url)
4. [Authentication](#authentication)
5. [Core APIs](#core-apis)
6. [Dashboard Integration](#dashboard-integration)
7. [Geofence & Location Tracking](#geofence--location-tracking)
8. [10-Hour Rule & Auto Clock-Out](#10-hour-rule--auto-clock-out)
9. [Multiple Sessions & Total Hours](#multiple-sessions--total-hours)
10. [Code Examples](#code-examples)
11. [Error Handling](#error-handling)
12. [Best Practices](#best-practices)

---

## 🎯 Overview

The Attendance System provides comprehensive employee time tracking with advanced features including:

- **Clock In/Out** with location verification
- **Geofence-based tracking** with 10-minute grace period
- **10-hour minimum work rule** with auto clock-out
- **Multiple session support** with total hours aggregation
- **Real-time dashboard** with logout times display
- **HR/Admin views** with detailed attendance records

---

## ✨ Key Features

### 1. **10-Hour Minimum Work Rule**
- Employees must work at least 10 hours to be marked as "present"
- If total hours < 10 hours, status is automatically set to "absent"
- System automatically clocks out employees after 10 hours of work

### 2. **Geofence Grace Period**
- 10-minute grace period when employee goes outside geofence
- Warning notifications during grace period
- Auto-logout if employee remains outside after grace period expires

### 3. **Multiple Sessions**
- Employees can clock in/out multiple times per day
- All sessions are tracked separately
- Total hours are aggregated across all sessions

### 4. **Logout Times Display**
- Check-in and check-out times visible on dashboard
- Logout reasons tracked (manual, auto_geofence, system)
- Session details with duration for each session

---

## 🌐 API Base URL

### Production
```
http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api
```

### Environment Variable
```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 
  'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api';
```

---

## 🔐 Authentication

All attendance APIs require authentication via JWT token.

### Headers Required
```typescript
{
  'Authorization': `Bearer ${accessToken}`,
  'X-Tenant-Id': tenantId,
  'Content-Type': 'application/json'
}
```

### Getting Token
```typescript
// Login endpoint
POST /api/auth/login

// Request
{
  email: 'employee@example.com',
  password: 'password123'
}

// Response
{
  success: true,
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  user: {
    id: '...',
    employeeId: 'EMP-2026-886706',
    tenantId: 'upcapto',
    // ... other user fields
  }
}
```

---

## 📡 Core APIs

### 1. Clock In

**Endpoint:** `POST /api/attendance/clock-in`

**Request:**
```typescript
interface ClockInRequest {
  latitude: number;        // Required: GPS latitude
  longitude: number;       // Required: GPS longitude
  timestamp?: number;      // Optional: Unix timestamp (default: current time)
  notes?: string;          // Optional: Additional notes
  accuracy?: number;       // Optional: GPS accuracy in meters
  selfie?: string;         // Optional: Base64 selfie image
}
```

**Example:**
```typescript
const clockIn = async (location: { lat: number; lng: number }) => {
  const response = await fetch(`${API_BASE}/attendance/clock-in`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      latitude: location.lat,
      longitude: location.lng,
      timestamp: Date.now(),
      notes: 'Clock-in from mobile app'
    })
  });

  const data = await response.json();
  return data;
};
```

**Response:**
```typescript
interface ClockInResponse {
  success: boolean;
  data: {
    id: string;
    employeeId: string;
    employeeName: string;
    date: string;                    // ISO date string
    isClockedIn: boolean;
    checkIn: {
      time: string;                  // ISO timestamp
      location: {
        latitude: number;
        longitude: number;
        address: string;
      };
      selfie: string | null;
    };
    status: 'present' | 'absent';
    storeId: string;
    storeCode: string;
    createdAt: string;
    updatedAt: string;
  };
  message: string;
}
```

**Error Cases:**
```typescript
// Already clocked in
{
  success: false,
  error: 'Please clock out from your current session before clocking in again',
  code: 'ALREADY_CLOCKED_IN'
}

// Outside geofence
{
  success: false,
  error: 'You are outside the allowed geofence area',
  code: 'GEOFENCE_VIOLATION'
}
```

---

### 2. Clock Out

**Endpoint:** `POST /api/attendance/clock-out`

**Request:**
```typescript
interface ClockOutRequest {
  latitude: number;        // Required: GPS latitude
  longitude: number;       // Required: GPS longitude
  timestamp?: number;      // Optional: Unix timestamp
  notes?: string;          // Optional: Additional notes
}
```

**Example:**
```typescript
const clockOut = async (location: { lat: number; lng: number }) => {
  const response = await fetch(`${API_BASE}/attendance/clock-out`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      latitude: location.lat,
      longitude: location.lng,
      timestamp: Date.now(),
      notes: 'Clock-out from mobile app'
    })
  });

  const data = await response.json();
  return data;
};
```

**Response:**
```typescript
interface ClockOutResponse {
  success: boolean;
  data: {
    _id: string;
    employee_id: string;
    employeeName: string;
    check_in_time: string;          // ISO timestamp
    check_out_time: string;          // ISO timestamp
    total_hours: number;             // Total hours worked (e.g., 8.5)
    break_duration: number;           // Break duration in hours
    overtime_hours: number;           // Overtime hours
    status: 'present' | 'absent';    // 'absent' if < 10 hours
    logout_reason: 'manual' | 'auto_geofence' | 'system';
    notes: string;                   // May include 10-hour rule message
    geofence_status: 'valid' | 'invalid';
    is_geofence_violation: boolean;
    // ... other fields
  };
  message: string;
}
```

**Important Notes:**
- If `total_hours < 10`, `status` will be `'absent'`
- `notes` field may contain: `"Total hours X.XX is less than required 10 hours. Marked as absent."`
- `logout_reason` indicates how the session ended

---

### 3. Get Today's Attendance

**Endpoint:** `GET /api/attendance/today`

**Query Parameters:**
```typescript
{
  employeeId?: string;    // Optional: Employee ID (default: current user)
  date?: string;          // Optional: Date in YYYY-MM-DD format (default: today)
}
```

**Example:**
```typescript
const getTodayAttendance = async (employeeId?: string) => {
  const params = new URLSearchParams();
  if (employeeId) params.append('employeeId', employeeId);
  params.append('date', new Date().toISOString().split('T')[0]);

  const response = await fetch(
    `${API_BASE}/attendance/today?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId
      }
    }
  );

  const data = await response.json();
  return data;
};
```

**Response:**
```typescript
interface TodayAttendanceResponse {
  success: boolean;
  data: {
    check_in_time: string | null;     // ISO timestamp or null
    check_out_time: string | null;     // ISO timestamp or null
    status: 'present' | 'absent' | null;
    isClockedIn: boolean;
    total_hours: number;
    store_code: string;
    store: {
      name: string;
      code: string;
    };
    geofence_violation_start_time?: string;  // If outside geofence
    geofence_grace_period_end_time?: string; // Grace period expiry
  };
}
```

---

### 4. Track Location (Geofence)

**Endpoint:** `POST /api/attendance/track-location`

**Purpose:** Check if employee is within geofence and handle grace period

**Request:**
```typescript
interface TrackLocationRequest {
  latitude: number;
  longitude: number;
}
```

**Example:**
```typescript
const trackLocation = async (location: { lat: number; lng: number }) => {
  const response = await fetch(`${API_BASE}/attendance/track-location`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      latitude: location.lat,
      longitude: location.lng
    })
  });

  const data = await response.json();
  return data;
};
```

**Response Scenarios:**

**1. Within Geofence:**
```typescript
{
  success: true,
  data: {
    action: 'none',
    withinGeofence: true,
    distance: 0.5  // Distance from store center in meters
  }
}
```

**2. Outside Geofence - Grace Period Started:**
```typescript
{
  success: true,
  data: {
    action: 'warning',
    withinGeofence: false,
    gracePeriodRemaining: 8,  // Minutes remaining
    geofence_violation_start_time: '2026-03-06T15:30:00.000Z',
    geofence_grace_period_end_time: '2026-03-06T15:40:00.000Z',
    message: 'You are outside the geofence. Please return within 10 minutes.'
  }
}
```

**3. Grace Period Expired - Auto Clock-Out (NOT Logout):**
```typescript
{
  success: true,
  data: {
    action: 'clock_out',  // Only attendance ends - user stays logged in
    withinGeofence: false,
    gracePeriodExpired: true,
    totalHours: 8.5,
    checkOutTime: '2026-03-06T15:40:00.000Z',
    message: 'Auto clock-out: You have been outside geofence for more than 10 minutes. Your attendance has been recorded.',
    requiresReLogin: false  // User stays logged in to app
  }
}
```

**Frontend Implementation:**
```typescript
// Track location every 30 seconds when clocked in
useEffect(() => {
  if (!isClockedIn) return;

  const interval = setInterval(async () => {
    const location = await getCurrentLocation();
    const result = await trackLocation(location);
    
    if (result.data.action === 'warning') {
      // Show warning notification
      showNotification({
        type: 'warning',
        message: `You are outside geofence. ${result.data.gracePeriodRemaining} minutes remaining.`,
        duration: 5000
      });
    } else if (result.data.action === 'clock_out') {
      // Handle auto clock-out (NOT logout - user stays logged in)
      setIsClockedIn(false);
      await refreshAttendanceStatus();
      showNotification({
        type: 'info',
        message: 'You have been clocked out due to geofence violation.',
        duration: 10000
      });
    }
  }, 30000); // Every 30 seconds

  return () => clearInterval(interval);
}, [isClockedIn]);
```

---

## 📊 Dashboard Integration

### Get Dashboard Data

**Endpoint:** `GET /api/hr/dashboard`

**Example:**
```typescript
const getDashboard = async () => {
  const response = await fetch(`${API_BASE}/hr/dashboard`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId
    }
  });

  const data = await response.json();
  return data;
};
```

### Employee Dashboard Response

```typescript
interface EmployeeDashboardResponse {
  success: boolean;
  data: {
    widgets: {
      attendance: {
        totalLoginTimeToday: {
          hours: number;              // Total hours (e.g., 4.5)
          minutes: number;            // Total minutes (e.g., 270)
          formatted: string;          // "4h 30m"
          formattedDetailed: string;  // "4 hours 30 minutes"
          sessionsCount: number;       // Number of sessions (e.g., 2)
          sessions: Array<{
            checkInTime: string;       // Formatted time string
            checkOutTime: string | null; // Formatted time or null if active
            duration: number;          // Duration in minutes
            logoutReason: 'manual' | 'auto_geofence' | 'system';
            isGeofenceViolation: boolean;
          }>;
        };
        today: {
          status: 'present' | 'absent';
          checkIn: string | null;
          checkOut: string | null;
        };
        weekly: {
          present: number;
          total: number;
        };
      };
      // ... other widgets
    };
  };
}
```

### HR/Admin Dashboard Response

```typescript
interface HRDashboardResponse {
  success: boolean;
  data: {
    widgets: {
      attendance: {
        overall: {
          totalEmployees: number;
          presentToday: number;
          absentToday: number;
          onLeaveToday: number;
        };
        records: Array<{
          employeeId: string;
          employeeName: string;
          checkInTime: string | null;    // Formatted time string
          checkOutTime: string | null;   // Formatted time string
          totalHours: number;
          status: 'present' | 'absent';
          logoutReason: 'manual' | 'auto_geofence' | 'system';
          isGeofenceViolation: boolean;
          storeCode: string;
        }>;
        totalRecords: number;
      };
      // ... other widgets
    };
  };
}
```

### Displaying Dashboard Data

**React Component Example:**
```typescript
import React, { useEffect, useState } from 'react';

const AttendanceDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const data = await getDashboard();
      setDashboard(data.data.widgets.attendance);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!dashboard) return <div>No data available</div>;

  const { totalLoginTimeToday, today, weekly } = dashboard;

  return (
    <div className="attendance-dashboard">
      {/* Today's Status */}
      <div className="today-status">
        <h3>Today's Status</h3>
        <p>Status: <strong>{today.status || 'Not clocked in'}</strong></p>
        {today.checkIn && (
          <p>Check-in: {new Date(today.checkIn).toLocaleString()}</p>
        )}
        {today.checkOut && (
          <p>Check-out: {new Date(today.checkOut).toLocaleString()}</p>
        )}
      </div>

      {/* Total Hours */}
      {totalLoginTimeToday && (
        <div className="total-hours">
          <h3>Total Login Time Today</h3>
          <p className="hours-display">
            {totalLoginTimeToday.formatted}
          </p>
          <p className="sessions-count">
            {totalLoginTimeToday.sessionsCount} session(s)
          </p>

          {/* Session Details */}
          {totalLoginTimeToday.sessions && (
            <div className="sessions-list">
              <h4>Sessions:</h4>
              {totalLoginTimeToday.sessions.map((session, index) => (
                <div key={index} className="session-item">
                  <p>
                    <strong>Session {index + 1}:</strong>
                  </p>
                  <p>Check-in: {session.checkInTime}</p>
                  <p>Check-out: {session.checkOutTime || 'Active'}</p>
                  <p>Duration: {session.duration} minutes</p>
                  <p>Logout Reason: {session.logoutReason}</p>
                  {session.isGeofenceViolation && (
                    <p className="warning">⚠️ Geofence Violation</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Weekly Summary */}
      <div className="weekly-summary">
        <h3>This Week</h3>
        <p>
          Present: {weekly.present} / {weekly.total} days
        </p>
      </div>
    </div>
  );
};

export default AttendanceDashboard;
```

---

## 🗺️ Geofence & Location Tracking

### Understanding Geofence Grace Period

1. **Employee clocks in** within geofence ✅
2. **Employee goes outside** geofence → Grace period starts (10 minutes)
3. **During grace period:**
   - `track-location` returns `action: 'warning'`
   - `gracePeriodRemaining` shows minutes left
   - Frontend should show warning notification
4. **If employee returns** within 10 minutes → Grace period cleared ✅
5. **If employee stays outside** after 10 minutes → Auto-logout triggered

### Implementation Example

```typescript
import { useEffect, useRef } from 'react';

const useGeofenceTracking = (isClockedIn: boolean, token: string, tenantId: string) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [gracePeriodRemaining, setGracePeriodRemaining] = useState<number | null>(null);
  const [isOutsideGeofence, setIsOutsideGeofence] = useState(false);

  useEffect(() => {
    if (!isClockedIn) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Track location every 30 seconds
    intervalRef.current = setInterval(async () => {
      try {
        const location = await getCurrentLocation();
        const result = await trackLocation(location);

        if (result.data.action === 'warning') {
          setIsOutsideGeofence(true);
          setGracePeriodRemaining(result.data.gracePeriodRemaining);
          
          // Show warning notification
          showNotification({
            type: 'warning',
            title: 'Outside Geofence',
            message: `Please return to your work location. ${result.data.gracePeriodRemaining} minutes remaining.`,
            duration: 5000
          });
        } else if (result.data.action === 'clock_out') {
          // Auto clock-out triggered (NOT logout - user stays logged in)
          setIsOutsideGeofence(false);
          setGracePeriodRemaining(null);
          
          showNotification({
            type: 'info',
            title: 'Auto Clock-Out',
            message: 'You have been clocked out due to geofence violation. You are still logged in.',
            duration: 10000
          });
          
          // Refresh attendance status - user stays logged in
          await refreshAttendanceStatus();
        } else if (result.data.withinGeofence) {
          // Back within geofence
          setIsOutsideGeofence(false);
          setGracePeriodRemaining(null);
        }
      } catch (error) {
        console.error('Location tracking error:', error);
      }
    }, 30000); // Every 30 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isClockedIn, token, tenantId]);

  return { gracePeriodRemaining, isOutsideGeofence };
};
```

---

## ⏰ 10-Hour Rule & Auto Clock-Out

### Understanding the Rule

- **Minimum Work Hours:** 10 hours required
- **Status Calculation:**
  - If `total_hours >= 10` → Status: `'present'`
  - If `total_hours < 10` → Status: `'absent'`
- **Auto Clock-Out:** System automatically clocks out after 10 hours

### Frontend Display

```typescript
const AttendanceStatus = ({ attendance }) => {
  const { total_hours, status, check_out_time } = attendance;
  const isAbsent = status === 'absent';
  const hoursRemaining = Math.max(0, 10 - total_hours);

  return (
    <div className="attendance-status">
      <div className="status-badge" data-status={status}>
        {status === 'present' ? '✅ Present' : '❌ Absent'}
      </div>
      
      <div className="hours-info">
        <p>Total Hours: <strong>{total_hours.toFixed(2)}</strong></p>
        
        {isAbsent && (
          <div className="warning-box">
            <p>⚠️ Less than 10 hours worked</p>
            <p>Required: 10 hours | Worked: {total_hours.toFixed(2)} hours</p>
            <p>Hours needed: {hoursRemaining.toFixed(2)}</p>
          </div>
        )}
        
        {!check_out_time && total_hours >= 10 && (
          <div className="info-box">
            <p>ℹ️ You have completed 10 hours. You can clock out anytime.</p>
          </div>
        )}
      </div>
    </div>
  );
};
```

### Handling Auto Clock-Out

```typescript
// Poll attendance status to detect auto clock-out
useEffect(() => {
  if (!isClockedIn) return;

  const interval = setInterval(async () => {
    const today = await getTodayAttendance();
    
    // Check if auto clock-out occurred
    if (today.data.check_out_time && !userInitiatedClockOut) {
      const checkOutTime = new Date(today.data.check_out_time);
      const now = new Date();
      const timeDiff = (now.getTime() - checkOutTime.getTime()) / 1000 / 60; // minutes
      
      // If clock-out happened in last 2 minutes and wasn't user-initiated
      if (timeDiff < 2 && today.data.logout_reason === 'system') {
        showNotification({
          type: 'info',
          title: 'Auto Clock-Out',
          message: 'You have been automatically clocked out after completing 10 hours.',
          duration: 10000
        });
        
        setIsClockedIn(false);
        refreshAttendanceStatus();
      }
    }
  }, 60000); // Check every minute

  return () => clearInterval(interval);
}, [isClockedIn]);
```

---

## 📈 Multiple Sessions & Total Hours

### Understanding Multiple Sessions

Employees can clock in/out multiple times per day. All sessions are tracked separately and total hours are aggregated.

**Example Scenario:**
- Session 1: 9:00 AM - 10:00 AM (1 hour)
- Session 2: 10:05 AM - 10:25 AM (auto-logout, geofence violation)
- Session 3: 10:30 AM - 1:30 PM (3 hours)
- **Total:** 4 hours

### Displaying Multiple Sessions

```typescript
const SessionsList = ({ sessions }) => {
  return (
    <div className="sessions-list">
      <h3>Today's Sessions ({sessions.length})</h3>
      
      {sessions.map((session, index) => (
        <div key={index} className="session-card">
          <div className="session-header">
            <span className="session-number">Session {index + 1}</span>
            <span className={`status-badge ${session.logoutReason}`}>
              {session.logoutReason === 'manual' && '✅ Manual'}
              {session.logoutReason === 'auto_geofence' && '⚠️ Auto (Geofence)'}
              {session.logoutReason === 'system' && '🔄 Auto (System)'}
            </span>
          </div>
          
          <div className="session-times">
            <div className="time-item">
              <span className="label">Check-in:</span>
              <span className="value">{session.checkInTime}</span>
            </div>
            <div className="time-item">
              <span className="label">Check-out:</span>
              <span className="value">{session.checkOutTime || 'Active'}</span>
            </div>
            <div className="time-item">
              <span className="label">Duration:</span>
              <span className="value">
                {Math.floor(session.duration / 60)}h {session.duration % 60}m
              </span>
            </div>
          </div>
          
          {session.isGeofenceViolation && (
            <div className="geofence-warning">
              ⚠️ This session ended due to geofence violation
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
```

---

## 💻 Code Examples

### Complete React Hook for Attendance

```typescript
import { useState, useEffect, useCallback } from 'react';

interface UseAttendanceReturn {
  isClockedIn: boolean;
  todayAttendance: any;
  clockIn: (location: { lat: number; lng: number }) => Promise<void>;
  clockOut: (location: { lat: number; lng: number }) => Promise<void>;
  refreshAttendance: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

export const useAttendance = (
  token: string,
  tenantId: string,
  employeeId?: string
): UseAttendanceReturn => {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTodayAttendance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (employeeId) params.append('employeeId', employeeId);
      params.append('date', new Date().toISOString().split('T')[0]);

      const response = await fetch(
        `${API_BASE}/attendance/today?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-Id': tenantId
          }
        }
      );

      const data = await response.json();
      
      if (data.success) {
        setTodayAttendance(data.data);
        setIsClockedIn(data.data.isClockedIn || false);
      } else {
        setError(data.error || 'Failed to fetch attendance');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [token, tenantId, employeeId]);

  const clockIn = useCallback(async (location: { lat: number; lng: number }) => {
    try {
      setError(null);
      
      const response = await fetch(`${API_BASE}/attendance/clock-in`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          latitude: location.lat,
          longitude: location.lng,
          timestamp: Date.now()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setIsClockedIn(true);
        await fetchTodayAttendance();
      } else {
        setError(data.error || 'Clock-in failed');
        throw new Error(data.error || 'Clock-in failed');
      }
    } catch (err: any) {
      setError(err.message || 'Clock-in failed');
      throw err;
    }
  }, [token, tenantId, fetchTodayAttendance]);

  const clockOut = useCallback(async (location: { lat: number; lng: number }) => {
    try {
      setError(null);
      
      const response = await fetch(`${API_BASE}/attendance/clock-out`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-Id': tenantId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          latitude: location.lat,
          longitude: location.lng,
          timestamp: Date.now()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setIsClockedIn(false);
        await fetchTodayAttendance();
      } else {
        setError(data.error || 'Clock-out failed');
        throw new Error(data.error || 'Clock-out failed');
      }
    } catch (err: any) {
      setError(err.message || 'Clock-out failed');
      throw err;
    }
  }, [token, tenantId, fetchTodayAttendance]);

  useEffect(() => {
    fetchTodayAttendance();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchTodayAttendance, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchTodayAttendance]);

  return {
    isClockedIn,
    todayAttendance,
    clockIn,
    clockOut,
    refreshAttendance: fetchTodayAttendance,
    loading,
    error
  };
};
```

### Usage Example

```typescript
import { useAttendance } from './hooks/useAttendance';

const AttendanceComponent = () => {
  const { token, tenantId, employeeId } = useAuth();
  const { isClockedIn, todayAttendance, clockIn, clockOut, loading, error } = 
    useAttendance(token, tenantId, employeeId);

  const handleClockIn = async () => {
    try {
      const location = await getCurrentLocation();
      await clockIn(location);
      showSuccess('Clocked in successfully!');
    } catch (err) {
      showError(err.message);
    }
  };

  const handleClockOut = async () => {
    try {
      const location = await getCurrentLocation();
      await clockOut(location);
      showSuccess('Clocked out successfully!');
    } catch (err) {
      showError(err.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {error && <div className="error">{error}</div>}
      
      <div className="attendance-status">
        <p>Status: {isClockedIn ? 'Clocked In' : 'Clocked Out'}</p>
        {todayAttendance && (
          <>
            <p>Total Hours: {todayAttendance.total_hours || 0}</p>
            <p>Status: {todayAttendance.status}</p>
          </>
        )}
      </div>

      <button 
        onClick={handleClockIn} 
        disabled={isClockedIn}
      >
        Clock In
      </button>
      
      <button 
        onClick={handleClockOut} 
        disabled={!isClockedIn}
      >
        Clock Out
      </button>
    </div>
  );
};
```

---

## ⚠️ Error Handling

### Common Error Codes

```typescript
enum AttendanceErrorCodes {
  ALREADY_CLOCKED_IN = 'ALREADY_CLOCKED_IN',
  NOT_CLOCKED_IN = 'NOT_CLOCKED_IN',
  GEOFENCE_VIOLATION = 'GEOFENCE_VIOLATION',
  INVALID_TOKEN = 'INVALID_TOKEN',
  EMPLOYEE_NOT_FOUND = 'EMPLOYEE_NOT_FOUND',
  NETWORK_ERROR = 'NETWORK_ERROR'
}
```

### Error Handler

```typescript
const handleAttendanceError = (error: any) => {
  const errorCode = error.code || error.error?.code;
  const errorMessage = error.message || error.error?.message;

  switch (errorCode) {
    case 'ALREADY_CLOCKED_IN':
      return {
        type: 'warning',
        message: 'You are already clocked in. Please clock out first.',
        action: 'showCurrentStatus'
      };
    
    case 'NOT_CLOCKED_IN':
      return {
        type: 'error',
        message: 'You are not clocked in. Please clock in first.',
        action: 'redirectToClockIn'
      };
    
    case 'GEOFENCE_VIOLATION':
      return {
        type: 'error',
        message: 'You are outside the allowed geofence area.',
        action: 'showLocationWarning'
      };
    
    case 'INVALID_TOKEN':
      return {
        type: 'error',
        message: 'Your session has expired. Please login again.',
        action: 'redirectToLogin'
      };
    
    default:
      return {
        type: 'error',
        message: errorMessage || 'An unexpected error occurred.',
        action: 'showError'
      };
  }
};
```

---

## 🎯 Best Practices

### 1. **Location Tracking**
- Request location permissions on app start
- Cache location to reduce API calls
- Handle location errors gracefully
- Show user-friendly messages for location issues

### 2. **State Management**
- Keep attendance state in sync with server
- Poll attendance status periodically (every 5 minutes)
- Handle auto clock-out gracefully
- Show real-time updates for grace period

### 3. **User Experience**
- Show clear status indicators (clocked in/out)
- Display total hours prominently
- Warn users about 10-hour rule
- Show grace period countdown
- Provide clear error messages

### 4. **Performance**
- Debounce location tracking calls
- Cache dashboard data
- Use optimistic UI updates
- Handle network failures gracefully

### 5. **Security**
- Never store tokens in localStorage (use secure storage)
- Validate location data before sending
- Handle token expiration
- Implement proper error boundaries

---

## 📝 Summary

This guide covers all aspects of integrating the Attendance System in your frontend application:

✅ **Core APIs:** Clock in/out, status checking, location tracking  
✅ **Dashboard Integration:** Employee and HR/Admin views  
✅ **Geofence Tracking:** 10-minute grace period implementation  
✅ **10-Hour Rule:** Status calculation and auto clock-out  
✅ **Multiple Sessions:** Tracking and aggregation  
✅ **Code Examples:** Ready-to-use React hooks and components  
✅ **Error Handling:** Comprehensive error management  
✅ **Best Practices:** Production-ready recommendations  

For additional support or questions, please refer to the backend API documentation or contact the development team.

---

**Last Updated:** March 6, 2026  
**Version:** 1.0.0
