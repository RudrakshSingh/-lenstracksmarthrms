# Employee Registration Test Results

**Date**: 2026-01-04  
**Backend URL**: `https://98.70.245.87`  
**Endpoint**: `POST /api/auth/register`

---

## Test Summary

### ✅ Login Test
- **Status**: ✅ **SUCCESS**
- **Endpoint**: `POST /api/auth/login`
- **Credentials**: `admin@etelios.com` / `Admin@123456`
- **Result**: Token received successfully
- **Token**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

### ❌ Registration Test
- **Status**: ❌ **FAILED**
- **Endpoint**: `POST /api/auth/register`
- **Error**: `"Invalid role specified"`
- **Status Code**: `400 Bad Request`

---

## Request Details

### Request Body
```json
{
  "employee_id": "EMP-2026-643416",
  "name": "Test Employee",
  "email": "test.employee.1767532482460@etelios.com",
  "phone": "+91-9876543210",
  "password": "Test@123456",
  "role": "employee",
  "department": "TECH",
  "designation": "Software Developer",
  "joining_date": "2026-01-02",
  "tenantId": "default",
  "address": {
    "street": "123 Test Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India",
    "pincode": "400001"
  }
}
```

### Request Headers
```
Content-Type: application/json
Authorization: Bearer <admin-token>
```

---

## Error Analysis

### Error Message
```json
{
  "success": false,
  "message": "Invalid role specified"
}
```

### Error Source
- **File**: `microservices/auth-service/src/services/auth.service.js`
- **Line**: 97
- **Code**:
  ```javascript
  throw new Error(`Invalid role specified: ${role}. Valid roles are: ${validRoles.join(', ')}`);
  ```

### Valid Roles (from code)
```javascript
const validRoles = ['admin', 'hr', 'manager', 'employee', 'superadmin', 'accountant', 'store_manager', 'sales', 'optometrist'];
```

### Issue
- **Role sent**: `"employee"` ✅ (should be valid)
- **Error thrown**: Line 97 suggests role is NOT in `validRoles` array
- **Possible causes**:
  1. Role lookup in database is failing
  2. Role creation is failing
  3. Role validation logic has a bug
  4. Database connection issue with Role model

---

## Code Flow Analysis

### Registration Flow
1. **Joi Validation** (auth.routes.js line 18):
   - ✅ Validates role: `Joi.string().valid('admin', 'hr', 'manager', 'employee').required()`
   - ✅ Should pass for "employee"

2. **Authentication Check** (authController.js line 10):
   - ✅ Token validated, `createdBy` extracted

3. **Service Registration** (auth.service.js line 48):
   - ✅ Extracts role from `userData`
   - ❌ **Fails at role validation** (line 74-100)

4. **Role Lookup** (auth.service.js line 74):
   ```javascript
   let roleExists = await Role.findOne({ name: role.toLowerCase(), is_active: true });
   ```
   - If not found, checks inactive roles (line 77)
   - If still not found, tries to create role (line 84-95)
   - **Error thrown if role not in validRoles** (line 97)

5. **User Creation** (auth.service.js line 103):
   - Never reached due to role validation failure

---

## Root Cause Hypothesis

### Hypothesis 1: Role Model Database Issue
- Role model lookup is failing (database connection issue)
- Role creation is also failing
- Error message is truncated in controller

### Hypothesis 2: Role Validation Logic Bug
- Role lookup succeeds but validation logic has a bug
- `role.toLowerCase()` might not match expected format
- Case sensitivity issue

### Hypothesis 3: Missing Role in Database
- Role "employee" doesn't exist in database
- Role creation is failing (permissions, validation, etc.)
- Error is thrown before role can be created

### Hypothesis 4: Tenant ID Issue
- Role model might require tenantId
- Role lookup might be tenant-specific
- Missing tenant context in role lookup

---

## Test Results for Different Roles

| Role | Status | Error |
|------|--------|-------|
| `employee` | ❌ 400 | Invalid role specified |
| `hr` | ❌ 400 | Invalid role specified |
| `manager` | ❌ 400 | Invalid role specified |
| `admin` | ❌ 400 | Invalid role specified |

**All roles are failing with the same error**, suggesting the issue is not role-specific but rather a systemic problem with role validation or database lookup.

---

## Recommendations

### 1. Check Role Model Database Connection
```javascript
// Add logging in auth.service.js
logger.info('Role lookup', { role: role.toLowerCase() });
let roleExists = await Role.findOne({ name: role.toLowerCase(), is_active: true });
logger.info('Role lookup result', { found: !!roleExists });
```

### 2. Check Role Creation Logic
```javascript
// Add logging before role creation
logger.info('Creating role', { role: role.toLowerCase(), inValidRoles: validRoles.includes(role.toLowerCase()) });
```

### 3. Check Tenant Context
- Verify if Role model requires tenantId
- Check if role lookup should be tenant-specific
- Verify tenantId is being passed correctly

### 4. Check Database Schema
- Verify Role collection exists
- Check if roles are seeded in database
- Verify database connection is working

### 5. Add Detailed Error Logging
```javascript
// In authController.js, log full error
logger.error('Registration error details', {
  error: error.message,
  stack: error.stack,
  role: userData.role,
  validRoles: ['admin', 'hr', 'manager', 'employee', 'superadmin', 'accountant', 'store_manager', 'sales', 'optometrist']
});
```

---

## Next Steps

1. ✅ **Test completed** - Registration endpoint tested
2. ❌ **Issue identified** - "Invalid role specified" error
3. 🔍 **Investigation needed** - Role validation logic needs debugging
4. 🔧 **Fix required** - Role lookup/creation logic needs to be fixed

---

## Test Script

The test script is available at:
- **File**: `scripts/test-employee-registration.js`
- **Usage**: `node scripts/test-employee-registration.js`
- **Features**:
  - Auto-login as admin
  - Test registration with different roles
  - Detailed error logging
  - Multiple endpoint testing

---

**Last Updated**: 2026-01-04

