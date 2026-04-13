# Frontend Developer - Complete API Guide

## 🚀 Quick Start

### Base URL
```
http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

**⚠️ IMPORTANT**: Update your frontend API base URL to the above URL. Do NOT use `localhost:3000` or `localhost:3002`.

### Login Credentials
```
Email: admin@upcapto.com
Password: Upcapto@2026
Tenant ID: upcapto
```

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [Working APIs](#working-apis)
3. [API Endpoints](#api-endpoints)
4. [Request/Response Formats](#requestresponse-formats)
5. [Error Handling](#error-handling)
6. [Employee Fields](#employee-fields)
7. [Code Examples](#code-examples)

---

## 🔐 Authentication

### Login Endpoint
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@upcapto.com",
  "password": "Upcapto@2026"
}
```

### Response
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "...",
    "user": {
      "id": "...",
      "email": "admin@upcapto.com",
      "role": "admin",
      "tenantId": "upcapto"
    }
  }
}
```

### Using the Token
Include the token in all authenticated requests:
```http
Authorization: Bearer <accessToken>
x-tenant-id: upcapto
```

---

## ✅ Working APIs

### 1. Attendance API
```http
GET /api/attendance?employeeId=<id>&date=2026-02-15
Authorization: Bearer <token>
x-tenant-id: upcapto
```

**Status**: ✅ Working

### 2. Time Tracking API
```http
GET /api/hr/time-tracking?employeeId=<id>&date=2026-02-15
Authorization: Bearer <token>
x-tenant-id: upcapto
```

**Status**: ✅ Working (Use `/api/hr/time-tracking` instead of `/api/time-tracking`)

### 3. Performance API
```http
GET /api/hr/performance/me/metrics
Authorization: Bearer <token>
x-tenant-id: upcapto
```

**Status**: ✅ Working

**Note**: `/api/performance/employee/:id` is currently not working. Use alternative routes below.

---

## 📡 Complete API Endpoints

### Authentication APIs

#### Login
```http
POST /api/auth/login
Content-Type: application/json

Body:
{
  "email": "string",
  "password": "string"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
x-tenant-id: upcapto
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

Body:
{
  "refreshToken": "string"
}
```

---

### Employee APIs

#### List Employees
```http
GET /api/hr/employees?page=1&limit=10&status=active&search=<query>
Authorization: Bearer <token>
x-tenant-id: upcapto
```

#### Get Employee by ID
```http
GET /api/hr/employees/:id
Authorization: Bearer <token>
x-tenant-id: upcapto
```

#### Create Employee
```http
POST /api/hr/employees
Authorization: Bearer <token>
x-tenant-id: upcapto
Content-Type: application/json

Body:
{
  "employeeId": "EMP001",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+91-9876543210",
  "department": "Sales",
  "designation": "Sales Executive",
  "doj": "2024-01-15",
  "status": "active",
  "storeId": "<store-id>",
  "dateOfBirth": "1990-05-20",
  "gender": "Male"
}
```

#### Update Employee
```http
PUT /api/hr/employees/:id
Authorization: Bearer <token>
x-tenant-id: upcapto
Content-Type: application/json

Body:
{
  "firstName": "John",
  "lastName": "Doe Updated",
  "phone": "+91-9876543210",
  "status": "active"
}
```

#### Update Employee Status
```http
PATCH /api/hr/employees/:id/status
Authorization: Bearer <token>
x-tenant-id: upcapto
Content-Type: application/json

Body:
{
  "status": "inactive" // or "active", "on-leave", "terminated"
}
```

#### Delete Employee (Soft Delete)
```http
DELETE /api/hr/employees/:id
Authorization: Bearer <token>
x-tenant-id: upcapto
```

---

### Department APIs

#### List Departments
```http
GET /api/hr/departments
Authorization: Bearer <token>
x-tenant-id: upcapto
```

#### Get Department by ID
```http
GET /api/hr/departments/:id
Authorization: Bearer <token>
x-tenant-id: upcapto
```

#### Create Department
```http
POST /api/hr/departments
Authorization: Bearer <token>
x-tenant-id: upcapto
Content-Type: application/json

Body:
{
  "name": "Sales",
  "code": "SALES",
  "description": "Sales Department"
}
```

#### Update Department
```http
PUT /api/hr/departments/:id
Authorization: Bearer <token>
x-tenant-id: upcapto
Content-Type: application/json

Body:
{
  "name": "Sales Updated",
  "description": "Updated description"
}
```

#### Delete Department
```http
DELETE /api/hr/departments/:id
Authorization: Bearer <token>
x-tenant-id: upcapto
```

---

### Store APIs

#### List Stores
```http
GET /api/hr/stores?page=1&limit=100&status=active
Authorization: Bearer <token>
x-tenant-id: upcapto
```

#### Get Store by ID
```http
GET /api/hr/stores/:id
Authorization: Bearer <token>
x-tenant-id: upcapto
```

#### Create Store
```http
POST /api/hr/stores
Authorization: Bearer <token>
x-tenant-id: upcapto
Content-Type: application/json

Body:
{
  "name": "Store Name",
  "code": "STORE001",
  "address": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  },
  "coordinates": {
    "latitude": 19.0760,
    "longitude": 72.8777
  },
  "geofenceRadius": 100
}
```

---

### Attendance APIs

#### Get Attendance Records
```http
GET /api/attendance?employeeId=<id>&date=2026-02-15
Authorization: Bearer <token>
x-tenant-id: upcapto
```

**Response:**
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "...",
        "employeeId": "EMP001",
        "date": "2026-02-15",
        "check_in_time": "2026-02-15T09:00:00Z",
        "check_out_time": "2026-02-15T18:00:00Z",
        "status": "present",
        "check_in_location": {
          "latitude": 19.0760,
          "longitude": 72.8777
        },
        "check_in_selfie": {
          "secure_url": "https://..."
        }
      }
    ],
    "pagination": {
      "current": 1,
      "pages": 1,
      "total": 1
    }
  }
}
```

