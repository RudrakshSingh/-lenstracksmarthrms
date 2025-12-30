# Onboarding Validation Fixes - Role & Status

## Problem

Frontend was sending:
- `roleName: "tenant-admin"` → Not in validation schema
- `status: "ACTIVE"` → Uppercase, but validation expected lowercase

## ✅ Fixes Applied

### 1. Role Name: `tenant-admin` Support

**File:** `microservices/hr-service/src/routes/hr.routes.js`

**Updated Validation Schema:**
```javascript
const assignRoleSchema = {
  body: Joi.object({
    roleName: Joi.string().valid(
      'SuperAdmin', 'Admin', 'HR', 'Manager', 'Employee',
      'superadmin', 'admin', 'hr', 'manager', 'employee',
      'tenant-admin', 'Tenant-Admin', 'TENANT-ADMIN'  // ✅ Added
    ).required()
  })
};
```

**File:** `microservices/hr-service/src/services/hr.service.js`

**Role Mapping Logic:**
```javascript
// Normalize role name: map tenant-admin to admin
let normalizedRoleName = roleName.toLowerCase();
if (normalizedRoleName === 'tenant-admin' || normalizedRoleName === 'tenantadmin') {
  normalizedRoleName = 'admin';  // Maps to existing 'admin' role
}
```

**Result:** `tenant-admin` is now accepted and automatically mapped to `admin` role.

### 2. Status: Uppercase Support

**File:** `microservices/hr-service/src/routes/hr.routes.js`

**Updated Validation Schema:**
```javascript
const updateStatusSchema = {
  body: Joi.object({
    status: Joi.string().valid(
      'active', 'on_leave', 'terminated', 'pending',        // Lowercase
      'ACTIVE', 'ON_LEAVE', 'TERMINATED', 'PENDING',        // Uppercase ✅ Added
      'inactive', 'INACTIVE'                                 // Also added
    ).required()
  })
};
```

**File:** `microservices/hr-service/src/services/hr.service.js`

**Status Normalization:**
```javascript
// Normalize status to lowercase (User model uses lowercase)
const normalizedStatus = status.toLowerCase();
const validStatuses = ['active', 'on_leave', 'terminated', 'pending', 'inactive'];
const validStatusesUpper = ['ACTIVE', 'ON_LEAVE', 'TERMINATED', 'PENDING', 'INACTIVE'];

// Check both lowercase and uppercase
if (!validStatuses.includes(normalizedStatus) && !validStatusesUpper.includes(status)) {
  throw new ApiError(httpStatus.BAD_REQUEST, `Invalid status: ${status}`);
}

// Use normalized lowercase for User model
const finalStatus = normalizedStatus;
employee.status = finalStatus;
```

**Result:** Both `ACTIVE` and `active` are now accepted, normalized to lowercase for storage.

## 📋 Summary

| Field | Frontend Sends | Backend Accepts | Backend Stores |
|-------|---------------|-----------------|----------------|
| `roleName` | `tenant-admin` | ✅ `tenant-admin`, `Tenant-Admin`, `TENANT-ADMIN` | `admin` (mapped) |
| `status` | `ACTIVE` | ✅ `ACTIVE`, `active`, `ON_LEAVE`, `on_leave`, etc. | `active` (normalized) |

## 🧪 Testing

### Test 1: Assign Role with `tenant-admin`
```bash
curl -X POST "https://98.70.245.87/api/hr/employees/EMP-2025-153599/assign-role" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"roleName":"tenant-admin"}'

# Expected: ✅ Success, role mapped to 'admin'
```

### Test 2: Update Status with `ACTIVE`
```bash
curl -X PATCH "https://98.70.245.87/api/hr/employees/EMP-2025-153599/status" \
  -H "Host: api.etelios.com" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status":"ACTIVE"}'

# Expected: ✅ Success, status normalized to 'active'
```

## ✅ Status

- ✅ **Backend:** Validation updated to accept `tenant-admin` and uppercase status
- ✅ **Backend:** `tenant-admin` automatically maps to `admin` role
- ✅ **Backend:** Status normalized to lowercase for storage
- ⚠️ **Frontend:** Still needs to update base URL from `localhost:3002` to `https://98.70.245.87`

## 📝 Notes

1. **Role Mapping:** `tenant-admin` → `admin` (because `tenant-admin` doesn't exist in Role model enum)
2. **Status Normalization:** All status values are normalized to lowercase for User model consistency
3. **Available Roles:** `superadmin`, `admin`, `hr`, `manager`, `employee` (all lowercase in database)
4. **Available Statuses:** `active`, `on_leave`, `terminated`, `pending` (all lowercase in User model)

---

**Last Updated:** December 31, 2025  
**Status:** Backend Fixed ✅ | Frontend Fix Required ⚠️

