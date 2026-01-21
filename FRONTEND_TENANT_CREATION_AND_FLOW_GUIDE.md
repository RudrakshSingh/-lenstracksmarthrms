# Tenant Creation and Complete Flow Guide for Frontend Developers

## Overview

This guide provides comprehensive documentation for frontend developers on how to:
1. Create a new tenant (company/organization)
2. Handle first-login password change flow
3. Create employees with new fields (gender, annual_ctc, salary_breakdown)
4. Complete the full onboarding workflow

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Tenant Creation Flow](#tenant-creation-flow)
3. [First Login & Password Change](#first-login--password-change)
4. [Employee Creation with New Fields](#employee-creation-with-new-fields)
5. [Complete Onboarding Workflow](#complete-onboarding-workflow)
6. [API Endpoints Reference](#api-endpoints-reference)
7. [Test Scripts](#test-scripts)
8. [Error Handling](#error-handling)
9. [Best Practices](#best-practices)

---

## Prerequisites

### Base Configuration

- **Base URL**: `https://98.70.245.87` (Production)
- **API Host Header**: `api.etelios.com`
- **Authentication**: Bearer Token (JWT)
- **Content-Type**: `application/json`

### Required Headers

```javascript
{
  'Content-Type': 'application/json',
  'Host': 'api.etelios.com',
  'Authorization': 'Bearer <token>',  // Required for authenticated requests
  'X-Tenant-Id': '<tenant-id>'        // Required for tenant-specific requests
}
```

---

## Tenant Creation Flow

### Step 1: Super Admin Login

Before creating a tenant, you need to authenticate as a Super Admin.

**Endpoint**: `POST /api/auth/login`

**Request Body**:
```json
{
  "emailOrEmployeeId": "admin@etelios.com",
  "password": "Admin@123456"
}
```

**Response** (200 OK):
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

**Implementation Example**:
```javascript
async function loginAsSuperAdmin() {
  const response = await fetch('https://98.70.245.87/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': 'api.etelios.com'
    },
    body: JSON.stringify({
      emailOrEmployeeId: 'admin@etelios.com',
      password: 'Admin@123456'
    })
  });
  
  const data = await response.json();
  if (data.success) {
    return data.data.accessToken;
  }
  throw new Error(data.message || 'Login failed');
}
```

### Step 2: Create Tenant

**Endpoint**: `POST /api/tenants`

**Required Headers**:
```javascript
{
  'Authorization': 'Bearer <super-admin-token>',
  'Content-Type': 'application/json'
}
```

**Request Body**:
```json
{
  "name": "Lenstrack",
  "email": "admin@lenstrack.etelios.com",
  "domain": "lenstrack",
  "subdomain": "lenstrack",
  "phone": "+919876543210",
  "primaryContact": "Lenstrack Admin",
  "address": {
    "street": "Lenstrack Office",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  },
  "plan": "enterprise",
  "modules": ["hr", "analytics", "reports"]
}
```

**Field Requirements**:
- `name` (required): Company/tenant name (2-200 characters)
- `email` (required): Primary contact email (will be used to create admin user)
- `domain` (optional): Auto-generated if not provided
- `subdomain` (optional): Auto-generated from name if not provided
- `phone` (optional): Contact phone number
- `primaryContact` (optional): Admin user name
- `address` (optional): Company address object
- `plan` (optional): One of `Trial`, `Basic`, `Professional`, `Enterprise`, `Enterprise Plus` (default: `Basic`)
- `modules` (optional): Array of module names. Valid values: `hr`, `crm`, `inventory`, `financial`, `sales`, `purchase`, `analytics`, `reports`

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "696e7b622a02069705de5735",
    "tenantId": "lenstrack",
    "name": "Lenstrack",
    "domain": "lenstrack",
    "subdomain": "lenstrack",
    "email": "admin@lenstrack.etelios.com",
    "phone": "+919876543210",
    "status": "active",
    "plan": "enterprise",
    "planDetails": {
      "name": "Enterprise",
      "price": 50000,
      "currency": "INR",
      "billing": "Monthly",
      "features": ["..."]
    },
    "subscription": {
      "startDate": "2026-01-19",
      "endDate": "2027-01-19",
      "renewalDate": "2027-01-19",
      "autoRenewal": true,
      "paymentStatus": "active"
    },
    "usage": {
      "users": 0,
      "maxUsers": 1000,
      "storage": 0,
      "maxStorage": 1000,
      "apiCalls": 0,
      "maxApiCalls": 100000
    },
    "settings": {
      "timezone": "Asia/Kolkata",
      "currency": "INR",
      "language": "en",
      "dateFormat": "DD/MM/YYYY",
      "customDomain": false,
      "ssoEnabled": false,
      "backupEnabled": true
    },
    "contact": {
      "primaryContact": "Lenstrack Admin",
      "primaryEmail": "admin@lenstrack.etelios.com",
      "primaryPhone": "+919876543210"
    },
    "modules": ["hr", "analytics", "reports"],
    "createdAt": "2026-01-19T18:30:00.000Z",
    "updatedAt": "2026-01-19T18:30:00.000Z",
    "adminUser": {
      "id": "...",
      "email": "admin@lenstrack.etelios.com",
      "name": "Lenstrack Admin (Admin)",
      "employeeId": "ADMIN-LENSTRACK-001",
      "role": "admin",
      "temporaryPassword": "S74t^z@jV3uQ",
      "mustChangePassword": true
    },
    "superAdminUser": {
      "id": "...",
      "email": "superadmin@lenstrack.etelios.com",
      "name": "Lenstrack Admin (Super Admin)",
      "employeeId": "SUPERADMIN-LENSTRACK-001",
      "role": "superadmin",
      "temporaryPassword": "9J4s#cHfcsoG",
      "mustChangePassword": true
    },
    "passwordChangeRequired": true,
    "passwordChangeMessage": "Please change your temporary password on first login. Admin and Super Admin can change passwords from their profile settings."
  },
  "message": "Tenant created successfully"
}
```

**Important Notes**:
1. **Temporary Passwords**: Both admin and super admin users are created with temporary passwords that must be changed on first login.
2. **Password Storage**: Store the temporary passwords securely and display them to the user (or send via email).
3. **First Login**: The `mustChangePassword` flag indicates that password change is required.

**Implementation Example**:
```javascript
async function createTenant(superAdminToken, tenantData) {
  const response = await fetch('https://98.70.245.87/api/tenants', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': 'api.etelios.com',
      'Authorization': `Bearer ${superAdminToken}`
    },
    body: JSON.stringify({
      name: tenantData.name,
      email: tenantData.email,
      domain: tenantData.domain,
      subdomain: tenantData.subdomain,
      phone: tenantData.phone,
      primaryContact: tenantData.primaryContact,
      address: tenantData.address,
      plan: tenantData.plan || 'Basic',
      modules: tenantData.modules || ['hr']
    })
  });
  
  const data = await response.json();
  if (data.success) {
    return {
      tenant: data.data,
      adminCredentials: {
        email: data.data.adminUser.email,
        password: data.data.adminUser.temporaryPassword,
        mustChangePassword: data.data.adminUser.mustChangePassword
      },
      superAdminCredentials: {
        email: data.data.superAdminUser.email,
        password: data.data.superAdminUser.temporaryPassword,
        mustChangePassword: data.data.superAdminUser.mustChangePassword
      }
    };
  }
  throw new Error(data.message || 'Tenant creation failed');
}
```

---

## First Login & Password Change

### Step 1: Admin Login (First Time)

When an admin user logs in for the first time with a temporary password, the response will include `mustChangePassword: true`.

**Endpoint**: `POST /api/auth/login`

**Request Body**:
```json
{
  "emailOrEmployeeId": "admin@lenstrack.etelios.com",
  "password": "S74t^z@jV3uQ"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "email": "admin@lenstrack.etelios.com",
      "mustChangePassword": true,
      "passwordTemporary": true
    }
  },
  "mustChangePassword": true
}
```

**Frontend Handling**:
```javascript
async function handleFirstLogin(email, password) {
  const response = await fetch('https://98.70.245.87/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': 'api.etelios.com',
      'X-Tenant-Id': 'lenstrack'  // Tenant ID from tenant creation
    },
    body: JSON.stringify({
      emailOrEmployeeId: email,
      password: password
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    const token = data.data.accessToken;
    
    // Check if password change is required
    if (data.mustChangePassword || data.data.user?.mustChangePassword) {
      // Redirect to password change page
      return {
        token,
        requiresPasswordChange: true,
        user: data.data.user
      };
    }
    
    // Normal login flow
    return {
      token,
      requiresPasswordChange: false,
      user: data.data.user
    };
  }
  
  throw new Error(data.message || 'Login failed');
}
```

### Step 2: Change Password

**Endpoint**: `POST /api/auth/change-password`

**Required Headers**:
```javascript
{
  'Authorization': 'Bearer <token>',
  'Content-Type': 'application/json',
  'X-Tenant-Id': '<tenant-id>'
}
```

**Request Body**:
```json
{
  "currentPassword": "S74t^z@jV3uQ",
  "newPassword": "Lenstrack@Admin123"
}
```

**Password Requirements**:
- Minimum 8 characters
- Should contain uppercase, lowercase, number, and special character
- Cannot be the same as current password

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": {
    "userId": "...",
    "passwordChangedAt": "2026-01-19T18:35:00.000Z"
  }
}
```

**Important**: After password change:
- The `mustChangePassword` and `passwordTemporary` flags are cleared in the database
- All refresh tokens are invalidated (user must login again)
- The user should be redirected to login page or automatically logged in with new password

**Implementation Example**:
```javascript
async function changePassword(token, tenantId, currentPassword, newPassword) {
  const response = await fetch('https://98.70.245.87/api/auth/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': 'api.etelios.com',
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId
    },
    body: JSON.stringify({
      currentPassword: currentPassword,
      newPassword: newPassword
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Password changed successfully
    // User must login again (refresh tokens are invalidated)
    return true;
  }
  
  throw new Error(data.message || 'Password change failed');
}

// Complete flow
async function handlePasswordChangeFlow(email, tempPassword, newPassword, tenantId) {
  // Step 1: Login with temporary password
  const loginResult = await handleFirstLogin(email, tempPassword);
  
  if (!loginResult.requiresPasswordChange) {
    throw new Error('Password change not required');
  }
  
  // Step 2: Change password
  await changePassword(loginResult.token, tenantId, tempPassword, newPassword);
  
  // Step 3: Login again with new password
  const finalLogin = await handleFirstLogin(email, newPassword);
  
  return finalLogin;
}
```

---

## Employee Creation with New Fields

### Step 1: Create Employee (Basic Info)

**Endpoint**: `POST /api/hr/employees`

**Required Headers**:
```javascript
{
  'Authorization': 'Bearer <admin-token>',
  'Content-Type': 'application/json',
  'X-Tenant-Id': '<tenant-id>'
}
```

**Request Body**:
```json
{
  "employeeId": "LENSTRACK-EMP-001",
  "firstName": "John",
  "lastName": "Doe",
  "fullName": "John Doe",
  "email": "john.doe@lenstrack.etelios.com",
  "phone": "9876543210",
  "password": "Employee@1234",
  "roleName": "employee",
  "dob": "1990-01-01",
  "gender": "Male",
  "department": "Sales",
  "designation": "Sales Executive",
  "currentAddress": {
    "lines": ["123 Employee Street"],
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  }
}
```

**New Fields**:
- `gender` (required): One of `"Male"`, `"Female"`, `"Other"`
- `dob` (optional): Date of birth (ISO format: `YYYY-MM-DD`)
- `currentAddress` (optional): Address object

**Field Requirements**:
- `employeeId` (required): Unique employee identifier (will be converted to uppercase)
- `firstName` (required): Employee's first name
- `lastName` (optional): Employee's last name
- `fullName` (optional): Auto-generated from firstName + lastName if not provided
- `email` (required): Valid email address (must be unique)
- `phone` (optional): Phone number
- `password` (optional): Employee password (min 8 characters)
- `roleName` (optional): One of `SuperAdmin`, `Admin`, `HR`, `Manager`, `Employee` (default: `employee`)
- `department` (optional): Department name
- `designation` (optional): Job designation/title

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Employee created successfully",
  "data": {
    "id": "...",
    "employeeId": "LENSTRACK-EMP-001",
    "fullName": "John Doe",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@lenstrack.etelios.com",
    "phone": "9876543210",
    "gender": "Male",
    "dateOfBirth": "1990-01-01T00:00:00.000Z",
    "role": {
      "id": "...",
      "name": "Employee"
    },
    "department": "Sales",
    "jobTitle": "Sales Executive",
    "status": "active",
    "createdAt": "2026-01-19T18:40:00.000Z"
  }
}
```

**Implementation Example**:
```javascript
async function createEmployee(token, tenantId, employeeData) {
  const response = await fetch('https://98.70.245.87/api/hr/employees', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': 'api.etelios.com',
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId
    },
    body: JSON.stringify({
      employeeId: employeeData.employeeId,
      firstName: employeeData.firstName,
      lastName: employeeData.lastName,
      fullName: employeeData.fullName,
      email: employeeData.email,
      phone: employeeData.phone,
      password: employeeData.password,
      roleName: employeeData.roleName || 'employee',
      dob: employeeData.dob,
      gender: employeeData.gender,  // NEW FIELD
      department: employeeData.department,
      designation: employeeData.designation,
      currentAddress: employeeData.currentAddress
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    return data.data;
  }
  
  throw new Error(data.message || 'Employee creation failed');
}
```

### Step 2: Add Work Details (with Salary Fields)

**Endpoint**: `POST /api/hr/onboarding/work-details`

**Required Headers**:
```javascript
{
  'Authorization': 'Bearer <admin-token>',
  'Content-Type': 'application/json',
  'X-Tenant-Id': '<tenant-id>'
}
```

**Request Body**:
```json
{
  "employeeId": "LENSTRACK-EMP-001",
  "jobTitle": "Sales Manager",
  "department": "Sales",
  "designation": "Sales Manager",
  "role_family": "Sales",
  "joining_date": "2026-01-20",
  "employee_status": "ACTIVE",
  "annual_ctc": 720000,
  "salary_breakdown": {
    "basic": 360000,
    "hra": 144000,
    "special_allowance": 120000,
    "pf_employer": 43200,
    "gratuity": 28800,
    "other_allowances": 24000
  }
}
```

**New Salary Fields**:
- `annual_ctc` (optional): Annual Cost to Company in INR (number, min: 0)
- `salary_breakdown` (optional): Object containing salary components:
  - `basic` (optional): Basic salary (number, min: 0)
  - `hra` (optional): House Rent Allowance (number, min: 0)
  - `special_allowance` (optional): Special allowance (number, min: 0)
  - `pf_employer` (optional): Employer PF contribution (number, min: 0)
  - `gratuity` (optional): Gratuity amount (number, min: 0)
  - `other_allowances` (optional): Other allowances (number, min: 0)

**Field Requirements**:
- `employeeId` (required): Employee ID (must exist)
- `jobTitle` (optional): Job title
- `department` (optional): Department name
- `designation` (optional): Designation
- `role_family` (optional): Role family
- `joining_date` (optional): Date of joining (ISO format: `YYYY-MM-DD`)
- `employee_status` (optional): One of `ACTIVE`, `INACTIVE`, `ON_LEAVE`, `TERMINATED`

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Work details added successfully",
  "data": {
    "employeeId": "LENSTRACK-EMP-001",
    "jobTitle": "Sales Manager",
    "department": "Sales",
    "annual_ctc": 720000,
    "salary_breakdown": {
      "basic": 360000,
      "hra": 144000,
      "special_allowance": 120000,
      "pf_employer": 43200,
      "gratuity": 28800,
      "other_allowances": 24000
    }
  }
}
```

**Implementation Example**:
```javascript
async function addWorkDetails(token, tenantId, employeeId, workDetails) {
  const response = await fetch('https://98.70.245.87/api/hr/onboarding/work-details', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': 'api.etelios.com',
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId
    },
    body: JSON.stringify({
      employeeId: employeeId,
      jobTitle: workDetails.jobTitle,
      department: workDetails.department,
      designation: workDetails.designation,
      role_family: workDetails.role_family,
      joining_date: workDetails.joining_date,
      employee_status: workDetails.employee_status,
      annual_ctc: workDetails.annual_ctc,  // NEW FIELD
      salary_breakdown: workDetails.salary_breakdown  // NEW FIELD
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    return data.data;
  }
  
  throw new Error(data.message || 'Work details update failed');
}
```

### Step 3: Get Employee (Verify New Fields)

**Endpoint**: `GET /api/hr/employees/:employeeId`

**Required Headers**:
```javascript
{
  'Authorization': 'Bearer <admin-token>',
  'X-Tenant-Id': '<tenant-id>'
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "...",
    "employeeId": "LENSTRACK-EMP-001",
    "fullName": "John Doe",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@lenstrack.etelios.com",
    "phone": "9876543210",
    "gender": "Male",
    "dateOfBirth": "1990-01-01T00:00:00.000Z",
    "annual_ctc": 720000,
    "salary_breakdown": {
      "basic": 360000,
      "hra": 144000,
      "special_allowance": 120000,
      "pf_employer": 43200,
      "gratuity": 28800,
      "other_allowances": 24000
    },
    "jobTitle": "Sales Manager",
    "department": "Sales",
    "status": "active",
    "createdAt": "2026-01-19T18:40:00.000Z",
    "updatedAt": "2026-01-19T18:45:00.000Z"
  }
}
```

**Implementation Example**:
```javascript
async function getEmployee(token, tenantId, employeeId) {
  const response = await fetch(`https://98.70.245.87/api/hr/employees/${employeeId}`, {
    method: 'GET',
    headers: {
      'Host': 'api.etelios.com',
      'Authorization': `Bearer ${token}`,
      'X-Tenant-Id': tenantId
    }
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Verify new fields are present
    const employee = data.data;
    console.log('Gender:', employee.gender);
    console.log('Annual CTC:', employee.annual_ctc);
    console.log('Salary Breakdown:', employee.salary_breakdown);
    
    return employee;
  }
  
  throw new Error(data.message || 'Employee fetch failed');
}
```

---

## Complete Onboarding Workflow

### Full Flow Diagram

```
1. Super Admin Login
   ↓
2. Create Tenant
   ↓
3. Admin First Login (with temporary password)
   ↓
4. Change Password (required)
   ↓
5. Admin Login (with new password)
   ↓
6. Create Employee (with gender field)
   ↓
7. Add Work Details (with annual_ctc and salary_breakdown)
   ↓
8. Add Personal Details (optional updates)
   ↓
9. Upload Documents (optional)
   ↓
10. Complete Onboarding
```

### Complete Implementation Example

```javascript
class TenantOnboardingService {
  constructor(baseUrl = 'https://98.70.245.87') {
    this.baseUrl = baseUrl;
    this.superAdminToken = null;
    this.adminToken = null;
    this.tenantId = null;
  }

  // Step 1: Super Admin Login
  async loginSuperAdmin(email, password) {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': 'api.etelios.com'
      },
      body: JSON.stringify({
        emailOrEmployeeId: email,
        password: password
      })
    });
    
    const data = await response.json();
    if (data.success) {
      this.superAdminToken = data.data.accessToken;
      return this.superAdminToken;
    }
    throw new Error(data.message || 'Super admin login failed');
  }

  // Step 2: Create Tenant
  async createTenant(tenantData) {
    const response = await fetch(`${this.baseUrl}/api/tenants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': 'api.etelios.com',
        'Authorization': `Bearer ${this.superAdminToken}`
      },
      body: JSON.stringify({
        name: tenantData.name,
        email: tenantData.email,
        domain: tenantData.domain,
        subdomain: tenantData.subdomain,
        phone: tenantData.phone,
        primaryContact: tenantData.primaryContact,
        address: tenantData.address,
        plan: tenantData.plan || 'Basic',
        modules: tenantData.modules || ['hr']
      })
    });
    
    const data = await response.json();
    if (data.success) {
      this.tenantId = data.data.tenantId;
      return {
        tenant: data.data,
        adminCredentials: {
          email: data.data.adminUser.email,
          password: data.data.adminUser.temporaryPassword
        }
      };
    }
    throw new Error(data.message || 'Tenant creation failed');
  }

  // Step 3 & 4: Admin First Login & Password Change
  async adminFirstLoginAndChangePassword(adminEmail, tempPassword, newPassword) {
    // Login with temporary password
    const loginResponse = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': 'api.etelios.com',
        'X-Tenant-Id': this.tenantId
      },
      body: JSON.stringify({
        emailOrEmployeeId: adminEmail,
        password: tempPassword
      })
    });
    
    const loginData = await loginResponse.json();
    if (!loginData.success) {
      throw new Error(loginData.message || 'Admin login failed');
    }
    
    const tempToken = loginData.data.accessToken;
    
    // Check if password change is required
    if (loginData.mustChangePassword || loginData.data.user?.mustChangePassword) {
      // Change password
      const changeResponse = await fetch(`${this.baseUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Host': 'api.etelios.com',
          'Authorization': `Bearer ${tempToken}`,
          'X-Tenant-Id': this.tenantId
        },
        body: JSON.stringify({
          currentPassword: tempPassword,
          newPassword: newPassword
        })
      });
      
      const changeData = await changeResponse.json();
      if (!changeData.success) {
        throw new Error(changeData.message || 'Password change failed');
      }
      
      // Login again with new password
      const finalLoginResponse = await fetch(`${this.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Host': 'api.etelios.com',
          'X-Tenant-Id': this.tenantId
        },
        body: JSON.stringify({
          emailOrEmployeeId: adminEmail,
          password: newPassword
        })
      });
      
      const finalLoginData = await finalLoginResponse.json();
      if (finalLoginData.success) {
        this.adminToken = finalLoginData.data.accessToken;
        return this.adminToken;
      }
      throw new Error(finalLoginData.message || 'Final login failed');
    }
    
    // Password change not required
    this.adminToken = tempToken;
    return this.adminToken;
  }

  // Step 5: Create Employee
  async createEmployee(employeeData) {
    const response = await fetch(`${this.baseUrl}/api/hr/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': 'api.etelios.com',
        'Authorization': `Bearer ${this.adminToken}`,
        'X-Tenant-Id': this.tenantId
      },
      body: JSON.stringify({
        employeeId: employeeData.employeeId,
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        fullName: employeeData.fullName,
        email: employeeData.email,
        phone: employeeData.phone,
        password: employeeData.password,
        roleName: employeeData.roleName || 'employee',
        dob: employeeData.dob,
        gender: employeeData.gender,  // NEW FIELD
        department: employeeData.department,
        designation: employeeData.designation,
        currentAddress: employeeData.currentAddress
      })
    });
    
    const data = await response.json();
    if (data.success) {
      return data.data;
    }
    throw new Error(data.message || 'Employee creation failed');
  }

  // Step 6: Add Work Details
  async addWorkDetails(employeeId, workDetails) {
    const response = await fetch(`${this.baseUrl}/api/hr/onboarding/work-details`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Host': 'api.etelios.com',
        'Authorization': `Bearer ${this.adminToken}`,
        'X-Tenant-Id': this.tenantId
      },
      body: JSON.stringify({
        employeeId: employeeId,
        jobTitle: workDetails.jobTitle,
        department: workDetails.department,
        designation: workDetails.designation,
        role_family: workDetails.role_family,
        joining_date: workDetails.joining_date,
        employee_status: workDetails.employee_status,
        annual_ctc: workDetails.annual_ctc,  // NEW FIELD
        salary_breakdown: workDetails.salary_breakdown  // NEW FIELD
      })
    });
    
    const data = await response.json();
    if (data.success) {
      return data.data;
    }
    throw new Error(data.message || 'Work details update failed');
  }

  // Step 7: Get Employee (Verify)
  async getEmployee(employeeId) {
    const response = await fetch(`${this.baseUrl}/api/hr/employees/${employeeId}`, {
      method: 'GET',
      headers: {
        'Host': 'api.etelios.com',
        'Authorization': `Bearer ${this.adminToken}`,
        'X-Tenant-Id': this.tenantId
      }
    });
    
    const data = await response.json();
    if (data.success) {
      return data.data;
    }
    throw new Error(data.message || 'Employee fetch failed');
  }
}