#### Clock In
```http
POST /api/attendance/clock-in
Authorization: Bearer <token>
x-tenant-id: upcapto
Content-Type: multipart/form-data

Form Data:
- latitude: number (required)
- longitude: number (required)
- selfie: File (optional - image file)
- notes: string (optional)
```

#### Clock Out
```http
POST /api/attendance/clock-out
Authorization: Bearer <token>
x-tenant-id: upcapto
Content-Type: multipart/form-data

Form Data:
- latitude: number (required)
- longitude: number (required)
- selfie: File (optional - image file)
- notes: string (optional)
```

---

### Time Tracking APIs

#### Get Time Tracking Records
```http
GET /api/hr/time-tracking?employeeId=<id>&date=2026-02-15
Authorization: Bearer <token>
x-tenant-id: upcapto
```

**Note**: Use `/api/hr/time-tracking` (not `/api/time-tracking`)

#### Start Time Tracking
```http
POST /api/hr/time-tracking/start
Authorization: Bearer <token>
x-tenant-id: upcapto
Content-Type: application/json

Body:
{
  "task": "Task description",
  "project": "Project name"
}
```

#### Stop Time Tracking
```http
POST /api/hr/time-tracking/:id/stop
Authorization: Bearer <token>
x-tenant-id: upcapto
Content-Type: application/json

Body:
{
  "notes": "Completion notes"
}
```

---

### Performance APIs

#### Get My Performance Metrics
```http
GET /api/hr/performance/me/metrics?period=monthly
Authorization: Bearer <token>
x-tenant-id: upcapto
```

**Important**: The `period` parameter is **required** and must be one of: `weekly`, `monthly`, or `quarterly`

#### Get Performance Analytics
```http
GET /api/hr/performance/analytics
Authorization: Bearer <token>
x-tenant-id: upcapto
```

**Note**: `/api/performance/employee/:id` is currently not working. Use `/api/hr/performance/me/metrics` for current user.

---

### Tenant APIs

#### Get Current Company
```http
GET /api/tenants/company
Authorization: Bearer <token>
x-tenant-id: upcapto
```

