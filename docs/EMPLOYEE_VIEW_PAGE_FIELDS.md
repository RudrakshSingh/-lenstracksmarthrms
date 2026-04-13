# Employee View Page - Complete Field Reference

**Date:** March 8, 2026  
**Purpose:** Complete reference for all fields displayed on Employee View page in Admin/HR Management

---

## 📋 API Endpoint

```
GET /api/hr/employees/:id
```

**Supports:**
- ObjectId: `/api/hr/employees/507f1f77bcf86cd799439011`
- Employee ID: `/api/hr/employees/EMP-2026-223156`

---

## 📑 Tab Structure

The Employee View page has the following tabs:
1. **Overview** - Personal, Employment, Salary, Address, Emergency Contact, Work Location
2. **Work Details** - Additional work-related information
3. **Statutory** - UAN, ESI, PAN, Aadhar
4. **Bank Details** - Bank account information
5. **Documents** - Uploaded documents
6. **Benefits** - Employee benefits

---

## 📊 Overview Tab Fields

### Personal Details Section

| Field Name | API Field(s) | Type | Notes |
|------------|--------------|------|-------|
| Full Name | `fullName` / `name` | String | Required |
| First Name | `firstName` / `first_name` | String | Required |
| Last Name | `lastName` / `last_name` | String | Optional |
| Date of Birth | `dateOfBirth` / `dob` / `date_of_birth` | Date (ISO) | Format: DD/MM/YYYY |
| Gender | `gender` | String | 'Male', 'Female', 'Other', or null (show "N/A") |
| Employee ID | `employeeId` / `employee_id` | String | Required |
| Code | `code` | String | Usually same as employeeId |

### Employment Details Section

| Field Name | API Field(s) | Type | Notes |
|------------|--------------|------|-------|
| Join Date | `joinDate` / `doj` / `join_date` | Date (ISO) | Format: DD/MM/YYYY |
| Confirmation Date | `confirmationDate` / `confirmation_date` | Date (ISO) | Can be null (show "N/A") |
| Department | `department` / `departmentRef.name` | String | Required |
| Designation | `jobTitle` / `designation` | String | Required |
| Reporting Manager | `reportingManagerName` / `reporting_manager_name` | String | Can be null (show "N/A") |
| Salary | `salary` / `base_salary` | Number | Monthly salary |

### Salary & Compensation Section

| Field Name | API Field(s) | Type | Notes |
|------------|--------------|------|-------|
| Annual CTC | `annual_ctc` / `annualCtc` | Number | Format as currency |
| Monthly Gross | `base_salary` / `baseSalary` | Number | Or calculate: annual_ctc / 12 |
| Basic | `salary_breakdown.basic` / `salaryBreakdown.basic` | Number | Annual amount |
| HRA | `salary_breakdown.hra` / `salaryBreakdown.hra` | Number | Annual amount |
| Special Allowance | `salary_breakdown.special_allowance` / `salaryBreakdown.special_allowance` | Number | Annual amount |
| PF Employer | `salary_breakdown.pf_employer` / `salaryBreakdown.pf_employer` | Number | Annual amount |
| Gratuity | `salary_breakdown.gratuity` / `salaryBreakdown.gratuity` | Number | Annual amount |
| Other Allowances | `salary_breakdown.other_allowances` / `salaryBreakdown.other_allowances` | Number | Annual amount |

### Current Address Section

| Field Name | API Field(s) | Type | Notes |
|------------|--------------|------|-------|
| Address Lines | `currentAddress.lines` | Array[String] | Array of address lines |
| Address Line 1 | `currentAddress.address_line_1` / `currentAddress.line1` | String | First line |
| Address Line 2 | `currentAddress.address_line_2` / `currentAddress.line2` | String | Second line (optional) |
| City | `currentAddress.city` | String | Required |
| State | `currentAddress.state` | String | Required |
| Pincode | `currentAddress.pincode` | String | Required |
| Country | `currentAddress.country` | String | Default: "India" |

### Emergency Contact Section

| Field Name | API Field(s) | Type | Notes |
|------------|--------------|------|-------|
| Name | `emergencyContact.name` | String | Can be null (show "N/A") |
| Relationship | `emergencyContact.relationship` | String | 'Father', 'Mother', 'Spouse', 'Sibling', 'Child', 'Friend', 'Other', or null (show "N/A") |
| Phone | `emergencyContact.phone` / `emergencyContact.contact_number` | String | Can be null (show "N/A") |

### Work Location Section

| Field Name | API Field(s) | Type | Notes |
|------------|--------------|------|-------|
| Store | `workLocation.storeName` / `store.name` | String | Can be null (show "N/A") |
| City | `workLocation.city` | String | Can be null (show "N/A") |
| State | `workLocation.state` | String | Can be null (show "N/A") |
| Pincode | `workLocation.pincode` | String | Can be null (show "N/A") |

---

## 📄 Statutory Tab Fields

| Field Name | API Field(s) | Type | Notes |
|------------|--------------|------|-------|
| UAN (EPF) | `uan` | String | Universal Account Number - can be null (show "N/A") |
| ESI Number | `esiNo` / `esi_no` / `esiNumber` / `esi_number` | String | Can be null (show "N/A") |
| PAN Number | `panNumber` / `pan_number` / `pan` | String | Can be null (show "N/A") |
| Aadhar (Masked) | `aadharMasked` / `aadhar_masked` / `aadhar` | String | Masked format: "XXXX XXXX 3383" - can be null (show "N/A") |

---

## 🏦 Bank Details Tab Fields

