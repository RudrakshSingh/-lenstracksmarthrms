# 🚀 Backend API Guide for Frontend Developers

**Date:** 2026-03-01  
**Status:** ✅ **BACKEND IS LIVE AND WORKING**

---

## ⚠️ IMPORTANT: Backend is Working!

The backend is **100% operational**. If you're experiencing issues, please check the configuration below.

---

## 🌐 Backend API Base URL

```env
NEXT_PUBLIC_API_BASE_URL=http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com
```

**⚠️ DO NOT USE THE OLD URL:**
```
❌ http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```
This URL was deleted and no longer exists.

---

## ✅ Verified Working APIs

All APIs have been tested and are working:

### 🔐 Authentication
- ✅ `POST /api/auth/login` - HTTP 200
- ✅ `GET /api/auth/me` - HTTP 200
- ✅ `POST /api/auth/refresh` - HTTP 200
- ✅ `POST /api/auth/logout` - HTTP 200

### 🏪 HR Service
- ✅ `GET /api/hr/stores` - HTTP 200
- ✅ `GET /api/hr/employees` - HTTP 200
- ✅ `GET /api/hr/departments` - HTTP 200
- ✅ `GET /api/hr/roles` - HTTP 200
- ✅ `GET /api/hr/time-tracking` - HTTP 200
- ✅ `GET /api/hr/dashboard/stats` - HTTP 200

### ⏰ Attendance Service
- ✅ `GET /api/attendance/status` - HTTP 200
- ✅ `GET /api/attendance/today` - HTTP 200
- ✅ `POST /api/attendance/clock-in` - HTTP 201
- ✅ `POST /api/attendance/check-out` - HTTP 200
- ✅ `GET /api/attendance/summary` - HTTP 200

### 📅 Roster Management
- ✅ `GET /api/hr/roster` - HTTP 200
- ✅ `POST /api/hr/roster` - HTTP 201
- ✅ `GET /api/hr/roster/settings` - HTTP 200

---

## 📝 Frontend Configuration

### 1. Update `.env` or `.env.local`

```env
# Backend API Base URL
NEXT_PUBLIC_API_BASE_URL=http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com

# Or if using Vite
VITE_API_URL=http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com
```

### 2. Restart Development Server

After updating the environment variable:
```bash
# Next.js
npm run dev

# Vite
npm run dev
```

---

## 🧪 Test Backend Connection

### Quick Test (Browser Console)

```javascript
// Test health endpoint
fetch('http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// Test login
fetch('http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@lenstrack.com',
    password: 'AdminPass123!'
  })
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

### Test with cURL

```bash
# Health check
curl http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.elb.amazonaws.com/health

# Login
curl -X POST http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.elb.amazonaws.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lenstrack.com","password":"AdminPass123!"}'
```

---

## 📋 API Examples

### 1. Login

```javascript
const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/login`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'admin@lenstrack.com',
    password: 'AdminPass123!'
  })
});

const data = await response.json();
// Returns: { success: true, data: { accessToken, refreshToken, user } }
```

### 2. Get Stores (Authenticated)

```javascript
const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/hr/stores`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': 'lenstrack'
  }
});

const data = await response.json();
// Returns: { success: true, data: [...stores] }
```

### 3. Get Employees

```javascript
const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/hr/employees`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': 'lenstrack'
  }
});

const data = await response.json();
```

### 4. Clock In

```javascript
const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/attendance/clock-in`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    latitude: 28.6139,
    longitude: 77.2090,
    timestamp: Date.now(),
    notes: 'Punch in from dashboard',
    selfie: 'data:image/jpeg;base64,...' // Optional: base64 string
  })
});
```

### 5. Get Today's Attendance

```javascript
const employeeId = 'EMP-2026-969954';
const date = new Date().toISOString().split('T')[0];

