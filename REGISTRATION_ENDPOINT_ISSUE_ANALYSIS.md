# Registration Endpoint Issue Analysis

**Date**: 2026-01-02  
**Issue**: Registration failing for all roles with different errors

---

## 🔍 Test Results from Frontend

| Role | Status | Response |
|------|--------|----------|
| `admin` | 500 Internal Server Error | Backend crash (HTML error page) |
| `superadmin` | 400 Bad Request | HTML error page |
| `hr` | 400 Bad Request | "Invalid role specified" |
| `manager` | 400 Bad Request | "Invalid role specified" |
| `employee` | 400 Bad Request | "Invalid role specified" |

---

## 🔍 Root Cause Analysis

### Issue 1: Two Different `/api/auth/register` Endpoints

There are **TWO** registration endpoints in the codebase:

#### 1. HR Service Endpoint (Public)
**File**: `microservices/hr-service/src/server.js` (line 441)
- **Path**: `POST /api/auth/register`
- **Auth Required**: ❌ No (Public endpoint)
- **Controller**: `onboardingController.register`
- **Service**: `onboardingService.registerBasicInfo`
- **Schema**: Accepts `'employee', 'hr', 'manager', 'admin', 'superadmin'`
- **Purpose**: Onboarding flow - Step 1

#### 2. Auth Service Endpoint (Protected)
**File**: `microservices/auth-service/src/routes/auth.routes.js` (line 98)
- **Path**: `POST /api/auth/register`
- **Auth Required**: ✅ Yes (`authenticate` middleware)
- **Role Required**: `requireRole(['admin', 'hr'])`
- **Controller**: `authController.register`
- **Service**: `authService.register`
- **Schema**: Accepts `'admin', 'hr', 'manager', 'employee'` (NO `superadmin`!)
- **Purpose**: Admin/HR creating users

**Problem**: Frontend is likely hitting the **HR Service endpoint** (public), but the roles might not exist in the database.

---

## 🔍 Issue 2: Role Not Found in Database

### Code Flow in `registerBasicInfo`:

```javascript
// microservices/hr-service/src/services/onboarding.service.js (line 72-86)
const roleDoc = await Role.findByName(role.toLowerCase()) || await Role.findOne({ name: role.toLowerCase() });
if (!roleDoc) {
  // Try to seed roles if they don't exist
  try {
    const { seedRoles } = require('../utils/seedRoles');
    await seedRoles();
    const retryRole = await Role.findByName(role.toLowerCase());
    if (!retryRole) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Invalid role specified: ${role}. Available roles: employee, hr, manager, admin, superadmin`);
    }
    return retryRole; // ❌ BUG: Returns role object, not user data!
  } catch (seedError) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid role specified: ${role}. Available roles: employee, hr, manager, admin, superadmin`);
  }
}
```

### Problems Identified:

1. **Bug in Error Handling** (line 82):
   - If role seeding succeeds but role still not found, it returns `retryRole` (a Role object)
   - Should continue with user creation, not return early
   - This causes the function to return wrong data type

2. **Role Seeding Might Fail**:
   - If `seedRoles()` throws an error, it's caught and re-thrown as "Invalid role specified"
   - The actual error is lost

3. **Database Connection Issue**:
   - If database is not connected or Role model is not accessible, role lookup fails
   - This would cause 500 error for `admin` role

---

## 🔍 Issue 3: Admin Role 500 Error

### Possible Causes:

1. **Database Error**:
   - Role lookup failing due to DB connection issue
   - Role model not properly initialized

2. **Seeding Error**:
   - `seedRoles()` function might be throwing an unhandled error
   - Error not being caught properly

3. **User Creation Error**:
   - After role is found, user creation might be failing
   - Missing required fields
   - Validation error

4. **Missing Error Handler**:
   - Error in `onboardingController.register` not being handled properly
   - Causing HTML error page instead of JSON response

---

## ✅ Solution

### Fix 1: Correct Role Seeding Logic

**File**: `microservices/hr-service/src/services/onboarding.service.js`

