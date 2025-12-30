# Frontend API Integration Guide

**Date:** December 30, 2025  
**For:** Frontend Development Team  
**Backend Services:** auth, hr, attendance (Live on Azure)

---

## 🌐 **API BASE URL - Single IP for All Services**

### **Production Endpoint (Azure AKS - Ingress LoadBalancer)**

```javascript
// config/api.js or .env file

// ✅ SINGLE IP FOR ALL SERVICES
const API_BASE_URL = "http://98.70.245.87"

// All services accessible via this single IP:
// - Auth:      http://98.70.245.87/api/auth/*
// - HR:        http://98.70.245.87/api/hr/*
// - Attendance: http://98.70.245.87/api/attendance/*
```

**📋 Usage with Host Header (Recommended):**

```javascript
// When making requests, include Host header:
fetch('http://98.70.245.87/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Host': 'api.etelios.com'  // Required for Ingress routing
  },
  body: JSON.stringify({ ... })
});
```

**⚠️ Important Notes:**
1. **Single IP**: `98.70.245.87` - One IP for all services (cost-optimized)
2. **Host Header**: Include `Host: api.etelios.com` in requests
3. **HTTP**: Currently HTTP (HTTPS/TLS can be enabled later)
4. **Path-based routing**: All services use `/api/<service-name>/*` pattern

---

## 📡 **API Endpoints Available**

### **1. AUTH-SERVICE** (`http://4.187.155.37`)

#### **Health Check**
```javascript
// GET /health
fetch('http://4.187.155.37/health')
  .then(res => res.json())
  .then(data => console.log(data));

// Response:
{
  "service": "auth-service",
  "status": "healthy",
  "version": "1.0.0",
  "routes": 6
}
```

#### **Login**
```javascript
// POST /api/auth/login
const login = async (email, password) => {
  const response = await fetch('http://4.187.155.37/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      emailOrEmployeeId: email,
      password: password
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Store tokens
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.data.user));
    
    return data.data;
  }
  
  throw new Error(data.message);
};

// Response:
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "employee_id": "EMP001",
      "name": "John Doe",
      "email": "john@company.com",
      "role": "employee"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### **Mock Login (For Development/Testing)**
```javascript
// POST /api/auth/mock-login-fast
const mockLogin = async (role = 'employee') => {
  const response = await fetch('http://4.187.155.37/api/auth/mock-login-fast', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      role: role,  // 'admin', 'hr', 'manager', 'employee'
      email: 'test@example.com'
    })
  });
  
  return await response.json();
};

// Response: Same as login, but with mock user data
```

#### **Get Profile (Authenticated)**
```javascript
// GET /api/auth/profile
const getProfile = async () => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch('http://4.187.155.37/api/auth/profile', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return await response.json();
};
```

#### **Refresh Token**
```javascript
// POST /api/auth/refresh-token
const refreshToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  const response = await fetch('http://4.187.155.37/api/auth/refresh-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refreshToken })
  });
  
  const data = await response.json();
  
  if (data.success) {
    localStorage.setItem('accessToken', data.data.accessToken);
  }
  
  return data;
};
```

---

### **2. HR-SERVICE** (`http://4.224.134.129`)

#### **Get Employees**
```javascript
// GET /api/hr/employees?page=1&limit=10
const getEmployees = async (page = 1, limit = 10) => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch(
    `http://4.224.134.129/api/hr/employees?page=${page}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  return await response.json();
};

// Response:
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "employee_id": "EMP001",
      "name": "John Doe",
      "email": "john@company.com",
      "department": "Sales",
      "status": "active"
    },
    // ... more employees
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 250,
    "pages": 25
  }
}
```

#### **Create Employee**
```javascript
// POST /api/hr/employees
const createEmployee = async (employeeData) => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch('http://4.224.134.129/api/hr/employees', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(employeeData)
  });
  
  return await response.json();
};
```

#### **Get Stores**
```javascript
// GET /api/hr/stores
const getStores = async () => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch('http://4.224.134.129/api/hr/stores', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return await response.json();
};
```

---

### **3. ATTENDANCE-SERVICE** (`http://4.213.212.183`)

