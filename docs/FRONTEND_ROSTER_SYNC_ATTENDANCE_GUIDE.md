# Frontend Developer Guide - Roster Sync Attendance & Attendance API

**Last Updated:** March 8, 2026  
**Status:** ✅ Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Roster Sync Attendance API](#roster-sync-attendance-api)
3. [Attendance API - dateFrom/dateTo Support](#attendance-api-datefromdateto-support)
4. [Integration Examples](#integration-examples)
5. [Error Handling](#error-handling)
6. [Best Practices](#best-practices)

---

## 🎯 Overview

This guide covers two major features:

1. **Roster Sync Attendance API** - Sync roster entries with attendance records
2. **Attendance API dateFrom/dateTo Support** - Query attendance using dateFrom/dateTo parameters

Both features are now live in production and ready for frontend integration.

---

## 🔄 Roster Sync Attendance API

### Endpoint

```
POST /api/hr/roster/sync-attendance
```

### Purpose

Syncs roster entries (store, shift, timings) with attendance records for a specific date. This ensures that attendance records align with the roster schedule.

### Authentication

Requires authentication token and HR/Admin/Manager role.

### Request

#### Headers
```javascript
{
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
  'x-tenant-id': tenantId // Optional, defaults to user's tenant
}
```

#### Body
```javascript
{
  date: '2026-03-08',           // Required: Date in YYYY-MM-DD format
  employeeId: 'EMP-2026-123'    // Optional: Sync only this employee
}
```

### Response

#### Success (200)
```javascript
{
  success: true,
  data: {
    date: '2026-03-08',
    total: 10,              // Total roster entries processed
    successful: 8,           // Successfully synced
    failed: 1,              // Failed to sync
    skipped: 1,             // Skipped (OFF shifts)
    results: [
      {
        employeeId: 'EMP-2026-123',
        employeeName: 'John Doe',
        status: 'success',   // 'success' | 'failed' | 'skipped'
        message: 'Attendance synced successfully',
        attendanceId: '65a1b2c3d4e5f6g7h8i9j0k1' // Only if success
      },
      {
        employeeId: 'EMP-2026-124',
        employeeName: 'Jane Smith',
        status: 'failed',
        message: 'Employee not found',
        error: 'Employee not found: EMP-2026-124'
      },
      {
        employeeId: 'EMP-2026-125',
        employeeName: 'Bob Wilson',
        status: 'skipped',
        message: 'Shift is OFF, skipping attendance sync'
      }
    ]
  },
  message: 'Roster synced with attendance successfully'
}
```

#### Error (404)
```javascript
{
  success: false,
  error: 'No roster found for the specified date',
  message: 'No roster found'
}
```

#### Error (400)
```javascript
{
  success: false,
  error: 'date is required',
  message: 'Validation failed'
}
```

---

## 📅 Attendance API - dateFrom/dateTo Support

### Endpoint

```
GET /api/attendance
```

### Purpose

Query attendance records using `dateFrom` and `dateTo` parameters (in addition to existing `startDate`/`endDate`).

### Authentication

Requires authentication token.

### Request

#### Headers
```javascript
{
  'Authorization': `Bearer ${token}`,
  'x-tenant-id': tenantId // Optional
}
```

#### Query Parameters
```javascript
{
  employeeId: 'EMP-2026-123',  // Optional: Filter by employee
  dateFrom: '2026-03-01',      // Start date (YYYY-MM-DD)
  dateTo: '2026-03-31',        // End date (YYYY-MM-DD)
  page: 1,                     // Optional: Page number
  limit: 25                    // Optional: Records per page
}
```

**Note:** Both `dateFrom`/`dateTo` and `startDate`/`endDate` formats are supported.

### Response

#### Success (200)
```javascript
{
  success: true,
  data: [
    {
      id: '65a1b2c3d4e5f6g7h8i9j0k1',
      employeeId: 'EMP-2026-123',
      employeeName: 'John Doe',
      date: '2026-03-08',
      checkInTime: '2026-03-08T09:00:00Z',
      checkOutTime: '2026-03-08T18:00:00Z',
      status: 'present',
      store: {
        id: 'store-id',
        name: 'Store Name',
        code: 'STORE-001'
      },
      // ... other attendance fields
    }
  ],
  pagination: {
    page: 1,
    limit: 25,
    total: 10,
    pages: 1,
    hasNext: false,
    hasPrev: false
  },
  message: 'Attendance retrieved successfully'
}
```

---

## 💻 Integration Examples

### Example 1: Roster Page - Sync Attendance Button

```javascript
import React, { useState } from 'react';
import { Button, Alert, Spinner } from 'your-ui-library';
import { syncRosterAttendance } from '../services/rosterService';

function RosterPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSyncAttendance = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await syncRosterAttendance(selectedDate);
      setResult(response.data);
      
      // Show success message
      if (response.data.successful > 0) {
        alert(`Successfully synced ${response.data.successful} attendance records!`);
      }
      
      // Show warnings for failures
      if (response.data.failed > 0) {
        alert(`Warning: ${response.data.failed} records failed to sync. Check details.`);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to sync attendance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Roster Management</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label>Select Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
        <Button
          onClick={handleSyncAttendance}
          disabled={loading}
          variant="primary"
        >
          {loading ? <Spinner /> : 'Sync Attendance'}
        </Button>
      </div>

      {error && (
        <Alert variant="danger">
          {error}
        </Alert>
      )}

      {result && (
        <div>
          <Alert variant="info">
            <strong>Sync Results:</strong>
            <ul>
              <li>Total: {result.total}</li>
              <li>Successful: {result.successful}</li>
              <li>Failed: {result.failed}</li>
              <li>Skipped: {result.skipped}</li>
            </ul>
          </Alert>

          {result.results && result.results.length > 0 && (
            <div>
              <h3>Detailed Results:</h3>
              <table>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Status</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.employeeName} ({item.employeeId})</td>
                      <td>
                        <span className={`badge badge-${item.status === 'success' ? 'success' : item.status === 'failed' ? 'danger' : 'warning'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>{item.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RosterPage;
```

### Example 2: Service Function - syncRosterAttendance

```javascript
// services/rosterService.js
import axios from 'axios';
import { getAuthToken, getTenantId } from './authService';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002';

export const syncRosterAttendance = async (date, employeeId = null) => {
  const token = getAuthToken();
  const tenantId = getTenantId();

  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await axios.post(
    `${API_BASE_URL}/api/hr/roster/sync-attendance`,
    {
      date, // YYYY-MM-DD format
      ...(employeeId && { employeeId })
    },
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(tenantId && { 'x-tenant-id': tenantId })
      },
      timeout: 30000 // 30 seconds timeout
    }
  );

  return response.data;
};
```

### Example 3: My Workday - Auto Sync After Check-in

```javascript
import { syncRosterAttendance } from '../services/rosterService';

async function handleClockIn(clockInData) {
  try {
    // 1. Perform clock-in
    const clockInResponse = await clockIn(clockInData);
    
    // 2. Auto-sync roster for today
    const today = new Date().toISOString().split('T')[0];
    const employeeId = getCurrentEmployeeId();
    
    try {
      await syncRosterAttendance(today, employeeId);
      console.log('Roster synced successfully after check-in');
    } catch (syncError) {
      // Don't fail clock-in if sync fails
      console.warn('Failed to sync roster after check-in:', syncError);
    }
    
    return clockInResponse;
  } catch (error) {
    throw error;
  }
}
```

### Example 4: Attendance Page - Using dateFrom/dateTo

```javascript
import React, { useState, useEffect } from 'react';
import { fetchAttendanceRecords } from '../services/attendanceService';

function AttendancePage() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [employeeId, setEmployeeId] = useState('');

  useEffect(() => {
    // Set default date range (current month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setDateFrom(firstDay.toISOString().split('T')[0]);
    setDateTo(lastDay.toISOString().split('T')[0]);
  }, []);

  const loadAttendance = async () => {
    if (!dateFrom || !dateTo) {
      alert('Please select date range');
      return;
    }

    setLoading(true);
    try {
      const response = await fetchAttendanceRecords({
        employeeId: employeeId || undefined,
        dateFrom,
        dateTo,
        page: 1,
        limit: 100
      });
      
      setAttendance(response.data || []);
    } catch (error) {
      console.error('Failed to load attendance:', error);
      alert('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Attendance Records</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label>Date From:</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        
        <label>Date To:</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        
        <label>Employee ID (Optional):</label>
        <input
          type="text"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          placeholder="EMP-2026-123"
        />
        
        <button onClick={loadAttendance} disabled={loading}>
          {loading ? 'Loading...' : 'Load Attendance'}
        </button>
      </div>

      {attendance.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Employee</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map((record) => (
              <tr key={record.id}>
                <td>{new Date(record.date).toLocaleDateString()}</td>
                <td>{record.employeeName} ({record.employeeId})</td>
                <td>{record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : '-'}</td>
                <td>{record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : '-'}</td>
                <td>{record.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AttendancePage;
```

### Example 5: Service Function - fetchAttendanceRecords

```javascript
// services/attendanceService.js
import axios from 'axios';
import { getAuthToken, getTenantId } from './authService';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3004';

export const fetchAttendanceRecords = async (params = {}) => {
  const token = getAuthToken();
  const tenantId = getTenantId();

  if (!token) {
    throw new Error('Authentication required');
  }

  const queryParams = new URLSearchParams();
  
  // Support both dateFrom/dateTo and startDate/endDate
  if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
  if (params.dateTo) queryParams.append('dateTo', params.dateTo);
  if (params.startDate) queryParams.append('startDate', params.startDate);
  if (params.endDate) queryParams.append('endDate', params.endDate);
  if (params.employeeId) queryParams.append('employeeId', params.employeeId);
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);

  const response = await axios.get(
    `${API_BASE_URL}/api/attendance?${queryParams.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...(tenantId && { 'x-tenant-id': tenantId })
      },
      timeout: 10000
    }
  );

  return response.data;
};
```

---

## ⚠️ Error Handling

### Common Errors

#### 1. No Roster Found (404)
```javascript
try {
  await syncRosterAttendance('2026-03-08');
} catch (error) {
  if (error.response?.status === 404) {
    alert('No roster found for the selected date. Please create roster first.');
  }
}
```

#### 2. Validation Error (400)
```javascript
try {
  await syncRosterAttendance(''); // Missing date
} catch (error) {
  if (error.response?.status === 400) {
    const errorMessage = error.response.data?.error || 'Validation failed';
    alert(`Validation Error: ${errorMessage}`);
  }
}
```

#### 3. Authentication Error (401)
```javascript
try {
  await syncRosterAttendance('2026-03-08');
} catch (error) {
  if (error.response?.status === 401) {
    // Redirect to login
    window.location.href = '/login';
  }
}
```

#### 4. Network/Timeout Error
```javascript
try {
  await syncRosterAttendance('2026-03-08');
} catch (error) {
  if (!error.response) {
    // Network error or timeout
    alert('Network error. Please check your connection and try again.');
  }
}
```

### Error Handling Best Practices

```javascript
async function handleSyncWithErrorHandling(date) {
  try {
    const result = await syncRosterAttendance(date);
    
    // Check for partial failures
    if (result.data.failed > 0) {
      const failedEmployees = result.data.results
        .filter(r => r.status === 'failed')
        .map(r => `${r.employeeName} (${r.employeeId})`)
        .join(', ');
      
      console.warn('Some employees failed to sync:', failedEmployees);
      // Show warning but don't block user
    }
    
    return result;
  } catch (error) {
    // Handle different error types
    if (error.response) {
      // Server responded with error
      switch (error.response.status) {
        case 404:
          throw new Error('No roster found for this date');
        case 400:
          throw new Error(error.response.data?.error || 'Invalid request');
        case 401:
          throw new Error('Authentication required');
        case 403:
          throw new Error('You do not have permission to sync attendance');
        default:
          throw new Error('Server error. Please try again later.');
      }
    } else if (error.request) {
      // Request made but no response
      throw new Error('Network error. Please check your connection.');
    } else {
      // Something else happened
      throw new Error(error.message || 'An unexpected error occurred');
    }
  }
}
```

---

## ✅ Best Practices

### 1. Date Format
Always use `YYYY-MM-DD` format for dates:
```javascript
const date = new Date().toISOString().split('T')[0]; // ✅ Correct
// Not: new Date().toLocaleDateString() // ❌ Wrong format
```

### 2. Loading States
Always show loading indicators for async operations:
```javascript
const [loading, setLoading] = useState(false);

const handleSync = async () => {
  setLoading(true);
  try {
    await syncRosterAttendance(date);
  } finally {
    setLoading(false);
  }
};
```

### 3. User Feedback
Provide clear feedback for all operations:
```javascript
// Success
if (result.successful > 0) {
  showNotification(`Successfully synced ${result.successful} records`, 'success');
}

// Partial failure
if (result.failed > 0) {
  showNotification(`${result.failed} records failed to sync. Check details.`, 'warning');
}

// Complete failure
if (result.successful === 0 && result.failed > 0) {
  showNotification('Failed to sync any records. Please try again.', 'error');
}
```

### 4. Retry Logic
Implement retry for network failures:
```javascript
async function syncWithRetry(date, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await syncRosterAttendance(date);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
    }
  }
}
```

### 5. Optimistic Updates
Update UI optimistically for better UX:
```javascript
const handleSync = async () => {
  // Show loading immediately
  setLoading(true);
  
  // Optimistically update UI
  setSyncStatus('syncing');
  
  try {
    const result = await syncRosterAttendance(date);
    setSyncStatus('synced');
    // Update attendance list
    refreshAttendanceList();
  } catch (error) {
    setSyncStatus('error');
    // Revert optimistic update if needed
  } finally {
    setLoading(false);
  }
};
```

### 6. Debouncing
Debounce rapid API calls:
```javascript
import { debounce } from 'lodash';

const debouncedSync = debounce(async (date) => {
  await syncRosterAttendance(date);
}, 500);

// Usage
<input onChange={(e) => debouncedSync(e.target.value)} />
```

---

## 🔗 Related Documentation

- [Roster Sync Attendance API Documentation](./ROSTER_SYNC_ATTENDANCE_API.md)
- [Attendance API Documentation](./ATTENDANCE_DATE_FROM_TO_FIX.md)
- [Frontend Developer Complete Guide](./FRONTEND_DEVELOPER_COMPLETE_GUIDE.md)

---

## 📞 Support

If you encounter any issues:

1. Check the API response for error messages
2. Verify authentication token is valid
3. Ensure date format is `YYYY-MM-DD`
4. Check network connectivity
5. Review server logs if available

---

**Last Updated:** March 8, 2026  
**Status:** ✅ Production Ready  
**Version:** 1.0
