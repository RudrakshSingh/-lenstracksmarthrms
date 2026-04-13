# Frontend API Endpoints - Etelios HRMS

## Base URL (AWS Production)
```
http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

**Region:** ap-south-1 (Mumbai, India)  
**Environment:** AWS EKS Production  
**Routing:** Kubernetes Ingress + AWS ALB (Application Load Balancer)  
**NO API Gateway** - Direct routing via Ingress  
**Last Updated:** February 15, 2026

---

## ⚡ Architecture

```
Frontend → AWS ALB (Ingress) → Kubernetes Services → Microservices
```

**You are using:**
- ✅ Kubernetes Ingress Controller
- ✅ AWS Application Load Balancer (ALB)
- ✅ Direct service routing (no gateway layer)

**You are NOT using:**
- ❌ API Gateway (Kong, custom Node.js gateway, etc.)
- ❌ Additional routing layers

---

## 🟢 **WORKING ENDPOINTS** (Ready to Use)

### 1. Authentication Service
- **Base Path:** `/api/auth`
- **Full URL:** `http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth`
- **Status:** ✅ Running (2/2 pods)
- **Key Endpoints:**
  - `POST /api/auth/register` - User registration
  - `POST /api/auth/login` - User login
  - `POST /api/auth/refresh` - Refresh token
  - `GET /api/auth/me` - Get current user
  - `GET /api/auth/health` - Health check

### 2. HR Service
- **Base Path:** `/api/hr`
- **Full URL:** `http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/hr`
- **Status:** ✅ Running (2/2 pods)
- **Key Endpoints:**
  - `GET /api/hr/employees` - List employees
  - `POST /api/hr/employees` - Create employee
  - `GET /api/hr/employees/:id` - Get employee
  - `PUT /api/hr/employees/:id` - Update employee
  - `DELETE /api/hr/employees/:id` - Delete employee
  - `GET /api/hr/departments` - List departments
  - `POST /api/hr/onboarding` - Employee onboarding
  - `GET /api/hr/health` - Health check

### 3. Attendance Service
- **Base Path:** `/api/attendance`
- **Full URL:** `http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance`
- **Status:** ✅ Running (2/2 pods)
- **Key Endpoints:**
  - `POST /api/attendance/checkin` - Check in
  - `POST /api/attendance/checkout` - Check out
  - `GET /api/attendance/records` - Get attendance records
  - `GET /api/attendance/summary` - Attendance summary
  - `GET /api/attendance/health` - Health check

### 4. Tenant Management Service (Admin)
- **Base Path:** `/api/admin`
- **Full URL:** `http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/admin`
- **Status:** ✅ Running (2/2 pods)
- **Key Endpoints:**
  - `GET /api/admin/tenants` - List all tenants
  - `POST /api/admin/tenants` - Create tenant
  - `GET /api/admin/tenants/:id` - Get tenant
  - `PUT /api/admin/tenants/:id` - Update tenant
  - `DELETE /api/admin/tenants/:id` - Delete tenant
  - `GET /api/admin/health` - Health check

### 5. Tenant Registry Service
- **Base Path:** `/api/tenants`
- **Full URL:** `http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/tenants`
- **Status:** ✅ Running (2/2 pods)
- **Key Endpoints:**
  - `GET /api/tenants` - Get tenant info
  - `GET /api/tenants/:id` - Get specific tenant
  - `GET /api/tenants/health` - Health check

---

## 🟡 **PENDING ENDPOINTS** (Currently Down - Being Fixed)

### 6. Payroll Service
- **Base Path:** `/api/payroll`
- **Full URL:** `http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/payroll`
- **Status:** ⚠️ CrashLoopBackOff (fixing)

### 7. Analytics Service
- **Base Path:** `/api/analytics`
- **Full URL:** `http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/analytics`
- **Status:** ⚠️ CrashLoopBackOff (fixing)

### 8. CRM Service
- **Base Path:** `/api/crm`
- **Full URL:** `http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/crm`
- **Status:** ⚠️ CrashLoopBackOff (fixing)

### 9. Document Service
- **Base Path:** `/api/documents`
- **Full URL:** `http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/documents`
- **Status:** ⚠️ CrashLoopBackOff (fixing)

### 10. Financial Service
- **Base Path:** `/api/financial`
- **Full URL:** `http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/financial`
- **Status:** ⚠️ CrashLoopBackOff (fixing)

### 11. Inventory Service
- **Base Path:** `/api/inventory`
- **Full URL:** `http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/inventory`
- **Status:** ⚠️ CrashLoopBackOff (fixing)

### 12. JTS Service (Job Tracking System)
- **Base Path:** `/api/jts`
- **Full URL:** `http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/jts`
- **Status:** ⚠️ CrashLoopBackOff (fixing)

### 13. Monitoring Service
- **Base Path:** `/api/monitoring`
- **Full URL:** `http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/monitoring`
- **Status:** ⚠️ CrashLoopBackOff (fixing)

### 14. Notification Service
- **Base Path:** `/api/notification`
- **Full URL:** `http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/notification`
- **Status:** ⚠️ CrashLoopBackOff (fixing)

### 15. Prescription Service
- **Base Path:** `/api/prescription`
- **Full URL:** `http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/prescription`
- **Status:** ⚠️ CrashLoopBackOff (fixing)

### 16. Purchase Service
- **Base Path:** `/api/purchase`
- **Full URL:** `http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/purchase`
- **Status:** ⚠️ CrashLoopBackOff (fixing)

### 17. Realtime Service
- **Base Path:** `/api/realtime`
- **Full URL:** `http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/realtime`
- **Status:** ⚠️ CrashLoopBackOff (fixing)

### 18. Sales Service
- **Base Path:** `/api/sales`
- **Full URL:** `http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/sales`
- **Status:** ⚠️ CrashLoopBackOff (fixing)

### 19. Service Management
- **Base Path:** `/api/service`
- **Full URL:** `http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/service`
- **Status:** ⚠️ CrashLoopBackOff (fixing)

### 20. CPP Service
- **Base Path:** `/api/cpp`
- **Full URL:** `http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/cpp`
- **Status:** ⚠️ CrashLoopBackOff (fixing)

---

## 📊 Monitoring Dashboard (Grafana)

- **URL:** `http://ab34c9c6fa48844e0891a53b28957383-1348033419.ap-south-1.elb.amazonaws.com`
- **Purpose:** System monitoring, metrics, and dashboards
- **Status:** ✅ Running

