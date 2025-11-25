# Anti-Fake GPS Backend Implementation

## Overview
Complete backend implementation of a multi-layered Anti-Fake GPS system to prevent employees from using fake/mock GPS locations for attendance tracking.

## Architecture

### 9-Level Security System

1. **Mock Location Detection** - Detects if mock location is enabled on device
2. **Device Security** - Checks for rooted/jailbroken devices
3. **Speed Validation** - Detects impossible speeds and teleportation
4. **Network Location Validation** - Compares GPS with network/IP locations
5. **Satellite Signal Validation** - Validates GPS satellite signals
6. **App State Validation** - Checks app foreground state and interaction
7. **Face Verification** - Verifies selfie matches employee photo
8. **Movement Pattern Analysis** - AI-based pattern detection
9. **AI Aggregation Engine** - Combines all signals for final decision

## File Structure

```
attendance-service/
├── src/
│   ├── models/
│   │   ├── LocationViolation.model.js      # Violation records
│   │   └── LocationHistory.model.js        # Location history tracking
│   ├── services/
│   │   ├── security/
│   │   │   ├── mockLocationDetector.service.js      # Level 1 & 2
│   │   │   ├── speedValidator.service.js            # Level 3
│   │   │   ├── networkLocationValidator.service.js  # Level 4
│   │   │   ├── satelliteValidator.service.js        # Level 5
│   │   │   ├── appStateValidator.service.js         # Level 6
│   │   │   ├── faceVerification.service.js          # Level 7
│   │   │   ├── movementPatternAnalyzer.service.js   # Level 8
│   │   │   ├── antiFakeGPSAI.service.js             # Level 9
│   │   │   └── security.service.js                  # Main orchestrator
│   │   └── attendance.service.js
│   ├── controllers/
│   │   ├── securityController.js           # Security endpoints
│   │   └── attendanceController.js         # Updated with security
│   └── routes/
│       └── security.routes.js              # Security API routes
```

## API Endpoints

### Security Validation

#### POST `/api/security/validate-location`
Validate location before any action.

**Request Body:**
```json
{
  "location": {
    "latitude": 19.0760,
    "longitude": 72.8777,
    "accuracy": 10,
    "altitude": 0,
    "heading": 0,
    "speed": 0,
    "timestamp": 1234567890
  },
  "networkLocation": {
    "latitude": 19.0760,
    "longitude": 72.8777,
    "accuracy": 50,
    "source": "wifi"
  },
  "ipLocation": {
    "latitude": 19.0760,
    "longitude": 72.8777,
    "city": "Mumbai",
    "region": "Maharashtra",
    "country": "India",
    "ip": "192.168.1.1"
  },
  "deviceSecurity": {
    "platform": "android",
    "mockLocationEnabled": false,
    "isRooted": false,
    "isJailbroken": false,
    "fakeGPSApps": [],
    "developerMode": false
  },
  "appState": {
    "isActive": true,
    "isOnline": true,
    "lastInteraction": 1234567890,
    "screenOn": true
  },
  "satelliteInfo": {
    "available": true,
    "satelliteCount": 8,
    "averageSNR": 35,
    "satellites": [
      { "id": 1, "snr": 40 },
      { "id": 2, "snr": 35 }
    ]
  },
  "selfie": "base64_or_url",
  "actionType": "CLOCK_IN",
  "timestamp": 1234567890
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "suspiciousScore": 15,
    "action": "ALLOW",
    "message": "Location verified",
    "checks": {
      "mockLocation": { "passed": true },
      "deviceSecurity": { "passed": true },
      "speed": { "passed": true },
      "network": { "passed": true },
      "satellite": { "passed": true },
      "appState": { "passed": true },
      "faceVerification": { "passed": true },
      "aiAnalysis": { "passed": true }
    },
    "violations": [],
    "breakdown": {
      "mockLocation": 0,
      "deviceSecurity": 0,
      "speed": 0,
      "network": 0,
      "satellite": 0,
      "appState": 0,
      "faceVerification": 0,
      "movementPattern": 15
    }
  },
  "message": "Location verified"
}
```

