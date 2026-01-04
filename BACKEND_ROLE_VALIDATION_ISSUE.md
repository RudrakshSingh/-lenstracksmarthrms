# ⚠️ Backend Team: Role Validation Issue in /api/auth/register

**Date**: 2026-01-04  
**Priority**: HIGH  
**Status**: 🔴 CRITICAL - All roles being rejected

---

## 🔍 Problem Summary

The `/api/auth/register` endpoint is **rejecting ALL valid roles** including:
- ❌ `employee`
- ❌ `hr`
- ❌ `manager`
- ❌ `admin`
- ❌ `superadmin`

**Error Message**: `"Invalid role specified: {role}. Available roles: employee, hr, manager, admin, superadmin"`

**Frontend Code**: ✅ Correct - Sending valid roles  
**Backend Validation**: ❌ Failing - Rejecting all roles

---

## 📍 Endpoint Details

### Endpoint Location
- **File**: `microservices/hr-service/src/server.js` (Line 430)
- **Path**: `POST /api/auth/register`
- **Controller**: `onboardingController.register`
- **Service**: `onboardingService.registerBasicInfo`
- **Auth Required**: ❌ No (Public endpoint)

### Expected Roles (from Joi validation)
```javascript
role: Joi.string().valid('employee', 'hr', 'manager', 'admin', 'superadmin').default('employee')
```

✅ **Joi validation accepts these roles**  
❌ **But service layer rejects them**

---

## 🔍 Root Cause Analysis

### Issue Location
**File**: `microservices/hr-service/src/services/onboarding.service.js`  
**Function**: `registerBasicInfo` (Lines 71-113)

### Problem Flow

1. **Joi Validation** ✅ Passes (accepts valid roles)
2. **Service Layer** ❌ Fails (checks database)
3. **Role Lookup** (Line 72):
   ```javascript
   let roleDoc = await Role.findByName(role.toLowerCase()) || 
                 await Role.findOne({ name: role.toLowerCase() });
   ```
4. **If Role Not Found** (Line 73):
   - Tries to seed roles (Line 77-78)
   - If seeding fails or role still not found → **Throws Error** (Line 94, 109)

### Error Messages

**Line 94**:
```javascript
throw new ApiError(httpStatus.BAD_REQUEST, 
  `Invalid role specified: ${role}. Available roles: employee, hr, manager, admin, superadmin`);
```

**Line 109**:
```javascript
throw new ApiError(httpStatus.BAD_REQUEST, 
  `Invalid role specified: ${role}. Available roles: employee, hr, manager, admin, superadmin`);
```

---

## 🔧 Current Code Logic

```javascript
// Line 72-113 in onboarding.service.js
let roleDoc = await Role.findByName(role.toLowerCase()) || 
              await Role.findOne({ name: role.toLowerCase() });

if (!roleDoc) {
  // Try to seed roles
  try {
    const { seedRoles } = require('../utils/seedRoles');
    await seedRoles();
    roleDoc = await Role.findByName(role.toLowerCase()) || 
              await Role.findOne({ name: role.toLowerCase() });
    
    if (!roleDoc) {
      // Check for inactive role
      const inactiveRole = await Role.findOne({ name: role.toLowerCase(), is_active: false });
      if (inactiveRole) {
        inactiveRole.is_active = true;
        await inactiveRole.save();
        roleDoc = inactiveRole;
      } else {
        // ❌ THROWS ERROR HERE - Even for valid roles!
        throw new ApiError(httpStatus.BAD_REQUEST, 
          `Invalid role specified: ${role}. Available roles: employee, hr, manager, admin, superadmin`);
      }
    }
  } catch (seedError) {
    // Error recovery
    roleDoc = await Role.findByName(role.toLowerCase()) || 
              await Role.findOne({ name: role.toLowerCase() });
    if (!roleDoc) {
      // ❌ THROWS ERROR HERE TOO
      throw new ApiError(httpStatus.BAD_REQUEST, 
        `Invalid role specified: ${role}. Available roles: employee, hr, manager, admin, superadmin`);
    }
  }
}
```

---

## 🐛 Issues Identified

### Issue 1: Role Seeding May Fail Silently
- `seedRoles()` might fail but error is caught
- Role might not be created even after seeding attempt
- No guarantee roles exist in database