// Usage Example
async function completeOnboardingFlow() {
  const service = new TenantOnboardingService();
  
  try {
    // Step 1: Super Admin Login
    await service.loginSuperAdmin('admin@etelios.com', 'Admin@123456');
    
    // Step 2: Create Tenant
    const tenantResult = await service.createTenant({
      name: 'Lenstrack',
      email: 'admin@lenstrack.etelios.com',
      domain: 'lenstrack',
      subdomain: 'lenstrack',
      phone: '+919876543210',
      primaryContact: 'Lenstrack Admin',
      address: {
        street: 'Lenstrack Office',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country: 'India'
      },
      plan: 'enterprise',
      modules: ['hr', 'analytics', 'reports']
    });
    
    // Step 3 & 4: Admin First Login & Password Change
    await service.adminFirstLoginAndChangePassword(
      tenantResult.adminCredentials.email,
      tenantResult.adminCredentials.password,
      'Lenstrack@Admin123'
    );
    
    // Step 5: Create Employee
    const employee = await service.createEmployee({
      employeeId: 'LENSTRACK-EMP-001',
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
      email: 'john.doe@lenstrack.etelios.com',
      phone: '9876543210',
      password: 'Employee@1234',
      roleName: 'employee',
      dob: '1990-01-01',
      gender: 'Male',  // NEW FIELD
      department: 'Sales',
      designation: 'Sales Executive',
      currentAddress: {
        lines: ['123 Employee Street'],
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country: 'India'
      }
    });
    
    // Step 6: Add Work Details
    await service.addWorkDetails(employee.employeeId, {
      jobTitle: 'Sales Manager',
      department: 'Sales',
      designation: 'Sales Manager',
      role_family: 'Sales',
      joining_date: '2026-01-20',
      employee_status: 'ACTIVE',
      annual_ctc: 720000,  // NEW FIELD
      salary_breakdown: {  // NEW FIELD
        basic: 360000,
        hra: 144000,
        special_allowance: 120000,
        pf_employer: 43200,
        gratuity: 28800,
        other_allowances: 24000
      }
    });
    
    // Step 7: Verify Employee
    const verifiedEmployee = await service.getEmployee(employee.employeeId);
    console.log('Employee created successfully:', verifiedEmployee);
    console.log('Gender:', verifiedEmployee.gender);
    console.log('Annual CTC:', verifiedEmployee.annual_ctc);
    console.log('Salary Breakdown:', verifiedEmployee.salary_breakdown);
    
    return verifiedEmployee;
  } catch (error) {
    console.error('Onboarding flow failed:', error);
    throw error;
  }
}
```

---

## API Endpoints Reference

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/change-password` | Change password | Yes |
| GET | `/api/auth/profile` | Get user profile | Yes |