#### **Clock In**
```javascript
// POST /api/attendance/clock-in
const clockIn = async (latitude, longitude, selfieFile) => {
  const token = localStorage.getItem('accessToken');
  
  const formData = new FormData();
  formData.append('latitude', latitude);
  formData.append('longitude', longitude);
  formData.append('selfie', selfieFile);  // File from input
  
  const response = await fetch('http://4.213.212.183/api/attendance/clock-in', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData  // Don't set Content-Type, browser will set it
  });
  
  return await response.json();
};

// Response:
{
  "success": true,
  "message": "Clocked in successfully",
  "data": {
    "attendanceId": "...",
    "clockInTime": "2025-12-30T09:00:00Z",
    "location": {
      "latitude": 19.0760,
      "longitude": 72.8777
    }
  }
}
```

#### **Clock Out**
```javascript
// POST /api/attendance/clock-out
const clockOut = async (latitude, longitude) => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch('http://4.213.212.183/api/attendance/clock-out', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      latitude,
      longitude
    })
  });
  
  return await response.json();
};
```

#### **Get Attendance History**
```javascript
// GET /api/attendance/history?startDate=2025-01-01&endDate=2025-01-31
const getAttendanceHistory = async (startDate, endDate) => {
  const token = localStorage.getItem('accessToken');
  
  const response = await fetch(
    `http://4.213.212.183/api/attendance/history?startDate=${startDate}&endDate=${endDate}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  return await response.json();
};
```

---

## 🔧 **Frontend Configuration**

### **React/Next.js Example**

```javascript
// .env.local or .env.production
NEXT_PUBLIC_AUTH_API_URL=http://4.187.155.37
NEXT_PUBLIC_HR_API_URL=http://4.224.134.129
NEXT_PUBLIC_ATTENDANCE_API_URL=http://4.213.212.183

// lib/api.js
export const API_URLS = {
  auth: process.env.NEXT_PUBLIC_AUTH_API_URL,
  hr: process.env.NEXT_PUBLIC_HR_API_URL,
  attendance: process.env.NEXT_PUBLIC_ATTENDANCE_API_URL
};

// lib/axios.js
import axios from 'axios';

const authAPI = axios.create({
  baseURL: API_URLS.auth,
  timeout: 10000
});

const hrAPI = axios.create({
  baseURL: API_URLS.hr,
  timeout: 10000
});

const attendanceAPI = axios.create({
  baseURL: API_URLS.attendance,
  timeout: 10000
});

