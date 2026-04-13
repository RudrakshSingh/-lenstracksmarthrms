# 📘 Frontend API Complete Guide - How to Make APIs Work

## 🚀 Quick Start

### API Base URL
```
http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

### Environment Variable
```env
NEXT_PUBLIC_API_BASE_URL=http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

---

## 📊 API Status Summary

### ✅ Working APIs (Tested & Verified)

| API | Status | HTTP Code |
|-----|--------|-----------|
| Auth Health | ✅ Working | 200 |
| Login | ✅ Working | 200 |
| Get Current User | ✅ Working | 200 |
| HR Health | ✅ Working | 200 |
| Get Employees | ✅ Working | 200 |
| Get Departments | ✅ Working | 200 |
| Get Stores | ✅ Working | 200 |
| Attendance Health | ✅ Working | 200 |

### ⚠️ APIs with Issues

| API | Status | Issue | Solution |
|-----|--------|-------|----------|
| Get Attendance Records | ❌ 404 | Route not found | Use correct endpoint |
| Get Attendance Summary | ❌ 404 | Route not found | Use correct endpoint |
| Payroll APIs | ❌ 504 | Gateway timeout | Service may be restarting |
| Get Current Company | ❌ 404 | Route not found | Check tenant service |

---

## 🔐 Authentication Setup

### Step 1: Create API Client

```typescript
// src/lib/api-client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 
  'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token and tenant ID
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken') || 
                  localStorage.getItem('authToken') || '';
    const tenantId = localStorage.getItem('tenantId') || 'lenstrack';

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (tenantId) {
      config.headers['x-tenant-id'] = tenantId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## 📡 Working APIs - Complete Examples

### 1. Authentication APIs

#### ✅ Login

```typescript
// services/authService.ts
import apiClient from '@/lib/api-client';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: {
      id: string;
      email: string;
      role: string;
      tenantId: string;
      employeeId?: string;
    };
    mustChangePassword?: boolean; // ✅ Flag indicating password change required
    passwordTemporary?: boolean;   // ✅ Flag indicating temporary password
  };
  message: string;
}

export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  try {
    const response = await apiClient.post('/api/auth/login', credentials);
    
    if (response.data.success && response.data.data.accessToken) {
      // Store token
      localStorage.setItem('accessToken', response.data.data.accessToken);
      localStorage.setItem('tenantId', response.data.data.user.tenantId);
      localStorage.setItem('user', JSON.stringify(response.data.data.user));
      
      // ✅ CRITICAL: Check if password change is required (temporary password / first login)
      if (response.data.data.mustChangePassword || response.data.data.passwordTemporary) {
        // Redirect to change password page with reason
        // Frontend router should handle: /auth/change-password?reason=first_login
        const redirectUrl = `/auth/change-password?reason=first_login&email=${encodeURIComponent(credentials.email)}`;
        // For React Router: navigate(redirectUrl)
        // For Next.js: router.push(redirectUrl)
        // For Vue Router: this.$router.push(redirectUrl)
        window.location.href = redirectUrl;
        // Return response so caller knows redirect is happening
        return response.data;
      }
      
      return response.data;
    }
    throw new Error(response.data.message || 'Login failed');
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};
```

**Request:**
```json
POST /api/auth/login
Content-Type: application/json

{
  "email": "Admin@lenstrack.com",
  "password": "Kadarkhan@123"
}
```

**Response (Normal Login):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "6991e71f1a07cb84b2c2c17e",
      "email": "admin@lenstrack.com",
      "role": "admin",
      "tenantId": "lenstrack",
      "employeeId": "LENSTRACK-ADMIN-001"
    },
    "mustChangePassword": false,
    "passwordTemporary": false
  },
  "message": "Login successful"
}
```

