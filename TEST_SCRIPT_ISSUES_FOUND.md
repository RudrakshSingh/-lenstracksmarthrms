# Test Script Issues Found

**Date**: 2026-01-02  
**Script**: Test Employee Registration with ALL Valid Roles

---

## 🔍 Issues Found

### Issue 1: Missing Required `address` Field ❌

**Problem**: Script doesn't include `address` field which is **REQUIRED** by backend

**Backend Schema** (server.js line 430-438):
```javascript
address: Joi.object({
  city: Joi.string().required(),
  state: Joi.string().required(),
  pincode: Joi.string().pattern(/^\d{6}$/).required(),
  country: Joi.string().default('India')
}).required()  // ← REQUIRED!
```

**Script Issue**:
```javascript
// ❌ MISSING address field
const employeeData = {
  employee_id: ...,
  name: ...,
  email: ...,
  // address: missing!
}
```

**Fix**: Add address field:
```javascript
address: {
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400001',
  country: 'India'
}
```

---

### Issue 2: Invalid Roles in Test List ❌

**Problem**: Script tests roles that are NOT in HR service Role model enum

**Backend Valid Roles** (server.js line 428):
```javascript
role: Joi.string().valid('employee', 'hr', 'manager', 'admin', 'superadmin')
```

**Script Invalid Roles**:
- `accountant` ❌ (not in enum)
- `store_manager` ❌ (not in enum)
- `sales` ❌ (not in enum)
- `optometrist` ❌ (not in enum)

**Fix**: Only test valid roles:
```javascript
const VALID_ROLES = ['employee', 'hr', 'manager', 'admin', 'superadmin'];
```

---

### Issue 3: Unnecessary Fields ❌

**Problem**: Script includes fields not in register schema

**Script Includes**:
- `department` ❌ (not in schema)
- `designation` ❌ (not in schema)
- `joining_date` ❌ (not in schema)

**Backend Schema Only Accepts**:
- `employee_id` ✅
- `name` ✅
- `email` ✅
- `phone` ✅
- `password` ✅
- `role` ✅
- `date_of_birth` ✅ (optional)
- `address` ✅ (required)

**Fix**: Remove unnecessary fields

---

### Issue 4: Unnecessary Authorization Header ⚠️

**Problem**: Script sends Authorization header but endpoint is PUBLIC

**Backend** (server.js line 441):
```javascript
app.post('/api/auth/register', validateRequest(registerSchema), asyncHandler(onboardingController.register));
// No authenticate middleware - PUBLIC endpoint
```

**Script**:
```javascript
headers: {
  'Authorization': `Bearer ${token}`, // ❌ Not needed
}
```

**Fix**: Remove Authorization header (optional, won't break but unnecessary)

---

### Issue 5: Wrong Login Response Parsing ⚠️

**Problem**: Login response structure might be wrong

**Backend Response** (auth-service):
```javascript
{
  success: true,
  message: 'Login successful',
  data: {
    accessToken: '...',
    refreshToken: '...',
    user: {...}
  }
}
```

**Script**:
```javascript
const token = data.accessToken || data.token || data.data?.accessToken;
// ✅ Correct fallback, but should prioritize data.data?.accessToken
```

**Fix**: Prioritize correct path:
```javascript
const token = data.data?.accessToken || data.accessToken || data.token;
```

---

### Issue 6: Missing Host Header ⚠️

**Problem**: Script doesn't include `Host` header which might be required

**Backend**: May require `Host: api.etelios.com` header

**Fix**: Add Host header:
```javascript
headers: {
  'Content-Type': 'application/json',
  'Host': 'api.etelios.com'
}
```

---

## ✅ Fixed Script

See: `scripts/test-registration-all-roles-fixed.js`

### Key Changes:

1. ✅ Added required `address` field
2. ✅ Removed invalid roles (only test valid ones)
3. ✅ Removed unnecessary fields (`department`, `designation`, `joining_date`)
4. ✅ Removed Authorization header (endpoint is public)
5. ✅ Fixed login response parsing
6. ✅ Added Host header
7. ✅ Better error handling
8. ✅ Improved logging

---

## 📋 Backend Requirements Summary

### Required Fields:
- ✅ `employee_id` (string)
- ✅ `name` (string, min 2, max 100)
- ✅ `email` (valid email)
- ✅ `phone` (string, 10 digits Indian format)
- ✅ `password` (string, min 8)
- ✅ `role` (one of: 'employee', 'hr', 'manager', 'admin', 'superadmin')
- ✅ `address` (object with city, state, pincode, country)

### Optional Fields:
- `date_of_birth` (date, must be 18+)
- `address.address_line_1` (string)
- `address.street` (string)
- `address.zip` (string)

### Validation Rules:
- Phone: Must be 10 digits, starting with 6-9
- Pincode: Must be exactly 6 digits
- Email: Must be valid format
- Date of Birth: Must be 18+ years if provided
- Role: Must be in enum

---

## 🧪 Testing

### Run Fixed Script:
```bash
node scripts/test-registration-all-roles-fixed.js
```

### Expected Results:
- ✅ All 5 valid roles should register successfully
- ✅ Proper error messages for invalid roles
- ✅ Address field included in all requests
- ✅ No unnecessary fields sent

---

**Status**: ✅ **Issues Identified and Fixed**

