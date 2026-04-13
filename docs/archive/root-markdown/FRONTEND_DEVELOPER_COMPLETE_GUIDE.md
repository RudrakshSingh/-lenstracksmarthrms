# Frontend Developer - Complete Integration Guide

## 🚀 Quick Start

### API Base URL
```
http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com
```

### Authentication Credentials (For Testing)
```
Email:    admin@upcapto.com
Password: Upcapto@2026
Tenant:   upcapto
Role:     superadmin
```

---

## 🔐 Authentication Flow

### 1. Login
```javascript
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@upcapto.com",
  "password": "Upcapto@2026"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "email": "admin@upcapto.com",
      "role": "superadmin",
      "tenantId": "upcapto"
    }
  }
}
```

### 2. Token Payload (Decoded)
```json
{
  "userId": "69918dde41e0c3122f4df3dd",
  "email": "admin@upcapto.com",
  "role": "superadmin",
  "tenantId": "upcapto",
  "employee_id": "UPCAPTO-ADMIN-001",
  "iat": 1771152272,
  "exp": 1771153172
}
```

### 3. Use Token for All Requests
```javascript
headers: {
  'Authorization': `Bearer ${accessToken}`,
  'x-tenant-id': tenantId,
  'Content-Type': 'application/json'
}
```

---

## 📋 Complete Employee Fields Reference

All fields are available in **both camelCase and snake_case** formats.

### Basic Information
```javascript
{
  fullName: "John Doe",           // or full_name
  employeeId: "EMP001",           // or employee_id
  code: "EMP001",
  email: "john.doe@example.com",
  phone: "+91-9876543210",
  dob: "1990-01-15T00:00:00.000Z", // or dateOfBirth, date_of_birth
  gender: "Male"
}
```

### Work Details
```javascript
{
  department: "Sales",
  designation: "Sales Executive",
  jobTitle: "Sales Executive",    // or job_title
  roleFamily: "Sales",            // or role_family
  gradeBand: "A",                 // or grade_band
  status: "active",               // or employee_status
  doj: "2024-01-15T00:00:00.000Z", // or joinDate, join_date
  confirmationDate: "2024-07-15T00:00:00.000Z", // or confirmation_date
  annual_ctc: 600000,             // or annualCtc
  salary_breakdown: {             // or salaryBreakdown
    basic: 30000,
    hra: 15000,
    special_allowance: 15000,
    pf_employer: 1800,
    gratuity: 1202.5,
    other_allowances: 0
  }
}
```

### Work Location
```javascript
{
  workLocation: {                 // or work_location
    storeId: "STORE001",         // or store_id
    storeName: "Mumbai Store",    // or store_name
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001"
  }
}
```

### Reporting Manager
```javascript
{
  reportingManager: "MGR001",           // or reporting_manager
  reportingManagerName: "Jane Smith"    // or reporting_manager_name
}
```

### Address
```javascript
{
  currentAddress: {              // or current_address
    lines: ["123 Main St", "Near Park"],
    line1: "123 Main St",        // or address_line_1
    line2: "Near Park",          // or address_line_2
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    country: "India"
  }
}
```

### Emergency Contact
```javascript
{
  emergencyContact: {           // or emergency_contact
    name: "Jane Doe",
    relationship: "Spouse",
    phone: "+91-9876543211"     // or contact_number
  }
}
```

### Statutory Information
```javascript
{
  uan: "123456789012",
  esiNo: "123456789012345",     // or esi_no, esiNumber, esi_number
  panNumber: "ABCDE1234F",      // or pan_number, pan
  aadharMasked: "1234-5678-9012" // or aadhar_masked, aadhar
}
```

### Bank Details
```javascript
{
  bankAccount: {                // or bank_account
    accountNumber: "1234567890", // or account_number, account_no
    ifscCode: "SBIN0001234",     // or ifsc_code, ifsc
    bankName: "State Bank of India", // or bank_name
    branchName: "Mumbai Main",   // or branch_name, branch
    accountType: "Savings"        // or account_type
  }
}
```

### Previous Employment
```javascript
{
  previousEmployment: {         // or previous_employment
    hasPreviousEmployment: true, // or has_previous_employment
    employerName: "Previous Company", // or employer_name
    fromDate: "2020-01-01T00:00:00.000Z", // or from_date
    toDate: "2023-12-31T00:00:00.000Z",   // or to_date
    form16Available: true      // or form_16_available
  }
}
```