**Response (Temporary Password / First Login):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "6991e71f1a07cb84b2c2c17e",
      "email": "admin@lenstrack.com",
      "role": "admin",
      "tenantId": "lenstrack",
      "employeeId": "LENSTRACK-ADMIN-001"
    },
    "mustChangePassword": true,  // ✅ Frontend should redirect to /auth/change-password?reason=first_login
    "passwordTemporary": true
  },
  "message": "Login successful"
}
```

**⚠️ Important:** When `mustChangePassword: true`, the backend returns **200 OK** (not 401). Frontend must check this flag and redirect to the password change page. Do not show "Access denied" error.

#### ✅ Get Current User

```typescript
export const getCurrentUser = async () => {
  try {
    const response = await apiClient.get('/api/auth/me');
    return response.data;
  } catch (error) {
    throw error;
  }
};
```

**Request:**
```json
GET /api/auth/me
Authorization: Bearer <token>
x-tenant-id: lenstrack
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "6991e71f1a07cb84b2c2c17e",
    "email": "admin@lenstrack.com",
    "role": "admin",
    "tenantId": "lenstrack"
  }
}
```

---

### 2. HR Management APIs

#### ✅ Get Employees

```typescript
// services/employeeService.ts
import apiClient from '@/lib/api-client';

export interface GetEmployeesParams {
  page?: number;
  limit?: number;
  search?: string;
  department?: string;
  status?: string;
}