### Tenant Management Endpoints

| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| POST | `/api/tenants` | Create tenant | Yes | superadmin |
| GET | `/api/tenants` | List tenants | Yes | superadmin |
| GET | `/api/tenants/:tenantId` | Get tenant details | Yes | superadmin |
| GET | `/api/tenants/stats` | Get tenant statistics | Yes | superadmin |

### Employee Management Endpoints

| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| POST | `/api/hr/employees` | Create employee | Yes | HR, Admin |
| GET | `/api/hr/employees` | List employees | Yes | HR, Admin, Manager |
| GET | `/api/hr/employees/:id` | Get employee details | Yes | HR, Admin, Manager |
| PUT | `/api/hr/employees/:id` | Update employee | Yes | HR, Admin |
| DELETE | `/api/hr/employees/:id` | Delete employee | Yes | HR, Admin |

### Onboarding Endpoints

| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| POST | `/api/hr/onboarding/work-details` | Add work details | Yes | HR, Admin |
| POST | `/api/hr/onboarding/personal-details` | Update personal details | Yes | HR, Admin |
| POST | `/api/hr/onboarding/upload` | Upload document | Yes | HR, Admin |
| POST | `/api/hr/employees/:employeeId/complete-onboarding` | Complete onboarding | Yes | HR, Admin |

