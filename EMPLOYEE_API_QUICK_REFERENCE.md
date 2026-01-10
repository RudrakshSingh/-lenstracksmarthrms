# 🚀 Employee API - Quick Reference Guide

**For:** Backend Developers  
**Status:** ✅ Implementation Complete  
**Last Updated:** 2026-01-08

---

## 📋 Quick Links

- **Complete Implementation:** See `BACKEND_EMPLOYEE_API_COMPLETE.md`
- **Frontend Requirements:** See user-provided requirements document
- **Environment Setup:** See `QUICK_ENV_SETUP.md`

---

## ⚡ Quick Start Testing

### 1. Get Employee (View Page)

```bash
# Login
TOKEN=$(curl -k -s -X POST "http://localhost:3002/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"emailOrEmployeeId":"admin@etelios.com","password":"Admin@123456"}' \
  | jq -r '.data.accessToken')

# Get employee
curl -X GET "http://localhost:3002/api/hr/employees/EMP-2026-001" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Expected:** Complete employee object with ALL fields

### 2. Update Employee (Edit Page)

```bash
curl -X PUT "http://localhost:3002/api/hr/employees/EMP-2026-001" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Updated Name",
    "status": "active",
    "salary": "60000"
  }' | jq
```

**Expected:** Success response with updated employee

---

## 🔴 Critical Field Names (MUST BE EXACT!)

### ✅ Correct Names:

```javascript
{
  // Basic
  "employeeId": "EMP-001",        // NOT employee_id
  "code": "EMP-001",              // NOT employee_code
  "firstName": "John",            // NOT first_name
  "lastName": "Doe",              // NOT last_name
  "fullName": "John Doe",         // NOT full_name
  
  // Work
  "jobTitle": "Engineer",         // NOT job_title
  "roleFamily": "Tech",           // NOT role_family
  "gradeBand": "L3",              // NOT grade_band (also send grade_band for compatibility)
  
  // Dates
  "doj": "2026-01-15",            // NOT joining_date
  "dob": "1995-05-15",            // NOT date_of_birth
  
  // Manager
  "reportingManager": "id",       // NOT reporting_manager
  "reportingManagerName": "Name", // NOT reporting_manager_name
  
  // Location
  "workLocation": {               // NOT work_location
    "storeId": "123",             // NOT store_id
    "storeName": "Mumbai"         // NOT store_name
  },
  
  // Address
  "currentAddress": {             // NOT current_address
    "lines": ["Street", "Area"]  // ARRAY! NOT single string
  },
  
  // Emergency
  "emergencyContact": {           // NOT emergency_contact
    "name": "Jane"
  },
  
  // Statutory (CRITICAL!)
  "esiNo": "123",                 // NOT esiNumber or esi_number
  "panNumber": "ABC",             // NOT pan_number
  "aadharMasked": "XXXX",         // NOT aadhar_masked
  
  // Bank (CRITICAL!)
  "bankAccount": {                // NOT bank_account
    "accountNumber": "123",       // NOT account_number
    "ifscCode": "HDFC",           // NOT ifsc_code
    "bankName": "HDFC",           // NOT bank_name
    "branchName": "Mumbai",       // NOT branch_name
    "accountType": "Savings"      // NOT account_type
  },
  
  // Documents
  "documents": [{                 // NOT onboarding_documents
    "type": "aadhar",
    "url": "/path",
    "uploaded_at": "2026-01-15"   // snake_case here is OK
  }]
}
```

---

## 🔴 Status Values (MUST BE LOWERCASE!)

```javascript
// ✅ CORRECT
"status": "active"
"status": "inactive"
"status": "on-leave"         // Hyphen, not underscore!
"status": "terminated"
"status": "pending"