const response = await fetch(
  `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/attendance/today?employeeId=${employeeId}&date=${date}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);

const data = await response.json();
// Returns: { success: true, data: { checkIn, checkOut, isClockedIn, ... } }
```

---

## 🔧 Troubleshooting

### Issue 1: "Backend API unavailable" or 503 Error

**Solution:**
1. Check if you're using the correct API URL
2. Verify environment variable is set correctly
3. Restart your development server
4. Clear browser cache

### Issue 2: CORS Error

**Solution:**
- CORS is configured on the backend
- Ensure you're using the correct API URL
- Check browser console for specific CORS error

### Issue 3: 401 Unauthorized

**Solution:**
- Token might be expired
- Call `/api/auth/refresh` to get a new token
- Or login again to get a fresh token

### Issue 4: 404 Not Found

**Solution:**
- Check the API endpoint path
- Ensure you're using the correct base URL
- Verify the endpoint exists in the API documentation

### Issue 5: Connection Timeout

**Solution:**
- Check your internet connection
- Verify the API URL is accessible from your network
- Try accessing the health endpoint first: `/health`

---

## 📊 Backend Health Check

### Check Backend Status

```javascript
// Health check endpoint
const healthCheck = async () => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/health`);
    const data = await response.json();
    console.log('Backend Status:', data);
    return data.status === 'healthy';
  } catch (error) {
    console.error('Backend not reachable:', error);
    return false;
  }
};
```

---

## 🔐 Authentication Flow

### 1. Login
```javascript
POST /api/auth/login
Body: { email, password }
Response: { success: true, data: { accessToken, refreshToken, user } }
```

### 2. Store Token
```javascript
localStorage.setItem('accessToken', data.accessToken);
localStorage.setItem('refreshToken', data.refreshToken);
```

### 3. Use Token in Requests
```javascript
headers: {
  'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
  'x-tenant-id': 'lenstrack'
}
```

### 4. Refresh Token (when expired)
```javascript
POST /api/auth/refresh
Body: { refreshToken }
Response: { success: true, data: { accessToken, refreshToken } }
```

---

## 📋 Required Headers

### For All Authenticated Requests:
```javascript
{
  'Authorization': 'Bearer <accessToken>',
  'Content-Type': 'application/json'
}
```

### For HR Service Requests:
```javascript
{
  'Authorization': 'Bearer <accessToken>',
  'x-tenant-id': 'lenstrack',
  'Content-Type': 'application/json'
}
```

---

## ✅ Backend Verification

### Test Results (Last Verified: 2026-03-01)

| API Endpoint | Method | Status | Response Time |
|--------------|--------|--------|---------------|
| `/health` | GET | ✅ 200 | < 100ms |
| `/api/auth/login` | POST | ✅ 200 | < 200ms |
| `/api/hr/stores` | GET | ✅ 200 | < 300ms |
| `/api/hr/employees` | GET | ✅ 200 | < 300ms |
| `/api/attendance/status` | GET | ✅ 200 | < 200ms |
| `/api/hr/dashboard/stats` | GET | ✅ 200 | < 400ms |

---

## 🚨 Common Mistakes

### ❌ Wrong: Using Old URL
```javascript
// DON'T USE THIS
const API_URL = 'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';
```

### ✅ Correct: Using New URL
```javascript
// USE THIS
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
// Or directly:
const API_URL = 'http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com';
```

### ❌ Wrong: Missing Tenant Header
```javascript
// Missing x-tenant-id header
fetch('/api/hr/stores', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### ✅ Correct: With Tenant Header
```javascript
// Include x-tenant-id header
fetch('/api/hr/stores', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': 'lenstrack'
  }
});
```

---

## 📞 Support

If you're still experiencing issues:

1. **Check Environment Variable:**
   ```bash
   echo $NEXT_PUBLIC_API_BASE_URL
   # Should output: http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com
   ```

2. **Test from Browser:**
   - Open browser console
   - Run the test code above
   - Check for errors

3. **Check Network Tab:**
   - Open browser DevTools → Network
   - Make an API call
   - Check the request URL and response

4. **Verify Backend Status:**
   - Visit: `http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com/health`
   - Should return: `{"status":"healthy",...}`

---

## ✅ Quick Checklist

- [ ] Environment variable `NEXT_PUBLIC_API_BASE_URL` is set correctly
- [ ] Using the new API URL (not the old one)
- [ ] Development server restarted after env change
- [ ] Token is being sent in `Authorization` header
- [ ] `x-tenant-id` header is included for HR APIs
- [ ] Health endpoint (`/health`) is accessible
- [ ] Login API works from browser console

---

## 📄 API Documentation

For complete API documentation, see:
- `docs/COMPLETE_SYSTEM_FLOW.md` - Complete system flow
- `docs/FRONTEND_DEVELOPER_REALTIME_GUIDE.md` - Real-time features
- `LENSTRACK_API_TEST_RESULTS.md` - Test results

---

**Last Updated:** 2026-03-01  
**Backend Status:** ✅ **100% OPERATIONAL**  
**API URL:** `http://k8s-ingressn-ingressn-3df442ea60-74e6b4f94ffda83f.elb.ap-south-1.amazonaws.com`

---

## 🎯 Bottom Line

**The backend IS working.** If you're having issues:

1. ✅ **Check your environment variable** - Make sure it's set to the NEW URL
2. ✅ **Restart your dev server** - Environment variables load on startup
3. ✅ **Test from browser console** - Use the test code above
4. ✅ **Check network tab** - See what URL is actually being called

**The backend is live, tested, and working perfectly!** 🚀