### Other Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/hr/departments` | List departments | Yes |
| GET | `/api/hr/stores` | List stores | Yes |

---

## Test Scripts

### Test Script 1: Create Tenant

**File**: `create-lenstrack-tenant.js`

This script creates a new tenant (Lenstrack) in production.

**Usage**:
```bash
node create-lenstrack-tenant.js
```

**What it does**:
1. Logs in as Super Admin
2. Checks if Lenstrack tenant already exists
3. Creates Lenstrack tenant if it doesn't exist
4. Displays tenant details and admin credentials

**Output**:
- Tenant ID
- Admin user credentials (email, temporary password)
- Super Admin user credentials (email, temporary password)

### Test Script 2: Complete Flow Test

**File**: `test-complete-lenstrack-flow.js`

This script tests the complete flow from admin login to employee creation with new fields.

**Usage**:
```bash
node test-complete-lenstrack-flow.js
```

**Environment Variables**:
```bash
export LENSTRACK_ADMIN_PASSWORD="Lenstrack@Admin123"
node test-complete-lenstrack-flow.js
```

**What it tests**:
1. Admin login (Lenstrack tenant)
2. Password change (if required)
3. Employee creation with `gender` field
4. Work details with `annual_ctc` and `salary_breakdown`
5. GET employee to verify new fields
6. Other APIs (departments, stores, employees list, tenant info)

