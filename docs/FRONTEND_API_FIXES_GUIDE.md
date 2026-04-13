# Frontend API Fixes & Updates Guide

**Last Updated:** March 5, 2026  
**Version:** 1.1.0

This document outlines all recent API fixes and updates that frontend developers need to be aware of.

---

## Table of Contents

1. [Auth API Fixes](#auth-api-fixes)
2. [HR Service API Fixes](#hr-service-api-fixes)
3. [Attendance API Fixes](#attendance-api-fixes)
4. [Roster API Fixes](#roster-api-fixes)
5. [Dashboard Time Calculation Fix](#dashboard-time-calculation-fix)
6. [Breaking Changes](#breaking-changes)
7. [Migration Guide](#migration-guide)

---

## Auth API Fixes

### 1. `/api/auth/me` - Null Fields Fixed

**Issue:** The `/api/auth/me` endpoint was returning `null` for many fields like `employeeId`, `tenantId`, `name`, `store`, and `departmentRef`.

**Fix:** All fields are now properly populated with fallback values.

#### Updated Response Format

```typescript
interface AuthMeResponse {
  success: boolean;
  message: string;
  data: {
    _id: string;
    id: string;
    employeeId: string;           // ✅ Now always present
    employee_id: string;           // ✅ Now always present
    name: string;                  // ✅ Now always present
    email: string;
    phone: string;
    tenantId: string;              // ✅ Now always present
    role: string;
    status: 'active' | 'inactive';
    department: string;
    designation: string;
    store: {                       // ✅ Now properly populated
      id: string;
      _id: string;
      name: string;
      code: string;
      address: object;
    } | null;
    departmentRef: {               // ✅ Now properly populated
      id: string;
      _id: string;
      name: string;
      code: string;
      description: string;
    } | null;
    reporting_manager: object | null;
    permissions: string[];
    stores: array;
  };
}
```

#### Example Usage

```typescript
// React/TypeScript Example
const fetchUserProfile = async () => {
  try {
    const response = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      const user = data.data;
      
      // All these fields are now guaranteed to be present
      console.log(user.employeeId);    // ✅ No longer null
      console.log(user.tenantId);     // ✅ No longer null
      console.log(user.name);         // ✅ No longer null
      console.log(user.store?.name);  // ✅ Properly populated
      console.log(user.departmentRef?.name); // ✅ Properly populated
    }
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
  }
};
```

---

## HR Service API Fixes

### 1. `/api/hr/employees/:id` - Null Fields Fixed

**Issue:** Employee API was returning `null` for `name`, `store`, and `departmentRef` fields.

**Fix:** All fields are now properly populated with fallback values.

#### Updated Response Format

```typescript
interface EmployeeResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    _id: string;
    employeeId: string;
    employee_id: string;
    name: string;                  // ✅ Now always present
    email: string;
    tenantId: string;
    store: {                       // ✅ Now properly populated
      id: string;
      _id: string;
      name: string;
      code: string;
      address: object;
    } | null;
    departmentRef: {               // ✅ Now properly populated
      id: string;
      _id: string;
      name: string;
      code: string;
      description: string;
    } | null;
    // ... other fields
  };
}
```

#### Example Usage

```typescript
const fetchEmployee = async (employeeId: string) => {
  const response = await fetch(`/api/hr/employees/${employeeId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  if (data.success) {
    const employee = data.data;
    
    // Safe to use without null checks
    const displayName = employee.name || 'Unknown Employee';
    const storeName = employee.store?.name || 'No Store Assigned';
    const deptName = employee.departmentRef?.name || 'No Department';
    
    return {
      name: displayName,
      store: storeName,
      department: deptName
    };
  }
};
```

---

## Attendance API Fixes

### 1. `/api/attendance/check-out` - Date Filter Fix

**Issue:** Check-out API was failing with "No open clock-in session found" even when a session existed for today.

**Fix:** Check-out now correctly filters by today's date and matches employee by both MongoDB `_id` and `employee_id` string.

#### What Changed

- ✅ Check-out now only looks for today's open sessions (not all-time)
- ✅ Improved employee ID matching (supports both `employee` ObjectId and `employee_id` string)
- ✅ Consistent with check-in logic

#### Example Usage

```typescript
// Check-out now works correctly
const handleCheckOut = async (latitude: number, longitude: number) => {
  try {
    const response = await fetch('/api/attendance/check-out', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latitude,
        longitude,
        notes: 'Checked out from dashboard'
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Check-out successful:', data.data);
      // ✅ Now correctly finds today's open session
    } else {
      console.error('Check-out failed:', data.message);
      // If this error occurs, it means there's genuinely no open session
    }
  } catch (error) {
    console.error('Check-out error:', error);
  }
};
```

#### Error Handling

```typescript
// Proper error handling for check-out
if (data.error === 'No open clock-in session found') {
  // This means:
  // 1. User hasn't clocked in today, OR
  // 2. User already clocked out from today's session
  // Show appropriate message to user
  showMessage('Please clock in first before checking out');
} else {
  // Other errors
  showMessage(data.message || 'Check-out failed');
}
```

---

## Roster API Fixes

### 1. `POST /api/hr/roster` - Employee Lookup Fix

**Issue:** The API was returning "Employee not found" when the frontend sent MongoDB `_id` (e.g., `"69a937017f3054713f9fb854"`) as `employeeId`, because the service was only looking up by `employeeId`/`employee_id` string fields.

**Fix:** The API now accepts both:
- MongoDB `_id` (ObjectId string) - ✅ **Now supported**
- `employeeId` string (e.g., `"EMP-344708"`)
- `employee_id` string

#### Example Requests

**Using MongoDB _id (now supported):**
```typescript
const response = await fetch('/api/hr/roster', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    employeeId: "69a937017f3054713f9fb854",  // ✅ MongoDB _id works now
    storeId: "69a9373e7f3054713f9fb881",
    date: "2026-03-06",
    shift: "MORNING",
    shiftStart: "09:00",
    shiftEnd: "18:00"
  })
});
```

**Using employeeId string (still works):**
```typescript
const response = await fetch('/api/hr/roster', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'X-Tenant-Id': tenantId,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    employeeId: "EMP-344708",  // ✅ employeeId string also works
    storeId: "STORE001",
    date: "2026-03-06",
    shift: "MORNING",
    shiftStart: "09:00",
    shiftEnd: "18:00"
  })
});
```

#### Frontend Implementation

```typescript
// ✅ Recommended: Use employee._id from employee list/select
const createRoster = async (employee: Employee, rosterData: RosterData) => {
  try {
    const response = await fetch('/api/hr/roster', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        employeeId: employee._id || employee.id,  // ✅ Works with MongoDB _id
        storeId: rosterData.storeId,
        date: rosterData.date,
        shift: rosterData.shift,
        shiftStart: rosterData.shiftStart,
        shiftEnd: rosterData.shiftEnd
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create roster');
    }

    return await response.json();
  } catch (error) {
    console.error('Roster creation failed:', error);
    throw error;
  }
};
```

---

### 2. `POST /api/hr/roster` - Shift Normalization & Default Times

**Issue:** 
- Roster POST API was rejecting lowercase shift values (e.g., "Morning" instead of "MORNING")
- Required `shiftStart` and `shiftEnd` fields were causing validation errors

**Fix:**
- ✅ Shift values are now case-insensitive (accepts "Morning", "morning", "MORNING")
- ✅ Default shift times are automatically set if not provided
- ✅ Improved error messages

#### Shift Values

**Accepted Values (case-insensitive):**
- `MORNING` / `Morning` / `morning`
- `EVENING` / `Evening` / `evening`
- `NIGHT` / `Night` / `night`
- `FULL_DAY` / `Full Day` / `full_day` / `fullday`
- `OFF` / `Off` / `off`

#### Default Shift Times

If `shiftStart` and `shiftEnd` are not provided, they are automatically set based on shift type:

| Shift Type | Default Start | Default End |
|------------|---------------|-------------|
| MORNING    | 09:00         | 17:00       |
| EVENING    | 14:00         | 22:00       |
| NIGHT      | 22:00         | 06:00       |
| FULL_DAY   | 09:00         | 18:00       |
| OFF        | N/A           | N/A         |

#### Updated Request Format

```typescript
interface CreateRosterRequest {
  employeeId: string;        // Required
  storeId: string;           // Required (ObjectId or store code)
  date: string;              // Required (ISO date: "2026-03-06")
  shift: string;             // Required (case-insensitive)
  shiftStart?: string;       // Optional (HH:MM format, auto-filled if missing)
  shiftEnd?: string;         // Optional (HH:MM format, auto-filled if missing)
  breakDuration?: number;    // Optional (default: 30 minutes)
  notes?: string;            // Optional
}
```

#### Example Usage

```typescript
// ✅ Minimal request (shift times auto-filled)
const createRosterMinimal = async () => {
  const response = await fetch('/api/hr/roster', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      employeeId: 'EMP-2026-853999',
      storeId: '69a2eece9586a541f446e247',
      date: '2026-03-06',
      shift: 'Morning'  // ✅ Case-insensitive, works!
      // shiftStart and shiftEnd are optional - will default to 09:00-17:00
    })
  });
  
  const data = await response.json();
  // Response includes auto-filled shiftStart: "09:00" and shiftEnd: "17:00"
};

