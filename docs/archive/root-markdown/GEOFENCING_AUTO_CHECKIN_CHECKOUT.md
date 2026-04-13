# 🗺️ Geofencing Auto Check-In/Check-Out Guide

## 📊 Current Implementation Status

### ✅ **Auto Check-Out (Logout)**: WORKING
- When employee leaves geofence → Automatically clocks out
- Uses `POST /api/attendance/track-location` endpoint
- Sets `logout_reason: 'auto_geofence'`
- Calculates total working hours

### ✅ **Auto Check-In (Login)**: NOW IMPLEMENTED
- When employee returns to geofence → Can automatically clock in
- Requires `autoCheckIn: true` flag in request
- Only works if employee was previously auto-logged out (within 30 minutes)

---

## 🔄 How It Works

### Flow Diagram

```
Employee Clocks In (Manual)
    ↓
Employee is within geofence
    ↓
Employee leaves geofence
    ↓
[Auto Check-Out Triggered] ✅
    ↓
Employee returns to geofence
    ↓
[Auto Check-In Available] ✅
    ↓
If autoCheckIn=true → Auto Check-In ✅
```

---

## 📍 API Endpoint

### Track Location (Auto Check-Out/Check-In)

**Endpoint**: `POST /api/attendance/track-location`  
**Authentication**: Required (Active Employee)

#### Request Body

```json
{
  "latitude": 19.0760,
  "longitude": 72.8777,
  "autoCheckIn": false  // Optional: Set to true to trigger auto check-in
}
```

#### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `latitude` | Number | ✅ Yes | GPS latitude |
| `longitude` | Number | ✅ Yes | GPS longitude |
| `autoCheckIn` | Boolean | ❌ Optional | Set to `true` to trigger auto check-in when back in geofence |

---

## 🔄 Response Scenarios

### 1. Employee Within Geofence (No Action)

**Request**:
```json
{
  "latitude": 19.0760,
  "longitude": 72.8777
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Location tracked",
  "data": {
    "action": "none",
    "withinGeofence": true,
    "distance": 45,
    "geofenceRadius": 100,
    "message": "Location tracked successfully"
  }
}
```

---

### 2. Employee Leaves Geofence (Auto Check-Out)

**Request**:
```json
{
  "latitude": 19.0780,  // Outside geofence
  "longitude": 72.8800
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Auto-logout performed",
  "data": {
    "action": "auto_logout",
    "withinGeofence": false,
    "distance": 250,
    "geofenceRadius": 100,
    "message": "Auto-logged out: You are 250m away from store (limit: 100m)"
  }
}
```

**What Happens**:
- ✅ Current attendance session is automatically closed
- ✅ `check_out_time` is set to current time
- ✅ `logout_reason` is set to `'auto_geofence'`
- ✅ `is_geofence_violation` is set to `true`
- ✅ Total working hours are calculated

---

### 3. Employee Returns to Geofence (Auto Check-In Available)

**Request** (after auto-logout):
```json
{
  "latitude": 19.0760,  // Back within geofence
  "longitude": 72.8777,
  "autoCheckIn": false  // Not requesting auto check-in yet
}
```

**Response** (200):
```json
{
  "success": true,
  "message": "Location tracked - Auto check-in available",
  "data": {
    "action": "auto_checkin_available",
    "withinGeofence": true,
    "distance": 45,
    "geofenceRadius": 100,
    "lastAutoLogout": "2026-02-16T10:30:00.000Z",
    "message": "You are back within geofence. Auto check-in available.",
    "canAutoCheckIn": true
  }
}
```

---

### 4. Employee Triggers Auto Check-In

**Request**:
```json
{
  "latitude": 19.0760,
  "longitude": 72.8777,
  "autoCheckIn": true  // ✅ Request auto check-in
}
```

**Response** (201):
```json
{
  "success": true,
  "message": "Auto check-in performed",
  "data": {
    "action": "auto_checkin",
    "withinGeofence": true,
    "distance": 45,
    "geofenceRadius": 100,
    "attendance": {
      "id": "6992a91caff40adbd9e8fa50",
      "checkInTime": "2026-02-16T10:45:00.000Z",
      "status": "present"
    },
    "message": "Auto check-in successful: You are back within geofence"
  }
}
```

**What Happens**:
- ✅ New attendance record is created
- ✅ `check_in_time` is set to current time
- ✅ Location is recorded
- ✅ Geofence status is validated
- ✅ Notes indicate it's an auto check-in

---

## 📱 Frontend Implementation

### React Hook Example