---

## 🔐 Authentication Flow

### Multi-Tenant Authentication
All requests (except login/register) require:

**Headers:**
```javascript
{
  "Authorization": "Bearer <jwt_token>",
  "x-tenant-id": "<tenant_id>"
}
```

### Login Example
```javascript
// Login Request
POST http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "tenantId": "your-tenant-id"
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "tenantId": "your-tenant-id",
    "role": "employee"
  }
}
```

### Using the Token
```javascript
// Authenticated Request Example
GET http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/hr/employees
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
x-tenant-id: your-tenant-id
```

---

## 🧪 Quick Test Commands

### Test Auth Service
```bash
curl http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/health
```

### Test HR Service
```bash
curl http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/hr/health
```

### Test Attendance Service
```bash
curl http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/health
```

---

## 📝 Environment Variables for Frontend

Create a `.env` file in your frontend project:

```env
# Production API
REACT_APP_API_BASE_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
REACT_APP_AUTH_SERVICE=/api/auth
REACT_APP_HR_SERVICE=/api/hr
REACT_APP_ATTENDANCE_SERVICE=/api/attendance
REACT_APP_TENANT_SERVICE=/api/tenants
REACT_APP_ADMIN_SERVICE=/api/admin

# Monitoring
REACT_APP_GRAFANA_URL=http://ab34c9c6fa48844e0891a53b28957383-1348033419.ap-south-1.elb.amazonaws.com
```

---

## 🚀 Frontend Integration Example (React/Axios)

```javascript
// api/config.js
export const API_BASE_URL = 'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';

// api/client.js
import axios from 'axios';
import { API_BASE_URL } from './config';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to all requests
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

// Usage in components
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

// Check in attendance
const checkIn = async () => {
  const response = await apiClient.post('/api/attendance/checkin');
  return response.data;
};
```

---

## ⚡ Status Summary

| Service | Status | Pods Running | Ready for Frontend |
|---------|--------|--------------|-------------------|
| Auth | ✅ Working | 2/2 | ✅ Yes |
| HR | ✅ Working | 2/2 | ✅ Yes |
| Attendance | ✅ Working | 2/2 | ✅ Yes |
| Tenant Management | ✅ Working | 2/2 | ✅ Yes |
| Tenant Registry | ✅ Working | 2/2 | ✅ Yes |
| MongoDB | ✅ Working | 1/1 | N/A |
| Analytics | ⚠️ Fixing | 0/2 | ❌ Not yet |
| Payroll | ⚠️ Fixing | 0/2 | ❌ Not yet |
| CRM | ⚠️ Fixing | 0/2 | ❌ Not yet |
| Document | ⚠️ Fixing | 0/2 | ❌ Not yet |
| Financial | ⚠️ Fixing | 0/2 | ❌ Not yet |
| Inventory | ⚠️ Fixing | 0/2 | ❌ Not yet |
| JTS | ⚠️ Fixing | 0/2 | ❌ Not yet |
| Monitoring | ⚠️ Fixing | 0/2 | ❌ Not yet |
| Notification | ⚠️ Fixing | 0/2 | ❌ Not yet |
| Prescription | ⚠️ Fixing | 0/2 | ❌ Not yet |
| Purchase | ⚠️ Fixing | 0/2 | ❌ Not yet |
| Realtime | ⚠️ Fixing | 0/2 | ❌ Not yet |
| Sales | ⚠️ Fixing | 0/2 | ❌ Not yet |
| Service Management | ⚠️ Fixing | 0/2 | ❌ Not yet |
| CPP | ⚠️ Fixing | 0/2 | ❌ Not yet |

**5 services working, 15 services being fixed**

---

## 📌 Important Notes

1. **HTTP Only (For Now):** Currently using HTTP. HTTPS/SSL will be configured later.
2. **CORS:** Make sure CORS is enabled on backend services for your frontend domain.
3. **Rate Limiting:** No rate limiting configured yet.
4. **Tenant ID Required:** All requests (except auth) require `x-tenant-id` header.
5. **Default Tenant:** For testing, you may need to create a tenant first using the admin API.

---

## 🔧 Next Steps

1. **Frontend can start integrating** with the 5 working services:
   - Authentication (login, register, user management)
   - HR (employee management, departments)
   - Attendance (check-in/out, records)
   - Tenant Management (admin features)
   - Tenant Registry (tenant info)

2. **Remaining services** will be fixed and made available soon.

3. **SSL/HTTPS** will be configured after all services are stable.

---

## 📞 Support

If any endpoint is not working or you need additional endpoints, please contact the backend team.

**Cluster:** etelios-prod-v2  
**Region:** ap-south-1 (Mumbai)  
**Environment:** AWS EKS Production
