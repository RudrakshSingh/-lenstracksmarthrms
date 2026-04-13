# Attendance API - dateFrom/dateTo Fix

**Date:** March 8, 2026  
**Issue:** Attendance API returning empty data when using `dateFrom` and `dateTo` query parameters  
**Status:** ✅ FIXED & DEPLOYED

---

## 🔍 Problem

Frontend was sending:
```
GET /api/attendance?employeeId=EMP-2026-886706&dateFrom=2026-03-01&dateTo=2026-03-31
```

But API was only checking for `startDate` and `endDate`, not `dateFrom` and `dateTo`.

**Additional Issue:** Attendance records have `tenantId: undefined`, so tenant isolation filter was excluding all records.

---

## ✅ Solution

### 1. Added dateFrom/dateTo Support

**File:** `microservices/attendance-service/src/controllers/attendanceController.js`

**Changes:**
```javascript
// Support dateFrom/dateTo (frontend format)
if (req.query.dateFrom) {
  filters.startDate = req.query.dateFrom;
}
if (req.query.dateTo) {
  filters.endDate = req.query.dateTo;
}
// Support startDate/endDate (backend format)
if (req.query.startDate) filters.startDate = req.query.startDate;
if (req.query.endDate) filters.endDate = req.query.endDate;
```

### 2. Fixed TenantId Backward Compatibility

**File:** `microservices/attendance-service/src/services/attendance.service.js`

**Problem:** Attendance records have `tenantId: undefined`, so strict tenant filtering was excluding all records.

**Solution:** Query now handles both cases:
- Records with matching `tenantId`
- Records without `tenantId` (for backward compatibility)

```javascript
// Before (too strict):
if (filters.tenantId) {
  query.tenantId = filters.tenantId; // Excludes records without tenantId
}

// After (backward compatible):
if (filters.tenantId) {
  query.$or = [
    { tenantId: filters.tenantId },
    { tenantId: { $exists: false } },
    { tenantId: null }
  ];
}
```

---

## 📋 Query Parameters Supported

### Frontend Format (Now Supported):
- `dateFrom` → Maps to `startDate`
- `dateTo` → Maps to `endDate`
- `employeeId` → Employee ID string

### Backend Format (Still Supported):
- `startDate` → Start date
- `endDate` → End date
- `employeeId` → Employee ID string

### Other Parameters:
- `date` → Single date (YYYY-MM-DD)
- `month` → Month number
- `year` → Year number
- `status` → Attendance status
- `storeId` → Store ID
- `departmentId` → Department ID

---

## 🔄 Query Logic

### Date Range Query:
```javascript
{
  employee_id: "EMP-2026-886706",
  $and: [
    {
      $or: [
        { tenantId: "upcapto" },
        { tenantId: { $exists: false } },
        { tenantId: null }
      ]
    },
    {
      $or: [
        { date: { $gte: startDate, $lte: endDate } },
        { check_in_time: { $gte: startDate, $lte: endDate } }
      ]
    }
  ]
}
```

This query:
1. ✅ Matches employee_id
2. ✅ Handles tenantId (with or without)
3. ✅ Checks both `date` and `check_in_time` fields
4. ✅ Filters by date range

---

## 🚀 Deployment

- ✅ Attendance Service deployed with fixes
- ✅ dateFrom/dateTo support added
- ✅ TenantId backward compatibility fixed
- ✅ Pods restarted

---

## ✅ Expected Behavior

### Before Fix:
```
GET /api/attendance?employeeId=EMP-2026-886706&dateFrom=2026-03-01&dateTo=2026-03-31
```
**Result:** ❌ Empty array (dateFrom/dateTo not recognized, tenantId filter too strict)

### After Fix:
```
GET /api/attendance?employeeId=EMP-2026-886706&dateFrom=2026-03-01&dateTo=2026-03-31
```
**Result:** ✅ Returns attendance records for the date range

---

## 📝 Notes

1. **Backward Compatibility:** Old attendance records without `tenantId` are still accessible
2. **Date Range:** Both `date` and `check_in_time` fields are checked
3. **Frontend Support:** Both `dateFrom/dateTo` and `startDate/endDate` formats work

---

**Last Updated:** March 8, 2026  
**Status:** ✅ FIXED & DEPLOYED