```javascript
import { useState, useEffect, useRef } from 'react';

const useGeofenceTracking = (accessToken, tenantId = 'upcapto', interval = 30000) => {
  const [status, setStatus] = useState('tracking');
  const [lastAction, setLastAction] = useState(null);
  const [wasAutoLoggedOut, setWasAutoLoggedOut] = useState(false);
  const intervalRef = useRef(null);
  
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 
    'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';
  
  const trackLocation = async (latitude, longitude, autoCheckIn = false) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/attendance/track-location`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          latitude,
          longitude,
          autoCheckIn
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const action = data.data.action;
        
        if (action === 'auto_logout') {
          setStatus('logged_out');
          setWasAutoLoggedOut(true);
          setLastAction('auto_logout');
          // Stop tracking or reduce frequency
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
        } else if (action === 'auto_checkin_available') {
          setStatus('checkin_available');
          setLastAction('checkin_available');
          
          // If autoCheckIn was requested but failed, show error
          if (autoCheckIn && data.data.error) {
            console.error('Auto check-in failed:', data.data.error);
          }
        } else if (action === 'auto_checkin') {
          setStatus('logged_in');
          setWasAutoLoggedOut(false);
          setLastAction('auto_checkin');
          // Resume normal tracking
          startTracking();
        } else {
          setStatus('tracking');
          setLastAction('none');
        }
        
        return data.data;
      }
    } catch (error) {
      console.error('Location tracking error:', error);
    }
  };
  
  const startTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        trackLocation(
          position.coords.latitude,
          position.coords.longitude,
          false // Don't auto check-in automatically - let user confirm
        );
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
    
    // Also track periodically as backup
    intervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          trackLocation(
            position.coords.latitude,
            position.coords.longitude,
            false
          );
        },
        (error) => {
          console.error('Geolocation error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000
        }
      );
    }, interval);
    
    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  };
  
  const triggerAutoCheckIn = async (latitude, longitude) => {
    return await trackLocation(latitude, longitude, true);
  };
  
  useEffect(() => {
    startTracking();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [accessToken]);
  
  return {
    status,
    lastAction,
    wasAutoLoggedOut,
    triggerAutoCheckIn,
    startTracking
  };
};

export default useGeofenceTracking;
```

---

### React Component Example

```javascript
import React, { useState } from 'react';
import useGeofenceTracking from './hooks/useGeofenceTracking';

const GeofenceAttendanceTracker = ({ accessToken, tenantId }) => {
  const { status, lastAction, wasAutoLoggedOut, triggerAutoCheckIn } = useGeofenceTracking(accessToken, tenantId);
  const [location, setLocation] = useState(null);
  
  const handleAutoCheckIn = async () => {
    if (!location) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setLocation({ lat, lon });
          await triggerAutoCheckIn(lat, lon);
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    } else {
      await triggerAutoCheckIn(location.lat, location.lon);
    }
  };
  
  return (
    <div className="geofence-tracker">
      <div className="status">
        <h3>Geofence Status</h3>
        <p>Status: {status}</p>
        <p>Last Action: {lastAction || 'None'}</p>
      </div>
      
      {wasAutoLoggedOut && status === 'checkin_available' && (
        <div className="auto-checkin-prompt">
          <p>You were auto-logged out. You're back within geofence.</p>
          <button onClick={handleAutoCheckIn}>
            Auto Check-In
          </button>
        </div>
      )}
      
      {status === 'logged_out' && (
        <div className="logged-out">
          <p>⚠️ You have been auto-logged out due to geofence violation.</p>
          <p>Return to your store location to check in again.</p>
        </div>
      )}
      
      {status === 'logged_in' && (
        <div className="logged-in">
          <p>✅ Auto check-in successful!</p>
        </div>
      )}
    </div>
  );
};

export default GeofenceAttendanceTracker;
```

---

## ⚙️ Configuration

### Store Geofence Settings

Each store has:
- **Coordinates**: `latitude`, `longitude`
- **Geofence Radius**: `geofenceRadius` (default: 100 meters)

**Example Store Configuration**:
```json
{
  "name": "Mumbai Main Store",
  "code": "STORE-MUM-001",
  "coordinates": {
    "latitude": 19.0760,
    "longitude": 72.8777
  },
  "geofenceRadius": 100  // meters
}
```

---

## 🔍 How Auto Check-Out Works

1. **Employee is clocked in** (has active attendance session)
2. **Frontend calls** `POST /api/attendance/track-location` periodically (e.g., every 30 seconds)
3. **Backend checks**:
   - Finds open attendance session
   - Calculates distance from store
   - If distance > geofenceRadius → **Auto check-out**
4. **Attendance record is updated**:
   - `check_out_time` = current time
   - `logout_reason` = `'auto_geofence'`
   - `is_geofence_violation` = `true`
   - Total hours calculated

---

## 🔍 How Auto Check-In Works

1. **Employee was auto-logged out** (within last 30 minutes)
2. **Employee returns to geofence**
3. **Frontend calls** `POST /api/attendance/track-location` with `autoCheckIn: true`
4. **Backend checks**:
   - Finds recent auto-logout record
   - Verifies employee is within geofence
   - If `autoCheckIn: true` → **Auto check-in**
5. **New attendance record is created**:
   - `check_in_time` = current time
   - Location recorded
   - Notes: "Auto check-in: Returned to geofence after auto-logout"

---

## 📋 Important Notes

### Auto Check-Out
- ✅ **Automatic**: No user action required
- ✅ **Immediate**: Happens as soon as employee leaves geofence
- ✅ **Logged**: `logout_reason: 'auto_geofence'` in attendance record
- ⚠️ **Requires**: Frontend must call `track-location` endpoint periodically

### Auto Check-In
- ⚠️ **Semi-Automatic**: Requires `autoCheckIn: true` flag
- ✅ **Smart**: Only available if employee was recently auto-logged out
- ✅ **Time Window**: Only works within 30 minutes of auto-logout
- ⚠️ **Requires**: Frontend must detect `auto_checkin_available` and call with flag

---

## 🧪 Testing

### Test Auto Check-Out

```bash
# 1. Clock in first
curl -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/clock-in" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: upcapto" \
  -F "latitude=19.0760" \
  -F "longitude=72.8777"

