# Clock-In Script Guide for Frontend Developers

## Overview

The `clock-in.js` script is used by the frontend for new employee punch-in. It has been updated to align with **Attendance Status API v2.0** and includes proper handling of the `isClockedIn` field.

---

## Script Location

```
scripts/clock-in.js
```

---

## Features

### ✅ API v2.0 Compatible
- Uses `isClockedIn` field from `/api/attendance/today` response
- Fallback logic for backward compatibility
- Proper error handling

### ✅ Smart Status Checking
- Checks today's attendance before clocking in
- Prevents duplicate clock-ins
- Shows clear status messages

### ✅ Error Handling
- Handles store validation errors
- Handles employee not found errors
- Handles already clocked in scenarios
- User-friendly error messages

---

## Usage

### Basic Usage

```bash
PASSWORD=yourpassword node scripts/clock-in.js
```

### With Custom Email

```bash
EMAIL=user@example.com PASSWORD=yourpassword node scripts/clock-in.js
```

### With Custom Base URL

```bash
BASE_URL=http://localhost:3000 PASSWORD=yourpassword node scripts/clock-in.js
```

### With Custom Location

```bash
LATITUDE=28.6139 LONGITUDE=77.2090 PASSWORD=yourpassword node scripts/clock-in.js
```

### With Custom Date

```bash
DATE=2026-02-24 PASSWORD=yourpassword node scripts/clock-in.js
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PASSWORD` | ✅ Yes | - | Login password |
| `EMAIL` | No | `raviraikwar10022001@gmail.com` | Login email |
| `BASE_URL` | No | `http://localhost:3000` | API base URL |
| `DATE` | No | Today's date | Date in YYYY-MM-DD format |
| `LATITUDE` | No | `28.6139` | GPS latitude |
| `LONGITUDE` | No | `77.2090` | GPS longitude |

---

## Script Flow

### 1. Login
```
POST /api/auth/login
```
- Extracts `accessToken` and `employeeId`
- Extracts `tenantId` for multi-tenant support

### 2. Check Today's Attendance
```
GET /api/attendance/today?employeeId={id}&date={date}
```
- Uses `isClockedIn` field (API v2.0)
- Fallback to `checkIn && !checkOut` for compatibility
- Handles null data (no attendance)

### 3. Clock In (if needed)
```
POST /api/attendance/clock-in
```
- Only proceeds if not already clocked in
- Includes location and timestamp
- Handles errors gracefully

---

## Response Handling

### Already Clocked In

**Output:**
```
ℹ️  Already clocked in today.
   Check-in time: 2/24/2026, 8:23:36 AM
   Status: Currently clocked in (isClockedIn: true)
   💡 Run clock-out script first if you need to clock in again.
```

**Exit Code:** `0` (success, no action needed)

### Attendance Complete

**Output:**
```
ℹ️  Attendance complete for today.
   Check-in: 2/24/2026, 8:23:36 AM
   Check-out: 2/24/2026, 8:45:58 AM
   Total hours: 0.37
   💡 You can clock in again for a new session.
```

**Exit Code:** `0` (continues to clock in)

### Clock In Successful

**Output:**
```
✅ Clock in successful!
   Message: Clock-in recorded successfully
   Check-in time: 2/24/2026, 2:30:00 PM
   Location: Testing clock-in API
   Store: LK001
```

**Exit Code:** `0` (success)

### Errors

#### Already Clocked In (Backend Validation)
```
ℹ️  Already clocked in (backend validation).
   Message: Please clock out from your current session before clocking in again
   💡 Run clock-out script first, then clock-in again if needed.
```

**Exit Code:** `0` (treated as success, no action needed)

#### Store Validation Error
```
❌ Store validation error: Employee not assigned to any store
   This might be a store assignment issue. Please contact HR.
```

**Exit Code:** `1` (error)

#### Employee Not Found
```
❌ Employee not found: Employee not found in HR system
   Please ensure employee exists in HR system.
```

**Exit Code:** `1` (error)

---

## Integration with Frontend

### React/TypeScript Example

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ClockInResult {
  success: boolean;
  message: string;
  alreadyClockedIn?: boolean;
}