// ❌ WRONG - Will cause 400 error
"status": "ACTIVE"           // Uppercase
"status": "Active"           // Title case
"status": "ON_LEAVE"         // Underscore
"status": "On Leave"         // Space
```

```javascript
{
  // === BASIC INFO ===
  "id": String,                    // MongoDB _id
  "employeeId": String,            // Employee ID (uppercase)
  "code": String,                  // Same as employeeId
  "firstName": String,
  "lastName": String,
  "fullName": String,
  "email": String,
  "phone": String,
  "avatar": String,                // Profile pic URL
  
  // === WORK DETAILS ===
  "department": String,
  "designation": String,
  "jobTitle": String,              // Usually same as designation
  "roleFamily": String,
  "grade_band": String,            // Snake case
  "gradeBand": String,             // Camel case (same value)
  "status": String,                // LOWERCASE ONLY!
  "salary": String,
  
  // === DATES ===
  "doj": String,                   // ISO 8601 format
  "dob": String,                   // ISO 8601 format
  "confirmationDate": String,      // ISO 8601 format (nullable)
  
  // === REPORTING ===
  "reportingManager": String,      // Manager ID or name
  "reportingManagerName": String,  // Manager full name
  
  // === WORK LOCATION ===
  "workLocation": {
    "storeId": String,
    "storeName": String,
    "city": String,
    "state": String,
    "pincode": String
  },
  
  // === ADDRESS ===
  "currentAddress": {
    "lines": [String],             // ARRAY of address lines
    "city": String,
    "state": String,
    "pincode": String,
    "country": String
  },
  
  // === EMERGENCY CONTACT ===
  "emergencyContact": {
    "name": String,
    "relationship": String,        // Father/Mother/Spouse/Sibling/Child/Friend/Other
    "phone": String
  },
  
  // === STATUTORY INFO ===
  "uan": String,                   // 12 digits
  "esiNo": String,                 // 15 digits (camelCase!)
  "aadharMasked": String,          // XXXX XXXX 9012
  "panNumber": String,             // 10 characters (camelCase!)
  
  // === BANK DETAILS ===
  "bankAccount": {                 // camelCase!
    "accountNumber": String,       // camelCase!
    "ifscCode": String,            // camelCase! (11 chars)
    "bankName": String,            // camelCase!
    "branchName": String,          // camelCase! (optional)
    "accountType": String          // camelCase! (Savings/Current/Salary)
  },
  
  // === PREVIOUS EMPLOYMENT ===
  "previousEmployment": {
    "has_previous_employment": Boolean,  // snake_case
    "employer_name": String,             // snake_case
    "from_date": String,                 // snake_case (ISO date)
    "to_date": String,                   // snake_case (ISO date)
    "form_16_available": Boolean         // snake_case
  },
  
  // === DOCUMENTS ===
  "documents": [{
    "type": String,                // Document type
    "url": String,                 // File URL
    "uploaded_at": String          // ISO date (snake_case)
  }],
  
  // === TIMESTAMPS ===
  "createdAt": String,             // ISO 8601
  "updatedAt": String              // ISO 8601
}
```

---

## 🧪 Validation Rules

### 1. Phone Number
```javascript
// Regex: /^\+?[\d\s-()]+$/
"9876543210"       // ✅ Valid (10 digits)
"+919876543210"    // ✅ Valid (with country code)
"98765 43210"      // ✅ Valid (with space)
"abc123"           // ❌ Invalid (letters)
```

### 2. ESI Number
```javascript
// Length: 15 digits
"123456789012345"  // ✅ Valid
"12345"            // ❌ Invalid (too short)
```

### 3. IFSC Code
```javascript
// Length: 11 characters (4 letters + 7 digits)
"HDFC0001234"      // ✅ Valid
"SBIN0ABCD12"      // ✅ Valid
"HDFC123"          // ❌ Invalid (wrong format)
```

### 4. PAN Number
```javascript
// Format: ABCDE1234F (5 letters + 4 digits + 1 letter)
"ABCDE1234F"       // ✅ Valid
"ABC1234"          // ❌ Invalid (wrong format)
```

### 5. Date Format
```javascript
// Accept both:
"2026-01-15"                    // ✅ Valid
"2026-01-15T00:00:00.000Z"      // ✅ Valid

