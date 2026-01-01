# Complete Frontend Developer Guide - Testing & Authentication

## 📋 Table of Contents
1. [Quick Start](#quick-start)
2. [Authentication Flow](#authentication-flow)
3. [Bearer Token Usage](#bearer-token-usage)
4. [API Testing Guide](#api-testing-guide)
5. [Complete API Reference](#complete-api-reference)
6. [Error Handling](#error-handling)
7. [Code Examples](#code-examples)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Base Configuration

```javascript
// config/api.js
const API_CONFIG = {
  baseURL: 'https://98.70.245.87',  // Azure Backend IP
  host: 'api.etelios.com',           // Required Host header
  timeout: 30000,                     // 30 seconds
  headers: {
    'Content-Type': 'application/json',
    'Host': 'api.etelios.com'        // CRITICAL: Must include Host header
  }
};
```

### Important Notes
- ✅ **Always include `Host: api.etelios.com` header** in all requests
- ✅ **Use HTTPS** (not HTTP) for production
- ✅ **Store tokens securely** (localStorage or httpOnly cookies)
- ✅ **Handle token expiration** and refresh automatically

---

## 🔐 Authentication Flow

### Step 1: Login to Get Tokens

#### Option A: Mock Login (Fast - No Database)
**Best for: Frontend development and testing**

```javascript
// POST /api/auth/mock-login-fast
const response = await fetch('https://98.70.245.87/api/auth/mock-login-fast', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Host': 'api.etelios.com'
  },
  body: JSON.stringify({
    role: 'admin'  // Options: 'admin', 'hr', 'manager', 'employee', 'superadmin'
  })
});

const data = await response.json();
// Response:
// {
//   "success": true,
//   "data": {
//     "user": { ... },
//     "accessToken": "eyJhbGc...",
//     "refreshToken": "eyJhbGc..."
//   }
// }

// Store tokens
localStorage.setItem('accessToken', data.data.accessToken);
localStorage.setItem('refreshToken', data.data.refreshToken);
```

#### Option B: Real Login (With Database)
**Best for: Production and real user testing**

```javascript
// POST /api/auth/login
const response = await fetch('https://98.70.245.87/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Host': 'api.etelios.com'
  },
  body: JSON.stringify({
    emailOrEmployeeId: 'superadmin@etelios.com',  // or employee ID
    password: 'your-password'
  })
});

const data = await response.json();
// Store tokens
localStorage.setItem('accessToken', data.data.accessToken);
localStorage.setItem('refreshToken', data.data.refreshToken);
```

### Step 2: Use Bearer Token in Requests

```javascript
// Example: Get Employees
const token = localStorage.getItem('accessToken');

const response = await fetch('https://98.70.245.87/api/hr/employees?status=active&limit=100', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,  // CRITICAL: Bearer token
    'Host': 'api.etelios.com',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

### Step 3: Handle Token Refresh

```javascript
// When access token expires (401 error)
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  
  const response = await fetch('https://98.70.245.87/api/auth/refresh-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': 'api.etelios.com'
    },
    body: JSON.stringify({
      refreshToken: refreshToken
    })
  });
  
  if (response.ok) {
    const data = await response.json();
    localStorage.setItem('accessToken', data.data.accessToken);
    return data.data.accessToken;
  } else {
    // Refresh token expired - redirect to login
    localStorage.clear();
    window.location.href = '/login';
  }
}
```

---

## 🔑 Bearer Token Usage

### Complete Authentication Helper

```javascript
// utils/auth.js
class AuthService {
  constructor() {
    this.baseURL = 'https://98.70.245.87';
    this.host = 'api.etelios.com';
  }

  // Get stored token
  getToken() {
    return localStorage.getItem('accessToken');
  }

  // Get refresh token
  getRefreshToken() {
    return localStorage.getItem('refreshToken');
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getToken();
  }

  // Make authenticated request
  async authenticatedFetch(url, options = {}) {
    const token = this.getToken();
    
    if (!token) {
      throw new Error('No access token found. Please login.');
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Host': this.host,
      'Content-Type': 'application/json',
      ...options.headers
    };

    let response = await fetch(`${this.baseURL}${url}`, {
      ...options,
      headers
    });

    // Handle token expiration
    if (response.status === 401) {
      // Try to refresh token
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        // Retry request with new token
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(`${this.baseURL}${url}`, {
          ...options,
          headers
        });
      } else {
        // Refresh failed - redirect to login
        this.logout();
        throw new Error('Session expired. Please login again.');
      }
    }

    return response;
  }

  // Refresh access token
  async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseURL}/api/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Host': this.host
        },
        body: JSON.stringify({ refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.data.accessToken);
        return data.data.accessToken;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    return null;
  }

  // Login
  async login(emailOrEmployeeId, password) {
    const response = await fetch(`${this.baseURL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': this.host
      },
      body: JSON.stringify({
        emailOrEmployeeId,
        password
      })
    });

    const data = await response.json();
    
    if (data.success && data.data.accessToken) {
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      return data.data;
    }

    throw new Error(data.message || 'Login failed');
  }

  // Mock login (for testing)
  async mockLogin(role = 'admin') {
    const response = await fetch(`${this.baseURL}/api/auth/mock-login-fast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': this.host
      },
      body: JSON.stringify({ role })
    });

    const data = await response.json();
    
    if (data.success && data.data.accessToken) {
      localStorage.setItem('accessToken', data.data.accessToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      return data.data;
    }

    throw new Error(data.message || 'Mock login failed');
  }

  // Logout
  async logout() {
    const refreshToken = this.getRefreshToken();
    
    if (refreshToken) {
      try {
        await fetch(`${this.baseURL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.getToken()}`,
            'Host': this.host,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ refreshToken })
        });
      } catch (error) {
        console.error('Logout request failed:', error);
      }
    }

    localStorage.clear();
  }

  // Get current user profile
  async getProfile() {
    const response = await this.authenticatedFetch('/api/auth/profile');
    const data = await response.json();
    return data.data;
  }
}

