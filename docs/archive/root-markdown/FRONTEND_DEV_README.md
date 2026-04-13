# Frontend Developer - API Access Guide

## 🎯 Main API URL (Use This First)

```
http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

---

## ✅ Quick Test

**Test in Browser:** Go to this URL
```
http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/health
```

**Should Show:**
```json
{"service":"auth-service","status":"healthy","timestamp":"...","businessLogic":"active"}
```

**Test in Terminal:**
```bash
curl http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/health
```

---

## 🚨 Can't Access? Try These

### Option 1: Test with IP Address
```bash
curl http://3.111.130.144/api/auth/health -H "Host: k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com"
```

### Option 2: Use Online Tool
Go to **https://reqbin.com** and test:
```
GET http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/health
```

### Option 3: Check Your Network
- Disconnect VPN and try
- Use mobile hotspot
- Try from different WiFi
- Check if your firewall/antivirus is blocking AWS domains

### Option 4: Ask Backend Team
If nothing works, we can create alternative URLs for you.

---

## 📋 Available Endpoints

### ✅ Working Now (5 Services)

**Authentication:** `/api/auth`
```
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/me
```

**HR Management:** `/api/hr`
```
GET  /api/hr/employees
POST /api/hr/employees
GET  /api/hr/departments
```

**Attendance:** `/api/attendance`
```
POST /api/attendance/checkin
POST /api/attendance/checkout
GET  /api/attendance/records
```

**Tenant Management:** `/api/admin`
```
GET  /api/admin/tenants
POST /api/admin/tenants
```

**Tenant Info:** `/api/tenants`
```
GET /api/tenants
```

---

## 💻 React Setup

### .env
```env
REACT_APP_API_BASE_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

### API Client
```javascript
// src/api/client.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  const tenantId = localStorage.getItem('tenantId');
  
  if (token) {
    config.headers.Authorization = \`Bearer \${token}\`;
  }
  
  if (tenantId) {
    config.headers['x-tenant-id'] = tenantId;
  }
  
  return config;
});

export default apiClient;
```

### Usage Example
```javascript
import apiClient from './api/client';

// Login
const login = async (email, password, tenantId) => {
  const response = await apiClient.post('/api/auth/login', {
    email,
    password,
    tenantId,
  });
  
  localStorage.setItem('authToken', response.data.token);
  localStorage.setItem('tenantId', tenantId);
  
  return response.data;
};

// Get employees
const getEmployees = async () => {
  const response = await apiClient.get('/api/hr/employees');
  return response.data;
};
```

---

## 🔐 Authentication Required

All requests (except login/register) need these headers:
```javascript
{
  "Authorization": "Bearer <jwt_token>",
  "x-tenant-id": "<tenant_id>"
}
```

---

## 📞 Need Help?

1. **Can't access URL?** → Read `ALB_ACCESS_TROUBLESHOOTING.md`
2. **Need alternative URLs?** → Ask backend team to run `create-alternative-loadbalancer.sh`
3. **Complete API docs?** → See `FRONTEND_API_ENDPOINTS.md`

---

## ✅ Verified Working

- ✅ URL is publicly accessible
- ✅ DNS resolving correctly
- ✅ Port 80 open to world
- ✅ Health checks passing
- ✅ 5 services operational

**If you can't access it, the issue is likely on your network side.**

Try from:
- Different WiFi
- Mobile hotspot
- Home instead of office
- Without VPN

---

## 🚀 Start Building!

You have enough to start building:
- User login/registration
- Employee management
- Attendance tracking
- HR operations

More services coming soon! 🎉