**Expected Output**:
```
✓ Admin login successful
✓ Password changed successfully
✓ Employee created: LENSTRACK-EMP-001
✓ Work details added successfully
✓ Employee fetched successfully
  ✓ gender: Present
  ✓ annual_ctc: Present
  ✓ salary_breakdown: Present
✓ All tests passed!
```

---

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error",
  "error": "VALIDATION_ERROR",
  "errors": ["\"name\" is required"]
}
```

**Handling**:
- Check validation errors array
- Display specific field errors to user
- Validate input before submission

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Authentication required",
  "error": "UNAUTHORIZED"
}
```

**Handling**:
- Check if token is present and valid
- Redirect to login page
- Refresh token if expired

#### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions",
  "error": "FORBIDDEN"
}
```

**Handling**:
- Check user role and permissions
- Display appropriate error message
- Hide/disable unauthorized actions

#### 404 Not Found
```json
{
  "success": false,
  "message": "Employee not found",
  "error": "EMPLOYEE_NOT_FOUND"
}
```

**Handling**:
- Verify resource exists
- Check if ID is correct
- Display "Not found" message

#### 409 Conflict
```json
{
  "success": false,
  "message": "Tenant already exists",
  "error": "TENANT_EXISTS"
}
```

**Handling**:
- Check if resource already exists
- Suggest alternative values
- Display conflict message

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "INTERNAL_ERROR"
}
```