| Field Name | API Field(s) | Type | Notes |
|------------|--------------|------|-------|
| Account Number | `bankAccount.accountNumber` / `bankAccount.account_number` / `bankAccount.account_no` | String | Can be null (show "N/A") |
| Bank Name | `bankAccount.bankName` / `bankAccount.bank_name` | String | Can be null (show "N/A") |
| Account Type | `bankAccount.accountType` / `bankAccount.account_type` | String | 'Savings', 'Current', 'Salary', or null (show "N/A") |
| IFSC Code | `bankAccount.ifscCode` / `bankAccount.ifsc_code` / `bankAccount.ifsc` | String | Can be null (show "N/A") |
| Branch Name | `bankAccount.branchName` / `bankAccount.branch_name` / `bankAccount.branch` | String | Can be null (show "N/A") |

---

## 📎 Documents Tab

| Field Name | API Field(s) | Type | Notes |
|------------|--------------|------|-------|
| Documents | `documents` | Array[Object] | Array of document objects |

**Document Object Structure:**
```javascript
{
  type: "AADHAR" | "PAN" | "PASSPORT" | "DRIVING_LICENSE" | 
        "EDUCATION_CERTIFICATE" | "EXPERIENCE_CERTIFICATE" | 
        "BANK_STATEMENT" | "PHOTO" | "SIGNATURE" | "OTHER",
  name: String,  // Document name
  url: String,   // Document URL
  uploadedAt: Date (ISO),  // Upload date
  uploadedBy: String,  // User ID who uploaded
  verified: Boolean,  // Verification status
  verifiedBy: String,  // User ID who verified (if verified)
  verifiedAt: Date (ISO)  // Verification date (if verified)
}
```

---

## 💡 Implementation Tips

### 1. Handling Null/Empty Values

Always check for null/undefined/empty values and display "N/A":

```javascript
const displayValue = (value) => {
  return value && value !== '' ? value : 'N/A';
};

// Usage
<div>Gender: {displayValue(employee.gender)}</div>
```

### 2. Date Formatting

Format ISO date strings to DD/MM/YYYY:

```javascript
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
};

// Usage
<div>Join Date: {formatDate(employee.joinDate)}</div>
```

### 3. Currency Formatting

Format numbers as Indian Rupee:

```javascript
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

// Usage
<div>Annual CTC: {formatCurrency(employee.annual_ctc)}</div>
```

### 4. Nested Object Access

Always check for null before accessing nested properties:

```javascript
// Safe access
const storeName = employee?.store?.name || employee?.workLocation?.storeName || 'N/A';
const city = employee?.currentAddress?.city || 'N/A';
const accountNumber = employee?.bankAccount?.accountNumber || 'N/A';
```

### 5. Field Name Variations

The API returns both camelCase and snake_case versions. Use either:

```javascript
// Both work:
const esiNumber = employee.esiNo || employee.esi_no || employee.esiNumber || employee.esi_number;
const panNumber = employee.panNumber || employee.pan_number || employee.pan;
```

---

## 🔍 Example Response Structure

```javascript
{
  "success": true,
  "data": {
    // Basic Info
    "_id": "69a445e8df5df88702d05c3b",
    "employeeId": "EMP-2026-223156",
    "name": "yuvraj singh",
    "firstName": "yuvraj",
    "lastName": "singh",
    "email": "yuvi@gmail.com",
    "phone": "+91 82793 44166",
    "dob": "2002-06-30T00:00:00.000Z",
    "gender": null,  // Show "N/A"
    
    // Work Details
    "doj": "2026-03-01T00:00:00.000Z",
    "confirmationDate": null,  // Show "N/A"
    "department": "etelios frontend",
    "jobTitle": "Operations Head",
    "reportingManagerName": null,  // Show "N/A"
    "salary": 0,
    
    // Salary
    "annual_ctc": 0,
    "salary_breakdown": {
      "basic": 0,
      "hra": 0,
      "special_allowance": 0,
      "pf_employer": 0,
      "gratuity": 0,
      "other_allowances": 0
    },
    
    // Address
    "currentAddress": {
      "lines": ["kakadeo"],
      "city": "Kanpur",
      "state": "Uttar Pradesh",
      "pincode": "208011",
      "country": "India"
    },
    
    // Emergency Contact
    "emergencyContact": {
      "name": null,  // Show "N/A"
      "relationship": null,  // Show "N/A"
      "phone": null  // Show "N/A"
    },
    
    // Work Location
    "workLocation": {
      "storeName": null,  // Show "N/A"
      "city": "raipur",
      "state": "Chhattisgarh",
      "pincode": "200123"
    },
    
    // Statutory
    "uan": null,  // Show "N/A"
    "esiNo": null,  // Show "N/A"
    "panNumber": null,  // Show "N/A"
    "aadharMasked": "XXXX XXXX 3383",
    
    // Bank Details
    "bankAccount": {
      "accountNumber": null,  // Show "N/A"
      "bankName": null,  // Show "N/A"
      "accountType": null,  // Show "N/A"
      "ifscCode": null,  // Show "N/A"
      "branchName": null  // Show "N/A"
    },
    
    // Documents
    "documents": []
  }
}
```

---

## ✅ Checklist for Frontend Implementation

- [ ] All Overview tab fields implemented
- [ ] All Statutory tab fields implemented
- [ ] All Bank Details tab fields implemented
- [ ] Documents tab implemented
- [ ] Null/empty values show "N/A"
- [ ] Dates formatted as DD/MM/YYYY
- [ ] Currency formatted as ₹ (Indian Rupee)
- [ ] Nested objects safely accessed
- [ ] Both camelCase and snake_case field names supported
- [ ] Error handling for API failures
- [ ] Loading states implemented
- [ ] Responsive design for mobile/tablet

---

**Last Updated:** March 8, 2026  
**Status:** ✅ Complete - All fields documented