async function clockInEmployee(
  email: string,
  password: string,
  latitude?: number,
  longitude?: number
): Promise<ClockInResult> {
  try {
    const env = {
      EMAIL: email,
      PASSWORD: password,
      ...(latitude && { LATITUDE: latitude.toString() }),
      ...(longitude && { LONGITUDE: longitude.toString() }),
    };
    
    const envString = Object.entries(env)
      .map(([key, value]) => `${key}=${value}`)
      .join(' ');
    
    const { stdout, stderr } = await execAsync(
      `${envString} node scripts/clock-in.js`
    );
    
    // Check output for status
    if (stdout.includes('Already clocked in')) {
      return {
        success: true,
        message: 'Already clocked in',
        alreadyClockedIn: true,
      };
    }
    
    if (stdout.includes('Clock in successful')) {
      return {
        success: true,
        message: 'Clock in successful',
      };
    }
    
    return {
      success: false,
      message: stderr || 'Unknown error',
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Clock in failed',
    };
  }
}

// Usage in component
function ClockInButton() {
  const [loading, setLoading] = useState(false);
  
  const handleClockIn = async () => {
    setLoading(true);
    try {
      const result = await clockInEmployee(
        userEmail,
        userPassword,
        currentLatitude,
        currentLongitude
      );
      
      if (result.success) {
        if (result.alreadyClockedIn) {
          showMessage('You are already clocked in');
        } else {
          showMessage('Clock in successful!');
          // Refresh attendance status
          await refreshAttendanceStatus();
        }
      } else {
        showError(result.message);
      }
    } catch (error) {
      showError('Failed to clock in');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <button onClick={handleClockIn} disabled={loading}>
      {loading ? 'Clocking in...' : 'Clock In'}
    </button>
  );
}
```

### Direct API Call (Alternative)

If you prefer to call the API directly instead of using the script:

```typescript
async function clockInDirect(
  token: string,
  tenantId: string,
  latitude: number,
  longitude: number
): Promise<boolean> {
  // First check today's attendance
  const todayRes = await fetch(
    `/api/attendance/today?employeeId=${employeeId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId,
      },
    }
  );
  
  if (todayRes.ok) {
    const data = await todayRes.json();
    if (data.data?.isClockedIn) {
      // Already clocked in
      return false;
    }
  }
  
  // Clock in
  const clockInRes = await fetch('/api/attendance/clock-in', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      latitude,
      longitude,
      timestamp: Date.now(),
      notes: 'Clock-in from frontend',
    }),
  });
  
  return clockInRes.ok;
}
```

---

## Error Codes

| Exit Code | Meaning | Action |
|-----------|---------|--------|
| `0` | Success | No action needed |
| `1` | Error | Check error message |

---

## Troubleshooting

### Issue: "No access token in login response"

**Solution:**
- Check if login API response format changed
- Verify email and password are correct
- Check network connectivity

### Issue: "No employeeId in user"

**Solution:**
- Ensure user account is linked to an employee record
- Contact HR to create employee record
- Verify employee exists in HR system

### Issue: "Store validation error"

**Solution:**
- Employee must be assigned to a store
- Contact HR to assign store to employee
- Verify store exists in system

### Issue: "Already clocked in"

**Solution:**
- This is expected if employee is already clocked in
- Run clock-out script first if needed
- Check `isClockedIn` field in attendance status

---

## Best Practices

### ✅ DO

1. **Check status first** - Always check today's attendance before clocking in
2. **Handle errors** - Show user-friendly error messages
3. **Use isClockedIn** - Rely on `isClockedIn` field for status
4. **Provide location** - Always include latitude and longitude
5. **Log actions** - Log clock-in attempts for debugging

### ❌ DON'T

1. **Don't skip status check** - Always check before clocking in
2. **Don't ignore errors** - Handle all error cases
3. **Don't hardcode credentials** - Use environment variables
4. **Don't assume success** - Always verify response

---

## Testing

### Test Scenarios

1. **New Employee (No Attendance)**
   ```bash
   PASSWORD=xxx node scripts/clock-in.js
   ```
   Expected: Clock in successful

2. **Already Clocked In**
   ```bash
   PASSWORD=xxx node scripts/clock-in.js
   ```
   Expected: "Already clocked in" message

3. **After Clock Out**
   ```bash
   # First clock out
   PASSWORD=xxx node scripts/clock-out.js
   # Then clock in
   PASSWORD=xxx node scripts/clock-in.js
   ```
   Expected: Clock in successful (new session)

---

## Changelog

### Version 2.0 (2026-02-24)
- ✅ Updated to use `isClockedIn` field (API v2.0)
- ✅ Improved error handling
- ✅ Better status messages
- ✅ Store validation error handling
- ✅ Enhanced output formatting

### Version 1.0
- Initial script version

---

**Last Updated:** 2026-02-24  
**Script Version:** 2.0  
**API Version:** 2.0