// ✅ Full request with custom times
const createRosterFull = async () => {
  const response = await fetch('/api/hr/roster', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      employeeId: 'EMP-2026-853999',
      storeId: '69a2eece9586a541f446e247',
      date: '2026-03-06',
      shift: 'EVENING',
      shiftStart: '14:00',   // Custom start time
      shiftEnd: '22:00',     // Custom end time
      breakDuration: 45,     // 45 minutes break
      notes: 'Evening shift with extended break'
    })
  });
};
```

#### Response Format

```typescript
interface RosterResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    employeeId: string;
    employeeName: string;
    storeId: string;
    storeName: string;
    date: string;              // ISO date format
    shift: string;             // Always uppercase (MORNING, EVENING, etc.)
    shiftStart: string;       // HH:MM format
    shiftEnd: string;         // HH:MM format
    status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  };
}
```

---

## Dashboard Time Calculation Fix

### 1. Total Hours Aggregation

**Issue:** Dashboard was not correctly aggregating total login hours from multiple clock-in/clock-out sessions. For example, if an employee worked 1 hour (10-11 AM) and then 3 hours (12-3 PM), the dashboard showed only one session instead of 4 hours total.

**Fix:** Dashboard now correctly aggregates all sessions for the day and calculates total hours.

#### Updated Response Format

**Endpoint:** `GET /api/hr/dashboard`

```typescript
interface DashboardResponse {
  success: boolean;
  data: {
    widgets: {
      attendance: {
        totalLoginTimeToday: {
          hours: number;              // ✅ Total hours (e.g., 4.5)
          minutes: number;            // ✅ Total minutes (e.g., 270)
          formatted: string;          // ✅ "4h 30m"
          formattedDetailed: string; // ✅ "4 hours 30 minutes"
          sessionsCount: number;      // ✅ Number of sessions (e.g., 2)
          sessions: Array<{          // ✅ Individual session details
            checkIn: string;          // ISO timestamp
            checkOut: string | null;  // ISO timestamp or null if active
            duration: number;         // Duration in minutes
            status: 'completed' | 'active';
          }>;
        } | null;
        // ... other attendance fields
      };
      // ... other widgets
    };
  };
}
```

#### Example Usage

```typescript
const fetchDashboard = async () => {
  const response = await fetch('/api/hr/dashboard', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  if (data.success) {
    const attendance = data.data.widgets.attendance;
    const timeTracking = attendance.totalLoginTimeToday;
    
    if (timeTracking) {
      // Display total hours
      console.log(`Total Hours: ${timeTracking.formatted}`); // "4h 30m"
      console.log(`Total Minutes: ${timeTracking.minutes}`); // 270
      console.log(`Sessions: ${timeTracking.sessionsCount}`); // 2
      
      // Display individual sessions
      timeTracking.sessions.forEach((session, index) => {
        console.log(`Session ${index + 1}:`, {
          checkIn: new Date(session.checkIn).toLocaleTimeString(),
          checkOut: session.checkOut 
            ? new Date(session.checkOut).toLocaleTimeString() 
            : 'Active',
          duration: `${Math.floor(session.duration / 60)}h ${session.duration % 60}m`,
          status: session.status
        });
      });
    }
  }
};
```

#### React Component Example

```tsx
import React from 'react';

interface TimeTrackingProps {
  totalLoginTimeToday: {
    hours: number;
    minutes: number;
    formatted: string;
    formattedDetailed: string;
    sessionsCount: number;
    sessions: Array<{
      checkIn: string;
      checkOut: string | null;
      duration: number;
      status: 'completed' | 'active';
    }>;
  } | null;
}

const TimeTrackingWidget: React.FC<TimeTrackingProps> = ({ totalLoginTimeToday }) => {
  if (!totalLoginTimeToday) {
    return <div>No attendance data for today</div>;
  }
  
  return (
    <div className="time-tracking-widget">
      <h3>Today's Time Tracking</h3>
      
      {/* Total Hours Display */}
      <div className="total-hours">
        <span className="hours-large">{totalLoginTimeToday.formatted}</span>
        <span className="hours-detail">
          {totalLoginTimeToday.formattedDetailed}
        </span>
        <span className="sessions-count">
          ({totalLoginTimeToday.sessionsCount} session{totalLoginTimeToday.sessionsCount !== 1 ? 's' : ''})
        </span>
      </div>
      
      {/* Individual Sessions */}
      <div className="sessions-list">
        <h4>Sessions:</h4>
        {totalLoginTimeToday.sessions.map((session, index) => (
          <div key={index} className="session-item">
            <div className="session-time">
              <span>In: {new Date(session.checkIn).toLocaleTimeString()}</span>
              <span>
                Out: {session.checkOut 
                  ? new Date(session.checkOut).toLocaleTimeString() 
                  : 'Active'}
              </span>
            </div>
            <div className="session-duration">
              Duration: {Math.floor(session.duration / 60)}h {session.duration % 60}m
            </div>
            <div className={`session-status ${session.status}`}>
              {session.status === 'active' ? '🟢 Active' : '✅ Completed'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimeTrackingWidget;
```

---

## Breaking Changes

### None

All fixes are **backward compatible**. Existing code will continue to work, but you can now rely on fields that were previously `null` being populated.

---

## Migration Guide

### Step 1: Update Auth `/me` Usage

**Before:**
```typescript
const user = await fetchUserProfile();
const employeeId = user.employeeId || user.employee_id || 'N/A';
const tenantId = user.tenantId || 'default';
const name = user.name || 'Unknown User';
```

**After:**
```typescript
const user = await fetchUserProfile();
// ✅ All fields are now guaranteed to be present
const employeeId = user.employeeId;  // No fallback needed
const tenantId = user.tenantId;      // No fallback needed
const name = user.name;              // No fallback needed
```

### Step 2: Update Roster Creation

**Before:**
```typescript
// Had to use uppercase and provide all fields
await createRoster({
  employeeId: 'EMP-001',
  storeId: 'store-id',
  date: '2026-03-06',
  shift: 'MORNING',        // ❌ Had to be uppercase
  shiftStart: '09:00',     // ❌ Required
  shiftEnd: '17:00'        // ❌ Required
});
```

**After:**
```typescript
// Now case-insensitive and fields are optional
await createRoster({
  employeeId: 'EMP-001',
  storeId: 'store-id',
  date: '2026-03-06',
  shift: 'Morning'         // ✅ Case-insensitive, works!
  // shiftStart and shiftEnd are optional - auto-filled
});
```

### Step 3: Update Dashboard Time Display

**Before:**
```typescript
// Had to manually calculate from attendance records
const records = await fetchAttendanceRecords();
let totalMinutes = 0;
records.forEach(record => {
  if (record.checkIn && record.checkOut) {
    const diff = new Date(record.checkOut) - new Date(record.checkIn);
    totalMinutes += diff / (1000 * 60);
  }
});
const totalHours = totalMinutes / 60;
```

**After:**
```typescript
// ✅ Use pre-calculated values from dashboard
const dashboard = await fetchDashboard();
const timeTracking = dashboard.widgets.attendance.totalLoginTimeToday;

if (timeTracking) {
  const totalHours = timeTracking.hours;        // ✅ Already calculated
  const formatted = timeTracking.formatted;      // ✅ "4h 30m"
  const sessions = timeTracking.sessions;        // ✅ Individual sessions
}
```

### Step 4: Update Check-Out Error Handling

**Before:**
```typescript
// Check-out might fail even with open session
try {
  await checkOut(lat, lng);
} catch (error) {
  // Error: "No open clock-in session found"
  // But session might exist from previous day
}
```

**After:**
```typescript
// ✅ Check-out now correctly finds today's session
try {
  await checkOut(lat, lng);
  // ✅ Success - found today's open session
} catch (error) {
  // ✅ Error only if genuinely no open session today
  if (error.message.includes('No open clock-in session')) {
    // User needs to clock in first
    showMessage('Please clock in before checking out');
  }
}
```

---

## Testing Checklist

Use this checklist to verify all fixes are working:

- [ ] **Auth `/me` API**
  - [ ] `employeeId` is not null
  - [ ] `tenantId` is not null
  - [ ] `name` is not null
  - [ ] `store` is properly populated (or null if not assigned)
  - [ ] `departmentRef` is properly populated (or null if not assigned)

- [ ] **HR Employee API**
  - [ ] `name` is not null
  - [ ] `store` is properly populated
  - [ ] `departmentRef` is properly populated

- [ ] **Roster POST API**
  - [ ] Accepts MongoDB `_id` as `employeeId` (e.g., `"69a937017f3054713f9fb854"`)
  - [ ] Accepts `employeeId` string as `employeeId` (e.g., `"EMP-344708"`)
  - [ ] Accepts lowercase shift values ("Morning", "Evening")
  - [ ] Auto-fills shift times when not provided
  - [ ] Returns correct shift in uppercase ("MORNING", "EVENING")

- [ ] **Check-Out API**
  - [ ] Correctly finds today's open session
  - [ ] Doesn't fail when session exists
  - [ ] Properly handles multiple sessions per day

- [ ] **Dashboard Time Calculation**
  - [ ] `totalLoginTimeToday` is not null when sessions exist
  - [ ] `hours` correctly aggregates all sessions
  - [ ] `sessionsCount` shows correct number of sessions
  - [ ] `sessions` array contains all individual sessions

---

## Support & Questions

If you encounter any issues or have questions about these fixes:

1. Check this documentation first
2. Review the API response examples
3. Test with the provided code snippets
4. Contact the backend team if issues persist

---

## Changelog

### Version 1.1.0 (March 5, 2026)

- ✅ Fixed roster POST API to accept MongoDB `_id` as `employeeId`
- ✅ Added support for both MongoDB `_id` and `employeeId` string in roster creation

### Version 1.0.0 (March 5, 2026)

- ✅ Fixed null fields in Auth `/me` endpoint
- ✅ Fixed null fields in HR Employee API
- ✅ Fixed check-out API date filtering
- ✅ Added shift normalization to Roster POST API
- ✅ Added default shift times to Roster POST API
- ✅ Fixed dashboard time calculation aggregation
- ✅ Added session details to dashboard response

---

**Document Maintained By:** Backend Team  
**Last Review Date:** March 5, 2026
