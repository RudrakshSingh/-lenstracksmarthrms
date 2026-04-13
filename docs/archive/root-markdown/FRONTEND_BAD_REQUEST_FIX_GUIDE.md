# Frontend Developer Guide: Fixing Bad Request (400) Errors

## Overview
This guide helps frontend developers diagnose and fix **400 Bad Request** errors when calling backend APIs.

---

## Common Causes of Bad Request Errors

### 1. **Missing Required Headers**

#### Required Headers for All API Calls:
```javascript
{
  "Authorization": "Bearer <accessToken>",
  "x-tenant-id": "<tenantId>",
  "Content-Type": "application/json"
}
```

#### Example Fix:
```javascript
// ❌ WRONG - Missing headers
const response = await fetch(`${API_BASE_URL}/api/attendance/clock-in`, {
  method: 'POST',
  body: JSON.stringify({ latitude: 19.0764, longitude: 72.8778 })
});

// ✅ CORRECT - All headers included
const response = await fetch(`${API_BASE_URL}/api/attendance/clock-in`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'x-tenant-id': tenantId,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ 
    latitude: 19.0764, 
    longitude: 72.8778,
    notes: 'Optional notes'
  })
});
```

---

### 2. **Missing Required Request Body Fields**

#### Clock-In API Required Fields:
```javascript
{
  "latitude": number,    // Required: GPS latitude (-90 to 90)
  "longitude": number    // Required: GPS longitude (-180 to 180)
}
```

#### Optional Fields:
```javascript
{
  "notes": string,       // Optional: Additional notes
  "selfieUrl": string    // Optional: Selfie image URL
}
```

#### Example Fix:
```javascript
// ❌ WRONG - Missing required fields
const response = await fetch(`${API_BASE_URL}/api/attendance/clock-in`, {
  method: 'POST',
  headers: { /* headers */ },
  body: JSON.stringify({})  // Missing latitude/longitude
});

// ✅ CORRECT - All required fields included
const response = await fetch(`${API_BASE_URL}/api/attendance/clock-in`, {
  method: 'POST',
  headers: { /* headers */ },
  body: JSON.stringify({
    latitude: 19.0764,   // Required
    longitude: 72.8778,  // Required
    notes: 'Clock-in from office'  // Optional
  })
});
```

---

### 3. **Invalid Data Types**

#### Common Type Errors:
- **Numbers as Strings**: `"19.0764"` instead of `19.0764`
- **Booleans as Strings**: `"true"` instead of `true`
- **Dates as Strings**: Use ISO format `"2026-02-19T19:45:00.574Z"`

#### Example Fix:
```javascript
// ❌ WRONG - Wrong data types
const payload = {
  latitude: "19.0764",    // String instead of number
  longitude: "72.8778",   // String instead of number
  isActive: "true"        // String instead of boolean
};

// ✅ CORRECT - Correct data types
const payload = {
  latitude: parseFloat("19.0764"),  // Number
  longitude: parseFloat("72.8778"), // Number
  isActive: true                     // Boolean
};
```

---

### 4. **Invalid JSON Format**

#### Common JSON Errors:
- Missing quotes around keys
- Trailing commas
- Unescaped special characters

#### Example Fix:
```javascript
// ❌ WRONG - Invalid JSON
const body = "{ latitude: 19.0764, longitude: 72.8778 }";  // Missing quotes

// ✅ CORRECT - Valid JSON
const body = JSON.stringify({ 
  latitude: 19.0764, 
  longitude: 72.8778 
});
```

---

### 5. **Tenant Mismatch**

#### Error Message:
```
"X-Tenant-Id header does not match JWT token"
```

#### Cause:
The `x-tenant-id` header doesn't match the tenant in the JWT token.

#### Fix:
```javascript
// Get tenantId from login response
const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { data } = await loginResponse.json();
const tenantId = data.user.tenantId || data.user.tenant_id || 'default';
const accessToken = data.accessToken || data.token;

// Use the same tenantId for all subsequent requests
const response = await fetch(`${API_BASE_URL}/api/attendance/clock-in`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'x-tenant-id': tenantId,  // Must match JWT token tenant
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ latitude, longitude })
});
```

---

### 6. **Active Session Already Exists**

#### Error Message:
```
"Please clock out from your current session before clocking in again"
```

#### Fix:
```javascript
// Check for active session and clock out first
async function clockInWithCheck(latitude, longitude, token, tenantId) {
  // Step 1: Try to clock out any active session
  try {
    await fetch(`${API_BASE_URL}/api/attendance/clock-out`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ latitude, longitude })
    });
  } catch (error) {
    // Ignore if no active session exists
    console.log('No active session to clock out');
  }

  // Step 2: Clock in
  const response = await fetch(`${API_BASE_URL}/api/attendance/clock-in`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ latitude, longitude })
  });

  return response;
}
```

---

## API-Specific Requirements

### Clock-In API (`POST /api/attendance/clock-in`)

#### Required:
```javascript
{
  "latitude": number,    // -90 to 90
  "longitude": number    // -180 to 180
}
```

#### Optional:
```javascript
{
  "notes": string,
  "selfieUrl": string
}
```

#### Complete Example:
```javascript
const clockIn = async (latitude, longitude, notes = '') => {
  const response = await fetch(`${API_BASE_URL}/api/attendance/clock-in`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      notes: notes || undefined
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Clock-in failed');
  }

  return await response.json();
};
```

---

### Clock-Out API (`POST /api/attendance/clock-out`)

#### Required:
```javascript
{
  "latitude": number,
  "longitude": number
}
```

#### Optional:
```javascript
{
  "notes": string,
  "selfieUrl": string
}
```

---

