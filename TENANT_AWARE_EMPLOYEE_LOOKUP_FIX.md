# Tenant-Aware Employee Lookup Fix

**Date:** 2026-03-05  
**Status:** ✅ **COMPLETED**

---

## Summary

Updated the employee lookup logic in attendance-service to prioritize the JWT token tenant and check multiple tenants if needed to find employees with valid store assignments.

---

## Problem

The attendance service was failing to find employees with valid store assignments because:
1. Employee lookup was using tenantId from user object instead of JWT token
2. If employee was found in primary tenant but had invalid store, lookup stopped without checking other tenants
3. Cache was returning employees with invalid stores, preventing multi-tenant search

---

## Solution

### 1. Prioritize JWT Token TenantId
- Updated `resolveTenantId()` to always extract tenantId from JWT token first (most reliable source)
- JWT token is the authoritative source for tenant identification

### 2. Multi-Tenant Search Strategy
- Always check JWT tenant first (primaryTenantId)
- If employee found in primary tenant but has no valid store, continue searching other tenants
- Added fallback tenants: `['default', 'upcapto', 'lenstrack']` based on primary tenant
- Prioritize tenants where employee has a valid store assignment

### 3. Cache Validation
- Updated cache logic to only return cached employees if they have valid stores
- If cached employee has invalid store, continue to HR service lookup to check other tenants
- Prevents cache from blocking multi-tenant search

### 4. Store Validation Logic
- Added `hasValidStore` check that validates:
  - Store object exists
  - Store has valid `_id` or `id` (not empty string)
  - Store has valid name (not "Unknown Store")
- If employee found in primary tenant but store is invalid, continue searching other tenants

---

## Code Changes

### Files Modified
- `microservices/attendance-service/src/utils/hrServiceClient.js`

### Key Changes

1. **`resolveTenantId()` function**:
   ```javascript
   // CRITICAL: Always prioritize JWT token tenantId first (most reliable source)
   let tenantId = null;
   if (token) {
     const decoded = jwt.decode(token);
     tenantId = decoded?.tenantId || decoded?.tenant_id;
   }
   return tenantId || 'default';
   ```

2. **Multi-tenant search**:
   ```javascript
   // Always try JWT tenant first, then check other tenants if needed
   const tenantsToTry = [primaryTenantId];
   if (primaryTenantId === 'default') {
     tenantsToTry.push('upcapto', 'lenstrack');
   } else if (primaryTenantId === 'upcapto') {
     tenantsToTry.push('default', 'lenstrack');
   }
   // ... etc
   ```

3. **Store validation and continue logic**:
   ```javascript
   const hasValidStore = employee.store && 
                        (employee.store._id || employee.store.id) && 
                        (employee.store._id?.toString().trim() !== '' || employee.store.id?.toString().trim() !== '') &&
                        employee.store.name && 
                        employee.store.name !== 'Unknown Store';
   
   if (tenantId === primaryTenantId && !hasValidStore) {
     logger.warn('Employee found in primary tenant but has no valid store, continuing search');
     continue; // Try next tenant
   }
   ```

4. **Cache validation**:
   ```javascript
   if (cachedEmployee) {
     const hasValidStore = /* validation logic */;
     if (hasValidStore) {
       return cachedEmployee;
     } else {
       logger.warn('Cached employee has invalid store, will check HR service');
       // Don't return - continue to HR service lookup
     }
   }
   ```

---

## Test Results

### Before Fix
- ❌ Clock-in failed: "Employee is not assigned to a store in this tenant"
- Employee found in "default" tenant with invalid store
- Lookup stopped without checking "upcapto" tenant

### After Fix
- ✅ Clock-in successful (201 Created)
- ✅ Clock-out successful (200 OK)
- Employee lookup:
  1. Checks JWT tenant ("upcapto") first
  2. Finds employee with valid store in "upcapto" tenant
  3. Successfully allows clock-in/clock-out

### Test Output
```
[LOGIN] OK { "tenantId": "upcapto", "employeeId": "EMP-2026-853999" }
[CLOCK_IN] OK { "status": 201, "message": "Clock-in recorded successfully" }
[CLOCK_OUT] OK { "status": 200, "message": "Clock-out recorded successfully" }
```

---

## Benefits

1. **Reliable Tenant Detection**: Always uses JWT token as authoritative source
2. **Multi-Tenant Support**: Automatically finds employees across tenants
3. **Store Validation**: Ensures employees have valid store assignments before allowing attendance
4. **Better Cache Behavior**: Cache only returns valid employees, preventing stale data issues
5. **Improved Logging**: Better visibility into tenant search strategy and store validation

---

## Deployment

- ✅ Code changes deployed to production
- ✅ New pods running with fix
- ✅ Rollout successful
- ✅ Tested and verified working

---

## Next Steps

1. Monitor logs for multi-tenant lookups to ensure performance is acceptable
2. Consider adding metrics for tenant search patterns
3. Document tenant configuration for new deployments