// Export singleton instance
export const authService = new AuthService();
```

---

## 📝 API Testing Guide

### Test Credentials

#### Mock Login (Recommended for Testing)
```javascript
// No credentials needed - just specify role
{
  role: 'admin'  // or 'hr', 'manager', 'employee', 'superadmin'
}
```

#### Real Login Credentials
```
Email: superadmin@etelios.com
Password: (check with backend team)

OR

Employee ID: SUPERADMIN001
Password: (check with backend team)
```

### Complete Testing Workflow

#### 1. Initialize Authentication

```javascript
// App initialization
import { authService } from './utils/auth';

// Check if user is already logged in
if (authService.isAuthenticated()) {
  // User is logged in, fetch profile
  try {
    const user = await authService.getProfile();
    console.log('User profile:', user);
  } catch (error) {
    // Token expired, clear and redirect to login
    authService.logout();
    window.location.href = '/login';
  }
} else {
  // User not logged in, redirect to login
  window.location.href = '/login';
}
```

#### 2. Login Page

```javascript
// Login component
import { authService } from './utils/auth';

async function handleLogin(email, password) {
  try {
    // Option 1: Real login
    const userData = await authService.login(email, password);
    console.log('Login successful:', userData);
    
    // Redirect to dashboard
    window.location.href = '/dashboard';
    
  } catch (error) {
    console.error('Login failed:', error.message);
    alert(`Login failed: ${error.message}`);
  }
}

// OR for testing - Mock login
async function handleMockLogin(role = 'admin') {
  try {
    const userData = await authService.mockLogin(role);
    console.log('Mock login successful:', userData);
    window.location.href = '/dashboard';
  } catch (error) {
    console.error('Mock login failed:', error.message);
  }
}
```

#### 3. Making API Calls

```javascript
// Example: Fetch Employees
import { authService } from './utils/auth';