#### POST `/api/security/validate-face`
Verify face match with employee photo.

**Request Body:**
```json
{
  "selfie": "base64_or_url",
  "employeeId": "EMP001",
  "location": {
    "latitude": 19.0760,
    "longitude": 72.8777
  },
  "timestamp": 1234567890
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "confidence": 0.92,
    "faceMatch": true,
    "locationMatch": true,
    "timestampValid": true,
    "violations": []
  },
  "message": "Face verified successfully"
}
```

#### GET `/api/security/violations`
Get all violations with pagination.

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `employeeId` (string, optional)
- `startDate` (date, optional)
- `endDate` (date, optional)
- `type` (string, optional)
- `resolved` (boolean, optional)

**Response:**
```json
{
  "success": true,
  "data": {
    "violations": [
      {
        "violation_id": "VIOL-000001",
        "employee_id": "EMP001",
        "violation_type": "MOCK_LOCATION",
        "suspicious_score": 100,
        "action_taken": "BLOCK",
        "created_at": "2024-01-15T10:00:00Z",
        "resolved": false
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "message": "Violations retrieved successfully"
}
```

#### GET `/api/security/violations/:id`
Get specific violation by ID.

#### POST `/api/security/violations/:id/resolve`
Resolve a violation.

**Request Body:**
```json
{
  "resolved": true,
  "notes": "False positive, employee was traveling",
  "action": "ALLOW"
}
```

### Attendance Endpoints (Updated)

#### POST `/api/attendance/clock-in`
Now includes security validation automatically.

**Request Body:**
```json
{
  "latitude": 19.0760,
  "longitude": 72.8777,
  "notes": "On time",
  "accuracy": 10,
  "deviceSecurity": { ... },
  "appState": { ... },
  "networkLocation": { ... },
  "ipLocation": { ... },
  "satelliteInfo": { ... },
  "timestamp": 1234567890
}
```

**Response (with security info):**
```json
{
  "success": true,
  "data": {
    "id": "ATT001",
    "employee": "EMP001",
    "clockIn": { ... },
    "security": {
      "validated": true,
      "suspiciousScore": 15,
      "action": "ALLOW",
      "checks": { ... }
    }
  },
  "message": "Clock-in recorded successfully"
}
```

**Error Response (Blocked):**
```json
{
  "success": false,
  "error": {
    "message": "Fake GPS detected - Check-in blocked",
    "suspiciousScore": 100,
    "violations": [
      {
        "type": "MOCK_LOCATION",
        "severity": "CRITICAL",
        "message": "Mock location enabled on device"
      }
    ]
  },
  "message": "Clock-in blocked due to security violation"
}
```

## Security Decision Logic

### Suspicious Score Calculation

- **0-60**: ALLOW - Location verified
- **61-85**: FLAG - Allow but flag for review
- **86-100**: BLOCK - Block the action

### Score Breakdown

- Mock Location Detected: +100 (immediate block)
- Device Rooted/Jailbroken: +100 (immediate block)
- Fake GPS Apps: +100 (immediate block)
- Speed Anomaly: +20-30
- Network Mismatch: +10-25
- Satellite Issues: +10-30
- App State Issues: +5-15
- Face Mismatch: +20-30
- Movement Pattern Anomaly: +10-30

## Database Models

### LocationViolation
Stores all security violations with complete context.

**Key Fields:**
- `violation_id` - Unique violation ID
- `employee_id` - Employee reference
- `violation_type` - Type of violation
- `suspicious_score` - Calculated score
- `action_taken` - ALLOW/FLAG/BLOCK
- `location_data` - Complete location data
- `device_info` - Device security info
- `security_checks` - All check results
- `violations` - Array of detected violations
- `resolved` - Resolution status

### LocationHistory
Tracks location history for pattern analysis.

