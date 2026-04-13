# Frontend Dashboard - Total Hours Display Guide

## 📋 Problem Statement

Employee dashboard par total login hours properly display nahi ho rahe the jab multiple sessions hote the. Example:
- Session 1: 10:00 AM - 11:00 AM (1 hour)
- Session 2: 12:00 PM - 3:00 PM (3 hours)
- **Expected Total: 4 hours**
- **Previous Issue: Only individual sessions dikh rahe the, total nahi**

---

## ✅ Solution

Backend ab **sabhi sessions ko aggregate** karke total hours calculate karta hai aur frontend ko proper format me data deta hai.

---

## 🔌 API Response Format

### Dashboard API Response

```http
GET /api/hr/dashboard
```

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "widgets": {
      "attendance": {
        "today": {
          "status": "present",
          "checkIn": "2026-03-05T10:00:00.000Z",
          "checkOut": "2026-03-05T15:00:00.000Z"
        },
        "totalLoginTimeToday": {
          "hours": 4.0,
          "minutes": 240,
          "formatted": "4h 0m",
          "formattedDetailed": "4 hours 0 minutes",
          "sessionsCount": 2,
          "sessions": [
            {
              "checkIn": "2026-03-05T10:00:00.000Z",
              "checkOut": "2026-03-05T11:00:00.000Z",
              "duration": 60,
              "status": "completed"
            },
            {
              "checkIn": "2026-03-05T12:00:00.000Z",
              "checkOut": "2026-03-05T15:00:00.000Z",
              "duration": 180,
              "status": "completed"
            }
          ]
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

---

## 🎨 Frontend Implementation

### React/TypeScript Component Example

```tsx
// components/TotalHoursWidget.tsx
import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';

interface Session {
  checkIn: string;
  checkOut: string | null;
  duration: number; // minutes
  status: 'completed' | 'active';
}

interface TotalLoginTime {
  hours: number;
  minutes: number;
  formatted: string;
  formattedDetailed: string;
  sessionsCount: number;
  sessions: Session[];
}

interface DashboardData {
  widgets: {
    attendance: {
      totalLoginTimeToday: TotalLoginTime;
      today: {
        status: string;
        checkIn: string | null;
        checkOut: string | null;
      };
    };
  };
}

export const TotalHoursWidget: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        const tenantId = localStorage.getItem('tenantId');
        
        const response = await fetch(
          `${API_BASE}/api/hr/dashboard`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'x-tenant-id': tenantId || '',
              'Content-Type': 'application/json'
            }
          }
        );

        const result = await response.json();
        
        if (result.success) {
          setDashboardData(result.data);
        } else {
          setError(result.message || 'Failed to fetch dashboard');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    
    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (isoString: string | null): string => {
    if (!isoString) return '--:--';
    try {
      return format(parseISO(isoString), 'HH:mm');
    } catch {
      return '--:--';
    }
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="total-hours-widget loading">
        <div className="spinner">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="total-hours-widget error">
        <p>Error: {error}</p>
      </div>
    );
  }

  const totalTime = dashboardData?.widgets?.attendance?.totalLoginTimeToday;
  const sessions = totalTime?.sessions || [];

  return (
    <div className="total-hours-widget">
      <div className="widget-header">
        <h3>Today's Total Hours</h3>
        <span className="sessions-badge">
          {totalTime?.sessionsCount || 0} session{totalTime?.sessionsCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Total Hours Display */}
      <div className="total-hours-display">
        <div className="hours-large">
          {totalTime?.formatted || '0h 0m'}
        </div>
        <div className="hours-detailed">
          {totalTime?.formattedDetailed || '0 hours 0 minutes'}
        </div>
        <div className="hours-numeric">
          {totalTime?.hours.toFixed(2) || '0.00'} hours
        </div>
      </div>

      {/* Session Breakdown */}
      {sessions.length > 0 && (
        <div className="sessions-breakdown">
          <h4>Session Details</h4>
          <div className="sessions-list">
            {sessions.map((session, index) => (
              <div key={index} className="session-item">
                <div className="session-time">
                  <span className="check-in">
                    <strong>In:</strong> {formatTime(session.checkIn)}
                  </span>
                  <span className="check-out">
                    <strong>Out:</strong> {session.checkOut ? formatTime(session.checkOut) : 'Active'}
                  </span>
                </div>
                <div className="session-duration">
                  Duration: {formatDuration(session.duration)}
                </div>
                <div className={`session-status status-${session.status}`}>
                  {session.status === 'active' ? '🟢 Active' : '✅ Completed'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's Status */}
      <div className="today-status">
        <div className="status-badge status-{dashboardData?.widgets?.attendance?.today?.status}">
          {dashboardData?.widgets?.attendance?.today?.status || 'Unknown'}
        </div>
        {dashboardData?.widgets?.attendance?.today?.checkIn && (
          <div className="current-session">
            <p>
              <strong>Current Session:</strong> {formatTime(dashboardData.widgets.attendance.today.checkIn)}
              {dashboardData.widgets.attendance.today.checkOut 
                ? ` - ${formatTime(dashboardData.widgets.attendance.today.checkOut)}`
                : ' (Active)'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## 📊 Alternative: Manual Aggregation (If Needed)

Agar backend se data chunks me aa raha hai, toh frontend me manually aggregate kar sakte hain:

```tsx
// hooks/useTotalHours.ts
import { useState, useEffect, useMemo } from 'react';

interface AttendanceRecord {
  check_in_time: string;
  check_out_time: string | null;
  status: string;
}

export const useTotalHours = (date?: string) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const tenantId = localStorage.getItem('tenantId');
        const today = date || new Date().toISOString().split('T')[0];
        
        // Fetch all attendance records for the day
        const response = await fetch(
          `${API_BASE}/api/attendance?date=${today}&limit=100`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'x-tenant-id': tenantId || ''
            }
          }
        );

        const result = await response.json();
        
        if (result.success) {
          // Handle different response formats
          let attendanceRecords: AttendanceRecord[] = [];
          
          if (Array.isArray(result.data)) {
            attendanceRecords = result.data;
          } else if (result.data?.records) {
            attendanceRecords = result.data.records;
          } else if (result.data?.data) {
            attendanceRecords = result.data.data;
          } else if (result.records) {
            attendanceRecords = result.records;
          }
          
          setRecords(attendanceRecords);
        }
      } catch (err) {
        console.error('Failed to fetch attendance:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [date]);

  // Calculate total hours from all sessions
  const totalHours = useMemo(() => {
    let totalMinutes = 0;
    const sessionDetails: Array<{
      checkIn: string;
      checkOut: string | null;
      duration: number;
    }> = [];

    records.forEach(record => {
      const checkIn = record.check_in_time;
      const checkOut = record.check_out_time;

      if (checkIn) {
        let sessionMinutes = 0;

        if (checkOut) {
          // Completed session
          const checkInTime = new Date(checkIn);
          const checkOutTime = new Date(checkOut);
          const diffMs = checkOutTime.getTime() - checkInTime.getTime();
          sessionMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));
        } else {
          // Active session - calculate to now
          const checkInTime = new Date(checkIn);
          const now = new Date();
          const diffMs = now.getTime() - checkInTime.getTime();
          sessionMinutes = Math.max(0, Math.round(diffMs / (1000 * 60)));
        }

        totalMinutes += sessionMinutes;
        sessionDetails.push({
          checkIn,
          checkOut,
          duration: sessionMinutes
        });
      }
    });

    const hours = totalMinutes / 60;
    const hoursInt = Math.floor(hours);
    const minutesInt = totalMinutes % 60;

    return {
      totalMinutes,
      totalHours: parseFloat(hours.toFixed(2)),
      formatted: `${hoursInt}h ${minutesInt}m`,
      formattedDetailed: `${hoursInt} hour${hoursInt !== 1 ? 's' : ''} ${minutesInt} minute${minutesInt !== 1 ? 's' : ''}`,
      sessions: sessionDetails,
      sessionsCount: sessionDetails.length
    };
  }, [records]);

  return { totalHours, records, loading };
};
```

**Usage:**
```tsx
import { useTotalHours } from '@/hooks/useTotalHours';