# 2. Track location outside geofence (250m away)
curl -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/track-location" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: upcapto" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 19.0780,
    "longitude": 72.8800
  }'

# Should return: action: "auto_logout"
```

### Test Auto Check-In

```bash
# 1. After auto-logout, return to geofence
curl -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/track-location" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: upcapto" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 19.0760,
    "longitude": 72.8777,
    "autoCheckIn": true
  }'

# Should return: action: "auto_checkin"
```

---

## 🎯 Frontend Implementation Checklist

- [ ] Set up periodic location tracking (every 30 seconds)
- [ ] Call `POST /api/attendance/track-location` with current GPS coordinates
- [ ] Handle `auto_logout` response - show notification to user
- [ ] Detect `auto_checkin_available` response - show prompt to user
- [ ] Implement auto check-in button/action
- [ ] Call `track-location` with `autoCheckIn: true` when user confirms
- [ ] Handle `auto_checkin` response - show success message
- [ ] Resume normal tracking after auto check-in

---

## ⚠️ Limitations & Considerations

1. **Battery Usage**: Continuous GPS tracking consumes battery
   - **Solution**: Use background location updates with appropriate intervals
   - **Recommendation**: Track every 30-60 seconds when active

2. **Network Dependency**: Requires internet connection
   - **Solution**: Queue location updates if offline, send when online

3. **GPS Accuracy**: GPS can be inaccurate indoors
   - **Solution**: Use high accuracy mode, combine with network location

4. **Auto Check-In Window**: Only works within 30 minutes of auto-logout
   - **Reason**: Prevents accidental auto check-in after long absence
   - **Workaround**: Manual check-in always available

5. **Multiple Sessions**: Only one active session per employee
   - **Behavior**: Auto check-out closes current session before new check-in

---

## 📊 Attendance Record Fields

### Auto Logout Record
```json
{
  "check_in_time": "2026-02-16T09:00:00.000Z",
  "check_out_time": "2026-02-16T10:30:00.000Z",
  "logout_reason": "auto_geofence",
  "is_geofence_violation": true,
  "check_out_location": {
    "latitude": 19.0780,
    "longitude": 72.8800,
    "address": "Auto-logout: 250m from store"
  }
}
```

### Auto Check-In Record
```json
{
  "check_in_time": "2026-02-16T10:45:00.000Z",
  "check_in_location": {
    "latitude": 19.0760,
    "longitude": 72.8777,
    "address": "Auto check-in: Returned to geofence after auto-logout"
  },
  "geofence_status": "valid",
  "status": "present"
}
```

---

## 🚀 Quick Start for Frontend

```javascript
// 1. Start tracking when employee clocks in
const startGeofenceTracking = () => {
  const interval = setInterval(async () => {
    const position = await getCurrentPosition();
    
    const response = await fetch('/api/attendance/track-location', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': 'upcapto',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      })
    });
    
    const data = await response.json();
    
    if (data.data.action === 'auto_logout') {
      // Show notification: "You have been auto-logged out"
      showNotification('Auto-logged out due to geofence violation');
      clearInterval(interval);
    } else if (data.data.action === 'auto_checkin_available') {
      // Show prompt: "You're back! Auto check-in?"
      showAutoCheckInPrompt(() => {
        // User confirms - trigger auto check-in
        triggerAutoCheckIn(position.coords.latitude, position.coords.longitude);
      });
    }
  }, 30000); // Every 30 seconds
  
  return interval;
};

// 2. Trigger auto check-in
const triggerAutoCheckIn = async (latitude, longitude) => {
  const response = await fetch('/api/attendance/track-location', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': 'upcapto',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      latitude,
      longitude,
      autoCheckIn: true
    })
  });
  
  const data = await response.json();
  
  if (data.data.action === 'auto_checkin') {
    showNotification('Auto check-in successful!');
  }
};
```

---

**Last Updated**: 2026-02-16  
**Status**: ✅ Auto Check-Out Working | ✅ Auto Check-In Implemented  
**API Version**: 1.0
