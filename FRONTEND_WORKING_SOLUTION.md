# ✅ Frontend Working Solution - IP is WORKING!

## Good News
The IP **98.70.245.87 IS WORKING** without any Host header requirement!

---

## ✅ Working Configuration

### The Ingress has TWO rules:
1. **Rule 1**: With host `api.etelios.com` (for production domain)
2. **Rule 2**: Without host (for direct IP access) ← **This is why it works!**

### Verified Working:
```bash
# ✅ This works (no Host header needed):
curl -k https://98.70.245.87/api/auth/status
# Returns: {"service":"auth-service","status":"operational",...}
```

---

## 🔍 Common Issues Causing 404

### 1. Using HTTP instead of HTTPS
**Problem**: SSL redirect returns 308, then browser might show error
```javascript
// ❌ Wrong:
fetch('http://98.70.245.87/api/auth/login')

// ✅ Correct:
fetch('https://98.70.245.87/api/auth/login')
```

### 2. Missing `/api` prefix
**Problem**: Ingress routes require `/api/<service>` path
```javascript
// ❌ Wrong:
fetch('https://98.70.245.87/auth/login')

// ✅ Correct:
fetch('https://98.70.245.87/api/auth/login')
```

### 3. SSL Certificate Warnings in Browser
**Problem**: Self-signed certificate causes browser to block requests

**Solution**: Accept the certificate first
1. Visit `https://98.70.245.87` in browser
2. Click "Advanced" → "Proceed anyway"
3. Or disable SSL verification in development

**For Fetch API**:
```javascript
// Browser will show SSL warning first time
fetch('https://98.70.245.87/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    emailOrEmployeeId: 'user@example.com',
    password: 'password123'
  })
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error('Error:', err));
```

### 4. CORS Issues (Not 404, but related)
**Problem**: Browser blocks cross-origin requests

**Current CORS Configuration**: Already enabled in services
- `Access-Control-Allow-Origin: *` (configured)
- Should work from any frontend domain

---

## 📋 Correct Frontend Implementation

### React Example:
```javascript
// config/api.js
export const API_BASE_URL = 'https://98.70.245.87';

// services/authService.js
import { API_BASE_URL } from '../config/api';

export const login = async (emailOrEmployeeId, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        emailOrEmployeeId,
        password
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};
```

### Axios Example:
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://98.70.245.87',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Login
export const login = (emailOrEmployeeId, password) => {
  return api.post('/api/auth/login', {
    emailOrEmployeeId,
    password
  });
};

// With auth token
export const getEmployees = (token) => {
  return api.get('/api/hr/employees', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
};
```

---

## 🧪 Test in Browser Console

Open browser console and run:

```javascript
// Test 1: Check if IP is accessible
fetch('https://98.70.245.87/api/auth/status')
  .then(res => res.json())
  .then(data => console.log('✅ Success:', data))
  .catch(err => console.error('❌ Error:', err));

// Test 2: Try login
fetch('https://98.70.245.87/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    emailOrEmployeeId: 'test@example.com',
    password: 'test123'
  })
})
  .then(res => res.json())
  .then(data => console.log('Response:', data))
  .catch(err => console.error('Error:', err));
```

---

## 🔧 Debugging Steps

### Step 1: Check Browser Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Try your API request
4. Look at the failed request:
   - **Status Code**: Is it 404, 308, 401, 500?
   - **Request URL**: Is it correct? Has `/api/` prefix?
   - **Protocol**: Is it HTTPS?
   - **Response**: What error message?

### Step 2: Check Console Errors
Look for:
- SSL certificate errors
- CORS errors
- Network errors
- JavaScript errors

### Step 3: Test with cURL first
```bash
# Test in terminal first:
curl -k https://98.70.245.87/api/auth/status

# If this works, the issue is in frontend code
# If this fails, the issue is in backend/network
```

---

## 📝 All Available Endpoints

### Auth Service:
- `https://98.70.245.87/api/auth/login`
- `https://98.70.245.87/api/auth/register`
- `https://98.70.245.87/api/auth/profile`
- `https://98.70.245.87/api/auth/status`

### HR Service:
- `https://98.70.245.87/api/hr/employees`
- `https://98.70.245.87/api/hr/stores`
- `https://98.70.245.87/api/hr/leave`
- `https://98.70.245.87/api/hr/status`

### Attendance Service:
- `https://98.70.245.87/api/attendance/clock-in`
- `https://98.70.245.87/api/attendance/history`
- `https://98.70.245.87/api/attendance/status`

---

## ⚠️ Important Notes

1. **Always use HTTPS**, not HTTP
2. **Always include `/api/` prefix** in the path
3. **Accept SSL certificate** on first visit
4. **Check browser console** for actual errors
5. **Use Network tab** to see exact request/response

---

## 🆘 Still Getting 404?

Share this information:
1. Exact URL you're trying to access
2. Request method (GET, POST, etc.)
3. Browser console error message
4. Network tab screenshot showing the request details
5. Response body/headers

The IP **IS WORKING** - the issue is likely in how the frontend is making the request!

