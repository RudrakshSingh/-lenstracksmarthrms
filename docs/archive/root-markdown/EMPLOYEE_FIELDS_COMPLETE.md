# Complete Employee Fields - Admin & HR Dashboard

## ✅ All Fields Fixed and Available

All employee fields are now available in both **camelCase** and **snake_case** formats for frontend compatibility.

---

## 📋 Complete Field List

### 1. Basic Information

| Field | camelCase | snake_case | Description |
|-------|----------|-------------|-----------|
| Full Name | `fullName` | `full_name` | Employee full name |
| Employee ID | `employeeId` | `employee_id` | Employee ID/Code |
| Code | `code` | `code` | Employee code |
| Email | `email` | `email` | Email address |
| Phone | `phone` | `phone` | Phone number |
| DOB | `dob`, `dateOfBirth` | `date_of_birth` | Date of birth |
| Gender | `gender` | `gender` | Gender (Male/Female/Other) |

**Example:**
```json
{
  "fullName": "John Doe",
  "full_name": "John Doe",
  "employeeId": "EMP001",
  "employee_id": "EMP001",
  "code": "EMP001",
  "email": "john.doe@example.com",
  "phone": "+91-9876543210",
  "dob": "1990-01-15T00:00:00.000Z",
  "dateOfBirth": "1990-01-15T00:00:00.000Z",
  "date_of_birth": "1990-01-15T00:00:00.000Z",
  "gender": "Male"
}
```

---

### 2. Work Details

| Field | camelCase | snake_case | Description |
|-------|----------|-------------|-----------|
| Department | `department` | `department` | Department name |
| Designation | `designation` | `designation` | Job designation |
| Job Title | `jobTitle` | `job_title` | Job title |
| Role Family | `roleFamily` | `role_family` | Role family |
| Grade Band | `gradeBand` | `grade_band` | Grade band |
| Status | `status` | `employee_status` | Employee status |
| DOJ | `doj`, `joinDate` | `join_date` | Date of joining |
| Confirmation Date | `confirmationDate` | `confirmation_date` | Confirmation date |
| Annual CTC | `annualCtc` | `annual_ctc` | Annual Cost to Company |
| Salary Breakdown | `salaryBreakdown` | `salary_breakdown` | Salary components |

**Example:**
```json
{
  "department": "Sales",
  "designation": "Sales Executive",
  "jobTitle": "Sales Executive",
  "job_title": "Sales Executive",
  "roleFamily": "Sales",
  "role_family": "Sales",
  "gradeBand": "A",
  "grade_band": "A",
  "status": "active",
  "employee_status": "active",
  "doj": "2024-01-15T00:00:00.000Z",
  "joinDate": "2024-01-15T00:00:00.000Z",
  "join_date": "2024-01-15T00:00:00.000Z",
  "confirmationDate": "2024-07-15T00:00:00.000Z",
  "confirmation_date": "2024-07-15T00:00:00.000Z",
  "annualCtc": 600000,
  "annual_ctc": 600000,
  "salaryBreakdown": {
    "basic": 30000,
    "hra": 15000,
    "special_allowance": 15000,
    "pf_employer": 1800,
    "gratuity": 1202.5,
    "other_allowances": 0
  },
  "salary_breakdown": {
    "basic": 30000,
    "hra": 15000,
    "special_allowance": 15000,
    "pf_employer": 1800,
    "gratuity": 1202.5,
    "other_allowances": 0
  }
}
```

---

### 3. Work Location

| Field | camelCase | snake_case | Description |
|-------|----------|-------------|-----------|
| Store ID | `workLocation.storeId` | `work_location.store_id` | Store ID |
| Store Name | `workLocation.storeName` | `work_location.store_name` | Store name |
| City | `workLocation.city` | `work_location.city` | City |
| State | `workLocation.state` | `work_location.state` | State |
| Pincode | `workLocation.pincode` | `work_location.pincode` | Pincode |

**Example:**
```json
{
  "workLocation": {
    "storeId": "STORE001",
    "store_id": "STORE001",
    "storeName": "Mumbai Store",
    "store_name": "Mumbai Store",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  },
  "work_location": {
    "storeId": "STORE001",
    "store_id": "STORE001",
    "storeName": "Mumbai Store",
    "store_name": "Mumbai Store",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  }
}
```

---

### 4. Reporting Manager