export const MyComponent = () => {
  const { totalHours, loading } = useTotalHours();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Total Hours Today: {totalHours.formatted}</h2>
      <p>Total: {totalHours.totalHours} hours</p>
      <p>Sessions: {totalHours.sessionsCount}</p>
      
      <div>
        <h3>Sessions:</h3>
        {totalHours.sessions.map((session, idx) => (
          <div key={idx}>
            {new Date(session.checkIn).toLocaleTimeString()} - 
            {session.checkOut 
              ? new Date(session.checkOut).toLocaleTimeString()
              : 'Active'
            } 
            ({Math.floor(session.duration / 60)}h {session.duration % 60}m)
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 🎯 Key Points

### 1. **Backend Response**
- Backend ab automatically **sabhi sessions ko aggregate** karke total hours calculate karta hai
- Response me `totalLoginTimeToday` object me complete data milta hai:
  - `hours`: Decimal format (e.g., 4.0)
  - `minutes`: Total minutes (e.g., 240)
  - `formatted`: "4h 0m"
  - `formattedDetailed`: "4 hours 0 minutes"
  - `sessionsCount`: Number of sessions
  - `sessions`: Array of individual sessions

### 2. **Frontend Display**
- **Preferred:** Use `totalLoginTimeToday` directly from dashboard API
- **Alternative:** If data chunks me aa raha hai, manually aggregate using `useTotalHours` hook

### 3. **Real-time Updates**
- Dashboard API ko every 30 seconds me refresh karein
- Active sessions ke liye real-time calculation hota hai

### 4. **Data Format**
- All times are in ISO 8601 format (UTC)
- Frontend me local timezone me convert karein
- Duration is in minutes (backend se convert to hours)

---

## 📝 Example Scenarios

### Scenario 1: Multiple Sessions
```
Session 1: 10:00 AM - 11:00 AM (1 hour)
Session 2: 12:00 PM - 3:00 PM (3 hours)
Total: 4 hours
```

**Backend Response:**
```json
{
  "totalLoginTimeToday": {
    "hours": 4.0,
    "minutes": 240,
    "formatted": "4h 0m",
    "sessionsCount": 2,
    "sessions": [
      { "checkIn": "10:00", "checkOut": "11:00", "duration": 60 },
      { "checkIn": "12:00", "checkOut": "15:00", "duration": 180 }
    ]
  }
}
```

### Scenario 2: Active Session
```
Session 1: 10:00 AM - 11:00 AM (1 hour) - Completed
Session 2: 12:00 PM - Present (Active) - 2 hours so far
Total: 3 hours (and counting)
```

**Backend Response:**
```json
{
  "totalLoginTimeToday": {
    "hours": 3.0,
    "minutes": 180,
    "formatted": "3h 0m",
    "sessionsCount": 2,
    "sessions": [
      { "checkIn": "10:00", "checkOut": "11:00", "duration": 60, "status": "completed" },
      { "checkIn": "12:00", "checkOut": null, "duration": 120, "status": "active" }
    ]
  }
}
```

---

## 🔧 Troubleshooting

### Issue: Total hours 0 dikh raha hai
**Solution:**
1. Check karein ki `totalLoginTimeToday` object response me hai ya nahi
2. Verify karein ki attendance records properly fetch ho rahe hain
3. Check browser console for errors

### Issue: Sessions properly aggregate nahi ho rahe
**Solution:**
1. Ensure ki `limit=100` parameter use ho raha hai (to get all sessions)
2. Check karein ki date filter properly set hai
3. Verify ki `check_in_time` aur `check_out_time` properly parse ho rahe hain

### Issue: Active session ka time update nahi ho raha
**Solution:**
1. Implement polling (every 30 seconds)
2. Use `setInterval` to refresh dashboard data
3. Check karein ki `check_out_time` null hai for active sessions

---

## 📚 Related APIs

1. **Dashboard API:** `GET /api/hr/dashboard`
2. **Attendance Records:** `GET /api/attendance?date=YYYY-MM-DD&limit=100`
3. **Today's Attendance:** `GET /api/attendance/today`

---

## ✅ Summary

1. ✅ Backend ab automatically total hours calculate karta hai
2. ✅ Response me `totalLoginTimeToday` object me complete data milta hai
3. ✅ Frontend me directly use karein ya manually aggregate karein
4. ✅ Real-time updates ke liye polling implement karein
5. ✅ Multiple sessions properly aggregate hote hain

**Last Updated:** 2026-03-05
