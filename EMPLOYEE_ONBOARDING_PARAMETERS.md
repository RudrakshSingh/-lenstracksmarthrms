# Employee Creation & Onboarding - Complete Parameters List

This document lists all parameters used in the employee creation and onboarding process.

---

## 📝 STEP 1: Create Employee

**Endpoint**: `POST /api/hr/employees`

### Parameters:

```json
{
  "employeeId": "EMP-2026-1767275468852",
  "firstName": "Yuvraj",
  "lastName": "Singh",
  "fullName": "Yuvraj Singh",
  "email": "yuvraj.1767275468852@example.com",
  "password": "Yuvraj@123",
  "roleName": "employee",
  "phone": "+91-9876543210",
  "department": "IT",
  "jobTitle": "Software Developer",
  "designation": "Software Engineer",
  "role_family": "Tech",
  "grade_band": "A",
  "joining_date": "2026-01-01T13:51:08.852Z",
  "dateOfBirth": "1995-05-15",
  "address": {
    "street": "123 Tech Park",
    "city": "Mumbai",
    "state": "Maharashtra",
    "zip": "400001",
    "country": "India"
  }
}
```

### Field Descriptions:

| Field | Type | Required | Description | Notes |
|-------|------|----------|-------------|-------|
| `employeeId` | String | Yes | Unique employee identifier | Format: `EMP-{YEAR}-{TIMESTAMP}` |
| `firstName` | String | Yes | Employee's first name | |
| `lastName` | String | Optional | Employee's last name | Can be empty string |
| `fullName` | String | Optional | Full name | Auto-generated if not provided |
| `email` | String | Yes | Email address | Must be unique |
| `password` | String | Yes | Login password | Min 8 characters |
| `roleName` | String | Yes | User role | Values: `employee`, `hr`, `admin`, `manager` |
| `phone` | String | Optional | Phone number | Format: `+91-XXXXXXXXXX` |
| `department` | String | Yes | Department name | |
| `jobTitle` | String | Optional | Job title | Maps to `jobTitle` in backend |
| `designation` | String | Optional | Designation | Transformed to `jobTitle` |
| `role_family` | String | Optional | Role family | Values: `Tech`, `Sales`, `HR`, etc. |
| `grade_band` | String | Optional | Grade band | Values: `A`, `B`, `C`, etc. |
| `joining_date` | String/Date | Optional | Date of joining | ISO format |
| `dateOfBirth` | String/Date | Optional | Date of birth | Format: `YYYY-MM-DD` |
| `address` | Object | Optional | Address object | |
| `address.street` | String | Optional | Street address | |
| `address.city` | String | Optional | City | |
| `address.state` | String | Optional | State | |
| `address.zip` | String | Optional | Zip/Pincode | |
| `address.country` | String | Optional | Country | Default: `India` |

---

## 📋 STEP 2: Personal Details (Onboarding Step 1)

**Endpoint**: `POST /api/hr/onboarding/personal-details`

### Parameters:

```json
{
  "employee_id": "EMP-2026-1767275468852",
  "name": "Yuvraj Singh",
  "email": "yuvraj.1767275468852@example.com",
  "phone": "+91-9876543210",
  "date_of_birth": "1995-05-15",
  "address": {
    "address_line_1": "123 Tech Park",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  }
}
```

### Field Descriptions:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `employee_id` | String | Yes | Employee ID (must exist) |
| `name` | String | Yes | Full name |
| `email` | String | Yes | Email address |
| `phone` | String | Yes | Phone number |
| `date_of_birth` | String | Optional | Date of birth (YYYY-MM-DD) |
| `address` | Object | Yes | Address object |
| `address.address_line_1` | String | Optional | Address line 1 |
| `address.city` | String | Yes | City |
| `address.state` | String | Yes | State |
| `address.pincode` | String | Yes | 6-digit pincode |
| `address.country` | String | Optional | Country (default: India) |

---

## 💼 STEP 3: Work Details (Onboarding Step 2)

**Endpoint**: `POST /api/hr/onboarding/work-details`

### Parameters:

```json
{
  "employeeId": "EMP-2026-1767275468852",
  "jobTitle": "Software Developer",
  "department": "IT",
  "designation": "Software Engineer",
  "role_family": "Tech",
  "joining_date": "2026-01-01T13:51:08.852Z",
  "reporting_manager_id": null,
  "employee_status": "ACTIVE",
  "compensation": {
    "salary": 50000,
    "currency": "INR",
    "payFrequency": "Monthly"
  }
}
```

### Field Descriptions:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `employeeId` | String | Yes | Employee ID |
| `jobTitle` | String | Yes | Job title |
| `department` | String | Yes | Department name |
| `designation` | String | Yes | Designation |
| `role_family` | String | Yes | Role family |
| `joining_date` | String/Date | Yes | Date of joining (ISO format) |
| `reporting_manager_id` | String | Optional | Manager's employee ID |
| `employee_status` | String | Optional | Status (ACTIVE, PENDING, INACTIVE) |
| `compensation` | Object | Optional | Compensation details |
| `compensation.salary` | Number | Optional | Base salary |
| `compensation.currency` | String | Optional | Currency code (INR, USD, etc.) |
| `compensation.payFrequency` | String | Optional | Payment frequency (Monthly, Weekly, etc.) |

---

## 📄 STEP 4: Statutory Information (Onboarding Step 3)

**Endpoint**: `POST /api/hr/onboarding/statutory-info`

### Parameters:

