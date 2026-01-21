# Frontend API Complete Documentation - Tested & Verified

**Generated:** January 21, 2026  
**Base URL:** `https://98.70.245.87`  
**API Host:** `api.etelios.com`  
**Status:** ✅ All APIs Tested & Working

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Authentication Flow](#authentication-flow)
3. [Tenant Isolation - CRITICAL](#tenant-isolation---critical)
4. [Complete API Flow](#complete-api-flow)
5. [API Endpoints Reference](#api-endpoints-reference)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)
8. [Code Examples](#code-examples)

---

## Prerequisites

### Base Configuration

```javascript
const BASE_URL = 'https://98.70.245.87';
const API_HOST = 'api.etelios.com';
```

### Required Headers for ALL Requests

```javascript
{
  'Content-Type': 'application/json',
  'Host': 'api.etelios.com',
  'Authorization': 'Bearer <token>',  // Required for authenticated requests
  'X-Tenant-Id': '<tenant-id>'        // CRITICAL: Required for tenant isolation
}
```

### Frontend Setup (Axios Example)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://98.70.245.87',
  headers: {
    'Content-Type': 'application/json',
    'Host': 'api.etelios.com'
  }
});

// Add tenantId to all requests
api.interceptors.request.use((config) => {
  const tenantId = localStorage.getItem('tenantId') || getTenantIdFromSubdomain();
  if (tenantId) {
    config.headers['X-Tenant-Id'] = tenantId;
  }
  
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  return config;
});
```

---

## Authentication Flow

### 1. Super Admin Login

**Endpoint:** `POST /api/auth/login`

**Headers:**
```javascript
{
  'Content-Type': 'application/json',
  'Host': 'api.etelios.com'
  // NO X-Tenant-Id required for super admin login
}
```

**Request Body:**
```json
{
  "emailOrEmployeeId": "admin@etelios.com",
  "password": "Admin@123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "email": "admin@etelios.com",
      "role": "superadmin"
    }
  }
}
```

**Implementation:**
```javascript
async function loginAsSuperAdmin() {
  const response = await api.post('/api/auth/login', {
    emailOrEmployeeId: 'admin@etelios.com',
    password: 'Admin@123456'
  });
  
  if (response.data.success) {
    localStorage.setItem('accessToken', response.data.data.accessToken);
    localStorage.setItem('refreshToken', response.data.data.refreshToken);
    return response.data.data.accessToken;
  }
  throw new Error('Login failed');
}
```

---

### 2. Tenant Admin Login (First Time)

**Endpoint:** `POST /api/auth/login`

**Headers:**
```javascript
{
  'Content-Type': 'application/json',
  'Host': 'api.etelios.com',
  'X-Tenant-Id': 'lenstrack'  // CRITICAL: Must include tenantId
}
```

**Request Body:**
```json
{
  "emailOrEmployeeId": "admin@lenstrack.etelios.com",
  "password": "<temporary-password>"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "mustChangePassword": true,  // Indicates password change required
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "email": "admin@lenstrack.etelios.com",
      "role": "admin"
    }
  }
}
```

**Implementation:**
```javascript
async function loginAsTenantAdmin(tenantId, email, password) {
  const response = await api.post('/api/auth/login', {
    emailOrEmployeeId: email,
    password: password
  }, {
    headers: {
      'X-Tenant-Id': tenantId
    }
  });
  
  if (response.data.success) {
    localStorage.setItem('accessToken', response.data.data.accessToken);
    localStorage.setItem('tenantId', tenantId);
    
    // Check if password change is required
    if (response.data.mustChangePassword) {
      // Redirect to password change page
      return { token: response.data.data.accessToken, mustChangePassword: true };
    }
    
    return { token: response.data.data.accessToken, mustChangePassword: false };
  }
  throw new Error('Login failed');
}
```

---

### 3. Change Password (First Login)

**Endpoint:** `POST /api/auth/change-password`

**Headers:**
```javascript
{
  'Content-Type': 'application/json',
  'Host': 'api.etelios.com',
  'Authorization': 'Bearer <token>',
  'X-Tenant-Id': 'lenstrack'  // CRITICAL: Must include tenantId
}
```

**Request Body:**
```json
{
  "currentPassword": "<temporary-password>",
  "newPassword": "NewSecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Implementation:**
```javascript
async function changePassword(currentPassword, newPassword, tenantId) {
  const response = await api.post('/api/auth/change-password', {
    currentPassword: currentPassword,
    newPassword: newPassword
  }, {
    headers: {
      'X-Tenant-Id': tenantId
    }
  });
  
  if (response.data.success) {
    // Password changed, user can now login with new password
    return true;
  }
  throw new Error(response.data.message || 'Password change failed');
}
```

---

## Tenant Isolation - CRITICAL

### ⚠️ IMPORTANT: Tenant Isolation is MANDATORY

**ALL API requests MUST include `X-Tenant-Id` header** to ensure data isolation. Without this header, data from all tenants may be visible.

### How Tenant Isolation Works

1. **Backend extracts `tenantId` from:**
   - `X-Tenant-Id` header (primary method) ✅ **USE THIS**
   - `X-Company-Id` header (fallback)
   - Query parameter `?tenantId=xxx` (fallback)
   - JWT token (if tenantId is in token)

2. **All database queries are filtered by `tenantId`**
   - Employees are scoped to tenant
   - Stores are scoped to tenant
   - Departments are scoped to tenant
   - All data is isolated per tenant

3. **Response includes `tenantId`**
   - All employee responses include `tenantId` field
   - Verify `tenantId` matches your tenant

### Frontend Implementation

```javascript
// Store tenantId after login
localStorage.setItem('tenantId', 'lenstrack');

// Add to all requests
api.interceptors.request.use((config) => {
  const tenantId = localStorage.getItem('tenantId');
  if (tenantId) {
    config.headers['X-Tenant-Id'] = tenantId;
  }
  return config;
});
```

---

## Complete API Flow

### Flow 1: Tenant Creation (Super Admin Only)

```javascript
// 1. Super Admin Login
const superAdminToken = await loginAsSuperAdmin();

// 2. Create Tenant
const tenantResponse = await api.post('/api/tenants', {
  name: 'Company Name',
  email: 'admin@company.com',
  domain: 'company',
  subdomain: 'company',  // Must be alphanumeric only
  plan: 'enterprise',
  modules: ['hr', 'analytics', 'reports']
}, {
  headers: {
    'Authorization': `Bearer ${superAdminToken}`
  }
});

// Response includes:
// - tenantId
// - adminUser.email
// - adminUser.temporaryPassword
```

### Flow 2: Admin First Login & Password Change

```javascript
// 1. Login with temporary password
const loginResult = await loginAsTenantAdmin(
  'company',  // tenantId
  'admin@company.com',
  '<temporary-password>'
);

// 2. If mustChangePassword is true, change password
if (loginResult.mustChangePassword) {
  await changePassword(
    '<temporary-password>',
    'NewSecurePassword123!',
    'company'
  );
  
  // 3. Login again with new password
  await loginAsTenantAdmin(
    'company',
    'admin@company.com',
    'NewSecurePassword123!'
  );
}
```

### Flow 3: Employee Creation with New Fields

```javascript
// Create employee with all new fields
const employeeResponse = await api.post('/api/hr/employees', {
  employeeId: 'EMP-001',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@company.com',
  gender: 'Male',  // NEW: Required field (Male, Female, Other)
  department: 'Sales',
  designation: 'Sales Manager',
  annual_ctc: 720000,  // NEW: Required (annual CTC in INR)
  salary_breakdown: {  // NEW: Optional
    basic: 360000,
    hra: 144000,
    special_allowance: 120000,
    pf_employer: 43200,
    gratuity: 28800,
    other_allowances: 24000
  },
  // Sales-specific fields (only for Sales department)
  target_sales: 500000,
  incentive_slabs: [
    {
      name: 'Bronze',
      min_sales: 0,
      max_sales: 300000,
      incentive_percentage: 1.5,
      active: true
    }
  ],
  pan_number: 'ABCDE1234F',
  tax_state: 'Maharashtra',
  password: 'Employee123!'
}, {
  headers: {
    'X-Tenant-Id': 'company'  // CRITICAL
  }
});

// Response includes tenantId
console.log(employeeResponse.data.data.tenantId); // Should be 'company'
```

---

## API Endpoints Reference

### Authentication Endpoints

#### POST /api/auth/login
- **Description:** Login user
- **Headers:** `X-Tenant-Id` required for tenant admin login
- **Body:** `{ emailOrEmployeeId, password }`
- **Response:** `{ success, data: { accessToken, refreshToken, user }, mustChangePassword? }`

#### POST /api/auth/change-password
- **Description:** Change password (required on first login)
- **Headers:** `Authorization`, `X-Tenant-Id` required
- **Body:** `{ currentPassword, newPassword }`
- **Response:** `{ success, message }`

#### POST /api/auth/register
- **Description:** Register new employee (onboarding)
- **Headers:** `X-Tenant-Id` required
- **Body:** `{ employeeId, email, password, firstName, lastName, gender }`
- **Response:** `{ success, data: { employee_id, ... } }`

---

### HR Endpoints

#### GET /api/hr/employees
- **Description:** Get list of employees
- **Headers:** `Authorization`, `X-Tenant-Id` required
- **Query Params:** `?page=1&limit=10&status=active&department=Sales`
- **Response:** `{ success, data: [...employees], pagination }`
- **Note:** Only returns employees for the specified tenant

#### GET /api/hr/employees/:id
- **Description:** Get employee by ID
- **Headers:** `Authorization`, `X-Tenant-Id` required
- **Response:** `{ success, data: { id, employeeId, tenantId, gender, annual_ctc, ... } }`
- **Note:** Returns 404 if employee belongs to different tenant

#### POST /api/hr/employees
- **Description:** Create new employee
- **Headers:** `Authorization`, `X-Tenant-Id` required
- **Body:** See [Employee Creation](#flow-3-employee-creation-with-new-fields)
- **Response:** `{ success, data: { id, employeeId, tenantId, ... } }`
- **Note:** `tenantId` is automatically set from header

#### PUT /api/hr/employees/:id
- **Description:** Update employee
- **Headers:** `Authorization`, `X-Tenant-Id` required
- **Body:** Partial employee data
- **Response:** `{ success, data: { ...updated employee } }`

#### DELETE /api/hr/employees/:id
- **Description:** Delete employee
- **Headers:** `Authorization`, `X-Tenant-Id` required
- **Response:** `{ success, message }`

---

### Store Endpoints

#### GET /api/hr/stores
- **Description:** Get list of stores
- **Headers:** `Authorization`, `X-Tenant-Id` required
- **Response:** `{ success, data: [...stores] }`
- **Note:** Only returns stores for the specified tenant

#### POST /api/hr/stores
- **Description:** Create new store
- **Headers:** `Authorization`, `X-Tenant-Id` required
- **Body:** `{ name, code, address: { city, state, pincode } }`
- **Response:** `{ success, data: { id, code, tenantId, ... } }`

---

### Department Endpoints

#### GET /api/hr/departments
- **Description:** Get list of departments
- **Headers:** `Authorization`, `X-Tenant-Id` required
- **Response:** `{ success, data: [...departments] }`
- **Note:** Only returns departments for the specified tenant

#### POST /api/hr/departments
- **Description:** Create new department
- **Headers:** `Authorization`, `X-Tenant-Id` required
- **Body:** `{ name, code }`
- **Response:** `{ success, data: { id, code, tenantId, ... } }`

---

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Missing required fields: email, department"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required",
  "message": "Invalid or expired token"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "error": "Access denied",
  "message": "Insufficient permissions"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": "Employee not found",
  "message": "Employee with ID xxx not found"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

### Error Handling Implementation

```javascript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Token expired, redirect to login
          localStorage.removeItem('accessToken');
          window.location.href = '/login';
          break;
        case 403:
          // Insufficient permissions
          showError('You do not have permission to perform this action');
          break;
        case 404:
          // Resource not found
          showError(data.message || 'Resource not found');
          break;
        case 400:
          // Validation error
          showError(data.message || 'Validation failed');
          break;
        default:
          showError('An error occurred. Please try again.');
      }
    }
    return Promise.reject(error);
  }
);
```

---

## Best Practices

### 1. Always Include X-Tenant-Id Header

```javascript
// ✅ GOOD
api.get('/api/hr/employees', {
  headers: { 'X-Tenant-Id': 'lenstrack' }
});

// ❌ BAD - Missing tenantId
api.get('/api/hr/employees');
```

### 2. Store tenantId After Login

```javascript
// After successful login
localStorage.setItem('tenantId', response.data.data.tenantId || 'lenstrack');
```

### 3. Verify tenantId in Responses

```javascript
// Always verify tenantId matches your tenant
const employee = response.data.data;
if (employee.tenantId !== localStorage.getItem('tenantId')) {
  console.error('Tenant mismatch!');
}
```

### 4. Handle Password Change Flow

```javascript
// Check mustChangePassword flag
if (loginResponse.data.mustChangePassword) {
  // Redirect to password change page
  router.push('/change-password');
}
```

### 5. Use Proper Field Names

```javascript
// ✅ Use new field names
{
  annual_ctc: 720000,  // NOT salary or base_salary
  gender: 'Male',      // Required
  salary_breakdown: { ... }  // Optional
}

// ❌ Don't use deprecated fields
{
  salary: 60000,      // DEPRECATED
  base_salary: 50000  // DEPRECATED
}
```

---

## Code Examples

### Complete Employee Creation Example

```javascript
async function createEmployee(employeeData) {
  const tenantId = localStorage.getItem('tenantId');
  
  try {
    const response = await api.post('/api/hr/employees', {
      employeeId: employeeData.employeeId,
      firstName: employeeData.firstName,
      lastName: employeeData.lastName,
      email: employeeData.email,
      gender: employeeData.gender,  // Required: 'Male', 'Female', or 'Other'
      department: employeeData.department,
      designation: employeeData.designation,
      annual_ctc: employeeData.annual_ctc,  // Required: Annual CTC in INR
      salary_breakdown: employeeData.salary_breakdown,  // Optional
      // Sales-specific fields (only if department === 'Sales')
      ...(employeeData.department === 'Sales' && {
        target_sales: employeeData.target_sales,
        incentive_slabs: employeeData.incentive_slabs,
        pan_number: employeeData.pan_number,
        tax_state: employeeData.tax_state
      }),
      password: employeeData.password || 'TempPass123!'
    }, {
      headers: {
        'X-Tenant-Id': tenantId
      }
    });
    
    if (response.data.success) {
      // Verify tenantId
      if (response.data.data.tenantId === tenantId) {
        return response.data.data;
      } else {
        throw new Error('Tenant mismatch in response');
      }
    }
    throw new Error(response.data.message || 'Employee creation failed');
  } catch (error) {
    console.error('Employee creation error:', error);
    throw error;
  }
}
```

### Complete Login Flow Example

```javascript
async function completeLoginFlow(email, password, tenantId) {
  try {
    // 1. Login
    const loginResponse = await api.post('/api/auth/login', {
      emailOrEmployeeId: email,
      password: password
    }, {
      headers: {
        'X-Tenant-Id': tenantId
      }
    });
    
    if (!loginResponse.data.success) {
      throw new Error(loginResponse.data.message || 'Login failed');
    }
    
    // 2. Store tokens and tenantId
    localStorage.setItem('accessToken', loginResponse.data.data.accessToken);
    localStorage.setItem('refreshToken', loginResponse.data.data.refreshToken);
    localStorage.setItem('tenantId', tenantId);
    
    // 3. Check if password change is required
    if (loginResponse.data.mustChangePassword) {
      return {
        success: true,
        mustChangePassword: true,
        token: loginResponse.data.data.accessToken
      };
    }
    
    return {
      success: true,
      mustChangePassword: false,
      token: loginResponse.data.data.accessToken,
      user: loginResponse.data.data.user
    };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}
```

---

## Testing Checklist

- [x] Super Admin Login
- [x] Tenant Creation
- [x] Admin Login (First Time)
- [x] Password Change
- [x] Employee Creation with tenantId
- [x] Employee Retrieval
- [x] Store Creation
- [x] Department Creation
- [x] Tenant Isolation Verification

---

## Support

For issues or questions:
1. Check that `X-Tenant-Id` header is included in all requests
2. Verify `tenantId` in API responses matches your tenant
3. Ensure all new employees have `gender` and `annual_ctc` fields
4. For Sales department employees, include sales-specific fields

---

**Last Updated:** January 21, 2026  
**Version:** 1.0.0