| Field | camelCase | snake_case | Description |
|-------|----------|-------------|-----------|
| Manager ID | `reportingManager` | `reporting_manager` | Reporting manager ID |
| Manager Name | `reportingManagerName` | `reporting_manager_name` | Reporting manager name |

**Example:**
```json
{
  "reportingManager": "MGR001",
  "reporting_manager": "MGR001",
  "reportingManagerName": "Jane Smith",
  "reporting_manager_name": "Jane Smith"
}
```

---

### 5. Address

| Field | camelCase | snake_case | Description |
|-------|----------|-------------|-----------|
| Address Lines | `currentAddress.lines` | `current_address.lines` | Address lines array |
| Line 1 | `currentAddress.line1` | `current_address.address_line_1` | Address line 1 |
| Line 2 | `currentAddress.line2` | `current_address.address_line_2` | Address line 2 |
| City | `currentAddress.city` | `current_address.city` | City |
| State | `currentAddress.state` | `current_address.state` | State |
| Pincode | `currentAddress.pincode` | `current_address.pincode` | Pincode |
| Country | `currentAddress.country` | `current_address.country` | Country |

**Example:**
```json
{
  "currentAddress": {
    "lines": ["123 Main Street", "Near Park"],
    "line1": "123 Main Street",
    "line2": "Near Park",
    "address_line_1": "123 Main Street",
    "address_line_2": "Near Park",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  },
  "current_address": {
    "lines": ["123 Main Street", "Near Park"],
    "line1": "123 Main Street",
    "line2": "Near Park",
    "address_line_1": "123 Main Street",
    "address_line_2": "Near Park",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  }
}
```

---

### 6. Emergency Contact

| Field | camelCase | snake_case | Description |
|-------|----------|-------------|-----------|
| Name | `emergencyContact.name` | `emergency_contact.name` | Emergency contact name |
| Relationship | `emergencyContact.relationship` | `emergency_contact.relationship` | Relationship |
| Phone | `emergencyContact.phone` | `emergency_contact.contact_number` | Contact phone |

**Example:**
```json
{
  "emergencyContact": {
    "name": "Jane Doe",
    "relationship": "Spouse",
    "phone": "+91-9876543211",
    "contact_number": "+91-9876543211"
  },
  "emergency_contact": {
    "name": "Jane Doe",
    "relationship": "Spouse",
    "phone": "+91-9876543211",
    "contact_number": "+91-9876543211"
  }
}
```

---

### 7. Statutory Information

| Field | camelCase | snake_case | Description |
|-------|----------|-------------|-----------|
| UAN | `uan` | `uan` | UAN number |
| ESI No | `esiNo` | `esi_no`, `esiNumber`, `esi_number` | ESI number |
| PAN | `panNumber` | `pan_number`, `pan` | PAN number |
| Aadhar | `aadharMasked` | `aadhar_masked`, `aadhar` | Aadhar (masked) |

**Example:**
```json
{
  "uan": "123456789012",
  "esiNo": "123456789012345",
  "esi_no": "123456789012345",
  "esiNumber": "123456789012345",
  "esi_number": "123456789012345",
  "panNumber": "ABCDE1234F",
  "pan_number": "ABCDE1234F",
  "pan": "ABCDE1234F",
  "aadharMasked": "1234-5678-9012",
  "aadhar_masked": "1234-5678-9012",
  "aadhar": "1234-5678-9012"
}
```

---

### 8. Bank Details

| Field | camelCase | snake_case | Description |
|-------|----------|-------------|-----------|
| Account Number | `bankAccount.accountNumber` | `bank_account.account_number`, `bank_account.account_no` | Account number |
| IFSC | `bankAccount.ifscCode` | `bank_account.ifsc_code`, `bank_account.ifsc` | IFSC code |
| Bank Name | `bankAccount.bankName` | `bank_account.bank_name` | Bank name |
| Branch | `bankAccount.branchName` | `bank_account.branch_name`, `bank_account.branch` | Branch name |
| Account Type | `bankAccount.accountType` | `bank_account.account_type` | Account type |

