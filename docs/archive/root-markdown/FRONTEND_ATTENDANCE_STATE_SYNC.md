# Frontend Attendance State Synchronization Fix

## Problem
- Employee has already clocked in from backend
- Frontend main page still shows "Clock In" button
- When frontend tries to punch in, backend returns: "Please clock out from your current session before clocking in again"

## Root Cause
Frontend is not checking the current attendance status when the page loads, so it doesn't know if the employee is already clocked in.

## Solution

### Step 1: Check Current Attendance Status on Page Load

Call the attendance history API to get the latest attendance record and check if there's an active session.

**API Endpoint:**
```
GET /api/attendance/history?limit=1
```

**Headers:**
```javascript
{
  "Authorization": "Bearer <accessToken>",
  "x-tenant-id": "<tenantId>"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "attendances": [
      {
        "_id": "...",
        "employee": "...",
        "employee_id": "EMP-2026-116865",
        "date": "2026-02-20T00:00:00.000Z",
        "check_in_time": "2026-02-20T08:30:00.000Z",
        "check_out_time": null,  // ← If null, employee is still clocked in
        "status": "present",
        "store": "...",
        "store_code": "LK001"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 1
  }
}
```

### Step 2: Determine Clock In/Out State

Check if there's an active session:
- **Active Session (Clock Out needed):** `check_in_time` exists AND `check_out_time` is `null`
- **No Active Session (Clock In needed):** No attendance record OR `check_out_time` exists

### Step 3: Update UI Based on Status

```javascript
// Example React/Next.js code
const [attendanceStatus, setAttendanceStatus] = useState(null); // 'clocked-in' | 'clocked-out' | 'loading'

useEffect(() => {
  checkAttendanceStatus();
}, []);

const checkAttendanceStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/attendance/history?limit=1`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-tenant-id': tenantId
      }
    });
    
    const data = await response.json();
    
    if (data.success && data.data.attendances.length > 0) {
      const latestAttendance = data.data.attendances[0];
      
      // Check if there's an active session (clocked in but not clocked out)
      if (latestAttendance.check_in_time && !latestAttendance.check_out_time) {
        // Employee is already clocked in
        setAttendanceStatus('clocked-in');
        setClockInTime(latestAttendance.check_in_time);
      } else {
        // Employee is clocked out (or no attendance today)
        setAttendanceStatus('clocked-out');
      }
    } else {
      // No attendance record found
      setAttendanceStatus('clocked-out');
    }
  } catch (error) {
    console.error('Error checking attendance status:', error);
    setAttendanceStatus('clocked-out'); // Default to clock-out state on error
  }
};
```

### Step 4: Handle "Already Clocked In" Error Gracefully

When clock-in API returns error, check if it's the "already clocked in" error and refresh status:

```javascript
const handleClockIn = async () => {
  try {
    const formData = new FormData();
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    if (selfieFile) {
      formData.append('selfie', selfieFile);
    }
    formData.append('notes', notes || '');

    const response = await fetch(`${API_BASE_URL}/api/attendance/clock-in`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-tenant-id': tenantId
      },
      body: formData
    });

    const data = await response.json();

    if (data.success) {
      // Clock-in successful
      setAttendanceStatus('clocked-in');
      setClockInTime(data.data.check_in_time);
      showSuccess('Clocked in successfully!');
    } else {
      // Check if it's "already clocked in" error
      if (data.message && data.message.includes('clock out')) {
        // Refresh attendance status
        await checkAttendanceStatus();
        showWarning('You are already clocked in. Please clock out first.');
      } else {
        showError(data.message || 'Clock-in failed');
      }
    }
  } catch (error) {
    console.error('Clock-in error:', error);
    showError('Failed to clock in. Please try again.');
  }
};
```

### Step 5: Display Correct Button

```javascript
// In your component render
{attendanceStatus === 'clocked-in' ? (
  <button onClick={handleClockOut}>
    Clock Out
    {clockInTime && (
      <span> (Clocked in at {formatTime(clockInTime)})</span>
    )}
  </button>
) : (
  <button onClick={handleClockIn}>
    Clock In
  </button>
)}
```

## Complete Example Implementation

```javascript
import { useState, useEffect } from 'react';

