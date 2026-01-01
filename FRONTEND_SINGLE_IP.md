# Frontend Integration - Single IP Configuration

**Date:** December 30, 2025  
**Status:** ✅ PRODUCTION READY  
**Backend IP:** `98.70.245.87`

---

## 🌐 **USE THIS SINGLE IP FOR ALL SERVICES**

```
http://98.70.245.87
```

**This ONE IP gives access to ALL backend services!**

---

## 🚀 **Quick Start (2 Minutes)**

### JavaScript Configuration

```javascript
// ✅ SINGLE BASE URL (Use this!)
const API_BASE_URL = 'http://98.70.245.87';

// All endpoints through ONE IP:
const endpoints = {
  // Auth endpoints
  login: `${API_BASE_URL}/api/auth/login`,
  mockLogin: `${API_BASE_URL}/api/auth/mock-login-fast`,
  profile: `${API_BASE_URL}/api/auth/profile`,
  logout: `${API_BASE_URL}/api/auth/logout`,
  
  // HR endpoints
  employees: `${API_BASE_URL}/api/hr/employees`,
  stores: `${API_BASE_URL}/api/hr/stores`,
  
  // Attendance endpoints
  clockIn: `${API_BASE_URL}/api/attendance/clock-in`,
  clockOut: `${API_BASE_URL}/api/attendance/clock-out`,
  history: `${API_BASE_URL}/api/attendance/history`
};
```

---

## 🧪 **Test Right Now**

Open your browser console and run:

```javascript
// Test 1: Auth service
fetch('http://98.70.245.87/api/auth/status')
  .then(r => r.json())
  .then(d => console.log('✅ Auth working:', d));

// Test 2: Mock login
fetch('http://98.70.245.87/api/auth/mock-login-fast', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ role: 'admin', email: 'test@test.com' })
})
.then(r => r.json())
.then(d => {
  console.log('✅ Login working:', d.success);
  console.log('Token:', d.data.accessToken);
  localStorage.setItem('token', d.data.accessToken);
});

// Test 3: Get employees (with token from test 2)
fetch('http://98.70.245.87/api/hr/employees?page=1&limit=5', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
})
.then(r => r.json())
.then(d => console.log('✅ HR working:', d));

// Test 4: Attendance
fetch('http://98.70.245.87/api/attendance/records', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
})
.then(r => r.json())
.then(d => console.log('✅ Attendance working:', d));
```

---

## 📱 **React/Next.js Configuration**

```javascript
// .env.local
NEXT_PUBLIC_API_BASE_URL=http://98.70.245.87

// src/config/api.js
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://98.70.245.87';

// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to all requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 (token expired)
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Usage:
// Login
await api.post('/api/auth/login', { email, password });

// Get employees
await api.get('/api/hr/employees?page=1&limit=10');

// Clock in
const formData = new FormData();
formData.append('latitude', lat);
formData.append('longitude', lng);
formData.append('selfie', file);

await api.post('/api/attendance/clock-in', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
```

---

## 🎯 **Complete API Endpoints (Single IP)**

### Auth Service
```
POST   http://98.70.245.87/api/auth/login
POST   http://98.70.245.87/api/auth/mock-login-fast
GET    http://98.70.245.87/api/auth/profile
POST   http://98.70.245.87/api/auth/logout
POST   http://98.70.245.87/api/auth/refresh-token
```

### HR Service
```
GET    http://98.70.245.87/api/hr/employees
POST   http://98.70.245.87/api/hr/employees
GET    http://98.70.245.87/api/hr/employees/:id
PUT    http://98.70.245.87/api/hr/employees/:id
GET    http://98.70.245.87/api/hr/stores
GET    http://98.70.245.87/api/transfers
GET    http://98.70.245.87/api/hr-letter
GET    http://98.70.245.87/api/leave
GET    http://98.70.245.87/api/payroll
```

### Attendance Service
```
POST   http://98.70.245.87/api/attendance/clock-in
POST   http://98.70.245.87/api/attendance/clock-out
GET    http://98.70.245.87/api/attendance/history
GET    http://98.70.245.87/api/attendance/summary
GET    http://98.70.245.87/api/geofencing/settings
```

---

## 📋 **Simple Copy-Paste Configuration**

```javascript
// ============================================
// COPY THIS INTO YOUR FRONTEND CODE
// ============================================

// API Configuration
export const API_CONFIG = {
  BASE_URL: 'http://98.70.245.87',
  ENDPOINTS: {
    // Auth
    LOGIN: '/api/auth/login',
    MOCK_LOGIN: '/api/auth/mock-login-fast',
    PROFILE: '/api/auth/profile',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh-token',
    
    // HR
    EMPLOYEES: '/api/hr/employees',
    STORES: '/api/hr/stores',
    
    // Attendance
    CLOCK_IN: '/api/attendance/clock-in',
    CLOCK_OUT: '/api/attendance/clock-out',
    HISTORY: '/api/attendance/history'
  }
};

// Usage:
// Login: POST ${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}
// Get employees: GET ${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EMPLOYEES}
```

---

## ✅ **Benefits of Single IP**

| Benefit | Description |
|---------|-------------|
| **Simplicity** | One IP to remember and configure |
| **Cost** | Saves ~$90/month (1 vs 4 Load Balancers) |
| **DNS** | Only need 1 DNS entry (api.etelios.com → 98.70.245.87) |
| **SSL** | Only need 1 certificate |
| **Maintenance** | Easier to manage |
| **Security** | Single point to monitor |

---

## 🎯 **FOR YOUR FRONTEND DEVELOPER**

**Tell them to use:**

```
API_BASE_URL = "http://98.70.245.87"
```

**That's it! Single IP, all services accessible!**

---

**Status:** ✅ Configured  
**Tested:** ✅ Working  
**Cost:** ✅ Optimized  
**Ready:** ✅ For frontend development

