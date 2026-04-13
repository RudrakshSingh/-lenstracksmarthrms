# Attendance Status API Guide for Frontend Developers

## Date: 2026-02-24
## Version: 2.0

---

## Overview

This guide covers the **Attendance Status API** (`GET /api/attendance/today`) and how to properly handle clock-in/clock-out status in the frontend.

---

## Key Changes (Latest Update)

### ✅ New Field: `isClockedIn`

The API response now includes an explicit `isClockedIn` boolean field that clearly indicates if the employee is currently clocked in.

### ✅ Store Validation Fix

Store codes (like "LK001") are now properly handled. The backend validates and converts store codes to ObjectIds automatically.

---

## API Endpoint

### Get Today's Attendance

```
GET /api/attendance/today?employeeId={employeeId}&date={date}
```

**Query Parameters:**
- `employeeId` (optional): Employee ID (e.g., "EMP-2026-969954")
  - Required for Admin/HR to query specific employees
  - Optional for employees (uses their own ID from token)
- `date` (optional): Date in ISO format (e.g., "2026-02-24")
  - Defaults to today's date

**Headers:**
```javascript
{
  "Authorization": "Bearer {JWT_TOKEN}",
  "X-Tenant-Id": "{tenantId}"  // Optional, extracted from token if not provided
}
```

---

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "data": {
    "id": "699d60084cb279fa3c372713",
    "_id": "699d60084cb279fa3c372713",
    "employeeId": "EMP-2026-969954",
    "employeeName": "John Doe",
    "isClockedIn": false,  // ⭐ NEW FIELD - Use this to check status
    "date": "2026-02-24T08:23:36.724Z",
    "checkIn": {
      "time": "2026-02-24T08:23:36.724Z",
      "location": {
        "latitude": 28.6139,
        "longitude": 77.209,
        "address": "Testing clock-in API"
      },
      "selfie": null
    },
    "checkOut": {
      "time": "2026-02-24T08:45:58.987Z",
      "location": {
        "latitude": 21.250118576816707,
        "longitude": 81.66254864516497,
        "address": "Punch out from dashboard"
      },
      "selfie": null
    },
    "totalHours": 0.37,
    "status": "present",
    "isGeofenceValid": true,
    "storeId": "6991BF3C8583D4F4470A1E6A",
    "storeCode": "LK001",
    "remarks": null,
    "createdAt": "2026-02-24T08:23:36.724Z",
    "updatedAt": "2026-02-24T08:45:58.987Z"
  },
  "message": "Today's attendance retrieved successfully"
}
```

### No Attendance Response (200)

```json
{
  "success": true,
  "data": null,
  "message": "No attendance for today"
}
```

### Error Response (400/401/403/500)

```json
{
  "success": false,
  "error": "Error message",
  "message": "User-friendly error message"
}
```

---

## Understanding `isClockedIn` Field

### Logic

```javascript
isClockedIn = checkIn exists AND checkOut is null/undefined
```

### Possible Scenarios

| Scenario | `isClockedIn` | `checkIn` | `checkOut` | Description |
|----------|---------------|-----------|------------|-------------|
| Not clocked in today | `false` | `null` | `null` | No attendance record for today |
| Currently clocked in | `true` | `{...}` | `null` | Clocked in but not clocked out |
| Clocked in and out | `false` | `{...}` | `{...}` | Complete attendance for today |

---

## Frontend Implementation

### React/TypeScript Example

```typescript
interface AttendanceData {
  id: string;
  employeeId: string;
  employeeName: string;
  isClockedIn: boolean;  // ⭐ Use this field
  checkIn: {
    time: string;
    location: {
      latitude: number;
      longitude: number;
      address: string;
    };
    selfie: string | null;
  } | null;
  checkOut: {
    time: string;
    location: {
      latitude: number;
      longitude: number;
      address: string;
    };
    selfie: string | null;
  } | null;
  date: string;
  totalHours?: number;
  status: string;
  storeCode?: string;
}

