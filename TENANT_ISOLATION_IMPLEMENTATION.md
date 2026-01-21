# Tenant Isolation Implementation Guide

## Problem Statement

Currently, all tenants are seeing each other's data. When a tenant logs in, they can see employees, stores, departments, and all data from ALL tenants. This is a critical security and data isolation issue.

## Root Cause

1. **User model doesn't have `tenantId` field** - Employees are not associated with any tenant
2. **Queries don't filter by `tenantId`** - All database queries return data from all tenants
3. **No tenant middleware** - The `X-Tenant-Id` header is not being extracted and used

## Solution Implemented

### 1. Added `tenantId` Field to User Model

**File**: `microservices/hr-service/src/models/User.model.js`

```javascript
tenantId: {
  type: String,
  required: true,
  trim: true,
  lowercase: true,
  index: true // Critical for tenant isolation queries
}
```

**Indexes Added**:
- Compound index: `{ tenantId: 1, employeeId: 1 }` - Ensures employeeId is unique per tenant
- Index: `{ tenantId: 1, status: 1 }` - For tenant-based status queries
- Index: `{ tenantId: 1, department: 1 }` - For tenant-based department queries

### 2. Created Tenant Middleware

**File**: `microservices/hr-service/src/middleware/tenant.middleware.js`

This middleware:
- Extracts `tenantId` from `X-Tenant-Id` header
- Falls back to `X-Company-Id` header
- Falls back to query parameter
- Falls back to JWT token (if tenantId is in token)
- Adds `req.tenantId` to all requests
- Uses 'default' for backward compatibility (will be removed after migration)

### 3. Updated Employee Queries

**File**: `microservices/hr-service/src/services/hr.service.js`

#### `getEmployees` Function
```javascript
const getEmployees = async (filters = {}, page = 1, limit = 10, tenantId = null) => {
  const query = { 
    isDeleted: false,
    tenantId: tenantId || filters.tenantId || 'default' // CRITICAL: Always filter by tenantId
  };
  // ... rest of query
}
```

#### `createEmployee` Function
```javascript
const createEmployee = async (employeeData, createdBy, tenantId = null) => {
  const employeeTenantId = tenantId || employeeData.tenantId || 'default';
  
  // Check if employeeId already exists FOR THIS TENANT
  const existingEmployeeId = await User.findOne({ 
    tenantId: employeeTenantId,
    employeeId: normalizedEmployeeId 
  });
  
  // Check if email already exists FOR THIS TENANT
  const existingUser = await User.findOne({ 
    tenantId: employeeTenantId,
    email: email.toLowerCase() 
  });
  
  // Set tenantId in userData
  const userData = {
    tenantId: employeeTenantId, // CRITICAL
    // ... other fields
  };
}
```

### 4. Updated Controllers

**File**: `microservices/hr-service/src/controllers/hrController.js`

```javascript
// Get employees - pass tenantId
const tenantId = req.tenantId || req.get('X-Tenant-Id') || 'default';
const result = await HRService.getEmployees(filters, page, limit, tenantId);

// Create employee - pass tenantId
const tenantId = req.tenantId || req.get('X-Tenant-Id') || 'default';
const employee = await HRService.createEmployee(employeeData, createdBy, tenantId);
```

### 5. Updated Routes

**File**: `microservices/hr-service/src/routes/hr.routes.js`

```javascript
const { extractTenantId } = require('../middleware/tenant.middleware');

router.get('/employees',
  extractTenantId, // CRITICAL: Extract tenantId from header
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin', 'Manager'], ['user:read']),
  validateRequest(getEmployeesSchema),
  asyncHandler(getEmployees)
);

router.post('/employees',
  extractTenantId, // CRITICAL: Extract tenantId from header
  authenticate,
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['user:create']),
  validateRequest(createEmployeeSchema),
  asyncHandler(createEmployee)
);
```

## Migration Required

### Existing Data Migration

All existing employees need to have `tenantId` set. You need to:

1. **Identify tenant for each employee** - Based on:
   - Store association (if Store has tenantId)
   - Email domain
   - Manual mapping

2. **Run migration script**:
```javascript
// Migration script to add tenantId to existing employees
const User = require('./models/User.model');
const Store = require('./models/Store.model');

async function migrateTenantIds() {
  const users = await User.find({ tenantId: { $exists: false } });
  
  for (const user of users) {
    let tenantId = 'default';
    
    // Try to get tenantId from store
    if (user.store) {
      const store = await Store.findById(user.store);
      if (store && store.tenantId) {
        tenantId = store.tenantId;
      }
    }
    
    // Update user with tenantId
    user.tenantId = tenantId;
    await user.save();
    
    console.log(`Updated user ${user.employeeId} with tenantId: ${tenantId}`);
  }
}
```

## Testing

### Test Tenant Isolation

1. **Create employee in Tenant A**:
```bash
curl -X POST https://98.70.245.87/api/hr/employees \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: tenant-a" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "EMP-001",
    "firstName": "John",
    "email": "john@tenanta.com"
  }'
```

2. **Try to get employees from Tenant B**:
```bash
curl -X GET https://98.70.245.87/api/hr/employees \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: tenant-b"
```

**Expected**: Should NOT see employee from Tenant A

3. **Get employees from Tenant A**:
```bash
curl -X GET https://98.70.245.87/api/hr/employees \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-Id: tenant-a"
```

**Expected**: Should see employee from Tenant A only

## Additional Models to Update

The following models also need tenant isolation:

1. **Store** - Already has `tenantId` ✅
2. **Department** - Needs `tenantId` field
3. **Roster** - Already has `tenantId` ✅
4. **LeaveBalance** - Already has `tenantId` ✅
5. **Documents** - Needs `tenantId` field
6. **Attendance** - Needs `tenantId` field
7. **All other HR-related models**

## Frontend Changes Required

Frontend MUST send `X-Tenant-Id` header in ALL requests:

```javascript
// Example: Axios interceptor
axios.interceptors.request.use((config) => {
  const tenantId = localStorage.getItem('tenantId') || getTenantIdFromSubdomain();
  if (tenantId) {
    config.headers['X-Tenant-Id'] = tenantId;
  }
  return config;
});
```

## Security Considerations

1. **Never trust client-provided tenantId** - Validate that user belongs to that tenant
2. **JWT token should include tenantId** - Validate token tenantId matches request tenantId
3. **Super Admin can access all tenants** - Special handling required
4. **Audit logs** - Log all tenant access for security

## Rollback Plan

If issues arise:

1. Remove `tenantId` requirement (make it optional)
2. Remove tenant filtering from queries
3. Keep `tenantId` field in model (for future migration)
4. Revert middleware changes

## Next Steps

1. ✅ Add `tenantId` to User model
2. ✅ Create tenant middleware
3. ✅ Update employee queries
4. ✅ Update employee creation
5. ⏳ Update all other queries (getEmployeeById, updateEmployee, etc.)
6. ⏳ Add `tenantId` to other models (Department, Documents, etc.)
7. ⏳ Create migration script
8. ⏳ Test thoroughly
9. ⏳ Deploy to production
10. ⏳ Run migration script
11. ⏳ Remove 'default' fallback after migration

---

**Status**: Partially Complete  
**Priority**: CRITICAL  
**Date**: January 19, 2026