**Example:**
```json
{
  "bankAccount": {
    "accountNumber": "1234567890",
    "account_number": "1234567890",
    "account_no": "1234567890",
    "ifscCode": "SBIN0001234",
    "ifsc_code": "SBIN0001234",
    "ifsc": "SBIN0001234",
    "bankName": "State Bank of India",
    "bank_name": "State Bank of India",
    "branchName": "Mumbai Main Branch",
    "branch_name": "Mumbai Main Branch",
    "branch": "Mumbai Main Branch",
    "accountType": "Savings",
    "account_type": "Savings"
  },
  "bank_account": {
    "accountNumber": "1234567890",
    "account_number": "1234567890",
    "account_no": "1234567890",
    "ifscCode": "SBIN0001234",
    "ifsc_code": "SBIN0001234",
    "ifsc": "SBIN0001234",
    "bankName": "State Bank of India",
    "bank_name": "State Bank of India",
    "branchName": "Mumbai Main Branch",
    "branch_name": "Mumbai Main Branch",
    "branch": "Mumbai Main Branch",
    "accountType": "Savings",
    "account_type": "Savings"
  }
}
```

---

### 9. Previous Employment

| Field | camelCase | snake_case | Description |
|-------|----------|-------------|-----------|
| Has Previous | `previousEmployment.hasPreviousEmployment` | `previous_employment.has_previous_employment` | Has previous employment |
| Employer Name | `previousEmployment.employerName` | `previous_employment.employer_name` | Previous employer name |
| From Date | `previousEmployment.fromDate` | `previous_employment.from_date` | From date |
| To Date | `previousEmployment.toDate` | `previous_employment.to_date` | To date |
| Form 16 | `previousEmployment.form16Available` | `previous_employment.form_16_available` | Form 16 available |

**Example:**
```json
{
  "previousEmployment": {
    "hasPreviousEmployment": true,
    "has_previous_employment": true,
    "employerName": "Previous Company",
    "employer_name": "Previous Company",
    "fromDate": "2020-01-01T00:00:00.000Z",
    "from_date": "2020-01-01T00:00:00.000Z",
    "toDate": "2023-12-31T00:00:00.000Z",
    "to_date": "2023-12-31T00:00:00.000Z",
    "form16Available": true,
    "form_16_available": true
  },
  "previous_employment": {
    "hasPreviousEmployment": true,
    "has_previous_employment": true,
    "employerName": "Previous Company",
    "employer_name": "Previous Company",
    "fromDate": "2020-01-01T00:00:00.000Z",
    "from_date": "2020-01-01T00:00:00.000Z",
    "toDate": "2023-12-31T00:00:00.000Z",
    "to_date": "2023-12-31T00:00:00.000Z",
    "form16Available": true,
    "form_16_available": true
  }
}
```

---

### 10. Documents

| Field | Description |
|-------|-------------|
| `documents` | Array of uploaded documents |

**Example:**
```json
{
  "documents": [
    {
      "type": "AADHAR",
      "url": "https://...",
      "uploaded_at": "2024-01-15T00:00:00.000Z"
    },
    {
      "type": "PAN",
      "url": "https://...",
      "uploaded_at": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

---

## 🌐 API Endpoints

### Get Employees (All Fields)
```
GET /api/hr/employees
Headers:
  Authorization: Bearer <token>
  x-tenant-id: <tenant_id>
```

### Get Single Employee (All Fields)
```
GET /api/hr/employees/:id
Headers:
  Authorization: Bearer <token>
  x-tenant-id: <tenant_id>
```

### Dashboard Endpoints
```
GET /api/hr/dashboard/departments
GET /api/hr/dashboard
GET /api/hrms/dashboard
Headers:
  Authorization: Bearer <token>
  x-tenant-id: <tenant_id>
```

---

## ✅ Status

- ✅ All fields mapped (camelCase + snake_case)
- ✅ Basic Information - Complete
- ✅ Work Details - Complete
- ✅ Work Location - Complete
- ✅ Reporting Manager - Complete
- ✅ Address - Complete
- ✅ Emergency Contact - Complete
- ✅ Statutory Information - Complete
- ✅ Bank Details - Complete
- ✅ Previous Employment - Complete
- ✅ Documents - Complete

**All fields are now available in both formats on Admin and HR Dashboard!** 🎉

---

## 📝 Notes

1. **Both Formats:** All fields are returned in both camelCase and snake_case
2. **Backward Compatible:** Old field names still work
3. **Dashboard Ready:** All fields visible in admin and HR dashboard
4. **Frontend Friendly:** Frontend can use either format

---

**Complete field mapping implemented!** ✅