async function fetchEmployees() {
  try {
    const response = await authService.authenticatedFetch(
      '/api/hr/employees?status=active&limit=100'
    );
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Employees:', data.data);
      return data.data;
    } else {
      throw new Error(data.message || 'Failed to fetch employees');
    }
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
}

// Example: Create Employee
async function createEmployee(employeeData) {
  try {
    const response = await authService.authenticatedFetch(
      '/api/hr/employees',
      {
        method: 'POST',
        body: JSON.stringify(employeeData)
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Employee created:', data.data);
      return data.data;
    } else {
      throw new Error(data.message || 'Failed to create employee');
    }
  } catch (error) {
    console.error('Error creating employee:', error);
    throw error;
  }
}
```

---

## 📚 Complete API Reference

### Authentication APIs

#### 1. Mock Login (Fast - No Database)
```javascript
POST /api/auth/mock-login-fast
Headers: {
  'Content-Type': 'application/json',
  'Host': 'api.etelios.com'
}
Body: {
  role: 'admin'  // 'admin', 'hr', 'manager', 'employee', 'superadmin'
}

Response: {
  success: true,
  data: {
    user: { ... },
    accessToken: "eyJhbGc...",
    refreshToken: "eyJhbGc..."
  }
}
```

#### 2. Real Login
```javascript
POST /api/auth/login
Headers: {
  'Content-Type': 'application/json',
  'Host': 'api.etelios.com'
}
Body: {
  emailOrEmployeeId: 'user@example.com',  // or employee ID
  password: 'password123'
}

Response: {
  success: true,
  data: {
    user: { ... },
    accessToken: "eyJhbGc...",
    refreshToken: "eyJhbGc..."
  }
}
```

#### 3. Refresh Token
```javascript
POST /api/auth/refresh-token
Headers: {
  'Content-Type': 'application/json',
  'Host': 'api.etelios.com'
}
Body: {
  refreshToken: "eyJhbGc..."
}

Response: {
  success: true,
  data: {
    accessToken: "eyJhbGc..."  // New access token
  }
}
```

#### 4. Get Profile
```javascript
GET /api/auth/profile
Headers: {
  'Authorization': 'Bearer <accessToken>',
  'Host': 'api.etelios.com'
}

Response: {
  success: true,
  data: {
    _id: "...",
    email: "user@example.com",
    name: "User Name",
    role: "admin",
    ...
  }
}
```

#### 5. Logout
```javascript
POST /api/auth/logout
Headers: {
  'Authorization': 'Bearer <accessToken>',
  'Host': 'api.etelios.com',
  'Content-Type': 'application/json'
}
Body: {
  refreshToken: "eyJhbGc..."  // Optional
}

Response: {
  success: true,
  message: 'Logout successful'
}
```

### HR Service APIs

#### 1. Get Employees
```javascript
GET /api/hr/employees?status=active&limit=100&page=1
Headers: {
  'Authorization': 'Bearer <accessToken>',
  'Host': 'api.etelios.com'
}

Query Parameters:
  - status: 'active' | 'on_leave' | 'terminated' | 'pending' (or uppercase: 'ACTIVE')
  - limit: number (1-1000, default: 10)
  - page: number (default: 1)
  - search: string (optional)
  - store: string (optional)
  - role: string (optional)
  - department: string (optional)

Response: {
  success: true,
  data: [
    {
      id: "...",
      fullName: "John Doe",
      email: "john@example.com",
      employeeId: "EMP-001",
      status: "active",
      ...
    }
  ],
  pagination: {
    currentPage: 1,
    totalPages: 10,
    totalItems: 100,
    itemsPerPage: 10
  }
}
```

#### 2. Get Employee by ID
```javascript
GET /api/hr/employees/:id
Headers: {
  'Authorization': 'Bearer <accessToken>',
  'Host': 'api.etelios.com'
}

// :id can be MongoDB ObjectId or employee_id (e.g., EMP-2025-172751)

Response: {
  success: true,
  data: {
    id: "...",
    fullName: "John Doe",
    email: "john@example.com",
    ...
  }
}
```

#### 3. Create Employee
```javascript
POST /api/hr/employees
Headers: {
  'Authorization': 'Bearer <accessToken>',
  'Host': 'api.etelios.com',
  'Content-Type': 'application/json'
}
Body: {
  employeeId: "EMP-001",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  password: "password123",
  roleName: "Employee",  // 'SuperAdmin', 'Admin', 'HR', 'Manager', 'Employee'
  phone: "+1234567890",
  jobTitle: "Software Engineer",
  department: "IT",
  storeId: "...",  // Optional
  dateOfBirth: "1990-01-01",  // Optional
  address: {  // Optional
    street: "123 Main St",
    city: "City",
    state: "State",
    zip: "12345",
    country: "Country"
  }
}

Response: {
  success: true,
  data: {
    id: "...",
    fullName: "John Doe",
    ...
  },
  message: "Employee created successfully"
}
```

#### 4. Update Employee
```javascript
PUT /api/hr/employees/:id
Headers: {
  'Authorization': 'Bearer <accessToken>',
  'Host': 'api.etelios.com',
  'Content-Type': 'application/json'
}
Body: {
  firstName: "John Updated",
  lastName: "Doe Updated",
  email: "john.updated@example.com",
  phone: "+1234567890",
  jobTitle: "Senior Software Engineer",
  status: "active"  // 'active', 'on_leave', 'terminated', 'pending'
}

Response: {
  success: true,
  data: { ... },
  message: "Employee updated successfully"
}
```

#### 5. Delete Employee
```javascript
DELETE /api/hr/employees/:id
Headers: {
  'Authorization': 'Bearer <accessToken>',
  'Host': 'api.etelios.com'
}

Response: {
  success: true,
  message: "Employee deleted successfully"
}
```

#### 6. Assign Role to Employee
```javascript
POST /api/hr/employees/:id/assign-role
Headers: {
  'Authorization': 'Bearer <accessToken>',
  'Host': 'api.etelios.com',
  'Content-Type': 'application/json'
}
Body: {
  roleName: "Manager"  // 'SuperAdmin', 'Admin', 'HR', 'Manager', 'Employee'
}

Response: {
  success: true,
  data: { ... },
  message: "Role assigned successfully"
}
```

#### 7. Update Employee Status
```javascript
PATCH /api/hr/employees/:id/status
Headers: {
  'Authorization': 'Bearer <accessToken>',
  'Host': 'api.etelios.com',
  'Content-Type': 'application/json'
}
Body: {
  status: "active"  // 'active', 'on_leave', 'terminated', 'pending'
  // Accepts both lowercase and uppercase: 'active' or 'ACTIVE'
}

Response: {
  success: true,
  data: { ... },
  message: "Employee status updated successfully"
}
```

#### 8. Get Departments
```javascript
GET /api/hr/departments
Headers: {
  'Authorization': 'Bearer <accessToken>',
  'Host': 'api.etelios.com'
}

Response: {
  success: true,
  data: [
    {
      name: "Sales",
      code: "SALES",
      description: "Sales Department"
    },
    {
      name: "IT",
      code: "TECH",
      description: "Technology Department"
    },
    ...
  ]
}
```

#### 9. Create Department
```javascript
POST /api/hr/departments
Headers: {
  'Authorization': 'Bearer <accessToken>',
  'Host': 'api.etelios.com',
  'Content-Type': 'application/json'
}
Body: {
  name: "Marketing",
  code: "MARKETING",
  description: "Marketing Department"  // Optional
}

Response: {
  success: true,
  data: { ... },
  message: "Department created successfully"
}
```

#### 10. Get Stores
```javascript
GET /api/hr/stores?page=1&limit=10
Headers: {
  'Authorization': 'Bearer <accessToken>',
  'Host': 'api.etelios.com'
}

Response: {
  success: true,
  data: [
    {
      id: "...",
      name: "Store Name",
      code: "STORE001",
      address: { ... },
      ...
    }
  ],
  pagination: { ... }
}
```

### Attendance Service APIs

#### 1. Clock In
```javascript
POST /api/attendance/clock-in
Headers: {
  'Authorization': 'Bearer <accessToken>',
  'Host': 'api.etelios.com',
  'Content-Type': 'application/json'
}
Body: {
  latitude: 28.6139,
  longitude: 77.2090,
  notes: "Optional notes"  // Optional
}

Response: {
  success: true,
  data: {
    attendanceId: "...",
    clockInTime: "2025-12-30T10:00:00Z",
    ...
  }
}
```

#### 2. Clock Out
```javascript
POST /api/attendance/clock-out
Headers: {
  'Authorization': 'Bearer <accessToken>',
  'Host': 'api.etelios.com',
  'Content-Type': 'application/json'
}
Body: {
  latitude: 28.6139,
  longitude: 77.2090,
  notes: "Optional notes"  // Optional
}

Response: {
  success: true,
  data: {
    attendanceId: "...",
    clockOutTime: "2025-12-30T18:00:00Z",
    ...
  }
}
```

#### 3. Get Attendance History
```javascript
GET /api/attendance/history?startDate=2025-01-01&endDate=2025-12-31&page=1&limit=10
Headers: {
  'Authorization': 'Bearer <accessToken>',
  'Host': 'api.etelios.com'
}

Response: {
  success: true,
  data: [
    {
      date: "2025-12-30",
      clockIn: "09:00:00",
      clockOut: "18:00:00",
      ...
    }
  ],
  pagination: { ... }
}
```

#### 4. Get Attendance Summary
```javascript
GET /api/attendance/summary?startDate=2025-01-01&endDate=2025-12-31
Headers: {
  'Authorization': 'Bearer <accessToken>',
  'Host': 'api.etelios.com'
}

Response: {
  success: true,
  data: {
    totalDays: 30,
    presentDays: 25,
    absentDays: 5,
    totalHours: 200,
    ...
  }
}
```

### Document APIs

#### 1. Upload Document
```javascript
POST /api/documents/upload
Headers: {
  'Authorization': 'Bearer <accessToken>',
  'Host': 'api.etelios.com'
  // Note: Don't set Content-Type - browser will set it with boundary for multipart/form-data
}
Body: FormData {
  file: <File object>,
  employeeId: "EMP-001",
  documentType: "ID_PROOF",  // Document type
  category: "personal",  // Optional
  complianceRequired: true  // Optional
}

Response: {
  success: true,
  data: {
    documentId: "...",
    fileName: "document.pdf",
    fileUrl: "https://...",
    ...
  }
}
```

#### 2. Get Employee Documents
```javascript
GET /api/documents/:employeeId
Headers: {
  'Authorization': 'Bearer <accessToken>',
  'Host': 'api.etelios.com'
}

Response: {
  success: true,
  data: [
    {
      documentId: "...",
      fileName: "document.pdf",
      documentType: "ID_PROOF",
      uploadDate: "2025-12-30T10:00:00Z",
      ...
    }
  ]
}
```

#### 3. Delete Document
```javascript
DELETE /api/documents/:documentId
Headers: {
  'Authorization': 'Bearer <accessToken>',
  'Host': 'api.etelios.com'
}

Response: {
  success: true,
  message: "Document deleted successfully"
}
```

---

## ⚠️ Error Handling

### Common Error Responses

#### 401 Unauthorized (Token Missing/Invalid)
```javascript
{
  success: false,
  message: "Authentication required",
  error: "UNAUTHORIZED"
}

// Solution: Redirect to login or refresh token
```

#### 403 Forbidden (Insufficient Permissions)
```javascript
{
  success: false,
  message: "You don't have permission to perform this action",
  error: "FORBIDDEN"
}

// Solution: Show error message to user
```

#### 400 Bad Request (Validation Error)
```javascript
{
  success: false,
  message: "Validation failed: \"status\" must be one of [active, on_leave, terminated, pending]",
  error: "VALIDATION_ERROR"
}

// Solution: Show validation errors to user
```

#### 404 Not Found
```javascript
{
  success: false,
  message: "Employee not found",
  error: "NOT_FOUND"
}

// Solution: Show "not found" message
```

#### 500 Internal Server Error
```javascript
{
  success: false,
  message: "An internal server error occurred",
  timestamp: "2025-12-30T20:00:00Z"
}

// Solution: Log error, show generic error message, retry if appropriate
```

### Error Handler Implementation

```javascript
// utils/errorHandler.js
export class APIError extends Error {
  constructor(message, status, code, data) {
    super(message);
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export async function handleAPIResponse(response) {
  const data = await response.json();
  
  if (!response.ok) {
    // Handle different error statuses
    switch (response.status) {
      case 401:
        // Token expired or invalid
        throw new APIError(
          data.message || 'Authentication required',
          401,
          data.error || 'UNAUTHORIZED',
          data
        );
      
      case 403:
        // Insufficient permissions
        throw new APIError(
          data.message || 'Access forbidden',
          403,
          data.error || 'FORBIDDEN',
          data
        );
      
      case 400:
        // Validation error
        throw new APIError(
          data.message || 'Validation failed',
          400,
          data.error || 'VALIDATION_ERROR',
          data
        );
      
      case 404:
        // Resource not found
        throw new APIError(
          data.message || 'Resource not found',
          404,
          data.error || 'NOT_FOUND',
          data
        );
      
      case 500:
        // Server error
        throw new APIError(
          data.message || 'Internal server error',
          500,
          data.error || 'INTERNAL_ERROR',
          data
        );
      
      default:
        throw new APIError(
          data.message || 'An error occurred',
          response.status,
          data.error || 'UNKNOWN_ERROR',
          data
        );
    }
  }
  
  return data;
}

// Usage
try {
  const response = await authService.authenticatedFetch('/api/hr/employees');
  const data = await handleAPIResponse(response);
  console.log('Success:', data);
} catch (error) {
  if (error instanceof APIError) {
    if (error.status === 401) {
      // Redirect to login
      authService.logout();
      window.location.href = '/login';
    } else {
      // Show error message
      alert(error.message);
    }
  } else {
    // Network error or other
    console.error('Request failed:', error);
    alert('Network error. Please try again.');
  }
}
```

---

## 💻 Code Examples

### React Example

```javascript
// hooks/useAuth.js
import { useState, useEffect } from 'react';
import { authService } from '../utils/auth';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        if (authService.isAuthenticated()) {
          const userData = await authService.getProfile();
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        authService.logout();
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      const userData = await authService.login(email, password);
      setUser(userData.user);
      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout
  };
}

// hooks/useEmployees.js
import { useState, useEffect } from 'react';
import { authService } from '../utils/auth';
import { handleAPIResponse } from '../utils/errorHandler';

export function useEmployees(filters = {}) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  const fetchEmployees = async (params = {}) => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        status: filters.status || 'active',
        limit: filters.limit || 100,
        page: params.page || 1,
        ...filters,
        ...params
      });

      const response = await authService.authenticatedFetch(
        `/api/hr/employees?${queryParams}`
      );
      
      const data = await handleAPIResponse(response);
      
      setEmployees(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  return {
    employees,
    loading,
    error,
    pagination,
    refetch: fetchEmployees
  };
}

