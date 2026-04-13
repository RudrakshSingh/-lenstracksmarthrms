# 🌐 Frontend Developer - API Base URL

**Date:** March 9, 2026  
**Status:** ✅ **PRODUCTION - ALL APIs WORKING**

---

## 🎯 API Base URL (Use This)

```
http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
```

**Type:** AWS Application Load Balancer (ALB)  
**Region:** Mumbai (ap-south-1)  
**Status:** ✅ Active & Tested

---

## 📝 Frontend Configuration

### For React/Next.js

**Create or update `.env.local`:**

```env
# Production API Base URL
NEXT_PUBLIC_API_BASE_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com

# Or for Vite/React
REACT_APP_API_BASE_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
VITE_API_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com
```

### API Client Setup

**Example with Axios:**

```javascript
// src/api/client.js or src/utils/api.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 
           process.env.REACT_APP_API_BASE_URL ||
           'http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId') || 'default';
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (tenantId) {
    config.headers['x-tenant-id'] = tenantId;
  }
  
  return config;
});

export default apiClient;
```

---

## ✅ Available APIs

### 🔐 Authentication

```javascript
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
GET  /api/auth/me
GET  /api/auth/status
GET  /api/auth/health
```

### 👥 HR Service

```javascript
// Public
GET  /api/hr
GET  /api/hr/status
GET  /api/hr/health

// Protected (needs auth)
GET    /api/hr/employees
POST   /api/hr/employees
GET    /api/hr/employees/:id
PUT    /api/hr/employees/:id
DELETE /api/hr/employees/:id

// Roster
GET    /api/hr/roster
POST   /api/hr/roster
PUT    /api/hr/roster/:id
DELETE /api/hr/roster/:id
GET    /api/hr/roster/weekly
POST   /api/hr/roster/sync-attendance

// Onboarding
GET    /api/hr/onboarding
POST   /api/hr/onboarding
POST   /api/hr/onboarding/personal-details
POST   /api/hr/onboarding/work-details
POST   /api/hr/onboarding/statutory-info
POST   /api/hr/onboarding/documents

// Leave
GET    /api/hr/leave
POST   /api/hr/leave

// Other
GET    /api/hr/payroll
GET    /api/hr/reports
GET    /api/hr/dashboard
GET    /api/time-tracking
GET    /api/performance
```

### ⏰ Attendance Service

```javascript
// Public
GET  /api/attendance/status
GET  /api/attendance/health

// Protected (needs auth)
GET  /api/attendance
POST /api/attendance/checkin
POST /api/attendance/checkout
GET  /api/attendance/report
```

### 💰 Payroll Service

```javascript
GET /api/payroll/status
GET /api/payroll/health
GET /api/payroll (protected)
```

### 🏢 Tenant Registry

```javascript
GET /api/tenants (protected)
```

### 📊 Grafana Monitoring

```javascript
GET /grafana
```

---

## 🔑 Authentication Headers

All protected endpoints require:

```javascript
headers: {
  'Authorization': 'Bearer <JWT_TOKEN>',
  'x-tenant-id': '<TENANT_ID>'  // Optional, defaults to 'default'
}
```

### Example Request

```javascript
// Login
const loginResponse = await apiClient.post('/api/auth/login', {
  email: 'user@example.com',
  password: 'password123'
});

const { token, tenantId } = loginResponse.data;

// Save token
localStorage.setItem('token', token);
localStorage.setItem('tenantId', tenantId);

// Use token for subsequent requests
const employees = await apiClient.get('/api/hr/employees', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': tenantId
  }
});
```

---

## 🧪 Quick Test

**Test in Browser:**
```
http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/health
```

**Should return:**
```json
{"status":"healthy"}
```

**Test in Terminal:**
```bash
curl http://k8s-eteliosp-eteliosi-f5ad4f50f3-842295189.ap-south-1.elb.amazonaws.com/api/hr/status
```

---

## 📊 API Status

- ✅ **Public APIs:** 10 endpoints (200 OK)
- ✅ **Protected APIs:** 20+ endpoints (401 = needs auth - working correctly)
- ✅ **Grafana:** Accessible (302 redirect)
- ✅ **Overall:** All APIs working correctly

---

## 🚨 Common Issues

### Issue 1: CORS Errors

If you see CORS errors, make sure:
- You're using the correct base URL (not localhost)
- Backend CORS is configured for your frontend domain

### Issue 2: 401 Unauthorized

- Check if token is being sent: `Authorization: Bearer <token>`
- Verify token is valid and not expired
- Check if `x-tenant-id` header is included (if required)

### Issue 3: 404 Not Found

- Verify the endpoint path is correct
- Check if the service is running (test `/health` endpoint)
- Ensure the base URL is correct

---

## 📚 Additional Documentation

- **Complete API Test Report:** `docs/COMPLETE_API_TEST_REPORT.md`
- **Frontend Developer Guide:** `docs/FRONTEND_DEVELOPER_COMPLETE_GUIDE.md`
- **Backend API Guide:** `docs/FRONTEND_DEVELOPER_BACKEND_GUIDE.md`

---

## ✅ Quick Checklist

- [ ] Environment variable set correctly
- [ ] API client configured with base URL
- [ ] Token interceptor added
- [ ] Tenant ID header included (if needed)
- [ ] Health endpoint accessible
- [ ] Login API working
- [ ] Protected endpoints working with token

---

**Last Updated:** March 9, 2026  
**Status:** ✅ **PRODUCTION READY**