```json
{
  "employeeId": "EMP-2026-1767275468852",
  "uan": "123456789012",
  "esiNo": "123456789012345",
  "panNumber": "ABCDE1234Y",
  "bankAccount": {
    "account_number": "1234567890123456",
    "ifsc_code": "HDFC0001234",
    "bank_name": "HDFC Bank",
    "branch_name": "Mumbai Branch",
    "account_type": "Savings"
  }
}
```

### Field Descriptions:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `employeeId` | String | Yes | Employee ID | |
| `uan` | String | Optional | UAN number | 12 digits |
| `esiNo` | String | Optional | ESI number | 15 digits |
| `panNumber` | String | Optional | PAN number | 10 characters (5 letters + 4 digits + 1 letter) |
| `bankAccount` | Object | Optional | Bank account details | |
| `bankAccount.account_number` | String | Optional | Bank account number | |
| `bankAccount.ifsc_code` | String | Optional | IFSC code | 11 characters (4 letters + 0 + 6 alphanumeric) |
| `bankAccount.bank_name` | String | Optional | Bank name | |
| `bankAccount.branch_name` | String | Optional | Branch name | |
| `bankAccount.account_type` | String | Optional | Account type | Values: `Savings`, `Current`, `Salary` |

---

## ✅ STEP 5: Complete Onboarding

**Endpoint**: `POST /api/hr/onboarding/complete/:employeeId`

### Parameters:

```json
{
  "system_access": {
    "create_system_account": true,
    "role_name": "employee"
  }
}
```

### Field Descriptions:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `system_access` | Object | Optional | System access configuration |
| `system_access.create_system_account` | Boolean | Optional | Whether to create system account |
| `system_access.role_name` | String | Optional | Role name for system account |

---

## 👤 STEP 6: Assign Role

**Endpoint**: `POST /api/hr/employees/:employeeId/assign-role`

### Parameters:

```json
{
  "roleName": "employee"
}
```

### Field Descriptions:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `roleName` | String | Yes | Role name | Values: `employee`, `hr`, `admin`, `manager`, `superadmin` |

---

## 🔄 STEP 7: Update Employee Status

**Endpoint**: `PATCH /api/hr/employees/:employeeId/status`

### Parameters:

```json
{
  "status": "ACTIVE"
}
```

### Field Descriptions:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | String | Yes | Employee status | Values: `ACTIVE`, `INACTIVE`, `ON_LEAVE`, `TERMINATED`, `PENDING` |

---

## ⏰ STEP 8: Mark Attendance

### Clock In
**Endpoint**: `POST /api/attendance/clock-in`

### Parameters:

```json
{
  "employeeId": "EMP-2026-1767275468852",
  "location": {
    "latitude": 19.0760,
    "longitude": 72.8777,
    "address": "Mumbai, Maharashtra, India"
  },
  "notes": "First day attendance - Yuvraj"
}
```

### Clock Out
**Endpoint**: `POST /api/attendance/clock-out`

### Parameters:

```json
{
  "employeeId": "EMP-2026-1767275468852",
  "location": {
    "latitude": 19.0760,
    "longitude": 72.8777,
    "address": "Mumbai, Maharashtra, India"
  },
  "notes": "End of day - Yuvraj"
}
```

### Field Descriptions:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `employeeId` | String | Yes | Employee ID |
| `location` | Object | Optional | Location details |
| `location.latitude` | Number | Optional | Latitude coordinate |
| `location.longitude` | Number | Optional | Longitude coordinate |
| `location.address` | String | Optional | Address string |
| `notes` | String | Optional | Additional notes |

---

## 📊 Complete Parameter Summary

### Required Fields (Employee Creation)
1. `employeeId` - Unique identifier
2. `firstName` - First name
3. `email` - Email address (unique)
4. `password` - Login password (min 8 chars)
5. `roleName` - User role
6. `department` - Department name

### Optional Fields (Employee Creation)
- `lastName` - Last name (can be empty)
- `fullName` - Full name (auto-generated)
- `phone` - Phone number
- `jobTitle` / `designation` - Job title
- `role_family` - Role family
- `grade_band` - Grade band
- `joining_date` - Joining date
- `dateOfBirth` - Date of birth
- `address` - Address object

### Field Transformations (Backend)
- `designation` → `jobTitle` (automatic)
- `joining_date` → `doj` (automatic)
- `esi_number` → `esiNo` (in update endpoints)
- `pan_number` → `panNumber` (in update endpoints)
- `bank_account` → `bankAccount` (in update endpoints)

---

## 🎯 Quick Reference

### Minimal Employee Creation:
```json
{
  "employeeId": "EMP-2026-123456",
  "firstName": "John",
  "email": "john@example.com",
  "password": "Password123!",
  "roleName": "employee",
  "department": "IT"
}
```

### Complete Employee Creation:
```json
{
  "employeeId": "EMP-2026-123456",
  "firstName": "John",
  "lastName": "Doe",
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "Password123!",
  "roleName": "employee",
  "phone": "+91-9876543210",
  "department": "IT",
  "jobTitle": "Software Developer",
  "designation": "Software Engineer",
  "role_family": "Tech",
  "grade_band": "A",
  "joining_date": "2026-01-01T00:00:00.000Z",
  "dateOfBirth": "1990-01-15",
  "address": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "zip": "400001",
    "country": "India"
  }
}
```

---

**Last Updated**: 2026-01-01  
**Script**: `scripts/test-yuvraj-complete-workflow.js`

