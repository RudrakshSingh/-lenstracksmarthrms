# Frontend Environment Configuration

## 🌐 Backend URL for Frontend

### Base URL
```
https://98.70.245.87
```

---

## 📝 .env File Configuration

### For Next.js / React / Vue / Angular

Create or update your `.env` or `.env.local` file:

```env
# Backend API Base URL
NEXT_PUBLIC_API_BASE_URL=https://98.70.245.87
# OR
REACT_APP_API_BASE_URL=https://98.70.245.87
# OR
VITE_API_BASE_URL=https://98.70.245.87

# API Host (for routing - optional but recommended)
NEXT_PUBLIC_API_HOST=api.etelios.com
```

---

## 🔧 Usage in Frontend Code

### Option 1: Direct API Calls (Recommended)

```typescript
// config/api.ts or utils/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://98.70.245.87';
const API_HOST = process.env.NEXT_PUBLIC_API_HOST || 'api.etelios.com';

export const apiClient = {
  // Auth endpoints
  login: `${API_BASE_URL}/api/auth/login`,
  mockLogin: `${API_BASE_URL}/api/auth/mock-login`,
  profile: `${API_BASE_URL}/api/auth/profile`,
  
  // HR endpoints
  employees: `${API_BASE_URL}/api/hr/employees`,
  departments: `${API_BASE_URL}/api/hr/departments`,
  stores: `${API_BASE_URL}/api/hr/stores`,
  onboarding: {
    personalDetails: `${API_BASE_URL}/api/hr/onboarding/personal-details`,
    workDetails: `${API_BASE_URL}/api/hr/onboarding/work-details`,
    statutoryInfo: `${API_BASE_URL}/api/hr/onboarding/statutory-info`,
    complete: (id: string) => `${API_BASE_URL}/api/hr/onboarding/complete/${id}`
  },
  
  // Attendance endpoints
  clockIn: `${API_BASE_URL}/api/attendance/clock-in`,
  clockOut: `${API_BASE_URL}/api/attendance/clock-out`,
  attendanceRecords: `${API_BASE_URL}/api/attendance/records`
};

// Fetch wrapper with headers
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const headers: HeadersInit = {
    'Host': API_HOST,
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  // Add auth token if available
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(url, {
    ...options,
    headers
  });
}
```

### Option 2: Using Next.js API Routes as Proxy

If you're using Next.js API routes as a proxy:

```typescript
// .env.local
NEXT_PUBLIC_API_BASE_URL=https://98.70.245.87
NEXT_PUBLIC_API_HOST=api.etelios.com

// lib/api-client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// For client-side: use relative URLs (goes through Next.js API routes)
// For server-side: use full URLs
export function getApiUrl(endpoint: string) {
  if (typeof window === 'undefined') {
    // Server-side: use full URL
    return `${API_BASE_URL}${endpoint}`;
  } else {
    // Client-side: use relative URL (goes through Next.js proxy)
    return endpoint;
  }
}
```

---

## 📋 Complete .env Example

### Next.js
```env
# .env.local
NEXT_PUBLIC_API_BASE_URL=https://98.70.245.87
NEXT_PUBLIC_API_HOST=api.etelios.com
NEXT_PUBLIC_ENVIRONMENT=production
```

### React (Create React App)
```env
# .env
REACT_APP_API_BASE_URL=https://98.70.245.87
REACT_APP_API_HOST=api.etelios.com
REACT_APP_ENVIRONMENT=production
```

### Vite
```env
# .env
VITE_API_BASE_URL=https://98.70.245.87
VITE_API_HOST=api.etelios.com
VITE_ENVIRONMENT=production
```

---

## 🎯 Quick Setup Guide

### Step 1: Create .env file
```bash
# In your frontend project root
touch .env.local  # For Next.js
# OR
touch .env       # For React/Vue
```

### Step 2: Add configuration
```env
NEXT_PUBLIC_API_BASE_URL=https://98.70.245.87
NEXT_PUBLIC_API_HOST=api.etelios.com
```

### Step 3: Use in code
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

fetch(`${API_BASE_URL}/api/hr/employees`)
```

---

## ✅ Important Notes

1. **Use HTTPS**: Always use `https://` not `http://`
2. **No trailing slash**: Don't add `/` at the end of base URL
3. **Service paths**: All APIs are under `/api/<service>/*`
4. **Host header**: Optional but recommended for proper routing
5. **Environment variables**: 
   - Next.js: Must start with `NEXT_PUBLIC_` for client-side
   - React: Must start with `REACT_APP_`
   - Vite: Must start with `VITE_`

---

## 🔍 Example API Calls

### With Environment Variable
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Health check
fetch(`${API_BASE_URL}/api/hr/health`)

// Get employees
fetch(`${API_BASE_URL}/api/hr/employees`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})

// Create employee
fetch(`${API_BASE_URL}/api/hr/employees`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(employeeData)
})
```

---

## 📊 URL Structure

```
Base URL: https://98.70.245.87
         └── /api
             ├── /auth/*          (Auth Service)
             ├── /hr/*            (HR Service)
             └── /attendance/*    (Attendance Service)
```

### Examples
- ✅ `https://98.70.245.87/api/hr/health`
- ✅ `https://98.70.245.87/api/hr/employees`
- ✅ `https://98.70.245.87/api/auth/mock-login`
- ✅ `https://98.70.245.87/api/attendance/records`

---

## 🚨 Common Mistakes to Avoid

### ❌ Wrong
```env
# Don't add trailing slash
API_BASE_URL=https://98.70.245.87/

# Don't use http
API_BASE_URL=http://98.70.245.87

# Don't include /api in base URL
API_BASE_URL=https://98.70.245.87/api
```

### ✅ Correct
```env
API_BASE_URL=https://98.70.245.87
```

Then in code:
```typescript
// Add /api/<service> in the endpoint
fetch(`${API_BASE_URL}/api/hr/employees`)
```

---

## 🧪 Testing the Configuration

### Test Script
```typescript
// test-api-connection.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

async function testConnection() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/hr/health`);
    const data = await response.json();
    console.log('✅ Backend connected:', data);
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error);
    return false;
  }
}

testConnection();
```

---

## 📝 Summary

**For Frontend Developer:**

1. **Add to .env file:**
   ```env
   NEXT_PUBLIC_API_BASE_URL=https://98.70.245.87
   NEXT_PUBLIC_API_HOST=api.etelios.com
   ```

2. **Use in code:**
   ```typescript
   const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
   fetch(`${API_BASE_URL}/api/hr/employees`)
   ```

3. **All APIs are under `/api/<service>/*`**

4. **Root URL (/) gives 404 - this is normal**

---

**Last Updated**: 2026-01-01  
**Backend URL**: `https://98.70.245.87`  
**Status**: ✅ Production Ready