export const getEmployees = async (params: GetEmployeesParams = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.department) queryParams.append('department', params.department);
    if (params.status) queryParams.append('status', params.status);

    const response = await apiClient.get(`/api/hr/employees?${queryParams.toString()}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};
```

**Request:**
```json
GET /api/hr/employees?limit=10&page=1
Authorization: Bearer <token>
x-tenant-id: lenstrack
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "6993588a44cf4bf0ff1dc71d",
      "employeeId": "EMP-2026-116865",
      "fullName": "Ravi Kumar",
      "email": "ravirrr@gmail.com",
      "department": "Sales",
      "status": "active"
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "limit": 10
  }
}
```

#### ✅ Create Employee

**⚠️ CRITICAL: Must include `employeeId`!**

```typescript
export interface EmployeeFormData {
  employeeId?: string;  // ⚠️ REQUIRED - Generate if not provided
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  department: string;
  designation?: string;
  status?: string;
}

export const createEmployee = async (formData: EmployeeFormData) => {
  try {
    // ⚠️ CRITICAL: Generate employeeId if not provided
    const employeeId = formData.employeeId || `EMP-${Date.now()}`;
    
    // ⚠️ CRITICAL: Ensure fullName exists
    const fullName = formData.fullName || 
      (formData.firstName && formData.lastName 
        ? `${formData.firstName} ${formData.lastName}` 
        : formData.firstName || '');

    const payload = {
      employeeId: employeeId,  // ⚠️ REQUIRED!
      firstName: formData.firstName,
      lastName: formData.lastName || '',
      fullName: fullName,
      email: formData.email,  // ⚠️ REQUIRED!
      phone: formData.phone || '',
      department: formData.department,  // ⚠️ REQUIRED!
      designation: formData.designation || '',
      status: formData.status || 'active',
    };

    const response = await apiClient.post('/api/hr/employees', payload);
    
    if (response.data.success) {
      return response.data;
    }
    throw new Error(response.data.message || 'Failed to create employee');
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to create employee');
  }
};
```

**Request:**
```json
POST /api/hr/employees
Authorization: Bearer <token>
x-tenant-id: lenstrack
Content-Type: application/json

{
  "employeeId": "EMP-2026-123456",  // ⚠️ REQUIRED!
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",  // ⚠️ REQUIRED!
  "department": "Sales",  // ⚠️ REQUIRED!
  "designation": "Sales Executive",
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "6993588a44cf4bf0ff1dc71d",
    "employeeId": "EMP-2026-123456",
    "fullName": "John Doe",
    "email": "john@example.com",
    "department": "Sales",
    "status": "active"
  },
  "message": "Employee created successfully"
}
```

#### ✅ Get Departments

```typescript
export const getDepartments = async () => {
  try {
    const response = await apiClient.get('/api/hr/departments');
    return response.data;
  } catch (error) {
    throw error;
  }
};
```

**Request:**
```json
GET /api/hr/departments
Authorization: Bearer <token>
x-tenant-id: lenstrack
```

#### ✅ Get Stores

```typescript
export const getStores = async () => {
  try {
    const response = await apiClient.get('/api/hr/stores');
    return response.data;
  } catch (error) {
    throw error;
  }
};
```

**Request:**
```json
GET /api/hr/stores
Authorization: Bearer <token>
x-tenant-id: lenstrack
```

---

### 3. Attendance APIs

#### ✅ Clock In

```typescript
// services/attendanceService.ts
import apiClient from '@/lib/api-client';

export interface ClockInData {
  latitude: number;
  longitude: number;
  location?: string;
  notes?: string;
}

export const clockIn = async (data: ClockInData) => {
  try {
    const response = await apiClient.post('/api/attendance/clock-in', {
      latitude: data.latitude,
      longitude: data.longitude,
      location: data.location || '',
      notes: data.notes || '',
    });
    
    if (response.data.success) {
      return response.data;
    }
    throw new Error(response.data.message || 'Clock-in failed');
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Clock-in failed');
  }
};
```

**Request:**
```json
POST /api/attendance/clock-in
Authorization: Bearer <token>
x-tenant-id: lenstrack
Content-Type: application/json

{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "location": "Delhi, India",
  "notes": "Office check-in"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "6993588a44cf4bf0ff1dc71d",
    "employeeId": "EMP-2026-116865",
    "check_in_time": "2026-02-16T17:00:00.000Z",
    "status": "present"
  },
  "message": "Clock-in successful"
}
```

#### ⚠️ Get Attendance Records (404 Issue)

**Current Status:** ❌ Returns 404

**Possible Solutions:**
1. Check if route is `/api/attendance/records` instead of `/api/attendance`
2. Verify authentication token is valid
3. Check tenant ID is correct

**Try this:**
```typescript
export const getAttendanceRecords = async (params: {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
} = {}) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.employeeId) queryParams.append('employeeId', params.employeeId);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    // Try both endpoints
    try {
      const response = await apiClient.get(`/api/attendance/records?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      // Fallback to alternative endpoint
      const response = await apiClient.get(`/api/attendance?${queryParams.toString()}`);
      return response.data;
    }
  } catch (error) {
    throw error;
  }
};
```

---

## 🚨 Error Handling

### Standard Error Response Format

```typescript
interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  timestamp: string;
  path: string;
}
```

### Error Handling Utility

```typescript
// utils/errorHandler.ts
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  } else if (error.message) {
    return error.message;
  } else {
    return 'An unexpected error occurred. Please try again.';
  }
};

// Usage in components
try {
  await createEmployee(formData);
  toast.success('Employee created successfully!');
} catch (error) {
  const errorMessage = handleApiError(error);
  toast.error(errorMessage);
}
```

### Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 400 | Bad Request | Check required fields (employeeId, email, department) |
| 401 | Unauthorized | Check Authorization header |
| 403 | Forbidden | Check user permissions |
| 404 | Not Found | Check endpoint URL and route |
| 500 | Server Error | Retry after some time |
| 504 | Gateway Timeout | Service may be restarting, retry later |

---

## 🔧 Troubleshooting

### Issue 1: "Employee ID is required" (400)

**Problem:** Backend requires `employeeId` but frontend is not sending it.

**Fix:**
```typescript
const payload = {
  employeeId: formData.employeeId || `EMP-${Date.now()}`,  // Generate if missing
  // ... other fields
};
```

### Issue 2: 404 Not Found

**Problem:** Wrong endpoint URL or route not found.

**Fix:**
1. Check API base URL is correct (not localhost)
2. Verify endpoint path is correct
3. Check if route requires authentication
4. Verify tenant ID header is present

### Issue 3: 401 Unauthorized

**Problem:** Missing or invalid authentication token.

**Fix:**
```typescript
// Ensure token is in localStorage
const token = localStorage.getItem('accessToken');
if (!token) {
  // Redirect to login
  window.location.href = '/login';
}

