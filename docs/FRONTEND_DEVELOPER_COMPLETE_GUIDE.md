# Frontend Developer Complete Guide

**Date:** March 8, 2026  
**Version:** 3.0  
**Status:** ✅ Production Ready - All Fixes Deployed

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication & Headers](#authentication--headers)
3. [Department APIs](#department-apis)
4. [Store APIs](#store-apis)
5. [Employee APIs](#employee-apis)
6. [Attendance APIs](#attendance-apis)
7. [Leave Management APIs](#leave-management-apis)
8. [Error Handling](#error-handling)
9. [Code Examples](#code-examples)
10. [Common Issues & Solutions](#common-issues--solutions)

---

## 🚀 Quick Start

### Base URL
```javascript
const API_BASE = process.env.REACT_APP_API_URL || 'https://your-api-domain.com';
```

### Required Headers
```javascript
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'X-Tenant-Id': tenantId,  // CRITICAL: Always include tenant ID
  'Content-Type': 'application/json'
};
```

---

## 🔐 Authentication & Headers

### Getting Access Token
```javascript
// Login endpoint
POST /api/auth/login

// Request
{
  "email": "user@example.com",
  "password": "password123",
  "tenantId": "upcapto"  // Optional, can be in header
}

// Response
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "email": "user@example.com",
      "role": "HR",
      "tenantId": "upcapto"
    }
  }
}
```

### Setting Up API Client
```javascript
// apiClient.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 30000,
});

// Add token and tenant to all requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  const tenantId = localStorage.getItem('tenantId');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (tenantId) {
    config.headers['X-Tenant-Id'] = tenantId;
  }
  
  return config;
});

export default apiClient;
```

---

## 📁 Department APIs

### 1. Get All Departments
```javascript
GET /api/hr/departments

// Request
const response = await apiClient.get('/api/hr/departments');

// Response
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "_id": "507f1f77bcf86cd799439011",
      "name": "Sales",
      "code": "SALES",
      "description": "Sales Department",
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-01-01T00:00:00.000Z"
    }
  ],
  "message": "Departments retrieved successfully"
}
```

### 2. Get Department By ID
```javascript
GET /api/hr/departments/:id

// Supports both ObjectId and code
// Example 1: By ObjectId
const dept = await apiClient.get('/api/hr/departments/507f1f77bcf86cd799439011');

// Example 2: By code
const dept = await apiClient.get('/api/hr/departments/SALES');

// Response
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Sales",
    "code": "SALES",
    "description": "Sales Department",
    "head": {
      "_id": "...",
      "fullName": "John Doe",
      "employeeId": "EMP-001",
      "email": "john@example.com"
    },
    "employees": 25,
    "employeeCount": 25
  }
}
```

### 3. Create Department
```javascript
POST /api/hr/departments

// Request
const newDept = await apiClient.post('/api/hr/departments', {
  name: "Marketing",
  code: "MARKETING",
  description: "Marketing Department",
  manager: "employee_id_here",  // Optional
  location: "Mumbai",
  phone: "+91-1234567890",
  email: "marketing@company.com",
  budget: 500000,
  status: "active"
});

// Response
{
  "success": true,
  "data": { /* department object */ },
  "message": "Department created successfully"
}
```

### 4. Update Department
```javascript
PUT /api/hr/departments/:id

// Supports both ObjectId and code
const updated = await apiClient.put('/api/hr/departments/SALES', {
  name: "Sales & Marketing",
  description: "Updated description"
});

// Response
{
  "success": true,
  "data": { /* updated department */ },
  "message": "Department updated successfully"
}
```

### 5. Delete Department
```javascript
DELETE /api/hr/departments/:id

// Supports both ObjectId and code
const result = await apiClient.delete('/api/hr/departments/SALES');

// Response
{
  "success": true,
  "data": null,
  "message": "Department deleted successfully"
}

// Error if department has employees
{
  "success": false,
  "error": "Cannot delete department",
  "message": "Department has 25 employees. Please reassign them first."
}
```

---

## 🏪 Store APIs

### 1. Get All Stores
```javascript
GET /api/hr/stores?page=1&limit=100&status=ACTIVE&search=keyword

// Request
const stores = await apiClient.get('/api/hr/stores', {
  params: {
    page: 1,
    limit: 100,
    status: 'ACTIVE',
    search: 'Mumbai'
  }
});

// Response
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Mumbai Store",
      "code": "MUM-001",
      "address": {
        "street": "123 Main St",
        "city": "Mumbai",
        "state": "Maharashtra",
        "zip": "400001",
        "country": "India"
      },
      "coordinates": {
        "latitude": 19.0760,
        "longitude": 72.8777
      },
      "geofenceRadius": 100,
      "status": "ACTIVE",
      "tenantId": "upcapto"
    }
  ],
  "pagination": {
    "current": 1,
    "pages": 5,
    "total": 500,
    "limit": 100
  }
}
```

### 2. Get Store By ID
```javascript
GET /api/hr/stores/:id

// Supports both ObjectId and code
// Example 1: By ObjectId
const store = await apiClient.get('/api/hr/stores/507f1f77bcf86cd799439011');

// Example 2: By code
const store = await apiClient.get('/api/hr/stores/MUM-001');

// Response
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Mumbai Store",
    "code": "MUM-001",
    "address": { /* address object */ },
    "manager": {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "employee_id": "EMP-001"
    },
    "staffCount": 15,
    "activeStaffCount": 12
  }
}
```

### 3. Create Store
```javascript
POST /api/hr/stores

// Request
const newStore = await apiClient.post('/api/hr/stores', {
  name: "Delhi Store",
  code: "DEL-001",
  address: {
    street: "456 Park Ave",
    city: "New Delhi",
    state: "Delhi",
    zip: "110001",
    country: "India"
  },
  coordinates: {
    latitude: 28.6139,
    longitude: 77.2090
  },
  geofenceRadius: 150,
  phone: "+91-9876543210",
  email: "delhi@company.com",
  status: "ACTIVE"
});

// Response
{
  "success": true,
  "data": { /* store object */ },
  "message": "Store created successfully"
}
```

### 4. Update Store
```javascript
PUT /api/hr/stores/:id

// Supports both ObjectId and code
const updated = await apiClient.put('/api/hr/stores/MUM-001', {
  name: "Mumbai Central Store",
  address: {
    city: "Mumbai",
    state: "Maharashtra"
  },
  geofenceRadius: 200
});

// Response
{
  "success": true,
  "data": { /* updated store */ },
  "message": "Store updated successfully"
}
```

### 5. Delete Store
```javascript
DELETE /api/hr/stores/:id

// Supports both ObjectId and code
const result = await apiClient.delete('/api/hr/stores/MUM-001');

// Response
{
  "success": true,
  "data": null,
  "message": "Store deleted successfully"
}

// Error if store has employees
{
  "success": false,
  "error": "Cannot delete store with assigned employees"
}
```

---

## 👥 Employee APIs

### 1. Get All Employees
```javascript
GET /api/hr/employees?page=1&limit=10&status=active&store=storeId&department=deptId&search=keyword

// Request
const employees = await apiClient.get('/api/hr/employees', {
  params: {
    page: 1,
    limit: 10,
    status: 'active',
    store: 'store_id_here',
    department: 'dept_id_here',
    search: 'John',
    role: 'Employee'
  }
});

// Response
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "employee_id": "EMP-001",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "+91-9876543210",
      "jobTitle": "Sales Manager",
      "department": "Sales",
      "store": {
        "_id": "...",
        "name": "Mumbai Store",
        "code": "MUM-001"
      },
      "status": "active",
      "tenantId": "upcapto"
    }
  ],
  "pagination": {
    "current": 1,
    "pages": 10,
    "total": 100,
    "limit": 10
  }
}
```

### 2. Get Employee By ID (Complete Response Structure)
```javascript
GET /api/hr/employees/:id

// Supports both ObjectId and employee_id
// Example 1: By ObjectId
const employee = await apiClient.get('/api/hr/employees/507f1f77bcf86cd799439011');

// Example 2: By employee_id
const employee = await apiClient.get('/api/hr/employees/EMP-001');

// Complete Response Structure (All Fields for Employee View Page)
{
  "success": true,
  "data": {
    // ============================================
    // Basic Information
    // ============================================
    "_id": "507f1f77bcf86cd799439011",
    "id": "507f1f77bcf86cd799439011",
    "employeeId": "EMP-2026-223156",
    "employee_id": "EMP-2026-223156",
    "code": "EMP-2026-223156",
    "tenantId": "upcapto",
    "name": "yuvraj singh",
    "firstName": "yuvraj",
    "first_name": "yuvraj",
    "lastName": "singh",
    "last_name": "singh",
    "fullName": "yuvraj singh",
    "full_name": "yuvraj singh",
    "email": "yuvi@gmail.com",
    "phone": "+91 82793 44166",
    "dob": "2002-06-30T00:00:00.000Z",
    "dateOfBirth": "2002-06-30T00:00:00.000Z",
    "date_of_birth": "2002-06-30T00:00:00.000Z",
    "gender": "Male",  // 'Male', 'Female', 'Other' or null
    "avatar": "/avatars/EMP-2026-223156.jpg",
    
    // ============================================
    // Work Details (Employment Details Tab)
    // ============================================
    "department": "etelios frontend",
    "departmentRef": {
      "_id": "...",
      "id": "...",
      "name": "etelios frontend",
      "code": "ETELIOS",
      "description": "..."
    },
    "designation": "Operations Head",
    "jobTitle": "Operations Head",
    "job_title": "Operations Head",
    "roleName": "Manager",
    "role_name": "Manager",
    "role": {
      "_id": "...",
      "id": "...",
      "name": "Manager",
      "code": "MANAGER"
    },
    "roleFamily": "",
    "role_family": "",
    "gradeBand": "",
    "grade_band": "",
    "status": "active",
    "employee_status": "active",
    "doj": "2026-03-01T00:00:00.000Z",
    "joinDate": "2026-03-01T00:00:00.000Z",
    "join_date": "2026-03-01T00:00:00.000Z",
    "confirmationDate": null,  // or ISO date string
    "confirmation_date": null,
    "reportingManager": "",  // Manager ID
    "reporting_manager": "",
    "reportingManagerName": "",  // Manager Name
    "reporting_manager_name": "",
    "reportingManagerDetails": null,  // or { id, _id, name, employeeId }
    "manager": "",
    
    // ============================================
    // Salary & Compensation (Overview Tab)
    // ============================================
    "salary": 0,  // DEPRECATED: Monthly salary (calculated from annual_ctc / 12)
    "annual_ctc": 0,
    "annualCtc": 0,
    "base_salary": 0,  // Monthly base salary
    "baseSalary": 0,
    "salary_breakdown": {
      "basic": 0,
      "hra": 0,
      "special_allowance": 0,
      "pf_employer": 0,
      "gratuity": 0,
      "other_allowances": 0
    },
    "salaryBreakdown": {
      "basic": 0,
      "hra": 0,
      "special_allowance": 0,
      "pf_employer": 0,
      "gratuity": 0,
      "other_allowances": 0
    },
    
    // ============================================
    // Work Location (Overview Tab)
    // ============================================
    "workLocation": {
      "storeId": "",
      "store_id": "",
      "storeName": "",
      "store_name": "",
      "city": "raipur",
      "state": "Chhattisgarh",
      "pincode": "200123"
    },
    "work_location": {
      "storeId": "",
      "store_id": "",
      "storeName": "",
      "store_name": "",
      "city": "raipur",
      "state": "Chhattisgarh",
      "pincode": "200123"
    },
    "store": {
      "_id": "...",
      "id": "...",
      "name": "N/A",  // or store name
      "code": "",
      "address": {}
    },
    
    // ============================================
    // Current Address (Overview Tab)
    // ============================================
    "currentAddress": {
      "lines": ["kakadeo"],
      "address_line_1": "kakadeo",
      "line1": "kakadeo",
      "address_line_2": "",
      "line2": "",
      "city": "Kanpur",
      "state": "Uttar Pradesh",
      "pincode": "208011",
      "country": "India"
    },
    "current_address": {
      "lines": ["kakadeo"],
      "address_line_1": "kakadeo",
      "line1": "kakadeo",
      "address_line_2": "",
      "line2": "",
      "city": "Kanpur",
      "state": "Uttar Pradesh",
      "pincode": "208011",
      "country": "India"
    },
    
    // ============================================
    // Emergency Contact (Overview Tab)
    // ============================================
    "emergencyContact": {
      "name": "N/A",  // or contact name
      "relationship": "N/A",  // 'Father', 'Mother', 'Spouse', 'Sibling', 'Child', 'Friend', 'Other'
      "phone": "N/A",  // or phone number
      "contact_number": "N/A"
    },
    "emergency_contact": {
      "name": "N/A",
      "relationship": "N/A",
      "phone": "N/A",
      "contact_number": "N/A"
    },
    
    // ============================================
    // Statutory & Compliance (Statutory Tab)
    // ============================================
    "uan": "",  // UAN (EPF) - Universal Account Number
    "esiNo": "",  // ESI Number
    "esi_no": "",
    "esiNumber": "",
    "esi_number": "",
    "panNumber": "",  // PAN Number
    "pan_number": "",
    "pan": "",
    "aadharMasked": "XXXX XXXX 3383",  // Masked Aadhar (last 4 digits visible)
    "aadhar_masked": "XXXX XXXX 3383",
    "aadhar": "XXXX XXXX 3383",
    
    // ============================================
    // Bank Details (Bank Details Tab)
    // ============================================
    "bankAccount": {
      "accountNumber": "N/A",  // or account number
      "account_number": "N/A",
      "account_no": "N/A",
      "ifscCode": "N/A",  // IFSC Code
      "ifsc_code": "N/A",
      "ifsc": "N/A",
      "bankName": "N/A",  // Bank Name
      "bank_name": "N/A",
      "branchName": "N/A",  // Branch Name
      "branch_name": "N/A",
      "branch": "N/A",
      "accountType": "N/A",  // 'Savings', 'Current', 'Salary'
      "account_type": "N/A"
    },
    "bank_account": {
      "accountNumber": "N/A",
      "account_number": "N/A",
      "account_no": "N/A",
      "ifscCode": "N/A",
      "ifsc_code": "N/A",
      "ifsc": "N/A",
      "bankName": "N/A",
      "bank_name": "N/A",
      "branchName": "N/A",
      "branch_name": "N/A",
      "branch": "N/A",
      "accountType": "N/A",
      "account_type": "N/A"
    },
    
    // ============================================
    // Previous Employment
    // ============================================
    "previousEmployment": {
      "has_previous_employment": false,
      "hasPreviousEmployment": false,
      "employer_name": "",
      "employerName": "",
      "from_date": null,
      "fromDate": null,
      "to_date": null,
      "toDate": null,
      "form_16_available": false,
      "form16Available": false
    },
    "previous_employment": {
      "has_previous_employment": false,
      "hasPreviousEmployment": false,
      "employer_name": "",
      "employerName": "",
      "from_date": null,
      "fromDate": null,
      "to_date": null,
      "toDate": null,
      "form_16_available": false,
      "form16Available": false
    },
    
    // ============================================
    // Documents (Documents Tab)
    // ============================================
    "documents": [
      {
        "type": "AADHAR",
        "name": "Aadhar Card",
        "url": "https://storage.example.com/files/aadhar.pdf",
        "uploadedAt": "2026-03-01T00:00:00.000Z",
        "uploadedBy": "...",
        "verified": true,
        "verifiedBy": "...",
        "verifiedAt": "2026-03-01T00:00:00.000Z"
      }
      // More documents...
    ],
    
    // ============================================
    // Timestamps
    // ============================================
    "createdAt": "2026-03-01T00:00:00.000Z",
    "updatedAt": "2026-03-08T00:00:00.000Z",
    "lastLogin": null
  }
}
```

### Employee View Page - Field Mapping Guide

#### Overview Tab

**Personal Details Section:**
- `fullName` or `name` → Full Name
- `firstName` or `first_name` → First Name
- `lastName` or `last_name` → Last Name
- `dateOfBirth` or `dob` or `date_of_birth` → Date of Birth (format: DD/MM/YYYY)
- `gender` → Gender (can be null/empty - show "N/A")
- `employeeId` or `employee_id` → Employee ID
- `code` → Code

**Employment Details Section:**
- `joinDate` or `doj` or `join_date` → Join Date (format: DD/MM/YYYY)
- `confirmationDate` or `confirmation_date` → Confirmation Date (can be null - show "N/A")
- `department` or `departmentRef.name` → Department
- `jobTitle` or `designation` → Designation
- `reportingManagerName` or `reporting_manager_name` → Reporting Manager (can be null - show "N/A")
- `salary` or `base_salary` → Salary (Monthly)

**Salary & Compensation Section:**
- `annual_ctc` or `annualCtc` → Annual CTC
- `base_salary` or `baseSalary` → Monthly Gross (calculated: annual_ctc / 12)
- `salary_breakdown.basic` → Basic
- `salary_breakdown.hra` → HRA
- `salary_breakdown.special_allowance` → Special Allowance
- `salary_breakdown.pf_employer` → PF Employer
- `salary_breakdown.gratuity` → Gratuity
- `salary_breakdown.other_allowances` → Other Allowances

**Current Address Section:**
- `currentAddress.lines` → Address (array of lines)
- `currentAddress.city` → City
- `currentAddress.state` → State
- `currentAddress.pincode` → Pincode
- `currentAddress.country` → Country

**Emergency Contact Section:**
- `emergencyContact.name` → Name (can be null/empty - show "N/A")
- `emergencyContact.relationship` → Relationship (can be null/empty - show "N/A")
- `emergencyContact.phone` → Phone (can be null/empty - show "N/A")

**Work Location Section:**
- `workLocation.storeName` or `store.name` → Store (can be null/empty - show "N/A")
- `workLocation.city` → City
- `workLocation.state` → State
- `workLocation.pincode` → Pincode

#### Statutory Tab

- `uan` → UAN (EPF) (can be null/empty - show "N/A")
- `esiNo` or `esi_no` or `esiNumber` or `esi_number` → ESI Number (can be null/empty - show "N/A")
- `panNumber` or `pan_number` or `pan` → PAN Number (can be null/empty - show "N/A")
- `aadharMasked` or `aadhar_masked` or `aadhar` → Aadhar (Masked) (can be null/empty - show "N/A")

#### Bank Details Tab

- `bankAccount.accountNumber` or `bankAccount.account_number` → Account Number (can be null/empty - show "N/A")
- `bankAccount.bankName` or `bankAccount.bank_name` → Bank Name (can be null/empty - show "N/A")
- `bankAccount.accountType` or `bankAccount.account_type` → Account Type (can be null/empty - show "N/A")
- `bankAccount.ifscCode` or `bankAccount.ifsc_code` → IFSC Code (can be null/empty - show "N/A")
- `bankAccount.branchName` or `bankAccount.branch_name` → Branch Name (can be null/empty - show "N/A")

#### Documents Tab

- `documents` → Array of document objects
  - `type` → Document type (AADHAR, PAN, PASSPORT, etc.)
  - `name` → Document name
  - `url` → Document URL
  - `uploadedAt` → Upload date
  - `verified` → Verification status

#### Benefits Tab

- Benefits data (if available from benefits service)

### 3. Create Employee
```javascript
POST /api/hr/employees

// Request
const newEmployee = await apiClient.post('/api/hr/employees', {
  firstName: "Jane",
  lastName: "Smith",
  email: "jane@example.com",
  phone: "+91-9876543211",
  jobTitle: "HR Manager",
  department: "department_id_here",
  storeId: "store_id_here",
  roleName: "HR",
  status: "active",
  dateOfBirth: "1992-05-15",
  doj: "2021-01-01",
  address: {
    street: "789 Oak St",
    city: "Mumbai",
    state: "Maharashtra",
    zip: "400001",
    country: "India"
  }
});

// Response
{
  "success": true,
  "data": { /* employee object */ },
  "message": "Employee created successfully"
}
```

### 4. Update Employee
```javascript
PUT /api/hr/employees/:id

// Supports both ObjectId and employee_id
// Note: Frontend field names are auto-transformed to backend format
const updated = await apiClient.put('/api/hr/employees/EMP-001', {
  firstName: "Jane",
  lastName: "Smith",
  email: "jane.new@example.com",
  jobTitle: "Senior HR Manager",
  designation: "Senior HR Manager",  // Auto-transformed to jobTitle
  esi_number: "ESI123456",  // Auto-transformed to esiNo
  pan_number: "ABCDE1234F",  // Auto-transformed to panNumber
  bank_account: {  // Auto-transformed to bankAccount
    accountNumber: "1234567890",
    ifsc: "BANK0001234",
    bankName: "Bank Name"
  },
  storeId: "new_store_id_here",  // Can be empty string to clear
  status: "active"
});

// Response
{
  "success": true,
  "data": { /* updated employee */ },
  "message": "Employee updated successfully"
}
```

### 5. Delete Employee
```javascript
DELETE /api/hr/employees/:id

// Supports both ObjectId and employee_id
const result = await apiClient.delete('/api/hr/employees/EMP-001');

// Response
{
  "success": true,
  "data": null,
  "message": "Employee deleted successfully"
}
```

---

## ⏰ Attendance APIs

### 1. Get Attendance Records
```javascript
GET /api/attendance?page=1&limit=10&date=2026-03-08&employeeId=EMP-001&status=present

// Request
const attendance = await apiClient.get('/api/attendance', {
  params: {
    page: 1,
    limit: 10,
    date: '2026-03-08',  // YYYY-MM-DD format
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    employeeId: 'EMP-001',
    status: 'present',
    storeId: 'store_id_here',
    departmentId: 'dept_id_here'
  }
});

// Response
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "employee": {
        "_id": "...",
        "name": "John Doe",
        "employee_id": "EMP-001"
      },
      "date": "2026-03-08T00:00:00.000Z",
      "check_in_time": "2026-03-08T09:00:00.000Z",
      "check_out_time": "2026-03-08T18:00:00.000Z",
      "total_hours": 9,
      "status": "present",
      "notes": "On time",
      "store": {
        "_id": "...",
        "name": "Mumbai Store",
        "code": "MUM-001"
      }
    }
  ],
  "pagination": {
    "current": 1,
    "pages": 10,
    "total": 100,
    "limit": 10
  }
}
```

### 2. Get Attendance By ID
```javascript
GET /api/attendance/:id

const attendance = await apiClient.get('/api/attendance/507f1f77bcf86cd799439011');

// Response
{
  "success": true,
  "data": { /* attendance record */ }
}
```

### 3. Clock In
```javascript
POST /api/attendance/clock-in

const clockIn = await apiClient.post('/api/attendance/clock-in', {
  latitude: 19.0760,
  longitude: 72.8777,
  notes: "Starting work",
  selfie: "base64_encoded_image",  // Optional
  timestamp: 1646726400000  // Optional, Unix timestamp
});

// Response
{
  "success": true,
  "data": {
    "_id": "...",
    "check_in_time": "2026-03-08T09:00:00.000Z",
    "status": "present"
  }
}
```

### 4. Clock Out
```javascript
POST /api/attendance/clock-out

const clockOut = await apiClient.post('/api/attendance/clock-out', {
  latitude: 19.0760,
  longitude: 72.8777,
  notes: "Finished work"
});

// Response
{
  "success": true,
  "data": {
    "_id": "...",
    "check_out_time": "2026-03-08T18:00:00.000Z",
    "total_hours": 9
  }
}
```

### 5. Edit Attendance (NEW - HR/Admin/Manager Only)
```javascript
PUT /api/attendance/:id

// Request
const updated = await apiClient.put('/api/attendance/507f1f77bcf86cd799439011', {
  notes: "Updated notes",
  status: "present",  // 'present', 'absent', 'on_leave', 'holiday', 'half_day'
  check_in_time: "2026-03-08T09:00:00.000Z",  // ISO date string
  check_out_time: "2026-03-08T18:00:00.000Z"  // ISO date string
});

// Response
{
  "success": true,
  "data": {
    "_id": "...",
    "notes": "Updated notes",
    "status": "present",
    "check_in_time": "2026-03-08T09:00:00.000Z",
    "check_out_time": "2026-03-08T18:00:00.000Z",
    "total_hours": 9  // Auto-calculated
  },
  "message": "Attendance record updated successfully"
}
```

### 6. Get Today's Attendance
```javascript
GET /api/attendance/today

const today = await apiClient.get('/api/attendance/today');

// Response
{
  "success": true,
  "data": {
    "check_in_time": "2026-03-08T09:00:00.000Z",
    "check_out_time": null,
    "status": "present"
  }
}
```

### 7. Get Attendance Summary
```javascript
GET /api/attendance/summary?startDate=2026-03-01&endDate=2026-03-31

const summary = await apiClient.get('/api/attendance/summary', {
  params: {
    startDate: '2026-03-01',
    endDate: '2026-03-31'
  }
});

// Response
{
  "success": true,
  "data": {
    "totalDays": 31,
    "presentDays": 25,
    "absentDays": 2,
    "leaveDays": 4,
    "totalHours": 225,
    "averageHours": 9
  }
}
```

---

## 📅 Leave Management APIs

### 1. Get Leave Policy
```javascript
GET /api/hr/leave-requests/policies/leave

const policy = await apiClient.get('/api/hr/leave-requests/policies/leave');

// Response
{
  "success": true,
  "data": {
    "CL": { "maxDays": 12, "available": 10 },
    "SL": { "maxDays": 12, "available": 12 },
    "EL": { "maxDays": 15, "available": 15 }
  }
}
```

### 2. Apply for Leave (IMPROVED - employee_id optional)
```javascript
POST /api/hr/leave-requests

// Request - employee_id is OPTIONAL
// For employees: Auto-set from logged-in user
// For HR/Admin: Can apply for themselves or specify employee_id
const leaveRequest = await apiClient.post('/api/hr/leave-requests', {
  // employee_id: "EMP-001",  // OPTIONAL - Auto-set if not provided
  leave_type: "CL",  // 'CL', 'SL', 'EL', 'WO', 'PH', 'LWP', etc.
  from_date: "2026-03-10",  // YYYY-MM-DD format
  to_date: "2026-03-12",  // YYYY-MM-DD format
  reason: "Personal work",
  half_day: false,
  half_day_type: null,  // 'FIRST_HALF' or 'SECOND_HALF' if half_day = true
  attachments: [  // Optional
    {
      file_name: "medical_certificate.pdf",
      file_url: "https://storage.example.com/files/cert.pdf",
      file_type: "MEDICAL_CERTIFICATE"
    }
  ]
});

// Response (Success - 201)
{
  "success": true,
  "data": {
    "request_id": "LR-2026-001",
    "employee_id": "EMP-001",
    "employee_code": "EMP-001",
    "employee_name": "John Doe",
    "leave_type": "CL",
    "from_date": "2026-03-10T00:00:00.000Z",
    "to_date": "2026-03-12T00:00:00.000Z",
    "days": 3,
    "status": "pending",
    "reason": "Personal work"
  },
  "message": "Leave request created successfully"
}

// Response (Error - Insufficient leave balance)
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Insufficient leave balance. Available: 0, Requested: 2"
}
```

### 3. Get Leave Requests
```javascript
GET /api/hr/leave-requests?page=1&limit=10&status=pending&employeeId=EMP-001

const requests = await apiClient.get('/api/hr/leave-requests', {
  params: {
    page: 1,
    limit: 10,
    status: 'pending',  // 'pending', 'approved', 'rejected', 'cancelled'
    employeeId: 'EMP-001',
    leave_type: 'CL',
    startDate: '2026-03-01',
    endDate: '2026-03-31'
  }
});

// Response
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "request_id": "LR-2026-001",
      "employee_id": "EMP-001",
      "employee_name": "John Doe",
      "leave_type": "CL",
      "from_date": "2026-03-10T00:00:00.000Z",
      "to_date": "2026-03-12T00:00:00.000Z",
      "days": 3,
      "status": "pending",
      "reason": "Personal work"
    }
  ],
  "pagination": {
    "current": 1,
    "pages": 5,
    "total": 50,
    "limit": 10
  }
}
```

### 4. Approve/Reject Leave Request
```javascript
POST /api/hr/leave-requests/:id/approve
POST /api/hr/leave-requests/:id/reject

// Approve
const approved = await apiClient.post('/api/hr/leave-requests/LR-2026-001/approve', {
  level: 1,  // 1, 2, or 3 (approval level)
  comments: "Approved by HR"
});

// Reject
const rejected = await apiClient.post('/api/hr/leave-requests/LR-2026-001/reject', {
  comments: "Insufficient leave balance"
});

// Response
{
  "success": true,
  "data": { /* updated leave request */ },
  "message": "Leave request approved/rejected successfully"
}
```

---

## ⚠️ Error Handling

### Standard Error Response Format
```typescript
{
  success: false,
  error: string,  // Error code: 'VALIDATION_ERROR', 'NOT_FOUND', 'UNAUTHORIZED', etc.
  message: string,  // Human-readable error message
  timestamp: string,  // ISO timestamp
  path: string  // API path that caused the error
}
```

### Common Error Codes
```javascript
// 400 - Bad Request
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Validation failed: 'from_date' is required"
}

// 401 - Unauthorized
{
  "success": false,
  "error": "UNAUTHORIZED",
  "message": "Invalid or expired token"
}

// 403 - Forbidden
{
  "success": false,
  "error": "ACCESS_DENIED",
  "message": "You don't have permission to perform this action"
}

// 404 - Not Found
{
  "success": false,
  "error": "NOT_FOUND",
  "message": "Employee not found"
}

// 409 - Conflict
{
  "success": false,
  "error": "DUPLICATE",
  "message": "Store with this code already exists"
}

// 500 - Server Error
{
  "success": false,
  "error": "INTERNAL_ERROR",
  "message": "Internal server error"
}
```

### Error Handling Helper
```javascript
// errorHandler.js
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error
    const { data } = error.response;
    
    switch (data.error) {
      case 'VALIDATION_ERROR':
        return `Validation Error: ${data.message}`;
      case 'NOT_FOUND':
        return `Not Found: ${data.message}`;
      case 'UNAUTHORIZED':
        return 'Session expired. Please login again.';
      case 'ACCESS_DENIED':
        return `Access Denied: ${data.message}`;
      default:
        return data.message || 'An error occurred';
    }
  } else if (error.request) {
    // Request made but no response
    return 'Network error. Please check your connection.';
  } else {
    // Something else happened
    return error.message || 'An unexpected error occurred';
  }
};

// Usage
try {
  const response = await apiClient.get('/api/hr/employees');
} catch (error) {
  const errorMessage = handleApiError(error);
  toast.error(errorMessage);
}
```

---

## 💻 Code Examples

### React Hook for API Calls
```javascript
// useApi.js
import { useState, useEffect } from 'react';
import apiClient from './apiClient';

export const useApi = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(url, options);
        setData(response.data);
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return { data, loading, error };
};

// Usage
const { data: employees, loading, error } = useApi('/api/hr/employees', {
  params: { page: 1, limit: 10 }
});
```

### Employee View Page Component Example
```javascript
// EmployeeViewPage.jsx
import React, { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';

const EmployeeViewPage = ({ employeeId }) => {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchEmployee();
  }, [employeeId]);

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/hr/employees/${employeeId}`);
      
      if (response.data.success) {
        setEmployee(response.data.data);
      }
    } catch (err) {
      console.error(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  if (loading) return <div>Loading...</div>;
  if (!employee) return <div>Employee not found</div>;

  return (
    <div className="employee-view-page">
      {/* Employee Header Card */}
      <div className="employee-header">
        <div className="avatar">
          <img src={employee.avatar || '/default-avatar.png'} alt={employee.fullName} />
        </div>
        <div className="employee-info">
          <h1>{employee.fullName || employee.name}</h1>
          <p>ID: {employee.employeeId || employee.employee_id}</p>
          <p>{employee.jobTitle || employee.designation}</p>
          <p>{employee.email}</p>
          <p>{employee.phone}</p>
          <span className={`status-badge ${employee.status}`}>
            {employee.status?.toUpperCase() || 'ACTIVE'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={activeTab === 'work-details' ? 'active' : ''}
          onClick={() => setActiveTab('work-details')}
        >
          Work Details
        </button>
        <button 
          className={activeTab === 'statutory' ? 'active' : ''}
          onClick={() => setActiveTab('statutory')}
        >
          Statutory
        </button>
        <button 
          className={activeTab === 'bank-details' ? 'active' : ''}
          onClick={() => setActiveTab('bank-details')}
        >
          Bank Details
        </button>
        <button 
          className={activeTab === 'documents' ? 'active' : ''}
          onClick={() => setActiveTab('documents')}
        >
          Documents
        </button>
        <button 
          className={activeTab === 'benefits' ? 'active' : ''}
          onClick={() => setActiveTab('benefits')}
        >
          Benefits
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            {/* Personal Details */}
            <div className="section">
              <h3>Personal Details</h3>
              <div className="field-grid">
                <div><strong>Full Name:</strong> {employee.fullName || employee.name}</div>
                <div><strong>First Name:</strong> {employee.firstName || employee.first_name}</div>
                <div><strong>Last Name:</strong> {employee.lastName || employee.last_name}</div>
                <div><strong>Date of Birth:</strong> {formatDate(employee.dateOfBirth || employee.dob)}</div>
                <div><strong>Gender:</strong> {employee.gender || 'N/A'}</div>
                <div><strong>Employee ID:</strong> {employee.employeeId || employee.employee_id}</div>
                <div><strong>Code:</strong> {employee.code || employee.employeeId}</div>
              </div>
            </div>

            {/* Employment Details */}
            <div className="section">
              <h3>Employment Details</h3>
              <div className="field-grid">
                <div><strong>Join Date:</strong> {formatDate(employee.joinDate || employee.doj)}</div>
                <div><strong>Confirmation Date:</strong> {formatDate(employee.confirmationDate || employee.confirmation_date) || 'N/A'}</div>
                <div><strong>Department:</strong> {employee.department || employee.departmentRef?.name || 'N/A'}</div>
                <div><strong>Designation:</strong> {employee.jobTitle || employee.designation || 'N/A'}</div>
                <div><strong>Reporting Manager:</strong> {employee.reportingManagerName || employee.reporting_manager_name || 'N/A'}</div>
                <div><strong>Salary:</strong> {formatCurrency(employee.salary || employee.base_salary)}</div>
              </div>
            </div>

            {/* Salary & Compensation */}
            <div className="section">
              <h3>Salary & Compensation</h3>
              <div className="field-grid">
                <div><strong>Annual CTC:</strong> {formatCurrency(employee.annual_ctc || employee.annualCtc)}</div>
                <div><strong>Monthly Gross:</strong> {formatCurrency((employee.annual_ctc || employee.annualCtc) / 12)}</div>
                <div className="salary-breakdown">
                  <h4>Salary Breakdown (Annual):</h4>
                  <div><strong>Basic:</strong> {formatCurrency(employee.salary_breakdown?.basic || employee.salaryBreakdown?.basic)}</div>
                  <div><strong>HRA:</strong> {formatCurrency(employee.salary_breakdown?.hra || employee.salaryBreakdown?.hra)}</div>
                  <div><strong>Special Allowance:</strong> {formatCurrency(employee.salary_breakdown?.special_allowance || employee.salaryBreakdown?.special_allowance)}</div>
                  <div><strong>PF Employer:</strong> {formatCurrency(employee.salary_breakdown?.pf_employer || employee.salaryBreakdown?.pf_employer)}</div>
                  <div><strong>Gratuity:</strong> {formatCurrency(employee.salary_breakdown?.gratuity || employee.salaryBreakdown?.gratuity)}</div>
                  <div><strong>Other Allowances:</strong> {formatCurrency(employee.salary_breakdown?.other_allowances || employee.salaryBreakdown?.other_allowances)}</div>
                </div>
              </div>
            </div>

            {/* Current Address */}
            <div className="section">
              <h3>Current Address</h3>
              <div className="address">
                {employee.currentAddress?.lines?.map((line, idx) => (
                  <div key={idx}>{line}</div>
                ))}
                <div>{employee.currentAddress?.city}, {employee.currentAddress?.state} {employee.currentAddress?.pincode}</div>
                <div>{employee.currentAddress?.country || 'India'}</div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="section">
              <h3>Emergency Contact</h3>
              <div className="field-grid">
                <div><strong>Name:</strong> {employee.emergencyContact?.name || 'N/A'}</div>
                <div><strong>Relationship:</strong> {employee.emergencyContact?.relationship || 'N/A'}</div>
                <div><strong>Phone:</strong> {employee.emergencyContact?.phone || employee.emergencyContact?.contact_number || 'N/A'}</div>
              </div>
            </div>

            {/* Work Location */}
            <div className="section">
              <h3>Work Location</h3>
              <div className="field-grid">
                <div><strong>Store:</strong> {employee.workLocation?.storeName || employee.store?.name || 'N/A'}</div>
                <div><strong>City:</strong> {employee.workLocation?.city || 'N/A'}</div>
                <div><strong>State:</strong> {employee.workLocation?.state || 'N/A'}</div>
                <div><strong>Pincode:</strong> {employee.workLocation?.pincode || 'N/A'}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'statutory' && (
          <div className="statutory-tab">
            <h3>Statutory & Compliance Details</h3>
            <div className="field-grid">
              <div><strong>UAN (EPF):</strong> {employee.uan || 'N/A'}</div>
              <div><strong>ESI Number:</strong> {employee.esiNo || employee.esi_no || employee.esiNumber || employee.esi_number || 'N/A'}</div>
              <div><strong>PAN Number:</strong> {employee.panNumber || employee.pan_number || employee.pan || 'N/A'}</div>
              <div><strong>Aadhar (Masked):</strong> {employee.aadharMasked || employee.aadhar_masked || employee.aadhar || 'N/A'}</div>
            </div>
          </div>
        )}

        {activeTab === 'bank-details' && (
          <div className="bank-details-tab">
            <h3>Bank Account Details</h3>
            <div className="field-grid">
              <div><strong>Account Number:</strong> {employee.bankAccount?.accountNumber || employee.bankAccount?.account_number || employee.bankAccount?.account_no || 'N/A'}</div>
              <div><strong>Bank Name:</strong> {employee.bankAccount?.bankName || employee.bankAccount?.bank_name || 'N/A'}</div>
              <div><strong>Account Type:</strong> {employee.bankAccount?.accountType || employee.bankAccount?.account_type || 'N/A'}</div>
              <div><strong>IFSC Code:</strong> {employee.bankAccount?.ifscCode || employee.bankAccount?.ifsc_code || employee.bankAccount?.ifsc || 'N/A'}</div>
              <div><strong>Branch Name:</strong> {employee.bankAccount?.branchName || employee.bankAccount?.branch_name || employee.bankAccount?.branch || 'N/A'}</div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="documents-tab">
            <h3>Documents</h3>
            {employee.documents && employee.documents.length > 0 ? (
              <div className="documents-list">
                {employee.documents.map((doc, idx) => (
                  <div key={idx} className="document-item">
                    <div><strong>Type:</strong> {doc.type}</div>
                    <div><strong>Name:</strong> {doc.name}</div>
                    <div><strong>Status:</strong> {doc.verified ? 'Verified' : 'Pending'}</div>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">View Document</a>
                  </div>
                ))}
              </div>
            ) : (
              <div>No documents uploaded</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeViewPage;
```

### React Component Example
```javascript
// EmployeeList.jsx
import React, { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';

const EmployeeList = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });

  useEffect(() => {
    fetchEmployees();
  }, [pagination]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/hr/employees', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          status: 'active'
        }
      });
      
      if (response.data.success) {
        setEmployees(response.data.data);
        setPagination(prev => ({
          ...prev,
          total: response.data.pagination?.total || 0,
          pages: response.data.pagination?.pages || 1
        }));
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (employeeId, updateData) => {
    try {
      const response = await apiClient.put(`/api/hr/employees/${employeeId}`, updateData);
      if (response.data.success) {
        // Refresh list
        fetchEmployees();
        alert('Employee updated successfully');
      }
    } catch (err) {
      alert(handleApiError(err));
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Employees</h2>
      <table>
        <thead>
          <tr>
            <th>Employee ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Department</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => (
            <tr key={emp._id}>
              <td>{emp.employee_id}</td>
              <td>{emp.fullName}</td>
              <td>{emp.email}</td>
              <td>{emp.department}</td>
              <td>
                <button onClick={() => handleEdit(emp._id, { status: 'inactive' })}>
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EmployeeList;
```

### Leave Apply Component
```javascript
// LeaveApplyForm.jsx
import React, { useState } from 'react';
import apiClient from '../utils/apiClient';
import { handleApiError } from '../utils/errorHandler';

const LeaveApplyForm = () => {
  const [formData, setFormData] = useState({
    leave_type: 'CL',
    from_date: '',
    to_date: '',
    reason: '',
    half_day: false,
    half_day_type: null
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      // Note: employee_id is NOT required - auto-set from token
      const response = await apiClient.post('/api/hr/leave-requests', formData);
      
      if (response.data.success) {
        alert('Leave applied successfully!');
        // Reset form
        setFormData({
          leave_type: 'CL',
          from_date: '',
          to_date: '',
          reason: '',
          half_day: false,
          half_day_type: null
        });
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Leave Type</label>
        <select
          value={formData.leave_type}
          onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
        >
          <option value="CL">Casual Leave</option>
          <option value="SL">Sick Leave</option>
          <option value="EL">Earned Leave</option>
        </select>
      </div>
      
      <div>
        <label>From Date</label>
        <input
          type="date"
          value={formData.from_date}
          onChange={(e) => setFormData({ ...formData, from_date: e.target.value })}
          required
        />
      </div>
      
      <div>
        <label>To Date</label>
        <input
          type="date"
          value={formData.to_date}
          onChange={(e) => setFormData({ ...formData, to_date: e.target.value })}
          required
        />
      </div>
      
      <div>
        <label>Reason</label>
        <textarea
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          required
          maxLength={1000}
        />
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Applying...' : 'Apply Leave'}
      </button>
    </form>
  );
};

export default LeaveApplyForm;
```

---

## 🔧 Common Issues & Solutions

### Issue 1: "X-Tenant-Id header does not match JWT token"
**Solution:** Ensure the `X-Tenant-Id` header matches the tenantId in the JWT token.

```javascript
// Get tenantId from token or user object
const tenantId = user?.tenantId || localStorage.getItem('tenantId');
apiClient.defaults.headers['X-Tenant-Id'] = tenantId;
```

### Issue 2: "Employee not found" when using employee_id
**Solution:** The API supports both ObjectId and employee_id. Make sure the employee_id format is correct (e.g., "EMP-001").

```javascript
// Both work:
await apiClient.get('/api/hr/employees/507f1f77bcf86cd799439011');  // ObjectId
await apiClient.get('/api/hr/employees/EMP-001');  // employee_id
```

### Issue 3: "employee_id is required" in Leave Apply
**Solution:** This is now fixed! `employee_id` is optional and auto-set from the logged-in user. Just don't include it in the request.

```javascript
// ✅ Correct - employee_id not needed
await apiClient.post('/api/hr/leave-requests', {
  leave_type: 'CL',
  from_date: '2026-03-10',
  to_date: '2026-03-12',
  reason: 'Personal work'
});

// ❌ Wrong - Don't include employee_id unless applying for someone else (HR/Admin)
```

### Issue 4: Store/Department not found by code
**Solution:** The API now supports both ObjectId and code lookup. Use the code directly:

```javascript
// ✅ Both work:
await apiClient.get('/api/hr/stores/MUM-001');  // By code
await apiClient.get('/api/hr/stores/507f1f77bcf86cd799439011');  // By ObjectId

await apiClient.get('/api/hr/departments/SALES');  // By code
await apiClient.get('/api/hr/departments/507f1f77bcf86cd799439011');  // By ObjectId
```

### Issue 5: Attendance showing all employees
**Solution:** This is by design. Admin/HR see all employees in their tenant. Employees only see their own attendance. The API automatically filters by tenantId.

```javascript
// Admin/HR - sees all employees in tenant
const allAttendance = await apiClient.get('/api/attendance');

// Employee - automatically filtered to their own
const myAttendance = await apiClient.get('/api/attendance');
```

### Issue 6: Field name mismatches (esi_number vs esiNo)
**Solution:** The API auto-transforms frontend field names to backend format:

```javascript
// ✅ Frontend can use either format:
{
  esi_number: "ESI123",  // Auto-transformed to esiNo
  pan_number: "PAN123",  // Auto-transformed to panNumber
  bank_account: {...},   // Auto-transformed to bankAccount
  designation: "Manager" // Auto-transformed to jobTitle
}
```

---

## 📚 Additional Resources

### API Base URLs
- **Production:** `https://your-production-domain.com`
- **Staging:** `https://staging.your-domain.com`
- **Local:** `http://localhost:3001` (for local development)

### Rate Limits
- **Default:** 100 requests per minute per user
- **Burst:** 20 requests per second

### Pagination
- **Default limit:** 10 items per page
- **Max limit:** 1000 items per page
- **Default page:** 1

### Date Formats
- **API Format:** ISO 8601 (`YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss.sssZ`)
- **Example:** `2026-03-08` or `2026-03-08T09:00:00.000Z`

---

## ✅ Recent Fixes (March 2026)

1. ✅ **Department View** - Added tenantId filter
2. ✅ **Store Delete** - Added code lookup support
3. ✅ **Leave Apply** - employee_id is now optional (auto-set from token)
4. ✅ **Attendance Edit** - New PUT endpoint for HR/Admin/Manager
5. ✅ **Employee View/Edit** - Tenant isolation verified
6. ✅ **Attendance Tenant Isolation** - Verified working

---

## 📄 Employee View Page - Complete Field Reference

### Quick Reference for Employee View Page

This section provides a quick reference for all fields displayed on the Employee View page in Admin/HR Management.

#### Overview Tab Fields

**Personal Details:**
- `fullName` / `name` - Full Name
- `firstName` / `first_name` - First Name  
- `lastName` / `last_name` - Last Name
- `dateOfBirth` / `dob` / `date_of_birth` - Date of Birth
- `gender` - Gender (can be null - show "N/A")
- `employeeId` / `employee_id` - Employee ID
- `code` - Code

**Employment Details:**
- `joinDate` / `doj` / `join_date` - Join Date
- `confirmationDate` / `confirmation_date` - Confirmation Date (can be null - show "N/A")
- `department` / `departmentRef.name` - Department
- `jobTitle` / `designation` - Designation
- `reportingManagerName` / `reporting_manager_name` - Reporting Manager (can be null - show "N/A")
- `salary` / `base_salary` - Salary (Monthly)

**Salary & Compensation:**
- `annual_ctc` / `annualCtc` - Annual CTC
- `base_salary` / `baseSalary` - Monthly Gross (annual_ctc / 12)
- `salary_breakdown.basic` - Basic
- `salary_breakdown.hra` - HRA
- `salary_breakdown.special_allowance` - Special Allowance
- `salary_breakdown.pf_employer` - PF Employer
- `salary_breakdown.gratuity` - Gratuity
- `salary_breakdown.other_allowances` - Other Allowances

**Current Address:**
- `currentAddress.lines` - Address lines (array)
- `currentAddress.city` - City
- `currentAddress.state` - State
- `currentAddress.pincode` - Pincode
- `currentAddress.country` - Country

**Emergency Contact:**
- `emergencyContact.name` - Name (can be null - show "N/A")
- `emergencyContact.relationship` - Relationship (can be null - show "N/A")
- `emergencyContact.phone` - Phone (can be null - show "N/A")

**Work Location:**
- `workLocation.storeName` / `store.name` - Store (can be null - show "N/A")
- `workLocation.city` - City
- `workLocation.state` - State
- `workLocation.pincode` - Pincode

#### Statutory Tab Fields

- `uan` - UAN (EPF) (can be null - show "N/A")
- `esiNo` / `esi_no` / `esiNumber` / `esi_number` - ESI Number (can be null - show "N/A")
- `panNumber` / `pan_number` / `pan` - PAN Number (can be null - show "N/A")
- `aadharMasked` / `aadhar_masked` / `aadhar` - Aadhar (Masked) (can be null - show "N/A")

#### Bank Details Tab Fields

- `bankAccount.accountNumber` / `bankAccount.account_number` - Account Number (can be null - show "N/A")
- `bankAccount.bankName` / `bankAccount.bank_name` - Bank Name (can be null - show "N/A")
- `bankAccount.accountType` / `bankAccount.account_type` - Account Type (can be null - show "N/A")
- `bankAccount.ifscCode` / `bankAccount.ifsc_code` - IFSC Code (can be null - show "N/A")
- `bankAccount.branchName` / `bankAccount.branch_name` - Branch Name (can be null - show "N/A")

#### Documents Tab

- `documents` - Array of document objects
  - Each document has: `type`, `name`, `url`, `uploadedAt`, `verified`

### Important Notes

1. **Null/Empty Values:** Many fields can be `null`, `undefined`, or empty strings. Always show "N/A" for these cases.

2. **Field Name Variations:** The API returns both camelCase and snake_case versions of field names. Use either format - both are available.

3. **Date Formatting:** Dates are returned as ISO strings. Format them as DD/MM/YYYY for display.

4. **Currency Formatting:** Use `Intl.NumberFormat` with 'en-IN' locale for Indian Rupee formatting.

5. **Nested Objects:** Some fields are nested (e.g., `currentAddress.city`, `bankAccount.accountNumber`). Always check for null before accessing nested properties.

---

## 📚 Additional Resources

### Recent Updates (March 8, 2026)

1. **Roster Sync Attendance API** - New endpoint to sync roster with attendance
   - See: [Frontend Roster Sync Attendance Guide](./FRONTEND_ROSTER_SYNC_ATTENDANCE_GUIDE.md)
   - Endpoint: `POST /api/hr/roster/sync-attendance`
   - Purpose: Sync roster entries (store, shift, timings) with attendance records

2. **Attendance API - dateFrom/dateTo Support** - Enhanced date filtering
   - See: [Frontend Roster Sync Attendance Guide](./FRONTEND_ROSTER_SYNC_ATTENDANCE_GUIDE.md)
   - Now supports `dateFrom` and `dateTo` query parameters (in addition to `startDate`/`endDate`)
   - Example: `GET /api/attendance?employeeId=EMP-123&dateFrom=2026-03-01&dateTo=2026-03-31`

---

**Last Updated:** March 8, 2026  
**Version:** 3.1  
**Status:** ✅ Production Ready

For questions or issues, contact the backend team or refer to the API documentation.
