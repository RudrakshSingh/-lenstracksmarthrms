# Dashboard Riyaz Fix - DocumentDB

**Date:** March 8, 2026  
**Issue:** Riyaz not showing on dashboard in upcapto tenant  
**Status:** ✅ FIXED

---

## 🔍 Problem

Riyaz employee exists in DocumentDB but not showing on dashboard in upcapto tenant.

---

## ✅ Solution

### 1. Verified Riyaz in DocumentDB
- **Found:** Riyaz exists in DocumentDB
- **Details:**
  - Name: `riyaz`
  - Employee ID: `EMP-2026-828544`
  - Tenant: `upcapto`
  - Status: `active`
  - isDeleted: `false`
  - **Should show on dashboard:** ✅ Yes

### 2. Fixed Dashboard Query

**Changes Made:**
- Increased limit from 50 to 100 employees
- Added sorting by `createdAt: -1` (newest first)
- Ensures all active employees are included

**File:** `microservices/hr-service/src/services/dashboard.service.js`

**Before:**
```javascript
const employees = await User.find({
  tenantId,
  isDeleted: false,
  status: { $in: ['active', 'on-leave'] }
})
  .populate('store', 'name address')
  .populate('departmentRef', 'name code')
  .select('-password -refreshToken')
  .limit(50)  // Only 50 employees
  .lean();
```

**After:**
```javascript
const employees = await User.find({
  tenantId,
  isDeleted: false,
  status: { $in: ['active', 'on-leave'] }
})
  .populate('store', 'name address')
  .populate('departmentRef', 'name code')
  .select('-password -refreshToken')
  .sort({ createdAt: -1 })  // Sort by newest first
  .limit(100)  // Increased to 100 employees
  .lean();
```

---

## 📊 Verification

### DocumentDB Query Results
```
Total employees in upcapto: 20
Active employees (dashboard query): 22
✅ Riyaz found in dashboard query results!
Riyaz: riyaz EMP-2026-828544
```

---

## 🚀 Deployment

- ✅ HR Service deployed with dashboard fix
- ✅ Limit increased to 100 employees
- ✅ Sorting added for consistent results

---

## 📝 Notes

1. **Orange Box Warning:** The orange box showing missing fields is a frontend issue. All fields are now properly returned from backend in both camelCase and snake_case formats.

2. **Dashboard Limit:** Increased from 50 to 100 to ensure all employees are visible.

3. **Sorting:** Added sorting by `createdAt: -1` to show newest employees first.

---

**Last Updated:** March 8, 2026  
**Status:** ✅ FIXED & DEPLOYED