interface AttendanceResponse {
  success: boolean;
  data: AttendanceData | null;
  message: string;
}

// Fetch attendance status
async function getTodayAttendance(employeeId?: string): Promise<AttendanceData | null> {
  const token = localStorage.getItem('authToken');
  const tenantId = localStorage.getItem('tenantId');
  
  const params = new URLSearchParams();
  if (employeeId) {
    params.append('employeeId', employeeId);
  }
  // date is optional, defaults to today
  
  const response = await fetch(
    `${API_BASE_URL}/api/attendance/today?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId || '',
        'Content-Type': 'application/json'
      }
    }
  );
  
  const data: AttendanceResponse = await response.json();
  
  if (!data.success || !data.data) {
    return null;
  }
  
  return data.data;
}

// Component usage
function AttendanceStatus() {
  const [attendance, setAttendance] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchAttendance() {
      try {
        const data = await getTodayAttendance();
        setAttendance(data);
      } catch (error) {
        console.error('Failed to fetch attendance:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchAttendance();
  }, []);
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!attendance) {
    return (
      <div>
        <p>No attendance for today</p>
        <button onClick={handleClockIn}>Clock In</button>
      </div>
    );
  }
  
  // ⭐ Use isClockedIn field (recommended)
  if (attendance.isClockedIn) {
    return (
      <div>
        <p>✅ Currently Clocked In</p>
        <p>Check-in: {new Date(attendance.checkIn.time).toLocaleString()}</p>
        <button onClick={handleClockOut}>Clock Out</button>
      </div>
    );
  }
  
  // Employee has clocked in and out today
  return (
    <div>
      <p>✅ Attendance Complete</p>
      <p>Check-in: {new Date(attendance.checkIn.time).toLocaleString()}</p>
      <p>Check-out: {new Date(attendance.checkOut.time).toLocaleString()}</p>
      <p>Total Hours: {attendance.totalHours || 0}</p>
      <button onClick={handleClockIn}>Clock In Again</button>
    </div>
  );
}
```

### Vue.js Example

```vue
<template>
  <div class="attendance-status">
    <div v-if="loading">Loading...</div>
    
    <div v-else-if="!attendance">
      <p>No attendance for today</p>
      <button @click="clockIn">Clock In</button>
    </div>
    
    <!-- ⭐ Use isClockedIn field -->
    <div v-else-if="attendance.isClockedIn">
      <p>✅ Currently Clocked In</p>
      <p>Check-in: {{ formatTime(attendance.checkIn.time) }}</p>
      <button @click="clockOut">Clock Out</button>
    </div>
    
    <div v-else>
      <p>✅ Attendance Complete</p>
      <p>Check-in: {{ formatTime(attendance.checkIn.time) }}</p>
      <p>Check-out: {{ formatTime(attendance.checkOut.time) }}</p>
      <p>Total Hours: {{ attendance.totalHours || 0 }}</p>
      <button @click="clockIn">Clock In Again</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

interface AttendanceData {
  isClockedIn: boolean;
  checkIn: { time: string } | null;
  checkOut: { time: string } | null;
  totalHours?: number;
}

const attendance = ref<AttendanceData | null>(null);
const loading = ref(true);

async function fetchAttendance() {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/attendance/today', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    attendance.value = data.data;
  } catch (error) {
    console.error('Failed to fetch attendance:', error);
  } finally {
    loading.value = false;
  }
}

function formatTime(time: string) {
  return new Date(time).toLocaleString();
}

onMounted(() => {
  fetchAttendance();
});
</script>
```

### Vanilla JavaScript Example

```javascript
// Fetch attendance status
async function getTodayAttendance(employeeId) {
  const token = localStorage.getItem('authToken');
  const tenantId = localStorage.getItem('tenantId');
  
  const url = employeeId 
    ? `/api/attendance/today?employeeId=${employeeId}`
    : '/api/attendance/today';
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId || '',
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!data.success || !data.data) {
      return null;
    }
    
    return data.data;
  } catch (error) {
    console.error('Failed to fetch attendance:', error);
    return null;
  }
}

// Update UI based on attendance status
async function updateAttendanceStatus() {
  const attendance = await getTodayAttendance();
  
  if (!attendance) {
    // No attendance - show clock-in button
    document.getElementById('status').textContent = 'Not clocked in';
    document.getElementById('clockInBtn').style.display = 'block';
    document.getElementById('clockOutBtn').style.display = 'none';
    return;
  }
  
  // ⭐ Use isClockedIn field (recommended approach)
  if (attendance.isClockedIn) {
    // Currently clocked in - show clock-out button
    document.getElementById('status').textContent = '✅ Currently Clocked In';
    document.getElementById('checkInTime').textContent = 
      new Date(attendance.checkIn.time).toLocaleString();
    document.getElementById('clockInBtn').style.display = 'none';
    document.getElementById('clockOutBtn').style.display = 'block';
  } else {
    // Clocked in and out - show summary
    document.getElementById('status').textContent = '✅ Attendance Complete';
    document.getElementById('checkInTime').textContent = 
      new Date(attendance.checkIn.time).toLocaleString();
    document.getElementById('checkOutTime').textContent = 
      new Date(attendance.checkOut.time).toLocaleString();
    document.getElementById('totalHours').textContent = 
      `Total: ${attendance.totalHours || 0} hours`;
    document.getElementById('clockInBtn').style.display = 'block';
    document.getElementById('clockOutBtn').style.display = 'none';
  }
}

// Call on page load
updateAttendanceStatus();
```

---

## Best Practices

### ✅ DO

1. **Use `isClockedIn` field** - It's the most reliable way to check status
   ```javascript
   if (attendance.isClockedIn) {
     // Show clock-out button
   }
   ```

2. **Handle null data** - Always check if `data` is null
   ```javascript
   if (!response.data || !response.data.data) {
     // No attendance for today
     return;
   }
   ```

3. **Show appropriate UI** - Display different states clearly
   - Not clocked in → Show "Clock In" button
   - Currently clocked in → Show "Clock Out" button with check-in time
   - Clocked in and out → Show summary with both times

4. **Refresh status periodically** - Poll the API every 30-60 seconds
   ```javascript
   setInterval(() => {
     updateAttendanceStatus();
   }, 30000); // Every 30 seconds
   ```

5. **Handle errors gracefully** - Show user-friendly error messages
   ```javascript
   try {
     const attendance = await getTodayAttendance();
   } catch (error) {
     showError('Failed to load attendance status. Please try again.');
   }
   ```

### ❌ DON'T

1. **Don't rely only on `checkIn` existence** - Use `isClockedIn` instead
   ```javascript
   // ❌ Wrong
   if (attendance.checkIn) {
     // This doesn't tell you if they're currently clocked in
   }
   
   // ✅ Correct
   if (attendance.isClockedIn) {
     // This clearly indicates current status
   }
   ```

2. **Don't assume `checkOut` is null means clocked in** - Always use `isClockedIn`
   ```javascript
   // ❌ Wrong
   if (!attendance.checkOut) {
     // Not reliable - checkOut might be null for other reasons
   }
   
   // ✅ Correct
   if (attendance.isClockedIn) {
     // Reliable - backend calculates this correctly
   }
   ```

3. **Don't ignore errors** - Always handle API errors
   ```javascript
   // ❌ Wrong
   const attendance = await getTodayAttendance();
   // No error handling
   
   // ✅ Correct
   try {
     const attendance = await getTodayAttendance();
   } catch (error) {
     // Handle error
   }
   ```

---

## Error Handling

### Common Errors

| Status Code | Error | Solution |
|------------|-------|----------|
| 400 | Bad Request | Check query parameters |
| 401 | Unauthorized | Refresh token or re-login |
| 403 | Forbidden | Check user permissions |
| 404 | Not Found | Employee not found |
| 500 | Internal Server Error | Retry after a few seconds |

### Error Handling Example

```typescript
async function getTodayAttendance(employeeId?: string): Promise<AttendanceData | null> {
  try {
    const response = await fetch(/* ... */);
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired - redirect to login
        window.location.href = '/login';
        return null;
      }
      
      if (response.status === 403) {
        throw new Error('You do not have permission to view this attendance');
      }
      
      throw new Error(`Failed to fetch attendance: ${response.statusText}`);
    }
    
    const data: AttendanceResponse = await response.json();
    
    if (!data.success) {
      console.error('API error:', data.error);
      return null;
    }
    
    return data.data;
  } catch (error) {
    console.error('Network error:', error);
    throw error;
  }
}
```

---

## Store Validation

### What Changed

Previously, store codes (like "LK001") caused validation errors. This is now fixed.

### For Frontend Developers

You don't need to do anything special. The backend now:
- Validates store ObjectIds
- Converts store codes to ObjectIds automatically
- Handles both formats seamlessly

### Store Information in Response

```json
{
  "storeId": "6991BF3C8583D4F4470A1E6A",
  "storeCode": "LK001"
}
```

Both fields are available in the response for your use.

---

## Testing

### Test Scenarios

1. **No Attendance**
   - Call API without any attendance record
   - Expected: `data: null`, `isClockedIn: undefined`

2. **Currently Clocked In**
   - Employee clocked in but not out
   - Expected: `isClockedIn: true`, `checkIn: {...}`, `checkOut: null`

3. **Clocked In and Out**
   - Employee completed attendance for the day
   - Expected: `isClockedIn: false`, `checkIn: {...}`, `checkOut: {...}`

### Test Code

```javascript
// Test function
async function testAttendanceStatus() {
  const testCases = [
    { name: 'No attendance', employeeId: 'NONEXISTENT' },
    { name: 'Current employee', employeeId: 'EMP-2026-969954' }
  ];
  
  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);
    const attendance = await getTodayAttendance(testCase.employeeId);
    
    if (!attendance) {
      console.log('  ✅ No attendance (expected)');
      continue;
    }
    
    console.log(`  isClockedIn: ${attendance.isClockedIn}`);
    console.log(`  checkIn: ${attendance.checkIn ? 'exists' : 'null'}`);
    console.log(`  checkOut: ${attendance.checkOut ? 'exists' : 'null'}`);
    
    // Verify logic
    const expectedIsClockedIn = !!(attendance.checkIn && !attendance.checkOut);
    if (attendance.isClockedIn === expectedIsClockedIn) {
      console.log('  ✅ Status matches expected logic');
    } else {
      console.error('  ❌ Status mismatch!');
    }
  }
}
```

---

## Migration Guide

### If You're Using Old Logic

**Before:**
```javascript
// Old way - checking checkIn existence
if (attendance.checkIn && !attendance.checkOut) {
  // Show clock-out button
}
```

**After:**
```javascript
// New way - use isClockedIn field
if (attendance.isClockedIn) {
  // Show clock-out button
}
```

### Benefits

1. **Clearer intent** - `isClockedIn` is self-documenting
2. **Less error-prone** - Backend calculates it correctly
3. **Future-proof** - If logic changes, backend handles it

---

## Support

### Questions?

- Check this documentation first
- Review API response examples
- Test with the provided code samples

### Issues?

- Verify you're using the latest API version
- Check that `isClockedIn` field is present in response
- Ensure proper error handling

---

## Changelog

### Version 2.0 (2026-02-24)
- ✅ Added `isClockedIn` field to response
- ✅ Fixed store validation for store codes
- ✅ Improved error messages

### Version 1.0
- Initial API documentation

---

**Last Updated:** 2026-02-24  
**API Version:** 2.0
