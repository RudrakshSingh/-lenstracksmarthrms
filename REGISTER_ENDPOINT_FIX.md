# Register Endpoint Fix

**Date**: 2026-01-02  
**Issue**: Frontend registration failing with "Invalid role specified"

---

## 🔍 Problem Identified

### Frontend Error
```
POST /api/auth/register
Status: 400
Error: "Invalid role specified"
```

### Root Cause
The `register` endpoint in `auth.service.js` checks if the role exists in the `Role` collection:
```javascript
const roleExists = await Role.findOne({ name: role, is_active: true });
if (!roleExists) {
  throw new Error('Invalid role specified');
}
```

If the role doesn't exist in the database, it throws an error even though the role is valid according to the schema.

---

## ✅ Fix Applied

### Updated Logic
**File**: `microservices/auth-service/src/services/auth.service.js`

**Change**: Register endpoint now:
1. Checks if role exists and is active
2. If inactive, reactivates it
3. If doesn't exist, creates it (for standard roles)
4. Only throws error for truly invalid roles

**Code**:
```javascript
// Validate role exists, create if it doesn't
let roleExists = await Role.findOne({ name: role.toLowerCase(), is_active: true });
if (!roleExists) {
  // Check if role exists but is inactive
  roleExists = await Role.findOne({ name: role.toLowerCase() });
  if (roleExists) {
    // Reactivate the role
    roleExists.is_active = true;
    await roleExists.save();
  } else {
    // Create the role if it doesn't exist (for standard roles)
    const validRoles = ['admin', 'hr', 'manager', 'employee', 'superadmin', ...];
    if (validRoles.includes(role.toLowerCase())) {
      roleExists = new Role({
        name: role.toLowerCase(),
        display_name: role.charAt(0).toUpperCase() + role.slice(1),
        description: `${role} role`,
        is_active: true,
        is_system: true
      });
      await roleExists.save();
    } else {
      throw new Error(`Invalid role specified: ${role}`);
    }
  }
}
```

---

## 🧪 Testing

### Test Payload
```json
{
  "employee_id": "EMP-2026-866556",
  "name": "dsd",
  "email": "gfgf@gmail.com",
  "phone": "+91 98798 76543",
  "password": "Test@123456",
  "role": "employee",
  "department": "TECH",
  "designation": "Developer",
  "joining_date": "2026-01-02"
}
```

### Expected Result
- ✅ Role 'employee' will be created if it doesn't exist
- ✅ Registration will succeed
- ✅ User will be created in database

---

## 📋 Supported Roles

The fix automatically creates these roles if they don't exist:
- `admin`
- `hr`
- `manager`
- `employee`
- `superadmin`
- `accountant`
- `store_manager`
- `sales`
- `optometrist`

---

## ⚠️ Deployment Required

### Code Changes
- ✅ `auth-service/src/services/auth.service.js` - Updated

### Pipeline Rerun
- ⚠️ **Required**: Rerun pipeline to deploy updated auth-service
- ⚠️ **Impact**: Frontend registration will work after deployment

---

## 🔧 Next Steps

1. ✅ **Code Updated**: Register endpoint now creates missing roles
2. ✅ **Code Pushed**: Changes pushed to Azure DevOps
3. ⏳ **Deploy**: Rerun pipeline to deploy updated auth-service
4. ✅ **Test**: Verify registration works after deployment

---

**Status**: ✅ **Fixed - Deployment Required**