// components/Login.jsx
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [useMockLogin, setUseMockLogin] = useState(false);
  const { login, loading, error } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (useMockLogin) {
        // Mock login for testing
        await authService.mockLogin('admin');
      } else {
        // Real login
        await login(email, password);
      }
      
      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Login failed:', err);
      alert(`Login failed: ${err.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {!useMockLogin && (
        <>
          <input
            type="email"
            placeholder="Email or Employee ID"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </>
      )}
      
      <label>
        <input
          type="checkbox"
          checked={useMockLogin}
          onChange={(e) => setUseMockLogin(e.target.checked)}
        />
        Use Mock Login (for testing)
      </label>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
      
      {error && <div className="error">{error}</div>}
    </form>
  );
}

// components/EmployeeList.jsx
import { useEmployees } from '../hooks/useEmployees';

export function EmployeeList() {
  const { employees, loading, error, pagination, refetch } = useEmployees({
    status: 'active',
    limit: 100
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Employees</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Employee ID</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr key={employee.id}>
              <td>{employee.fullName}</td>
              <td>{employee.email}</td>
              <td>{employee.employeeId}</td>
              <td>{employee.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {pagination && (
        <div>
          <button
            onClick={() => refetch({ page: pagination.currentPage - 1 })}
            disabled={!pagination.hasPrevPage}
          >
            Previous
          </button>
          <span>
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            onClick={() => refetch({ page: pagination.currentPage + 1 })}
            disabled={!pagination.hasNextPage}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

### Axios Example

```javascript
// utils/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://98.70.245.87',
  timeout: 30000,
  headers: {
    'Host': 'api.etelios.com',
    'Content-Type': 'application/json'
  }
});