### Issue 2: No Fallback for Valid Roles
- Code doesn't create role if it's a valid standard role
- Should auto-create standard roles like auth-service does (Line 85-94 in auth.service.js)

### Issue 3: Database Dependency
- Validation depends on database state
- If roles aren't seeded, all registrations fail
- Should validate against enum, not just database

---

## ✅ Recommended Fix

### Option 1: Auto-Create Valid Roles (Recommended)

**Similar to auth-service approach** (Line 85-94 in `auth.service.js`):

```javascript
// In onboarding.service.js, after line 72
let roleDoc = await Role.findByName(role.toLowerCase()) || 
              await Role.findOne({ name: role.toLowerCase() });

if (!roleDoc) {
  // Define valid roles
  const validRoles = ['employee', 'hr', 'manager', 'admin', 'superadmin'];
  
  // Check if role is valid
  if (!validRoles.includes(role.toLowerCase())) {
    throw new ApiError(httpStatus.BAD_REQUEST, 
      `Invalid role specified: ${role}. Available roles: ${validRoles.join(', ')}`);
  }
  
  // Try to seed roles first
  try {
    const { seedRoles } = require('../utils/seedRoles');
    await seedRoles();
    roleDoc = await Role.findByName(role.toLowerCase()) || 
              await Role.findOne({ name: role.toLowerCase() });
  } catch (seedError) {
    logger.warn('Role seeding failed, will create role directly', { error: seedError.message });
  }
  
  // If still not found, create it (for valid standard roles)
  if (!roleDoc) {
    roleDoc = new Role({
      name: role.toLowerCase(),
      display_name: role.charAt(0).toUpperCase() + role.slice(1),
      description: `${role.charAt(0).toUpperCase() + role.slice(1)} role`,
      is_active: true,
      is_system: true
    });
    await roleDoc.save();
    logger.info('Auto-created role', { role: role.toLowerCase() });
  }
}
```

### Option 2: Validate Against Enum First

```javascript
// Validate role against enum BEFORE database lookup
const validRoles = ['employee', 'hr', 'manager', 'admin', 'superadmin'];
if (!validRoles.includes(role.toLowerCase())) {
  throw new ApiError(httpStatus.BAD_REQUEST, 
    `Invalid role specified: ${role}. Available roles: ${validRoles.join(', ')}`);
}

// Then lookup/create in database
let roleDoc = await Role.findByName(role.toLowerCase()) || 
              await Role.findOne({ name: role.toLowerCase() });

// ... rest of logic with auto-create for valid roles
```

---

## 🧪 Testing Checklist

After fix, test with:

```bash
# Test each role
curl -k -X POST "https://98.70.245.87/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "TEST001",
    "name": "Test Employee",
    "email": "test@example.com",
    "phone": "9876543210",
    "password": "Test123456",
    "role": "employee",
    "address": {
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001"
    }
  }'
```

**Test all roles**:
- [ ] `employee`
- [ ] `hr`
- [ ] `manager`
- [ ] `admin`
- [ ] `superadmin`

---

## 📋 Files to Update

1. **Primary Fix**:
   - `microservices/hr-service/src/services/onboarding.service.js` (Lines 71-113)

2. **Verify**:
   - `microservices/hr-service/src/utils/seedRoles.js` (Ensure it exists and works)
   - Database: Check if roles table has data

---

## 🔍 Debugging Steps

1. **Check if roles exist in database**:
   ```javascript
   // In MongoDB shell or via API
   db.roles.find({}, {name: 1, is_active: 1})
   ```

2. **Check role seeding**:
   ```javascript
   // Test if seedRoles function works
   const { seedRoles } = require('./utils/seedRoles');
   await seedRoles();
   ```

3. **Check logs**:
   ```bash
   kubectl logs -n etelios-backend-prod -l app=hr-service --tail=100 | grep -i "role\|register"
   ```

---

## 📝 Summary

**Problem**: Backend rejects all valid roles because:
- Roles don't exist in database
- Role seeding may fail
- No fallback to auto-create valid standard roles

**Solution**: 
- Validate role against enum first
- Auto-create valid standard roles if not in database
- Only reject truly invalid roles

**Priority**: 🔴 HIGH - Blocks all user registrations

---

**Status**: ⚠️ **AWAITING BACKEND TEAM FIX**