### Documents
```javascript
{
  documents: [
    {
      type: "AADHAR",
      url: "https://...",
      uploaded_at: "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

---

## 🌐 Complete API Endpoints

### Authentication
```
POST   /api/auth/login          - Login
POST   /api/auth/register       - Register
GET    /api/auth/me             - Get current user
GET    /api/auth/profile        - Get user profile
POST   /api/auth/logout         - Logout
POST   /api/auth/refresh-token  - Refresh token
GET    /api/auth/health         - Health check
```

### HR Service
```
GET    /api/hr/health           - Health check
GET    /api/hr/status           - Service status
GET    /api/hr/employees        - List employees (with all fields)
GET    /api/hr/employees/:id    - Get employee (with all fields)
PUT    /api/hr/employees/:id    - Update employee
DELETE /api/hr/employees/:id    - Delete employee (soft delete)
PATCH  /api/hr/employees/:id/status - Update employee status
GET    /api/hr/departments      - List departments
GET    /api/hr/departments/:id  - Get department
POST   /api/hr/departments      - Create department
PUT    /api/hr/departments/:id  - Update department
DELETE /api/hr/departments/:id  - Delete department
GET    /api/hr/stores           - List stores
POST   /api/hr/stores           - Create store
GET    /api/hr/dashboard        - Main dashboard
GET    /api/hr/dashboard/departments - Dashboard departments
GET    /api/hrms/dashboard      - HRMS dashboard
```

### Payroll Service
```
GET    /api/payroll/health      - Health check
GET    /api/payroll/status      - Service status
POST   /api/payroll/salary/calculate - Calculate salary breakdown (CTC Calculator)
GET    /api/payroll/salary/employee/:employeeId - Get current salary
GET    /api/payroll/salary/employee/:employeeId/history - Salary history
PUT    /api/payroll/salary/employee/:employeeId - Update salary
GET    /api/payroll/salary/payroll-summary - Payroll summary
POST   /api/payroll/salary/bulk-calculate - Bulk calculate salaries
```

### Tenant Service
```
GET    /api/tenants/company     - Get current company info
GET    /api/tenants             - List tenants (superadmin only)
POST   /api/tenants             - Create tenant (superadmin only)
GET    /api/tenants/:tenantId   - Get tenant (superadmin only)
```

### Attendance Service
```
GET    /api/attendance/health   - Health check
GET    /api/attendance/status   - Status check
POST   /api/attendance/clock-in - Clock in (auth required)
POST   /api/attendance/clock-out - Clock out (auth required)
POST   /api/attendance/check-in  - Clock in (alias)
POST   /api/attendance/check-out - Clock out (alias)
GET    /api/attendance/history  - Get own attendance history (auth required)
POST   /api/attendance/track-location - Track location (geofence)
GET    /api/attendance          - Get all records (HR/Admin, permission required)
POST   /api/attendance           - Mark attendance manually (HR/Admin)
GET    /api/attendance/summary   - Get attendance summary (HR/Admin)
GET    /api/attendance/stats     - Get attendance statistics (HR/Admin)
GET    /api/attendance/reports   - Get attendance reports (HR/Admin)
GET    /api/attendance/daily-timeline - Get daily timeline (HR/Admin)
```

---

## 💻 Frontend Implementation Examples

### React/Next.js Setup

```typescript
// api.ts
const API_BASE = 'http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    user: {
      email: string;
      role: string;
      tenantId: string;
    };
  };
}

export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  return await response.json();
};

export const getEmployees = async (token: string, tenantId: string) => {
  const response = await fetch(`${API_BASE}/api/hr/employees`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json'
    }
  });
  return await response.json();
};

export const updateEmployeeStatus = async (
  token: string, 
  tenantId: string, 
  employeeId: string, 
  status: string
) => {
  const response = await fetch(`${API_BASE}/api/hr/employees/${employeeId}/status`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status })
  });
  return await response.json();
};

export const deleteEmployee = async (
  token: string, 
  tenantId: string, 
  employeeId: string
) => {
  const response = await fetch(`${API_BASE}/api/hr/employees/${employeeId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
    }
  });
  return await response.json();
};

export const getDepartments = async (token: string, tenantId: string) => {
  const response = await fetch(`${API_BASE}/api/hr/departments`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
    }
  });
  return await response.json();
};

export const updateDepartment = async (
  token: string,
  tenantId: string,
  departmentId: string,
  data: any
) => {
  const response = await fetch(`${API_BASE}/api/hr/departments/${departmentId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return await response.json();
};

export const deleteDepartment = async (
  token: string,
  tenantId: string,
  departmentId: string
) => {
  const response = await fetch(`${API_BASE}/api/hr/departments/${departmentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
    }
  });
  return await response.json();
};

export const calculateSalary = async (
  token: string,
  tenantId: string,
  data: {
    employee_id: string;
    gross_monthly: number;
    variable_incentive?: number;
  }
) => {
  const response = await fetch(`${API_BASE}/api/payroll/salary/calculate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return await response.json();
};

export const getDashboard = async (token: string, tenantId: string) => {
  const response = await fetch(`${API_BASE}/api/hr/dashboard`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId
    }
  });
  return await response.json();
};
```

### Usage in Component

```typescript
// EmployeeList.tsx
import { useState, useEffect } from 'react';
import { getEmployees, login } from './api';

export default function EmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [token, setToken] = useState('');
  const [tenantId, setTenantId] = useState('');

  useEffect(() => {
    // Login first
    login({ email: 'admin@upcapto.com', password: 'Upcapto@2026' })
      .then(response => {
        if (response.success) {
          setToken(response.data.accessToken);
          setTenantId(response.data.user.tenantId);
          
          // Get employees
          return getEmployees(response.data.accessToken, response.data.user.tenantId);
        }
      })
      .then(response => {
        if (response?.success) {
          setEmployees(response.data);
        }
      })
      .catch(error => console.error('Error:', error));
  }, []);

  return (
    <div>
      <h1>Employees</h1>
      {employees.map(emp => (
        <div key={emp.id}>
          <h3>{emp.fullName} ({emp.full_name})</h3>
          <p>ID: {emp.employeeId} ({emp.employee_id})</p>
          <p>Email: {emp.email}</p>
          <p>Department: {emp.department}</p>
          <p>CTC: ₹{emp.annual_ctc} ({emp.annualCtc})</p>
          <p>Status: {emp.status}</p>
          {/* All fields available in both formats */}
        </div>
      ))}
    </div>
  );
}
```

---

## 📊 Employee Status Values

```javascript
'active'      // Active employee
'inactive'    // Inactive employee
'on-leave'    // On leave
'terminated'  // Terminated
'pending'     // Pending activation
```

---

## 🔧 CTC Breakdown Calculator

### Calculate Salary from Gross Monthly
```javascript
POST /api/payroll/salary/calculate
Headers:
  Authorization: Bearer <token>
  x-tenant-id: <tenant_id>