**Note**: Use `/api/tenants/company` (plural) - `/api/tenant/company` (singular) is not working.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "tenantId": "upcapto",
    "name": "Company Name",
    "domain": "example.com",
    "phone": "+91-1234567890",
    "status": "active",
    "address": {
      "city": "Mumbai",
      "state": "Maharashtra",
      "country": "India"
    }
  }
}
```

---

### Payroll APIs

#### Get Salary Breakdown
```http
GET /api/payroll/salary/breakdown?grossMonthly=50000
Authorization: Bearer <token>
x-tenant-id: upcapto
```

**Response:**
```json
{
  "success": true,
  "data": {
    "grossMonthly": 50000,
    "basic_salary": 25000,
    "hra": 12500,
    "special_allowance": 12500,
    "epf_employee": 1800,
    "epf_employer": 1800,
    "esic_employee": 375,
    "esic_employer": 1625,
    "gratuity": 1202.5,
    "total_deductions": 2175,
    "net_take_home": 47825,
    "monthly_ctc": 55127.5,
    "annual_ctc": 661530
  }
}
```

---

## 📊 Employee Fields

All employee fields are available in both **camelCase** and **snake_case** formats.

### Basic Information
- `fullName` / `full_name`
- `employeeId` / `employee_id`
- `code`
- `email`
- `phone`
- `dob` / `dateOfBirth` / `date_of_birth`
- `gender`

### Work Details
- `department`
- `designation` / `jobTitle` / `job_title`
- `roleFamily` / `role_family`
- `gradeBand` / `grade_band`
- `status` / `employee_status`
- `doj` / `joinDate` / `join_date`
- `confirmationDate` / `confirmation_date`
- `annualCtc` / `annual_ctc`
- `salaryBreakdown` / `salary_breakdown`:
  - `basic`
  - `hra`
  - `special_allowance`
  - `pf_employer`
  - `gratuity`
  - `other_allowances`

### Work Location
- `workLocation` / `work_location`:
  - `storeId` / `store_id`
  - `storeName` / `store_name`
  - `city`
  - `state`
  - `pincode`

### Reporting Manager
- `reportingManager` / `reporting_manager`
- `reportingManagerName` / `reporting_manager_name`

### Address
- `currentAddress` / `current_address`:
  - `lines` (array)
  - `address_line_1`
  - `address_line_2`
  - `city`
  - `state`
  - `pincode`
  - `country`

### Emergency Contact
- `emergencyContact` / `emergency_contact`:
  - `name`
  - `relationship`
  - `phone` / `contact_number`

### Statutory Information
- `uan`
- `esiNo` / `esi_no` / `esiNumber` / `esi_number`
- `panNumber` / `pan_number` / `pan`
- `aadharMasked` / `aadhar_masked` / `aadhar`

### Bank Account
- `bankAccount` / `bank_account`:
  - `accountNumber` / `account_number` / `account_no`
  - `ifscCode` / `ifsc_code` / `ifsc`
  - `bankName` / `bank_name`
  - `branchName` / `branch_name` / `branch`
  - `accountType` / `account_type`

### Previous Employment
- `previousEmployment` / `previous_employment`:
  - `has_previous_employment`
  - `employer_name`
  - `from_date` / `fromDate`
  - `to_date` / `toDate`
  - `form_16_available`

### Documents
- `documents` (array of document objects)

---

## 💻 Code Examples

### JavaScript/TypeScript

#### Login and Store Token
```javascript
const API_BASE = 'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';

async function login(email, password) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  
  if (data.success) {
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('tenantId', data.data.user.tenantId);
    return data.data;
  }
  
  throw new Error(data.message || 'Login failed');
}
```

#### Make Authenticated Request
```javascript
async function fetchEmployees(page = 1, limit = 10) {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');
  
  const response = await fetch(
    `${API_BASE}/api/hr/employees?page=${page}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId,
        'Content-Type': 'application/json',
      },
    }
  );
  
  const data = await response.json();
  return data;
}
```

#### Clock In with Selfie and GPS
```javascript
async function clockIn(latitude, longitude, selfieFile) {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');
  
  const formData = new FormData();
  formData.append('latitude', latitude);
  formData.append('longitude', longitude);
  if (selfieFile) {
    formData.append('selfie', selfieFile);
  }
  formData.append('notes', 'Clock in from mobile app');
  
  const response = await fetch(`${API_BASE}/api/attendance/clock-in`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      // Don't set Content-Type for FormData - browser will set it with boundary
    },
    body: formData,
  });
  
  const data = await response.json();
  return data;
}

// Usage
navigator.geolocation.getCurrentPosition(async (position) => {
  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;
  
  // Capture selfie (example using camera)
  const selfieFile = await captureSelfie(); // Your selfie capture function
  
  const result = await clockIn(latitude, longitude, selfieFile);
  console.log('Clock in successful:', result);
});
```

#### Get Attendance Records
```javascript
async function getAttendance(employeeId, date) {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');
  
  const response = await fetch(
    `${API_BASE}/api/attendance?employeeId=${employeeId}&date=${date}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId,
      },
    }
  );
  
  const data = await response.json();
  return data;
}
```

#### Get Time Tracking
```javascript
async function getTimeTracking(employeeId, date) {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');
  
  const response = await fetch(
    `${API_BASE}/api/hr/time-tracking?employeeId=${employeeId}&date=${date}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId,
      },
    }
  );
  
  const data = await response.json();
  return data;
}
```

#### Get Performance Metrics
```javascript
async function getPerformanceMetrics(period = 'monthly') {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');
  
  // period must be: 'weekly', 'monthly', or 'quarterly'
  const response = await fetch(
    `${API_BASE}/api/hr/performance/me/metrics?period=${period}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId,
      },
    }
  );
  
  const data = await response.json();
  return data;
}
```

#### Get Current Company
```javascript
async function getCurrentCompany() {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');
  
  // Use /api/tenants/company (plural) - /api/tenant/company doesn't work
  const response = await fetch(
    `${API_BASE}/api/tenants/company`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId,
      },
    }
  );
  
  const data = await response.json();
  return data;
}
```

#### Create Employee
```javascript
async function createEmployee(employeeData) {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');
  
  const response = await fetch(`${API_BASE}/api/hr/employees`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(employeeData),
  });
  
  const data = await response.json();
  return data;
}

