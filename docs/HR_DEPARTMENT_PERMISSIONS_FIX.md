# ✅ HR Department Permissions Fix

**Date:** March 10, 2026  
**Issue:** HR Head (Lav Kumar) getting 403 error when creating departments/stores/employees  
**Status:** ✅ **FIXED & DEPLOYED**

---

## 🐛 Problem

HR Head (Lav Kumar) was getting 403 Forbidden errors when trying to:
- Create departments
- Update departments
- Delete departments
- Create stores (already had permission)
- Create employees (already had permission)

**Root Cause:** Department routes only allowed `Admin` and `SuperAdmin` roles, not `HR` role.

---

## ✅ Fix Applied

### Updated Routes in `microservices/hr-service/src/routes/hr.routes.js`

**Before:**
```javascript
router.post('/departments',
  requireRole(['Admin', 'SuperAdmin'], ['department:create']),
  asyncHandler(createDepartment)
);

router.put('/departments/:id',
  requireRole(['Admin', 'SuperAdmin'], ['department:update']),
  asyncHandler(updateDepartment)
);

router.delete('/departments/:id',
  requireRole(['Admin', 'SuperAdmin'], ['department:delete']),
  asyncHandler(deleteDepartment)
);
```

**After:**
```javascript
router.post('/departments',
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['department:create']), // Added HR
  asyncHandler(createDepartment)
);

router.put('/departments/:id',
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['department:update']), // Added HR
  asyncHandler(updateDepartment)
);

router.delete('/departments/:id',
  requireRole(['HR', 'Admin', 'SuperAdmin'], ['department:delete']), // Added HR
  asyncHandler(deleteDepartment)
);
```

---

## 📋 Changes Summary

| Route | Before | After |
|-------|--------|-------|
| POST /departments | Admin, SuperAdmin | **HR, Admin, SuperAdmin** ✅ |
| PUT /departments/:id | Admin, SuperAdmin | **HR, Admin, SuperAdmin** ✅ |
| DELETE /departments/:id | Admin, SuperAdmin | **HR, Admin, SuperAdmin** ✅ |
| POST /stores | HR, Admin, SuperAdmin | HR, Admin, SuperAdmin (unchanged) ✅ |
| POST /employees | HR, Admin, SuperAdmin | HR, Admin, SuperAdmin (unchanged) ✅ |

---

## 🔐 Lav Kumar Credentials

- **Email:** `lav@lenstrack.com`
- **Password:** `Lav@1234` (reset)
- **Role:** HR
- **Tenant:** lenstrack
- **Employee ID:** EMP-2026-650044

---

## ✅ Verification

After deployment, HR Head can now:
- ✅ Create departments
- ✅ Update departments
- ✅ Delete departments
- ✅ Create stores
- ✅ Create employees

---

## 🚀 Deployment

**Deployed to Production:**
- ✅ Docker image built
- ✅ Pushed to ECR
- ✅ Kubernetes deployment restarted
- ✅ Pods running

---

**Last Updated:** March 10, 2026  
**Status:** ✅ **FIXED & DEPLOYED TO PRODUCTION**