// Request interceptor - Add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(
          'https://98.70.245.87/api/auth/refresh-token',
          { refreshToken },
          {
            headers: {
              'Host': 'api.etelios.com',
              'Content-Type': 'application/json'
            }
          }
        );

        const { accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Usage
import api from './utils/api';

// Get employees
const fetchEmployees = async () => {
  try {
    const response = await api.get('/api/hr/employees', {
      params: {
        status: 'active',
        limit: 100
      }
    });
    return response.data.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
};

// Create employee
const createEmployee = async (employeeData) => {
  try {
    const response = await api.post('/api/hr/employees', employeeData);
    return response.data.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    throw error;
  }
};
```

---

## 🧪 Testing Checklist

### Authentication Testing

- [ ] **Mock Login Works**
  ```javascript
  // Test mock login
  const response = await fetch('https://98.70.245.87/api/auth/mock-login-fast', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': 'api.etelios.com'
    },
    body: JSON.stringify({ role: 'admin' })
  });
  // Should return 200 with tokens
  ```

- [ ] **Real Login Works**
  ```javascript
  // Test real login
  const response = await fetch('https://98.70.245.87/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': 'api.etelios.com'
    },
    body: JSON.stringify({
      emailOrEmployeeId: 'test@test.com',
      password: 'password'
    })
  });
  // Should return 200 with tokens or 401 if invalid
  ```

- [ ] **Token Storage**
  ```javascript
  // After login, check tokens are stored
  console.log('Access Token:', localStorage.getItem('accessToken'));
  console.log('Refresh Token:', localStorage.getItem('refreshToken'));
  // Both should be present
  ```

- [ ] **Authenticated Request Works**
  ```javascript
  // Test API call with token
  const token = localStorage.getItem('accessToken');
  const response = await fetch('https://98.70.245.87/api/hr/employees', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Host': 'api.etelios.com'
    }
  });
  // Should return 200 with data, not 401
  ```

- [ ] **Token Refresh Works**
  ```javascript
  // Test token refresh
  const refreshToken = localStorage.getItem('refreshToken');
  const response = await fetch('https://98.70.245.87/api/auth/refresh-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': 'api.etelios.com'
    },
    body: JSON.stringify({ refreshToken })
  });
  // Should return 200 with new accessToken
  ```

### API Testing

- [ ] **Get Employees**
  ```javascript
  // Test with different status values
  GET /api/hr/employees?status=active&limit=100
  GET /api/hr/employees?status=ACTIVE&limit=1000  // Uppercase should work
  // Both should return 200
  ```

- [ ] **Create Employee**
  ```javascript
  // Test employee creation
  POST /api/hr/employees
  // Should return 201 with created employee
  ```

- [ ] **Update Employee**
  ```javascript
  // Test employee update
  PUT /api/hr/employees/:id
  // Should return 200 with updated employee
  ```

- [ ] **Get Departments**
  ```javascript
  // Test departments endpoint
  GET /api/hr/departments
  // Should return 200 with department list
  ```

- [ ] **Get Stores**
  ```javascript
  // Test stores endpoint
  GET /api/hr/stores
  // Should return 200 with store list
  ```

---

## 🔧 Troubleshooting

### Issue 1: 404 Not Found
**Problem:** API returns 404 even with correct URL

**Solutions:**
1. ✅ Check Host header is included: `Host: api.etelios.com`
2. ✅ Verify URL path: `/api/hr/employees` (not `/api/employees`)
3. ✅ Check if service is running: `GET /health`

### Issue 2: 401 Unauthorized
**Problem:** Getting 401 even with token

**Solutions:**
1. ✅ Verify token format: `Bearer <token>` (with space)
2. ✅ Check token is not expired (refresh if needed)
3. ✅ Verify token is in Authorization header
4. ✅ Try logging in again to get fresh token

### Issue 3: 500 Internal Server Error
**Problem:** Backend returns 500 errors

**Solutions:**
1. ✅ Check request parameters (status should be lowercase or uppercase)
2. ✅ Check limit is ≤ 1000
3. ✅ Verify request body format is correct
4. ✅ Check backend logs for specific error

### Issue 4: CORS Errors
**Problem:** CORS policy blocking requests

**Solutions:**
1. ✅ Backend is configured to allow all origins (`CORS_ORIGIN: "*"`)
2. ✅ If still getting CORS errors, check:
   - Request includes `Host: api.etelios.com` header
   - Using HTTPS (not HTTP)
   - No mixed content (HTTP + HTTPS)

### Issue 5: Token Expired
**Problem:** Token expires and requests fail

**Solutions:**
1. ✅ Implement automatic token refresh
2. ✅ Check token expiration time (usually 1 hour)
3. ✅ Refresh token before it expires
4. ✅ Redirect to login if refresh fails

---

## 📞 Support & Resources

### Backend Information
- **Base URL:** `https://98.70.245.87`
- **Host Header:** `api.etelios.com` (REQUIRED)
- **Protocol:** HTTPS
- **Timeout:** 30 seconds recommended

