# Frontend Attendance State Sync - Quick Fix

## Problem
Backend mein clock-in ho chuka hai, par frontend "Clock In" button dikha raha hai. Jab frontend se punch in karte hain, backend error deta hai: "Please clock out from your current session before clocking in again"

## Quick Solution

### 1. Page Load Par Status Check Karo

```javascript
// Component mount par
useEffect(() => {
  checkCurrentAttendance();
}, []);

const checkCurrentAttendance = async () => {
  const response = await fetch(
    `${API_BASE_URL}/api/attendance/history?limit=1`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId
      }
    }
  );
  
  const data = await response.json();
  
  if (data.success && data.data.attendances?.length > 0) {
    const latest = data.data.attendances[0];
    
    // Active session check: check_in_time hai aur check_out_time null hai
    if (latest.check_in_time && !latest.check_out_time) {
      setStatus('clocked-in'); // "Clock Out" button dikhao
    } else {
      setStatus('clocked-out'); // "Clock In" button dikhao
    }
  } else {
    setStatus('clocked-out'); // No attendance = clock out state
  }
};
```

### 2. Clock-In Error Handle Karo

```javascript
const handleClockIn = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/attendance/clock-in`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId
      },
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Success - status refresh karo
      await checkCurrentAttendance();
    } else {
      // Error check karo
      if (data.message?.includes('clock out') || 
          data.message?.includes('current session')) {
        // "Already clocked in" error - status refresh karo
        await checkCurrentAttendance();
        alert('You are already clocked in. Please clock out first.');
      } else {
        alert(data.message || 'Clock-in failed');
      }
    }
  } catch (error) {
    console.error(error);
  }
};
```

### 3. UI Update Karo

```javascript
{status === 'clocked-in' ? (
  <button onClick={handleClockOut}>Clock Out</button>
) : (
  <button onClick={handleClockIn}>Clock In</button>
)}
```

## Key Points

✅ **Page load par status check karo** - `/api/attendance/history?limit=1` call karo  
✅ **Active session check** - `check_in_time` hai aur `check_out_time` null hai = clocked in  
✅ **Error handle karo** - "already clocked in" error aaye to status refresh karo, error mat dikhao  
✅ **After clock in/out** - Status refresh karo taaki UI update ho  

## API Endpoint

```
GET /api/attendance/history?limit=1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "attendances": [{
      "check_in_time": "2026-02-20T08:30:00.000Z",
      "check_out_time": null  // ← null = still clocked in
    }]
  }
}
```

## Complete Code Example

```javascript
const [status, setStatus] = useState('loading');

useEffect(() => {
  checkStatus();
}, []);

const checkStatus = async () => {
  const res = await fetch(`${API_BASE_URL}/api/attendance/history?limit=1`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
    }
  });
  const data = await res.json();
  
  if (data.data?.attendances?.[0]) {
    const att = data.data.attendances[0];
    setStatus(att.check_in_time && !att.check_out_time ? 'in' : 'out');
  } else {
    setStatus('out');
  }
};

const handleClockIn = async () => {
  const res = await fetch(`${API_BASE_URL}/api/attendance/clock-in`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId },
    body: formData
  });
  const data = await res.json();
  
  if (data.success) {
    await checkStatus(); // Refresh
  } else if (data.message?.includes('clock out')) {
    await checkStatus(); // Refresh on "already clocked in"
    alert('Already clocked in. Please clock out first.');
  }
};

return status === 'in' ? <ClockOutBtn /> : <ClockInBtn />;
```

Yeh implement karo, issue resolve ho jayega! 🎯