**Handling**:
- Log error for debugging
- Display generic error message
- Retry if appropriate

### Error Handling Implementation

```javascript
async function handleApiRequest(url, options) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      // Handle specific error codes
      switch (response.status) {
        case 400:
          throw new ValidationError(data.message, data.errors);
        case 401:
          // Token expired or invalid
          await refreshToken();
          throw new UnauthorizedError(data.message);
        case 403:
          throw new ForbiddenError(data.message);
        case 404:
          throw new NotFoundError(data.message);
        case 409:
          throw new ConflictError(data.message);
        case 500:
          throw new ServerError(data.message);
        default:
          throw new ApiError(data.message, response.status);
      }
    }
    
    return data;
  } catch (error) {
    if (error instanceof ValidationError) {
      // Display validation errors
      console.error('Validation errors:', error.errors);
    } else if (error instanceof UnauthorizedError) {
      // Redirect to login
      window.location.href = '/login';
    } else {
      // Generic error handling
      console.error('API error:', error.message);
    }
    throw error;
  }
}

// Custom error classes
class ValidationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
  }
}

class ServerError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ServerError';
  }
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
```

---

## Best Practices

### 1. Token Management

- **Store tokens securely**: Use httpOnly cookies or secure localStorage
- **Refresh tokens**: Implement automatic token refresh before expiration
- **Handle token expiration**: Redirect to login when token is invalid