function AttendanceWidget() {
  const [attendanceStatus, setAttendanceStatus] = useState('loading'); // 'loading' | 'clocked-in' | 'clocked-out'
  const [clockInTime, setClockInTime] = useState(null);
  const [clockOutTime, setClockOutTime] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
  const accessToken = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');

  // Check attendance status on mount and after clock in/out
  useEffect(() => {
    checkAttendanceStatus();
  }, []);

  const checkAttendanceStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/attendance/history?limit=1`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success && data.data.attendances && data.data.attendances.length > 0) {
        const latest = data.data.attendances[0];
        
        if (latest.check_in_time && !latest.check_out_time) {
          // Active session - clocked in but not clocked out
          setAttendanceStatus('clocked-in');
          setClockInTime(latest.check_in_time);
          setClockOutTime(null);
        } else if (latest.check_out_time) {
          // Clocked out
          setAttendanceStatus('clocked-out');
          setClockInTime(latest.check_in_time);
          setClockOutTime(latest.check_out_time);
        } else {
          setAttendanceStatus('clocked-out');
        }
      } else {
        // No attendance record
        setAttendanceStatus('clocked-out');
      }
    } catch (error) {
      console.error('Error checking attendance:', error);
      setAttendanceStatus('clocked-out'); // Default to clock-out on error
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async (latitude, longitude, selfieFile) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      if (selfieFile) {
        formData.append('selfie', selfieFile);
      }

      const response = await fetch(`${API_BASE_URL}/api/attendance/clock-in`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': tenantId
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        // Refresh status
        await checkAttendanceStatus();
        alert('Clocked in successfully!');
      } else {
        // Handle "already clocked in" error
        if (data.message && (
          data.message.includes('clock out') || 
          data.message.includes('current session')
        )) {
          // Refresh status to get current state
          await checkAttendanceStatus();
          alert('You are already clocked in. Please clock out first.');
        } else {
          alert(data.message || 'Clock-in failed');
        }
      }
    } catch (error) {
      console.error('Clock-in error:', error);
      alert('Failed to clock in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async (latitude, longitude, selfieFile) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      if (selfieFile) {
        formData.append('selfie', selfieFile);
      }

      const response = await fetch(`${API_BASE_URL}/api/attendance/clock-out`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': tenantId
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        // Refresh status
        await checkAttendanceStatus();
        alert('Clocked out successfully!');
      } else {
        alert(data.message || 'Clock-out failed');
      }
    } catch (error) {
      console.error('Clock-out error:', error);
      alert('Failed to clock out. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && attendanceStatus === 'loading') {
    return <div>Loading attendance status...</div>;
  }

  return (
    <div className="attendance-widget">
      {attendanceStatus === 'clocked-in' ? (
        <div>
          <p>✅ Clocked in at: {clockInTime ? new Date(clockInTime).toLocaleTimeString() : 'N/A'}</p>
          <button 
            onClick={() => handleClockOut(lat, lng, selfieFile)}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Clock Out'}
          </button>
        </div>
      ) : (
        <div>
          <button 
            onClick={() => handleClockIn(lat, lng, selfieFile)}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Clock In'}
          </button>
        </div>
      )}
    </div>
  );
}

export default AttendanceWidget;
```

## Key Points

1. **Always check status on page load** - Call `/api/attendance/history?limit=1` when component mounts
2. **Check for active session** - `check_in_time` exists AND `check_out_time` is `null`
3. **Handle "already clocked in" error** - When clock-in fails with this error, refresh status instead of showing error
4. **Refresh after clock in/out** - Always call `checkAttendanceStatus()` after successful clock in/out
5. **Show appropriate button** - Display "Clock Out" if already clocked in, "Clock In" otherwise

## Alternative: Use Today's Attendance Endpoint

If you want to check only today's attendance:

```javascript
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
const response = await fetch(
  `${API_BASE_URL}/api/attendance/history?startDate=${today}&endDate=${today}&limit=1`,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-tenant-id': tenantId
    }
  }
);
```

## Error Messages to Handle

- `"Please clock out from your current session before clocking in again"` → Refresh status and show "Clock Out" button
- `"No open clock-in session found. Please clock in first."` → Show "Clock In" button
- `"Employee not found in backend"` → Show error and contact HR

## Testing

1. Clock in from backend (or another device)
2. Refresh frontend page
3. Frontend should automatically show "Clock Out" button
4. Try to clock in again → Should show warning and refresh status
5. Clock out → Should show "Clock In" button