Body:
{
  "employee_id": "EMP001",
  "gross_monthly": 60000,
  "variable_incentive": 5000,
  "professional_tax": 200,
  "tds": 0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "basic_salary": 30000,
    "hra": 15000,
    "special_allowance": 15000,
    "epf_employee": 1800,
    "esic_employee": 0,
    "total_deductions": 2000,
    "net_take_home": 58000,
    "monthly_ctc": 63002.5,
    "annual_ctc": 756030,
    "salary_breakdown": {
      "basic": 30000,
      "hra": 15000,
      "special_allowance": 15000
    }
  }
}
```

---

## 🎯 Key Points for Frontend

### 1. **Field Format Support**
- All fields available in **both camelCase and snake_case**
- Use whichever format your frontend prefers
- Both formats are always present in response

### 2. **Required Headers**
```javascript
{
  'Authorization': `Bearer ${token}`,
  'x-tenant-id': tenantId,
  'Content-Type': 'application/json'
}
```

### 3. **Employee Management**
- **Update Status:** `PATCH /api/hr/employees/:id/status` with `{"status": "inactive"}`
- **Delete:** `DELETE /api/hr/employees/:id` (soft delete)
- **Update:** `PUT /api/hr/employees/:id` with employee data

### 4. **Department Management**
- **View:** `GET /api/hr/departments/:id`
- **Edit:** `PUT /api/hr/departments/:id` with department data
- **Delete:** `DELETE /api/hr/departments/:id`
- **Dashboard:** `GET /api/hr/dashboard/departments`

### 5. **Dashboard**
- **Main Dashboard:** `GET /api/hr/dashboard` - Returns widgets and employees
- **HRMS Dashboard:** `GET /api/hrms/dashboard` - HR-specific dashboard
- **Departments:** `GET /api/hr/dashboard/departments` - Department overview

---

## 🧪 Quick Test Commands

```bash
# 1. Login
curl -X POST http://API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@upcapto.com","password":"Upcapto@2026"}'

# 2. Get Employees (All Fields)
curl -X GET http://API_URL/api/hr/employees \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: upcapto"

# 3. Get Dashboard
curl -X GET http://API_URL/api/hr/dashboard \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: upcapto"

# 4. Calculate Salary (CTC)
curl -X POST http://API_URL/api/payroll/salary/calculate \
  -H "Authorization: Bearer <token>" \
  -H "x-tenant-id: upcapto" \
  -H "Content-Type: application/json" \
  -d '{"employee_id":"EMP001","gross_monthly":60000}'
```

---

## ✅ Available Features

- ✅ Complete employee field mapping (camelCase + snake_case)
- ✅ Employee CRUD operations
- ✅ Employee status management (active/inactive/terminated)
- ✅ Department CRUD operations
- ✅ Store management
- ✅ CTC breakdown calculator
- ✅ Dashboard endpoints
- ✅ Tenant management (for superadmin)
- ✅ Authentication & authorization

---

## 📝 Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Success message",
  "pagination": { /* if paginated */ }
}
```

**Error Format:**
```json
{
  "success": false,
  "message": "Error message",
  "error": "ERROR_CODE"
}
```

---

## 🔗 Related Documentation

- `EMPLOYEE_FIELDS_COMPLETE.md` - Complete field reference
- `SUPERADMIN_LOGIN_PAYLOAD_FOR_FRONTEND.md` - Superadmin token details
- `CTC_BREAKDOWN_CALCULATOR.md` - CTC calculator documentation
- `API_TEST_AND_FIXES.md` - API testing results

---

## 🚀 Ready to Use!

**Everything is set up and working. Start integrating!** 🎉

**API Base URL:** `http://k8s-eteliosp-eteliosi-f5ad4f50f3-636936140.ap-south-1.elb.amazonaws.com`

**Test Credentials:**
- Email: `admin@upcapto.com`
- Password: `Upcapto@2026`