// Usage
const newEmployee = await createEmployee({
  employeeId: 'EMP001',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+91-9876543210',
  department: 'Sales',
  designation: 'Sales Executive',
  doj: '2024-01-15',
  status: 'active',
});
```

---

## ⚠️ Important Notes

### 1. Always Include Headers
All authenticated requests must include:
- `Authorization: Bearer <token>`
- `x-tenant-id: <tenantId>`

### 2. API Route Alternatives
- ✅ Use `/api/hr/time-tracking` instead of `/api/time-tracking`
- ✅ Use `/api/hr/performance/me/metrics?period=monthly` instead of `/api/performance/employee/:id`
- ✅ Use `/api/tenants/company` (plural) instead of `/api/tenant/company` (singular)

### 3. Attendance Selfie Upload
- Selfie is **optional** but recommended
- Use `multipart/form-data` for clock-in/out requests
- GPS location (`latitude`, `longitude`) is **required**

### 4. Employee Status Values
- `active`
- `inactive`
- `on-leave`
- `terminated`
- `pending`

### 5. Date Formats
- Use ISO 8601 format: `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ssZ`
- Example: `2026-02-15` or `2026-02-15T09:00:00Z`

---

## 🔧 Error Handling

### Common Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access token required",
  "code": "AUTH_REQUIRED"
}
```
**Solution**: Re-login and get a new token

#### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied. Required permissions not found.",
  "code": "FORBIDDEN"
}
```
**Solution**: User doesn't have required permissions

#### 404 Not Found
```json
{
  "success": false,
  "message": "Route not found",
  "path": "/api/endpoint"
}
```
**Solution**: Check the endpoint URL and use alternative routes if needed

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```
**Solution**: Fix validation errors in request body

---

## 📝 Response Format

All successful responses follow this format:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

All error responses follow this format:
```json
{
  "success": false,
  "message": "Error message",
  "error": "ERROR_CODE",
  "errors": [ ... ] // Optional validation errors
}
```

---

## 🚨 Known Issues & Workarounds

### 1. `/api/time-tracking` Not Working
**Issue**: Route not found  
**Workaround**: Use `/api/hr/time-tracking` ✅

### 2. `/api/performance/employee/:id` Not Working
**Issue**: Route not found  
**Workaround**: Use `/api/hr/performance/me/metrics?period=monthly` for current user ✅

### 3. `/api/tenant/company` Not Working
**Issue**: Route not found  
**Workaround**: Use `/api/tenants/company` (plural) ✅

### 4. Clock-In Timeout / 500 Error
**Issue**: Clock-in endpoint times out or returns 500 error  
**Possible Causes**:
- Employee already has an open clock-in session (need to clock out first)
- HR service lookup timeout (being fixed)
- Employee not assigned to a store

**Solutions**:
1. **Check for open sessions**: Before clocking in, ensure the employee has clocked out from any previous session
2. **Verify employee has store**: Employee must be assigned to a store with coordinates
3. **Use correct base URL**: Ensure frontend uses AWS ALB URL, not `localhost:3000`

**Frontend Fix**:
```javascript
// ❌ WRONG - Don't use localhost
const API_BASE = 'http://localhost:3000';

// ✅ CORRECT - Use AWS ALB URL
const API_BASE = 'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';
```

### 5. 503 Service Unavailable for Attendance GET
**Issue**: GET `/api/attendance` returns 503  
**Solution**: This usually indicates the service is temporarily unavailable. Wait a few seconds and retry. If persistent, check service health.

---

## 📞 Support

If you encounter any issues:
1. Check the error response for details
2. Verify token is valid (not expired)
3. Ensure `x-tenant-id` header is included
4. Use alternative routes if primary route fails
5. Check network connectivity to ALB URL

---

## ✅ Quick Test

Test your setup with this curl command:

```bash
# Login
TOKEN=$(curl -s -X POST "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@upcapto.com","password":"Upcapto@2026"}' \
  | jq -r '.data.accessToken')

# Test API
curl -X GET "http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com/api/hr/employees?limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-id: upcapto"
```

---

**Last Updated**: 2026-02-15  
**API Base URL**: `http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com`  
**Status**: All major APIs working ✅
