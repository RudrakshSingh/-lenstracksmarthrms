# 🚀 Frontend Developer - Complete API Guide

## ⚡ Quick Start

**Base URL**: 
```
http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

**Test Credentials**:
```
Email: admin@upcapto.com
Password: Upcapto@2026
Tenant ID: upcapto
```

---

## 🔐 Authentication

### Login
```javascript
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@upcapto.com",
  "password": "Upcapto@2026"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "mustChangePassword": false,
    "passwordTemporary": false
  }
}
```

### All Authenticated Requests
```javascript
headers: {
  "Authorization": "Bearer <accessToken>",
  "X-Tenant-Id": "upcapto",
  "Content-Type": "application/json"
}
```

---

## ✅ Working APIs (All Tested)

### Health Checks
- `GET /health` ✅
- `GET /api/auth/health` ✅
- `GET /api/hr/health` ✅
- `GET /api/attendance/health` ✅
- `GET /api/payroll/health` ✅

### Auth APIs
- `POST /api/auth/login` ✅
- `GET /api/auth/me` ✅ (requires auth)

### HR APIs - Employees
- `GET /api/hr/employees` ✅
- `GET /api/hr/employees/:id` ✅
- `POST /api/hr/employees` ✅
- `PUT /api/hr/employees/:id` ✅
- `PATCH /api/hr/employees/:id/status` ✅
- `DELETE /api/hr/employees/:id` ✅

### HR APIs - Departments
- `GET /api/hr/departments` ✅
- `GET /api/hr/departments/:id` ✅
- `POST /api/hr/departments` ✅
- `PUT /api/hr/departments/:id` ✅
- `DELETE /api/hr/departments/:id` ✅

### HR APIs - Stores
- `GET /api/hr/stores` ✅
- `GET /api/hr/stores/:id` ✅

### HR APIs - Dashboard
- `GET /api/hr/dashboard/departments` ✅
- `GET /api/hr/dashboard` ✅
- `GET /api/hr/dashboard/stats` ✅

### Attendance APIs
- `GET /api/attendance?employeeId=EMP001&date=2026-02-16` ✅
- `POST /api/attendance/clock-in` ✅ (multipart/form-data with selfie)
- `POST /api/attendance/clock-out` ✅ (multipart/form-data with selfie)
- `PATCH /api/attendance/:id` ✅ (for clock-out)
- `POST /api/attendance/track-location` ✅ (geofencing)
- `GET /api/attendance/summary?startDate=2026-02-01&endDate=2026-02-16` ✅

### Payroll APIs
- `POST /api/payroll/calculate` ✅
  ```json
  {
    "grossMonthly": 50000,
    "variableIncentive": 0,
    "professionalTax": 0,
    "tds": 0
  }
  ```
- `GET /api/payroll/salary?employeeId=EMP001` ✅

### Tenant APIs
- `GET /api/tenant/company` ✅
- `GET /api/tenants` ✅

### Time Tracking APIs
- `GET /api/time-tracking/stats` ✅
- `GET /api/hr/time-tracking` ✅

### Performance APIs
- `GET /api/performance/employee/:id` ✅
- `GET /api/hr/performance/employee/:id` ✅
- `GET /api/hr/performance/me/metrics` ✅
- `GET /api/hr/performance/me/trends` ✅

---

## 💻 Frontend Code Examples

### 1. Login Function
```typescript
const login = async (email: string, password: string) => {
  const response = await fetch(
    'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/login',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    }
  );
  
  const data = await response.json();
  
  if (data.success) {
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    localStorage.setItem('tenantId', data.data.user.tenantId);
    return data.data;
  } else {
    throw new Error(data.message);
  }
};
```

### 2. Authenticated API Helper
```typescript
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId') || 'upcapto';
  
  const response = await fetch(
    `http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com${endpoint}`,
    {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    }
  );
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'API request failed');
  }
  
  return data;
};
```

### 3. Clock In with Selfie
```typescript
const clockIn = async (latitude: number, longitude: number, selfieFile: File) => {
  const formData = new FormData();
  formData.append('latitude', latitude.toString());
  formData.append('longitude', longitude.toString());
  formData.append('selfie', selfieFile);
  
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId') || 'upcapto';
  
  const response = await fetch(
    'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/attendance/clock-in',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-Id': tenantId,
        // Don't set Content-Type for FormData - browser will set it with boundary
      },
      body: formData,
    }
  );
  
  return response.json();
};
```

### 4. Get Employees
```typescript
const getEmployees = async () => {
  return apiCall('/api/hr/employees');
};
```

### 5. Create Employee
```typescript
const createEmployee = async (employeeData: any) => {
  return apiCall('/api/hr/employees', {
    method: 'POST',
    body: JSON.stringify(employeeData),
  });
};
```

### 6. Get Attendance Records
```typescript
const getAttendance = async (employeeId: string, date: string) => {
  return apiCall(`/api/attendance?employeeId=${employeeId}&date=${date}`);
};
```

---

## 📋 Response Format

All APIs return:
```json
{
  "success": true/false,
  "message": "Description",
  "data": { ... },
  "error": "Error code (if failed)"
}
```

---

## ⚠️ Error Handling

```typescript
try {
  const data = await apiCall('/api/hr/employees');
  // Use data.data for the actual data
  console.log(data.data);
} catch (error) {
  if (error.message.includes('401') || error.message.includes('Unauthorized')) {
    // Token expired - redirect to login
    window.location.href = '/login';
  } else {
    console.error('API Error:', error.message);
    // Show error to user
  }
}
```

---

## 🔢 Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error
- `503` - Service Unavailable

---

## 🎯 Employee Field Mapping

### Frontend → Backend
- `fullName` → `fullName` or `full_name`
- `employeeId` → `employeeId` or `employee_id`
- `email` → `email`
- `phone` → `phone`
- `dob` → `dob` or `dateOfBirth`
- `gender` → `gender`
- `department` → `department` or `departmentRef` (ObjectId)
- `jobTitle` → `jobTitle` or `designation`
- `status` → `status`
- `doj` → `doj` or `joinDate`
- `annualCtc` → `annual_ctc` or `annualCtc`
- `workLocation` → `workLocation` (object with storeId, city, state, pincode)
- `currentAddress` → `currentAddress` (object with lines, city, state, pincode)
- `emergencyContact` → `emergencyContact` (object with name, relationship, phone)
- `bankAccount` → `bankAccount` (object with accountNumber, ifscCode, bankName, etc.)
- `panNumber` → `panNumber` or `pan_number`
- `aadharMasked` → `aadharMasked` or `aadhar_masked`
- `uan` → `uan`
- `esiNo` → `esiNo` or `esi_number`

**Note**: Backend accepts both camelCase and snake_case. Use either format.

---

## ✅ All APIs Tested and Working!

**Last Updated**: $(date)
**Status**: ✅ All APIs Working
**Deployment**: ✅ Live in Production

---

## 🆘 Support

If any API fails:
1. Check if token is valid (try login again)
2. Check if tenantId is set correctly
3. Check network tab for actual error
4. Verify API endpoint URL is correct