```javascript
// Get role (Role model automatically converts to lowercase)
let roleDoc = await Role.findByName(role.toLowerCase()) || await Role.findOne({ name: role.toLowerCase() });

if (!roleDoc) {
  // Try to seed roles if they don't exist
  try {
    const { seedRoles } = require('../utils/seedRoles');
    await seedRoles();
    // Retry finding the role after seeding
    roleDoc = await Role.findByName(role.toLowerCase()) || await Role.findOne({ name: role.toLowerCase() });
    
    if (!roleDoc) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Invalid role specified: ${role}. Available roles: employee, hr, manager, admin, superadmin`);
    }
    // ✅ Continue with user creation (don't return early)
  } catch (seedError) {
    logger.error('Error seeding roles', { error: seedError.message, stack: seedError.stack });
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid role specified: ${role}. Available roles: employee, hr, manager, admin, superadmin`);
  }
}

// Continue with user creation...
```

### Fix 2: Improve Error Handling in Controller

**File**: `microservices/hr-service/src/controllers/onboardingController.js`

```javascript
const register = async (req, res, next) => {
  try {
    const result = await onboardingService.registerBasicInfo(req.body);

    res.status(201).json({
      success: true,
      message: 'Basic information registered successfully',
      data: result
    });
  } catch (error) {
    logger.error('Registration error', { 
      error: error.message,
      stack: error.stack,
      statusCode: error.statusCode,
      body: req.body
    });
    
    // Handle ApiError properly
    if (error instanceof ApiError) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
        code: error.code || 'REGISTRATION_ERROR'
      });
    }
    
    // Handle other errors
    next(error);
  }
};
```

### Fix 3: Ensure Roles Are Seeded

**Action**: Run role seeding script before testing:

```bash
# Option 1: Seed roles via script
node -e "const { seedRoles } = require('./microservices/hr-service/src/utils/seedRoles'); seedRoles().then(() => console.log('Roles seeded')).catch(console.error);"

# Option 2: Seed roles via API (if endpoint exists)
# Option 3: Seed roles on server startup
```

### Fix 4: Verify Database Connection

**Check**: Ensure HR service database is connected and Role collection exists.

---

## 🧪 Testing

### Test Registration with Proper Payload:

```bash
curl -k -X POST "https://98.70.245.87/api/auth/register" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "EMP-2025-TEST",
    "name": "Test User",
    "email": "test@example.com",
    "phone": "9876543210",
    "password": "Test@123456",
    "role": "employee",
    "address": {
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India"
    }
  }'
```

### Expected Response:
```json
{
  "success": true,
  "message": "Basic information registered successfully",
  "data": {
    "employee_id": "EMP-2025-TEST",
    "user_id": "...",
    "email": "test@example.com",
    "status": "pending"
  }
}
```

---

## 📋 Quick Fix Checklist

- [ ] Fix role seeding logic in `registerBasicInfo` (remove early return)
- [ ] Improve error handling in `onboardingController.register`
- [ ] Ensure roles are seeded in database
- [ ] Verify database connection for HR service
- [ ] Test registration with each role
- [ ] Check backend logs for exact error messages

---

## 🔍 Debugging Steps

1. **Check Backend Logs**:
   ```bash
   kubectl logs -n etelios-backend-prod -l app=hr-service --tail=100
   ```

2. **Check Role Collection**:
   - Verify roles exist in `hr-db` database
   - Check `roles` collection has: `superadmin`, `admin`, `hr`, `manager`, `employee`

3. **Test Role Seeding**:
   - Manually run `seedRoles()` function
   - Verify it completes without errors

4. **Test Role Lookup**:
   ```javascript
   const Role = require('./models/Role.model');
   const role = await Role.findByName('admin');
   console.log(role); // Should not be null
   ```

---

## 💡 Root Cause Summary

1. **Role Not Found**: Roles don't exist in database
2. **Seeding Bug**: Early return in error handling (line 82)
3. **Error Handling**: 500 errors not being caught properly
4. **Database**: Possible connection or model initialization issue

---

**Status**: 🔍 **Root Cause Identified - Ready for Fix**

**Priority**: 🔴 **HIGH** - Blocking user registration

