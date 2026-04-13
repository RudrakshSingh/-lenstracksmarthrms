# Geofence Grace Period & Session Tracking Rule

## Overview
This document describes the implementation of geofence-based auto-logout with 10-minute grace period and comprehensive session tracking for dashboard display.

## Features

### 1. 10-Minute Grace Period
- When user goes outside geofence, system starts a 10-minute grace period
- User gets warnings but is not immediately logged out
- If user doesn't return within 10 minutes, auto-logout happens
- If user returns within 10 minutes, violation is cleared

### 2. Session Tracking
- All sessions are tracked separately
- Total hours from all sessions are aggregated
- Each session shows check-in and check-out times
- Logout reasons are tracked (manual, auto_geofence, system)

### 3. Dashboard Display

#### Employee Dashboard
- Shows total login time from all sessions
- Displays individual session details
- Shows check-in and check-out times for each session
- Shows logout reason for each session

#### HR/Admin Dashboard
- Shows all employee attendance records
- Displays check-in and check-out times
- Shows logout reasons
- Shows geofence violations
- Total hours per employee

## Implementation Details

### Attendance Model Updates
**File:** `microservices/attendance-service/src/models/Attendance.model.js`

Added fields:
- `geofence_violation_start`: Date when user first went outside geofence
- `geofence_grace_period_minutes`: Grace period duration (default: 10 minutes)

### Geofence Tracking Logic
**File:** `microservices/attendance-service/src/controllers/attendanceController.js`

**Endpoint:** `POST /api/attendance/track-location`

**Behavior:**
1. **Within Geofence:**
   - Clears any violation start time
   - Returns success

2. **Outside Geofence (First Time):**
   - Sets `geofence_violation_start` to current time
   - Returns warning with grace period remaining
   - Status: 200 (not logged out yet)

3. **Outside Geofence (Still Outside):**
   - Checks if grace period expired
   - If < 10 minutes: Returns warning with remaining time
   - If >= 10 minutes: Auto-logout, returns 401

4. **Auto-Logout Response:**
   - Status: 401 Unauthorized
   - `requiresReLogin: true`
   - Frontend should logout user

### Dashboard Updates
**File:** `microservices/hr-service/src/services/dashboard.service.js`

**Employee Dashboard:**
- Aggregates all sessions for the day
- Calculates total hours
- Shows session details with logout times

**HR/Admin Dashboard:**
- Fetches all attendance records for today
- Shows detailed information including:
  - Check-in times
  - Check-out times
  - Logout reasons
  - Geofence violations

## API Responses

### Track Location - Warning (Outside Geofence)
```json
{
  "success": true,
  "data": {
    "action": "warning",
    "withinGeofence": false,
    "distance": 250,
    "geofenceRadius": 200,
    "gracePeriodRemaining": 8,
    "timeOutsideMinutes": 2,
    "message": "You are outside geofence. Auto-logout in 8 minute(s) if you don't return."
  }
}
```

### Track Location - Auto Logout
```json
{
  "success": false,
  "action": "auto_logout",
  "withinGeofence": false,
  "distance": 250,
  "geofenceRadius": 200,
  "gracePeriodExpired": true,
  "timeOutsideMinutes": 12,
  "message": "Auto-logged out: You have been outside geofence for more than 10 minutes.",
  "requiresReLogin": true
}
```

### Dashboard Response - Employee
```json
{
  "success": true,
  "data": {
    "widgets": {
      "attendance": {
        "totalLoginTimeToday": {
          "hours": 4.0,
          "minutes": 240,
          "formatted": "4h 0m",
          "sessionsCount": 2,
          "sessions": [
            {
              "checkIn": "2026-03-06T10:00:00.000Z",
              "checkOut": "2026-03-06T11:00:00.000Z",
              "checkInTime": "3/6/2026, 3:30:00 PM",
              "checkOutTime": "3/6/2026, 4:30:00 PM",
              "duration": 60,
              "status": "completed",
              "logoutReason": "auto_geofence",
              "isGeofenceViolation": true
            },
            {
              "checkIn": "2026-03-06T12:00:00.000Z",
              "checkOut": "2026-03-06T15:00:00.000Z",
              "checkInTime": "3/6/2026, 5:30:00 PM",
              "checkOutTime": "3/6/2026, 8:30:00 PM",
              "duration": 180,
              "status": "completed",
              "logoutReason": "manual",
              "isGeofenceViolation": false
            }
          ]
        }
      }
    }
  }
}
```

