# Auto Clock-Out Features

## Features Added

### 1. Auto Clock-Out on Logout
When employee logs out, the system automatically clocks them out from attendance.

**Implementation:**
- Modified `auth-service` logout function to call `attendance-service` clock-out API
- Non-blocking: If attendance service is unavailable, logout still succeeds
- Logs warning if auto clock-out fails but doesn't block logout

**Files Modified:**
- `microservices/auth-service/src/services/auth.service.js` - Added auto clock-out call
- `microservices/auth-service/src/controllers/authController.js` - Pass token to logout service

### 2. Auto Clock-Out on Geofence Violation (200m)
When employee goes outside 200m geofencing radius, the system automatically clocks them out and requires re-login.

**Implementation:**
- Modified `track-location` endpoint to check if employee is within 200m radius
- If outside radius, automatically clocks out
- Returns 401 Unauthorized with `requiresReLogin: true` flag
- Frontend should handle 401 by logging out user and requiring re-login

**Files Modified:**
- `microservices/attendance-service/src/controllers/attendanceController.js` - Updated geofence check to 200m and return 401
- `microservices/attendance-service/src/services/attendance.service.js` - Updated default geofence radius to 200m

## Changes Made

### Auth Service - Logout with Auto Clock-Out

```javascript
async logout(userId, ip, userAgent, token = null) {
  // Auto clock-out from attendance service
  try {
    const axios = require('axios');
    const ATTENDANCE_SERVICE_URL = process.env.ATTENDANCE_SERVICE_URL || 'http://attendance-service:80';
    
    const user = await User.findById(userId);
    if (user && (user.employee_id || user.employeeId)) {
      await axios.post(`${ATTENDANCE_SERVICE_URL}/api/attendance/clock-out`, {
        latitude: 0,
        longitude: 0,
        notes: 'Auto clock-out on logout'
      }, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        },
        timeout: 3000
      }).catch(error => {
        // Non-blocking - log but don't fail logout
        logger.warn('Auto clock-out on logout failed', { error: error.message });
      });
    }
  } catch (error) {
    // Non-blocking
    logger.warn('Auto clock-out on logout error', { error: error.message });
  }
  
  // Continue with normal logout
  await this.removeRefreshToken(userId);
  // ...
}
```

### Attendance Service - Geofence Violation Auto Clock-Out

```javascript
// In trackLocation controller
const geofenceRadius = store.geofenceRadius || 200; // 200 meters
const withinGeofence = distance <= geofenceRadius;

if (!withinGeofence) {
  // Auto clock-out
  openAttendance.check_out_time = new Date();
  openAttendance.logout_reason = 'auto_geofence';
  openAttendance.is_geofence_violation = true;
  await openAttendance.save();
  
  // Return 401 to force re-login
  return res.status(401).json({
    success: false,
    action: 'auto_logout',
    requiresReLogin: true,
    message: `Auto-logged out: You are ${Math.round(distance)}m away from store (limit: ${geofenceRadius}m). Please login again.`
  });
}
```

## Geofence Radius Updated

- **Previous:** 100 meters default
- **New:** 200 meters default
- **Updated in:**
  - `clockIn` service function
  - `clockOut` service function
  - `trackLocation` controller

## Frontend Integration

### Handle Geofence Violation (401 Response)

```javascript
// When calling track-location API
const response = await fetch(`${API_BASE_URL}/api/attendance/track-location`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': tenantId,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ latitude, longitude })
});

const data = await response.json();

if (response.status === 401 && data.requiresReLogin) {
  // Auto clock-out due to geofence violation
  // Logout user and require re-login
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  window.location.href = '/login';
  alert(data.message || 'You have been logged out. Please login again.');
}
```

### Handle Logout (Auto Clock-Out)

```javascript
const handleLogout = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Logout will automatically clock-out employee
    // Clear tokens and redirect
    localStorage.clear();
    window.location.href = '/login';
  } catch (error) {
    // Even if logout fails, clear local storage
    localStorage.clear();
    window.location.href = '/login';
  }
};
```

## API Endpoints

### 1. Logout (with Auto Clock-Out)
```
POST /api/auth/logout
Headers:
  Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Note:** This automatically clocks out the employee if they are clocked in.

### 2. Track Location (with Auto Clock-Out on Geofence Violation)
```
POST /api/attendance/track-location
Headers:
  Authorization: Bearer <token>
  x-tenant-id: <tenantId>
Body:
  {
    "latitude": 28.6139,
    "longitude": 77.2090
  }
```

**Response (Within Geofence):**
```json
{
  "success": true,
  "data": {
    "action": "none",
    "withinGeofence": true,
    "distance": 50,
    "geofenceRadius": 200
  }
}
```

**Response (Outside Geofence - 401):**
```json
{
  "success": false,
  "action": "auto_logout",
  "withinGeofence": false,
  "distance": 250,
  "geofenceRadius": 200,
  "requiresReLogin": true,
  "message": "Auto-logged out: You are 250m away from store (limit: 200m). Please login again."
}
```

## Configuration

### Geofence Radius
- **Default:** 200 meters
- **Configurable:** Set `geofenceRadius` on Store model
- **Override:** Can be set per store in database

### Environment Variables
- `ATTENDANCE_SERVICE_URL` - URL for attendance service (default: `http://attendance-service:80`)
- `HR_SERVICE_URL` - URL for HR service (for employee/store lookup)

## Testing

### Test Auto Clock-Out on Logout
1. Clock in as employee
2. Call logout API
3. Verify attendance record shows `check_out_time` set
4. Verify `logout_reason` is not set (normal logout)

### Test Auto Clock-Out on Geofence Violation
1. Clock in as employee
2. Call `track-location` with coordinates > 200m from store
3. Verify:
   - Response is 401
   - `requiresReLogin: true`
   - Attendance record shows `check_out_time` set
   - `logout_reason: 'auto_geofence'`
   - `is_geofence_violation: true`
4. Frontend should logout user and require re-login

## Deployment

Deploy both services:
```bash
# Deploy auth-service
./deploy-auth-register-fix.sh

# Deploy attendance-service
# Use deploy-all-fixes-complete.sh or manually deploy
```

## Notes

- Auto clock-out on logout is **non-blocking** - if attendance service is unavailable, logout still succeeds
- Auto clock-out on geofence violation **requires re-login** - returns 401 to force frontend logout
- Geofence radius is now **200m** by default (updated from 100m)
- Frontend must handle 401 response from `track-location` and logout user