### Test Endpoints
- **Health Check:** `GET /api/auth/health`
- **Mock Login:** `POST /api/auth/mock-login-fast`
- **Real Login:** `POST /api/auth/login`

### Documentation Files
- `COMPLETE_API_INVENTORY.md` - All APIs documented
- `FRONTEND_COMPLETE_MIGRATION_GUIDE.md` - Migration guide
- `EXACT_CONFIGURATION_GUIDE.md` - Backend configuration

---

## ✅ Quick Reference Card

```javascript
// 1. LOGIN
POST https://98.70.245.87/api/auth/mock-login-fast
Headers: { 'Host': 'api.etelios.com', 'Content-Type': 'application/json' }
Body: { role: 'admin' }

// 2. STORE TOKENS
localStorage.setItem('accessToken', data.data.accessToken);
localStorage.setItem('refreshToken', data.data.refreshToken);

// 3. MAKE REQUEST
GET https://98.70.245.87/api/hr/employees?status=active&limit=100
Headers: {
  'Authorization': 'Bearer ' + localStorage.getItem('accessToken'),
  'Host': 'api.etelios.com'
}

// 4. HANDLE ERRORS
if (response.status === 401) {
  // Refresh token or redirect to login
}
```

---

**Last Updated:** 2025-12-30  
**Version:** 1.0  
**Status:** Production Ready ✅

