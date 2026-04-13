# API Endpoints for Frontend - Quick Reference

## 🎯 Single Base URL (Production)

```
http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

**Region:** Mumbai (ap-south-1)  
**Routing:** Kubernetes Ingress (NO API Gateway)

---

## ✅ Available Now (Working)

### 1. Authentication - `/api/auth`
```javascript
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
GET  /api/auth/me
GET  /api/auth/health
```

### 2. HR Management - `/api/hr`
```javascript
GET    /api/hr/employees
POST   /api/hr/employees
GET    /api/hr/employees/:id
PUT    /api/hr/employees/:id
DELETE /api/hr/employees/:id
GET    /api/hr/departments
POST   /api/hr/onboarding
GET    /api/hr/health
```

### 3. Attendance - `/api/attendance`
```javascript
POST /api/attendance/checkin
POST /api/attendance/checkout
GET  /api/attendance/records
GET  /api/attendance/summary
GET  /api/attendance/health
```

### 4. Tenant Management - `/api/admin`
```javascript
GET    /api/admin/tenants
POST   /api/admin/tenants
GET    /api/admin/tenants/:id
PUT    /api/admin/tenants/:id
DELETE /api/admin/tenants/:id
```

### 5. Tenant Info - `/api/tenants`
```javascript
GET /api/tenants
GET /api/tenants/:id
```

---

## ⏳ Coming Soon (Being Fixed)

- `/api/payroll` - Payroll Service
- `/api/analytics` - Analytics
- `/api/crm` - CRM
- `/api/documents` - Document Management
- `/api/financial` - Financial Service
- `/api/inventory` - Inventory
- `/api/jts` - Job Tracking
- `/api/monitoring` - Monitoring
- `/api/notification` - Notifications
- `/api/prescription` - Prescriptions
- `/api/purchase` - Purchase Orders
- `/api/realtime` - Real-time Updates
- `/api/sales` - Sales
- `/api/service` - Service Management
- `/api/cpp` - CPP Service

---

## 🔐 Authentication

All requests (except login/register) need:

```javascript
headers: {
  'Authorization': 'Bearer <your_jwt_token>',
  'x-tenant-id': '<tenant_id>'
}
```

---

## 💻 React/Axios Setup

### Step 1: Create .env file
```env
REACT_APP_API_BASE_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

### Step 2: Create API client
```javascript
// src/api/client.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  const tenantId = localStorage.getItem('tenantId');
  
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

### Step 3: Use in components
```javascript
import apiClient from './api/client';

// Login
const login = async (email, password, tenantId) => {
  const response = await apiClient.post('/api/auth/login', {
    email,
    password,
    tenantId
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

// Check in
const checkIn = async () => {
  const response = await apiClient.post('/api/attendance/checkin');
  return response.data;
};
```

---

## 🧪 Quick Test

```bash
# Test if API is working
curl http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/health

# Should return:
# {"service":"auth-service","status":"healthy","timestamp":"...","businessLogic":"active"}
```

---

## ✅ What You Get

- Single entry point for all APIs
- Path-based routing (no complex gateway)
- Auto-scaling and load balancing
- Health checks built-in
- 5 services ready to use NOW

---

## 📝 Important Notes

1. **Multi-tenant:** Always send `x-tenant-id` header
2. **HTTP Only:** HTTPS coming soon
3. **CORS:** Already configured on backend
4. **No API Gateway:** Direct routing via Kubernetes Ingress

---

## 🎉 Start Building!

You have **5 working services** - enough to build:
- User authentication & management
- Employee management
- HR operations
- Attendance tracking
- Tenant administration

The rest are coming soon! 🚀