// Add auth interceptor
[authAPI, hrAPI, attendanceAPI].forEach(api => {
  api.interceptors.request.use(config => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  
  // Handle token refresh on 401
  api.interceptors.response.use(
    response => response,
    async error => {
      if (error.response?.status === 401) {
        // Token expired, try refresh
        await refreshToken();
        // Retry original request
        return api.request(error.config);
      }
      return Promise.reject(error);
    }
  );
});

export { authAPI, hrAPI, attendanceAPI };
```

### **Vue.js Example**

```javascript
// src/config/api.js
export const API_CONFIG = {
  AUTH_URL: 'http://4.187.155.37',
  HR_URL: 'http://4.224.134.129',
  ATTENDANCE_URL: 'http://4.213.212.183'
};

// src/services/authService.js
import axios from 'axios';
import { API_CONFIG } from '@/config/api';

export const authService = {
  async login(email, password) {
    const response = await axios.post(`${API_CONFIG.AUTH_URL}/api/auth/login`, {
      emailOrEmployeeId: email,
      password
    });
    return response.data;
  },
  
  async getProfile() {
    const token = localStorage.getItem('accessToken');
    const response = await axios.get(`${API_CONFIG.AUTH_URL}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};
```

### **Angular Example**

```typescript
// src/environments/environment.ts
export const environment = {
  production: true,
  apiUrls: {
    auth: 'http://4.187.155.37',
    hr: 'http://4.224.134.129',
    attendance: 'http://4.213.212.183'
  }
};

// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = environment.apiUrls.auth;
  
  constructor(private http: HttpClient) {}
  
  login(email: string, password: string) {
    return this.http.post(`${this.baseUrl}/api/auth/login`, {
      emailOrEmployeeId: email,
      password: password
    });
  }
  
  getProfile() {
    const token = localStorage.getItem('accessToken');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
    
    return this.http.get(`${this.baseUrl}/api/auth/profile`, { headers });
  }
}
```

---

## 🧪 **Test These Endpoints Now**

### **Quick Test with cURL**

```bash
# Test auth service
curl http://4.187.155.37/health
# Expected: {"service":"auth-service","status":"healthy"}

# Test mock login
curl -X POST http://4.187.155.37/api/auth/mock-login-fast \
  -H "Content-Type: application/json" \
  -d '{"role":"admin","email":"test@example.com"}'
# Expected: {"success":true,"data":{"accessToken":"eyJ..."}}

# Test HR service
curl http://4.224.134.129/health
# Expected: Service health response

# Test attendance service
curl http://4.213.212.183/health
# Expected: {"service":"attendance-service","status":"healthy"}
```

### **Test with Postman**

```
Collection Setup:
├── Environment Variables
│   ├── AUTH_URL: http://4.187.155.37
│   ├── HR_URL: http://4.224.134.129
│   ├── ATTENDANCE_URL: http://4.213.212.183
│   └── TOKEN: (will be set after login)
│
├── Auth Service
│   ├── POST {{AUTH_URL}}/api/auth/mock-login-fast
│   ├── POST {{AUTH_URL}}/api/auth/login
│   ├── GET {{AUTH_URL}}/api/auth/profile
│   │   Header: Authorization: Bearer {{TOKEN}}
│   └── POST {{AUTH_URL}}/api/auth/logout
│
├── HR Service  
│   ├── GET {{HR_URL}}/api/hr/employees
│   │   Header: Authorization: Bearer {{TOKEN}}
│   ├── POST {{HR_URL}}/api/hr/employees
│   └── GET {{HR_URL}}/api/hr/stores
│
└── Attendance Service
    ├── POST {{ATTENDANCE_URL}}/api/attendance/clock-in
    │   Header: Authorization: Bearer {{TOKEN}}
    ├── POST {{ATTENDANCE_URL}}/api/attendance/clock-out
    └── GET {{ATTENDANCE_URL}}/api/attendance/history
```

---

## 🔐 **CORS Configuration**

The backend services are configured with:
```javascript
CORS_ORIGIN: '*'  // Allows all origins
```

This means your frontend can call these APIs from:
- localhost (development)
- Any domain (production)
- Mobile apps
- Third-party integrations

**No CORS errors will occur!**

---

## 🚀 **Complete Frontend Integration Example**

### **React Example - Full Auth Flow**

```javascript
// src/services/api.js
const API_URLS = {
  auth: 'http://4.187.155.37',
  hr: 'http://4.224.134.129',
  attendance: 'http://4.213.212.183'
};

// Auth API
export const authAPI = {
  login: async (email, password) => {
    const response = await fetch(`${API_URLS.auth}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailOrEmployeeId: email,
        password: password
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
    }
    
    return data;
  },
  
  logout: async () => {
    const token = localStorage.getItem('accessToken');
    
    await fetch(`${API_URLS.auth}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },
  
  getProfile: async () => {
    const token = localStorage.getItem('accessToken');
    
    const response = await fetch(`${API_URLS.auth}/api/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return await response.json();
  }
};

// HR API
export const hrAPI = {
  getEmployees: async (page = 1, limit = 10, filters = {}) => {
    const token = localStorage.getItem('accessToken');
    
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    
    const response = await fetch(
      `${API_URLS.hr}/api/hr/employees?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return await response.json();
  },
  
  getStores: async () => {
    const token = localStorage.getItem('accessToken');
    
    const response = await fetch(`${API_URLS.hr}/api/hr/stores`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return await response.json();
  }
};

// Attendance API
export const attendanceAPI = {
  clockIn: async (latitude, longitude, selfieFile) => {
    const token = localStorage.getItem('accessToken');
    
    const formData = new FormData();
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    if (selfieFile) {
      formData.append('selfie', selfieFile);
    }
    
    const response = await fetch(`${API_URLS.attendance}/api/attendance/clock-in`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type for FormData
      },
      body: formData
    });
    
    return await response.json();
  },
  
  clockOut: async (latitude, longitude) => {
    const token = localStorage.getItem('accessToken');
    
    const response = await fetch(`${API_URLS.attendance}/api/attendance/clock-out`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ latitude, longitude })
    });
    
    return await response.json();
  },
  
  getHistory: async (startDate, endDate) => {
    const token = localStorage.getItem('accessToken');
    
    const params = new URLSearchParams({
      startDate: startDate,
      endDate: endDate
    });
    
    const response = await fetch(
      `${API_URLS.attendance}/api/attendance/history?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return await response.json();
  }
};
```

---

## 🎯 **Quick Start for Frontend Dev**

### **Step 1: Test Connectivity**

Open browser console and run:
```javascript
// Test auth service
fetch('http://4.187.155.37/health')
  .then(r => r.json())
  .then(d => console.log('Auth:', d));

// Test HR service
fetch('http://4.224.134.129/health')
  .then(r => r.json())
  .then(d => console.log('HR:', d));

// Test attendance service
fetch('http://4.213.212.183/health')
  .then(r => r.json())
  .then(d => console.log('Attendance:', d));
```

### **Step 2: Test Login**

```javascript
// Mock login (no real credentials needed)
fetch('http://4.187.155.37/api/auth/mock-login-fast', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    role: 'admin',
    email: 'test@example.com'
  })
})
.then(r => r.json())
.then(d => {
  console.log('Login success:', d);
  console.log('Token:', d.data.accessToken);
  localStorage.setItem('token', d.data.accessToken);
});
```

### **Step 3: Test Authenticated Request**

```javascript
// Get employees (use token from step 2)
const token = localStorage.getItem('token');