### Dashboard Response - HR/Admin
```json
{
  "success": true,
  "data": {
    "widgets": {
      "attendance": {
        "type": "admin_view",
        "overall": { ... },
        "records": [
          {
            "employeeId": "EMP-2026-886706",
            "employeeName": "rudi singh",
            "checkIn": "2026-03-06T10:00:00.000Z",
            "checkOut": "2026-03-06T11:00:00.000Z",
            "checkInTime": "3/6/2026, 3:30:00 PM",
            "checkOutTime": "3/6/2026, 4:30:00 PM",
            "totalHours": 1.0,
            "status": "absent",
            "logoutReason": "auto_geofence",
            "isGeofenceViolation": true,
            "storeCode": "SHK"
          }
        ],
        "totalRecords": 1
      }
    }
  }
}
```

## Example Scenario

### Scenario: Employee with Multiple Sessions

1. **9:00 AM** - Clock in (within geofence)
2. **10:00 AM** - Clock out manually (1 hour worked)
3. **10:05 AM** - Clock in again (within geofence)
4. **10:15 AM** - Goes outside geofence (grace period starts)
5. **10:25 AM** - Still outside (10 minutes passed) → Auto-logout
6. **10:30 AM** - Returns and clocks in again
7. **1:30 PM** - Clock out manually (3 hours worked)

**Result:**
- Total Hours: 4 hours (1 + 3)
- Sessions: 3 sessions
- Logout Times:
  - Session 1: 10:00 AM (manual)
  - Session 2: 10:25 AM (auto_geofence)
  - Session 3: 1:30 PM (manual)

**Dashboard Display:**
- Employee Dashboard: Shows 4 hours total with 3 sessions
- HR/Admin Dashboard: Shows all 3 sessions with logout times and reasons

## Frontend Integration

### Handle Grace Period Warning
```javascript
// Track location periodically
const response = await fetch('/api/attendance/track-location', {
  method: 'POST',
  body: JSON.stringify({ latitude, longitude })
});

const data = await response.json();

if (data.data?.action === 'warning') {
  // Show warning to user
  const remaining = data.data.gracePeriodRemaining;
  showNotification(`You are outside geofence. Auto-logout in ${remaining} minutes.`);
}
```

### Handle Auto-Logout
```javascript
if (response.status === 401 && data.requiresReLogin) {
  // Auto-logout user
  localStorage.clear();
  window.location.href = '/login';
  alert('You have been logged out due to geofence violation.');
}
```

### Display Dashboard Data
```javascript
// Employee Dashboard
const totalHours = dashboard.widgets.attendance.totalLoginTimeToday;
console.log(`Total: ${totalHours.formatted}`); // "4h 0m"

totalHours.sessions.forEach(session => {
  console.log(`Session: ${session.checkInTime} to ${session.checkOutTime || 'Active'}`);
  console.log(`Logout Reason: ${session.logoutReason}`);
});

// HR/Admin Dashboard
dashboard.widgets.attendance.records.forEach(record => {
  console.log(`${record.employeeName}: ${record.checkInTime} to ${record.checkOutTime}`);
  console.log(`Logout: ${record.checkOutTime} (${record.logoutReason})`);
});
```

## Testing

Run the test script:
```bash
node scripts/test-geofence-grace-period.js
```

This will test:
- Clock in/out
- Geofence tracking
- Grace period logic
- Dashboard display
- Total hours calculation

## Configuration

### Grace Period Duration
Default: 10 minutes

To change, update in `attendanceController.js`:
```javascript
const GRACE_PERIOD_MINUTES = 10; // Change this value
```

### Geofence Radius
Default: 200 meters

Configured per store in store settings.

## Notes

- Grace period is per session (not cumulative)
- If user returns within 10 minutes, violation is cleared
- Auto-logout happens exactly at 10 minutes
- All logout times are tracked and displayed
- Total hours aggregate all sessions for the day