```javascript
// Token storage
const tokenStorage = {
  set: (token) => {
    localStorage.setItem('auth_token', token);
  },
  get: () => {
    return localStorage.getItem('auth_token');
  },
  remove: () => {
    localStorage.removeItem('auth_token');
  }
};

// Token refresh
async function refreshTokenIfNeeded() {
  const token = tokenStorage.get();
  if (!token) return null;
  
  try {
    const decoded = jwt.decode(token);
    const expirationTime = decoded.exp * 1000;
    const currentTime = Date.now();
    const timeUntilExpiry = expirationTime - currentTime;
    
    // Refresh if token expires in less than 5 minutes
    if (timeUntilExpiry < 5 * 60 * 1000) {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        tokenStorage.set(data.data.accessToken);
        return data.data.accessToken;
      }
    }
    
    return token;
  } catch (error) {
    tokenStorage.remove();
    return null;
  }
}
```

### 2. Request Interceptors

Use axios or fetch interceptors to automatically add headers:

```javascript
// Axios interceptor example
axios.interceptors.request.use(
  async (config) => {
    const token = await refreshTokenIfNeeded();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['X-Tenant-Id'] = getTenantId();
    config.headers['Host'] = 'api.etelios.com';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, redirect to login
      tokenStorage.remove();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### 3. Loading States

Always show loading indicators during API calls:

```javascript
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

