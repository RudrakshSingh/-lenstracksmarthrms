# Registration Endpoint Debug - All Roles Failing

**Date**: 2026-01-02  
**Issue**: All 9 roles failing with different errors

---

## 🔍 Test Results Analysis

### Error Patterns:

1. **HTML Responses (400/500)**:
   - `superadmin`, `admin`, `accountant`, `store_manager`, `sales`, `optometrist`
   - **Cause**: Backend crash or routing issue
   - **Possible**: Endpoint not found, service down, or error handler returning HTML

2. **JSON "Invalid role specified"**:
   - `hr`, `manager`, `employee`
   - **Cause**: Role validation failing
   - **Possible**: Roles don't exist in database, seeding failing

3. **500 Internal Server Error**:
   - `admin` role specifically
   - **Cause**: Backend crash during processing
   - **Possible**: Database error, role lookup failing, or unhandled exception

---

## 🔍 Root Cause Analysis

### Issue 1: Roles Don't Exist in Database

**Problem**: The `registerBasicInfo` function tries to find roles, and if they don't exist, it tries to seed them. But if seeding fails or roles still don't exist, it throws "Invalid role specified".

**Code Flow** (onboarding.service.js line 72-88):
```javascript
let roleDoc = await Role.findByName(role.toLowerCase()) || await Role.findOne({ name: role.toLowerCase() });
if (!roleDoc) {
  try {
    const { seedRoles } = require('../utils/seedRoles');
    await seedRoles();
    roleDoc = await Role.findByName(role.toLowerCase()) || ...;
    if (!roleDoc) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Invalid role specified: ${role}...`);
    }
  } catch (seedError) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid role specified: ${role}...`);
  }
}
```

**Possible Issues**:
1. Database connection failing
2. Role collection doesn't exist
3. `seedRoles()` function failing silently
4. Role model not properly initialized

### Issue 2: HTML Error Responses

**Problem**: Getting HTML instead of JSON suggests:
1. Endpoint not found (404 → HTML error page)
2. Server error (500 → HTML error page)
3. Error handler not catching errors properly

**Possible Causes**:
1. Route not registered properly
2. Middleware throwing unhandled errors
3. Error handler returning HTML instead of JSON

### Issue 3: 500 Error for Admin Role

**Problem**: Admin role specifically causing 500 error suggests:
1. Database query failing
2. Role lookup throwing exception
3. User creation failing after role found

---

## ✅ Solutions

### Solution 1: Ensure Roles Are Seeded

**Action**: Manually seed roles in database before testing

```javascript
// Run this script to seed roles
const { seedRoles } = require('./microservices/hr-service/src/utils/seedRoles');
const mongoose = require('mongoose');

async function seedRolesManually() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'hr-db'
    });
    await seedRoles();
    console.log('✅ Roles seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding roles:', error);
    process.exit(1);
  }
}

seedRolesManually();
```

### Solution 2: Check Database Connection

**Verify**: HR service can connect to database and access Role collection

```bash
# Check HR service logs
kubectl logs -n etelios-backend-prod -l app=hr-service --tail=100 | grep -i "role\|database\|connection"
```

### Solution 3: Fix Error Handling

**Issue**: HTML responses suggest error handler not working

**Check**: Error middleware in server.js is properly configured

### Solution 4: Test Endpoint Directly

**Action**: Test with minimal payload to isolate issue

```bash
curl -k -X POST "https://98.70.245.87/api/auth/register" \
  -H "Host: api.etelios.com" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "TEST001",
    "name": "Test User",
    "email": "test@example.com",
    "phone": "9876543210",
    "password": "Test123456",
    "role": "employee",
    "address": {
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "country": "India"
    }
  }'
```

---

## 🔧 Immediate Fixes Needed

### Fix 1: Improve Role Seeding Error Handling

**File**: `microservices/hr-service/src/services/onboarding.service.js`

```javascript
// Get role (Role model automatically converts to lowercase)
let roleDoc = await Role.findByName(role.toLowerCase()) || await Role.findOne({ name: role.toLowerCase() });
if (!roleDoc) {
  // Try to seed roles if they don't exist
  try {
    logger.info('Role not found, attempting to seed roles', { role: role.toLowerCase() });
    const { seedRoles } = require('../utils/seedRoles');
    await seedRoles();
    // Retry finding the role after seeding
    roleDoc = await Role.findByName(role.toLowerCase()) || await Role.findOne({ name: role.toLowerCase() });
    if (!roleDoc) {
      // Check if role exists but is inactive
      const inactiveRole = await Role.findOne({ name: role.toLowerCase(), is_active: false });
      if (inactiveRole) {
        inactiveRole.is_active = true;
        await inactiveRole.save();
        roleDoc = inactiveRole;
        logger.info('Reactivated inactive role', { role: role.toLowerCase() });
      } else {
        logger.error('Role not found after seeding', { role: role.toLowerCase() });
        throw new ApiError(httpStatus.BAD_REQUEST, `Invalid role specified: ${role}. Available roles: employee, hr, manager, admin, superadmin`);
      }
    } else {
      logger.info('Role found after seeding', { role: role.toLowerCase() });
    }
  } catch (seedError) {
    logger.error('Error seeding roles', { 
      error: seedError.message, 
      stack: seedError.stack, 
      role: role.toLowerCase() 
    });
    // Try to find role one more time (might have been created by another request)
    roleDoc = await Role.findByName(role.toLowerCase()) || await Role.findOne({ name: role.toLowerCase() });
    if (!roleDoc) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Invalid role specified: ${role}. Available roles: employee, hr, manager, admin, superadmin`);
    }
  }
}
```

### Fix 2: Ensure Error Handler Returns JSON

**File**: `microservices/hr-service/src/server.js`

Verify error handler is properly configured to return JSON:

```javascript
// Error handler should be after all routes
app.use((err, req, res, next) => {
  // Always return JSON, never HTML
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});
```

---

## 🧪 Debugging Steps

### Step 1: Check Endpoint Exists

```bash
# Test endpoint directly
curl -k -v "https://98.70.245.87/api/auth/register" \
  -H "Host: api.etelios.com" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}'
```

### Step 2: Check Backend Logs

```bash
# Get HR service logs
kubectl logs -n etelios-backend-prod -l app=hr-service --tail=200 | grep -i "register\|role\|error"
```

### Step 3: Check Database

```bash
# Verify roles exist in database
# Connect to MongoDB and check roles collection
```

### Step 4: Test Role Seeding

```bash
# Run seed script manually
node -e "require('./microservices/hr-service/src/utils/seedRoles').seedRoles().then(() => console.log('Done')).catch(console.error)"
```

---

## 📋 Checklist

- [ ] Verify `/api/auth/register` endpoint is accessible
- [ ] Check if roles exist in database
- [ ] Verify database connection is working
- [ ] Check error handler returns JSON (not HTML)
- [ ] Test role seeding manually
- [ ] Verify Role model is properly initialized
- [ ] Check backend logs for exact errors

---

## 💡 Most Likely Cause

**Roles don't exist in the database**, and role seeding is failing silently or throwing errors that aren't being caught properly.

**Solution**: 
1. Manually seed roles in database
2. Improve error handling in role lookup/seeding
3. Add better logging to see what's happening

---

**Status**: 🔍 **Debugging Required - Roles Likely Not in Database**