// Ensure Authorization header is set
config.headers.Authorization = `Bearer ${token}`;
```

### Issue 4: 504 Gateway Timeout

**Problem:** Service is taking too long to respond or is restarting.

**Fix:**
1. Retry the request after a few seconds
2. Check if service is available (health endpoint)
3. Contact backend team if issue persists

### Issue 5: CORS Error

**Problem:** Browser blocking cross-origin requests.

**Fix:**
- Backend CORS is configured ✅
- Ensure you're using the correct production URL (not localhost)
- Check if request includes proper headers

---

## 📋 Required Headers Checklist

Every authenticated request MUST include:

```typescript
headers: {
  'Authorization': `Bearer ${token}`,  // ⚠️ REQUIRED
  'x-tenant-id': tenantId,            // ⚠️ REQUIRED
  'Content-Type': 'application/json'   // ⚠️ REQUIRED for POST/PUT
}
```

---

## 💻 Complete React Example

```typescript
// components/EmployeeForm.tsx
'use client';

import { useState } from 'react';
import { createEmployee } from '@/services/employeeService';
import { toast } from 'react-hot-toast';

export default function EmployeeForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ⚠️ CRITICAL: Generate employeeId
      const employeeId = `EMP-${Date.now()}`;
      
      const result = await createEmployee({
        ...formData,
        employeeId,  // ⚠️ REQUIRED!
      });

      toast.success('Employee created successfully!');
      console.log('Created:', result.data);
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        department: '',
        designation: '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to create employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="First Name"
        value={formData.firstName}
        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
        required
      />
      <input
        type="text"
        placeholder="Last Name"
        value={formData.lastName}
        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
      />
      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />
      <select
        value={formData.department}
        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
        required
      >
        <option value="">Select Department</option>
        <option value="Sales">Sales</option>
        <option value="IT">IT</option>
        <option value="HR">HR</option>
      </select>
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Employee'}
      </button>
    </form>
  );
}
```

---

## 📝 Best Practices

1. ✅ **Always use environment variables** for API URLs
2. ✅ **Always include `employeeId`** when creating employees
3. ✅ **Always include `Authorization` header** in authenticated requests
4. ✅ **Always include `x-tenant-id` header** for multi-tenant support
5. ✅ **Handle errors gracefully** with user-friendly messages
6. ✅ **Check browser DevTools Network tab** for debugging
7. ✅ **Validate required fields** before sending requests
8. ✅ **Use TypeScript** for type safety

---

## 🆘 Support & Debugging

### Debug Checklist

1. ✅ Check `.env` file has correct `NEXT_PUBLIC_API_BASE_URL`
2. ✅ Restart dev server after changing `.env`
3. ✅ Check browser DevTools Network tab
4. ✅ Verify `Authorization` header is present
5. ✅ Verify `x-tenant-id` header is present
6. ✅ Verify `employeeId` is in request payload (for employee creation)
7. ✅ Check response status code and error message

### Test API Connection

```javascript
// Browser console
fetch('http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/health')
  .then(res => res.json())
  .then(data => console.log('✅ API Connected:', data))
  .catch(err => console.error('❌ API Error:', err));
```

---

## 📚 Additional Resources

- **Complete Developer Guide:** See `FRONTEND_DEVELOPER_GUIDE.md`
- **Quick Reference:** See `FRONTEND_QUICK_REFERENCE.md`
- **Troubleshooting:** See `FRONTEND_DB_ISSUE_DIAGNOSIS.md`

---

**Last Updated:** 2026-02-16  
**API Version:** v1  
**Status:** ✅ Production Ready (Most APIs Working)