fetch('http://4.224.134.129/api/hr/employees?page=1&limit=5', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(d => console.log('Employees:', d));
```

---

## 📋 **API Reference - Quick Summary**

### **Auth Service** (`4.187.155.37`)
- `POST /api/auth/login` - User login
- `POST /api/auth/mock-login-fast` - Mock login (testing)
- `POST /api/auth/register` - Register user
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh-token` - Refresh JWT

### **HR Service** (`4.224.134.129`)
- `GET /api/hr/employees` - List employees
- `POST /api/hr/employees` - Create employee
- `GET /api/hr/employees/:id` - Get employee
- `PUT /api/hr/employees/:id` - Update employee
- `GET /api/hr/stores` - List stores
- `POST /api/hr/stores` - Create store
- `GET /api/hr/onboarding` - Onboarding data
- `GET /api/leave` - Leave management
- `GET /api/payroll` - Payroll data
- `GET /api/transfers` - Transfers
- `GET /api/reports` - Reports

### **Attendance Service** (`4.213.212.183`)
- `POST /api/attendance/clock-in` - Clock in
- `POST /api/attendance/clock-out` - Clock out
- `GET /api/attendance/history` - Get history
- `GET /api/attendance/summary` - Get summary
- `GET /api/geofencing/settings` - Geofencing settings
- `POST /api/security/validate-location` - Validate location

---

## ⚠️ **Important Notes for Frontend Team**

### **1. These are HTTP (not HTTPS)**
Currently using HTTP. For production:
- Domain name: api.etelios.com (to be configured)
- HTTPS will be enabled via TLS certificate
- IPs will remain the same

### **2. Token Management**
- Access token expires in 15 minutes
- Refresh token expires in 7 days
- Implement auto-refresh before token expires
- Handle 401 errors (token expired)

### **3. Error Handling**
All APIs return consistent format:
```javascript
// Success
{
  "success": true,
  "data": {...},
  "message": "Operation successful"
}

// Error
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

### **4. Rate Limiting**
- Limit: 100 requests per minute per IP
- If exceeded: HTTP 429 Too Many Requests
- Implement retry with exponential backoff

---

## 🎉 **Ready to Start!**

**Give these URLs to your frontend team:**

```
AUTH API:       http://4.187.155.37
HR API:         http://4.224.134.129
ATTENDANCE API: http://4.213.212.183
```

**They can start integrating immediately!** All services are live, tested, and ready to use. 🚀