// Store as Date, return as ISO 8601:
"2026-01-15T00:00:00.000Z"
```

---

## 🐛 Common Errors & Fixes

### Error 1: "Invalid status"
```javascript
// Problem:
{
  "status": "ACTIVE"  // ❌ Uppercase
}

// Fix:
{
  "status": "active"  // ✅ Lowercase
}
```

### Error 2: Field not found
```javascript
// Problem:
{
  "esi_number": "123"  // ❌ Wrong name
}

// Fix:
{
  "esiNo": "123"       // ✅ Correct camelCase
}
```

### Error 3: Address not working
```javascript
// Problem:
{
  "currentAddress": {
    "street": "123 Main St"  // ❌ Wrong structure
  }
}

// Fix:
{
  "currentAddress": {
    "lines": ["123 Main St", "Area"]  // ✅ Array
  }
}
```

### Error 4: Employee not found (404)
```javascript
// Problem: Database name mismatch

// Check:
1. Service connected to hr-db (not auth-db)
2. User model being queried correctly
3. Employee actually exists in database
```

### Error 5: Validation failed
```javascript
// Problem: Missing required fields

// Fix: Ensure these are always sent:
{
  "employeeId": "EMP-001",  // Required
  "email": "user@email.com", // Required
  "department": "IT",        // Required
  "designation": "Engineer", // Required
  "doj": "2026-01-15"        // Required
}
```

---

## 📝 Testing Scenarios

### Scenario 1: View Employee Page
```bash
# Frontend calls:
GET /api/hr/employees/{id}

# Backend returns:
- Complete employee object
- All 50+ fields populated
- Status in lowercase
- Dates in ISO format
- Nested objects complete

# Verify:
✓ All sections render correctly
✓ No "undefined" values
✓ Dates display properly
✓ Nested data shows correctly
```

### Scenario 2: Edit Employee Page
```bash
# Frontend calls:
GET /api/hr/employees/{id}  # Load data

# Backend returns:
- All fields for form pre-population

# User edits and submits:
PUT /api/hr/employees/{id}
{
  "fullName": "New Name",
  "status": "on-leave"
}

# Backend:
- Validates status (lowercase)
- Updates fields
- Returns updated employee

# Verify:
✓ Changes saved to database
✓ Response shows updated values
✓ Frontend updates display
```

### Scenario 3: Onboarding Flow
```bash
# Step 1: Register (POST /api/auth/register)
# Step 2: Create Employee (POST /api/hr/employees)
# Step 3: Update Statutory (PUT /api/hr/employees/{id})
# Step 4: View Complete (GET /api/hr/employees/{id})

# Verify:
✓ All data persists across steps
✓ User in auth-db
✓ Employee in hr-db  
✓ All fields retrievable
```

---

## 🎯 Quick Checklist

Before marking "done", verify:

- [ ] GET returns ALL 50+ fields
- [ ] PUT accepts ALL fields
- [ ] Status validation enforces lowercase
- [ ] Field names are exact (camelCase)
- [ ] Nested objects have correct structure
- [ ] `currentAddress.lines` is an array
- [ ] `esiNo` not `esiNumber`
- [ ] `panNumber` not `pan_number`
- [ ] `bankAccount` fields are camelCase
- [ ] Dates are ISO 8601 format
- [ ] Response includes timestamps
- [ ] Documents array included
- [ ] Emergency contact object present
- [ ] Work location object complete
- [ ] Reporting manager name populated

---

## 🚀 Ready to Deploy?

```bash
# 1. Test locally
cd microservices/hr-service
npm start
# Test with curl commands above

# 2. Push to production
git add .
git commit -m "feat: Complete employee API"
git push

# 3. Verify deployment
# Wait for Azure Pipeline
# Test production endpoint
```

---

**All Clear?** ✅  
**Need Help?** See `BACKEND_EMPLOYEE_API_COMPLETE.md` for detailed docs!