async function createEmployee(employeeData) {
  setLoading(true);
  setError(null);
  
  try {
    const result = await employeeService.create(employeeData);
    return result;
  } catch (err) {
    setError(err.message);
    throw err;
  } finally {
    setLoading(false);
  }
}
```

### 4. Form Validation

Validate forms on both client and server side:

```javascript
// Client-side validation
const validateEmployeeForm = (data) => {
  const errors = {};
  
  if (!data.employeeId || data.employeeId.trim() === '') {
    errors.employeeId = 'Employee ID is required';
  }
  
  if (!data.firstName || data.firstName.trim() === '') {
    errors.firstName = 'First name is required';
  }
  
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Valid email is required';
  }
  
  if (data.gender && !['Male', 'Female', 'Other'].includes(data.gender)) {
    errors.gender = 'Gender must be Male, Female, or Other';
  }
  
  if (data.annual_ctc && (isNaN(data.annual_ctc) || data.annual_ctc < 0)) {
    errors.annual_ctc = 'Annual CTC must be a positive number';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
```

### 5. Error Messages

Display user-friendly error messages:

```javascript
const getErrorMessage = (error) => {
  if (error instanceof ValidationError) {
    return error.errors.join(', ');
  }
  
  const errorMessages = {
    'UNAUTHORIZED': 'Please login to continue',
    'FORBIDDEN': 'You do not have permission to perform this action',
    'NOT_FOUND': 'The requested resource was not found',
    'TENANT_EXISTS': 'A tenant with this name or domain already exists',
    'EMPLOYEE_EXISTS': 'An employee with this ID or email already exists'
  };
  
  return errorMessages[error.error] || error.message || 'An error occurred';
};
```

### 6. Retry Logic

Implement retry logic for failed requests:

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return await response.json();
      }
      
      // Don't retry on client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${response.status}`);
      }
      
      // Retry on server errors (5xx)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      
      throw new Error(`Server error: ${response.status}`);
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

---

## Summary

This guide covers:

1. **Tenant Creation**: Complete flow from Super Admin login to tenant creation with admin users
2. **First Login & Password Change**: Handling temporary passwords and mandatory password changes
3. **Employee Creation**: Creating employees with new fields (`gender`, `annual_ctc`, `salary_breakdown`)
4. **Complete Workflow**: End-to-end implementation example
5. **API Reference**: All relevant endpoints with request/response examples
6. **Test Scripts**: Ready-to-use test scripts for validation
7. **Error Handling**: Comprehensive error handling strategies
8. **Best Practices**: Production-ready implementation patterns

### Key Takeaways

- Always include `X-Tenant-Id` header for tenant-specific requests
- Handle `mustChangePassword` flag for first-time logins
- Validate new fields (`gender`, `annual_ctc`, `salary_breakdown`) on frontend
- Implement proper error handling and user feedback
- Use loading states for better UX
- Store tokens securely and implement refresh logic

### Support

For questions or issues, refer to:
- API documentation: `/api/docs` (if available)
- Backend team for API-related queries
- Test scripts for reference implementations

---

**Last Updated**: January 19, 2026
**Version**: 1.0.0