### Employee Creation API (`POST /api/hr/employees`)

#### Required Fields:
```javascript
{
  "firstName": string,
  "lastName": string,
  "fullName": string,
  "email": string,
  "phone": string,
  "employeeId": string,
  "department": string,
  "jobTitle": string,
  "roleName": string,      // "employee", "admin", etc.
  "doj": string,           // Date of joining (YYYY-MM-DD)
  "status": string         // "active" or "inactive"
}
```

#### Optional Fields:
```javascript
{
  "storeId": string,
  "designation": string,
  "band_level": string,
  "hierarchy_level": string
}
```

---

## Debugging Tips

### 1. **Check Response Details**
```javascript
const response = await fetch(url, options);

if (!response.ok) {
  const error = await response.json();
  console.error('Error Details:', {
    status: response.status,
    statusText: response.statusText,
    error: error.message,
    errorCode: error.error,
    hint: error.hint
  });
}
```

### 2. **Validate Request Before Sending**
```javascript
function validateClockInData(latitude, longitude) {
  const errors = [];

  if (latitude === undefined || latitude === null) {
    errors.push('latitude is required');
  } else if (typeof latitude !== 'number') {
    errors.push('latitude must be a number');
  } else if (latitude < -90 || latitude > 90) {
    errors.push('latitude must be between -90 and 90');
  }

  if (longitude === undefined || longitude === null) {
    errors.push('longitude is required');
  } else if (typeof longitude !== 'number') {
    errors.push('longitude must be a number');
  } else if (longitude < -180 || longitude > 180) {
    errors.push('longitude must be between -180 and 180');
  }

  return errors;
}

// Usage
const errors = validateClockInData(latitude, longitude);
if (errors.length > 0) {
  console.error('Validation errors:', errors);
  return;
}
```

### 3. **Log Request Details**
```javascript
const requestData = {
  latitude: parseFloat(latitude),
  longitude: parseFloat(longitude),
  notes: notes
};

console.log('Sending request:', {
  url: `${API_BASE_URL}/api/attendance/clock-in`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken.substring(0, 20)}...`,
    'x-tenant-id': tenantId,
    'Content-Type': 'application/json'
  },
  body: requestData
});

const response = await fetch(`${API_BASE_URL}/api/attendance/clock-in`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'x-tenant-id': tenantId,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(requestData)
});
```

---

## Common Error Messages and Solutions

| Error Message | Cause | Solution |
|--------------|-------|----------|
| `"latitude" is required` | Missing latitude in request body | Add `latitude` field |
| `"longitude" is required` | Missing longitude in request body | Add `longitude` field |
| `"latitude" must be a number` | Latitude is a string | Use `parseFloat()` or `Number()` |
| `"longitude" must be a number` | Longitude is a string | Use `parseFloat()` or `Number()` |
| `Access token required` | Missing Authorization header | Add `Authorization: Bearer <token>` |
| `X-Tenant-Id header does not match JWT token` | Tenant mismatch | Use tenantId from login response |
| `Please clock out from your current session` | Active session exists | Clock out first, then clock in |
| `Employee not found in HR service` | Employee doesn't exist in HR | Create employee in HR service first |

---

## Complete Working Example

```javascript
// Complete Clock-In Implementation
async function performClockIn(latitude, longitude, notes = '') {
  try {
    // Step 1: Get authentication token and tenant
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      throw new Error('Login failed');
    }

    const loginData = await loginResponse.json();
    const accessToken = loginData.data.accessToken;
    const tenantId = loginData.data.user.tenantId || 'default';

    // Step 2: Validate input
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      throw new Error('Invalid latitude');
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      throw new Error('Invalid longitude');
    }

    // Step 3: Clock out any active session (optional)
    try {
      await fetch(`${API_BASE_URL}/api/attendance/clock-out`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': tenantId,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ latitude: lat, longitude: lon })
      });
    } catch (error) {
      // Ignore if no active session
    }

    // Step 4: Clock in
    const clockInResponse = await fetch(`${API_BASE_URL}/api/attendance/clock-in`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'x-tenant-id': tenantId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latitude: lat,
        longitude: lon,
        notes: notes || undefined
      })
    });

    if (!clockInResponse.ok) {
      const error = await clockInResponse.json();
      throw new Error(error.message || 'Clock-in failed');
    }

    const result = await clockInResponse.json();
    console.log('Clock-in successful:', {
      attendanceId: result.data._id,
      checkInTime: result.data.check_in_time,
      storeCode: result.data.store_code,
      geofenceStatus: result.data.geofence_status
    });

    return result;
  } catch (error) {
    console.error('Clock-in error:', error.message);
    throw error;
  }
}

// Usage
performClockIn(19.0764, 72.8778, 'Clock-in from office')
  .then(result => console.log('Success:', result))
  .catch(error => console.error('Failed:', error));
```

---

## Quick Checklist

Before making an API call, ensure:

- [ ] Authorization header is included: `Bearer <token>`
- [ ] `x-tenant-id` header matches JWT token tenant
- [ ] `Content-Type: application/json` header is set
- [ ] All required fields are present in request body
- [ ] Data types are correct (numbers, not strings)
- [ ] JSON is valid (use `JSON.stringify()`)
- [ ] No active session exists (for clock-in)
- [ ] Latitude is between -90 and 90
- [ ] Longitude is between -180 and 180

---

## Need Help?

If you're still getting Bad Request errors:

1. Check browser console for detailed error messages
2. Verify request payload in Network tab
3. Compare with working examples in this guide
4. Check backend API documentation
5. Contact backend team with:
   - Request URL
   - Request headers
   - Request body
   - Error response

---

**Last Updated:** 2026-02-19  
**API Base URL:** `http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com`