**Key Fields:**
- `history_id` - Unique history ID
- `employee_id` - Employee reference
- `location` - GPS location
- `network_location` - Network location
- `ip_location` - IP geolocation
- `satellite_info` - Satellite data
- `distance_from_last` - Calculated distance
- `speed_from_last` - Calculated speed
- `action_type` - CLOCK_IN/CLOCK_OUT/LOCATION_UPDATE

## Integration Points

### Attendance Service Integration

The attendance service automatically validates location before:
- Clock-in
- Clock-out

Security validation is transparent to the frontend - it just needs to send the additional security data.

### Frontend Requirements

Frontend should collect and send:
1. GPS location (latitude, longitude, accuracy, etc.)
2. Network location (if available)
3. IP location (backend can fetch)
4. Device security info (mock location, root status, etc.)
5. App state (foreground, online, screen state)
6. Satellite info (mobile only)
7. Selfie for face verification
8. Timestamp

## Configuration

### Environment Variables

```env
# Face Verification (Optional)
AWS_REKOGNITION_ENABLED=false
AZURE_FACE_API_ENABLED=false

# IP Geolocation (Optional)
IP_GEOLOCATION_SERVICE=maxmind|ipstack|ipapi
IP_GEOLOCATION_API_KEY=your_api_key
```

## Usage Example

### Clock-In with Security

```javascript
// Frontend sends comprehensive location data
const clockInData = {
  latitude: 19.0760,
  longitude: 72.8777,
  accuracy: 10,
  deviceSecurity: {
    platform: 'android',
    mockLocationEnabled: false,
    isRooted: false,
    fakeGPSApps: []
  },
  appState: {
    isActive: true,
    isOnline: true,
    screenOn: true
  },
  satelliteInfo: {
    available: true,
    satelliteCount: 8,
    averageSNR: 35
  }
};

// Backend automatically validates
const response = await fetch('/api/attendance/clock-in', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(clockInData)
});

// Response includes security validation
const result = await response.json();
if (result.data.security.action === 'BLOCK') {
  // Handle blocked check-in
  alert('Check-in blocked: ' + result.data.security.message);
}
```

## Monitoring & Reporting

### Violation Dashboard

Use `/api/security/violations` to:
- View all violations
- Filter by employee, date, type
- Track resolution status
- Analyze patterns

### Location History

Location history is automatically tracked for:
- Pattern analysis
- Movement validation
- Speed calculations
- Historical review

## Security Features

1. **Multi-Source Validation** - GPS, Network, IP comparison
2. **Real-Time Detection** - Immediate validation on check-in/out
3. **Pattern Analysis** - AI-based movement pattern detection
4. **Face Verification** - Selfie matching with employee photo
5. **Device Security** - Root/jailbreak detection
6. **Violation Logging** - Complete audit trail
7. **Configurable Thresholds** - Adjustable sensitivity

## Future Enhancements

1. **Machine Learning** - Train models on violation patterns
2. **Behavioral Analysis** - Learn employee movement patterns
3. **Real-Time Alerts** - Notify HR of violations
4. **Advanced Face Recognition** - Liveness detection
5. **Biometric Integration** - Fingerprint, voice verification

## Testing

### Test Scenarios

1. **Normal Check-In** - Valid location, no violations
2. **Mock Location Enabled** - Should block
3. **Rooted Device** - Should block
4. **Speed Anomaly** - Should flag
5. **Network Mismatch** - Should flag
6. **Face Mismatch** - Should flag
7. **Multiple Violations** - Should block

### Test Data

```javascript
// Valid location data
const validData = {
  location: { latitude: 19.0760, longitude: 72.8777, accuracy: 10 },
  deviceSecurity: { mockLocationEnabled: false, isRooted: false },
  appState: { isActive: true, isOnline: true }
};

// Fake GPS data
const fakeData = {
  location: { latitude: 19.0760, longitude: 72.8777, accuracy: 10 },
  deviceSecurity: { mockLocationEnabled: true, isRooted: false },
  appState: { isActive: true, isOnline: true }
};
```

## Support

For issues or questions:
1. Check violation logs: `/api/security/violations`
2. Review location history
3. Check security service logs
4. Verify frontend is sending all required data

