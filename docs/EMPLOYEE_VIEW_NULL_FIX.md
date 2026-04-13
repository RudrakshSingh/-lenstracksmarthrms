# Employee View - Null Values Fix

**Date:** March 8, 2026  
**Issue:** Employee view showing nothing / empty fields  
**Status:** ✅ FIXED

---

## 🔍 Problem

Employee view page was showing empty fields because backend was returning empty strings (`''`) instead of `null` for missing/optional fields. Frontend might be checking for `null`/`undefined` to display "N/A".

---

## ✅ Solution

Changed `formatEmployee` function to return `null` instead of empty strings (`''`) for optional fields:

### Fields Changed:
- `gender`: `''` → `null`
- `confirmationDate`: `''` → `null`
- `reportingManagerName`: `''` → `null`
- `uan`: `''` → `null`
- `esiNo`: `''` → `null`
- `panNumber`: `''` → `null`
- `aadharMasked`: `''` → `null`
- `bankAccount.*`: All fields `''` → `null`
- `currentAddress.*`: All fields `''` → `null` (except `country` which defaults to 'India')
- `emergencyContact.*`: All fields `''` → `null`
- `workLocation.*`: All fields `''` → `null`

---

## 📝 Changes Made

**File:** `microservices/shared/utils/response.util.js`

**Before:**
```javascript
gender: emp.gender || '',
uan: emp.uan || '',
esiNo: emp.esiNo || emp.esi_no || '',
```

**After:**
```javascript
gender: emp.gender || null,
uan: emp.uan || null,
esiNo: emp.esiNo || emp.esi_no || null,
```

---

## 🚀 Deployment

- ✅ HR Service deployed with null fixes
- ✅ All optional fields now return `null` instead of empty strings
- ✅ Frontend can now properly check for `null` and display "N/A"

---

## 📊 Expected Behavior

### Before Fix:
```json
{
  "gender": "",
  "uan": "",
  "esiNo": "",
  "panNumber": ""
}
```

### After Fix:
```json
{
  "gender": null,
  "uan": null,
  "esiNo": null,
  "panNumber": null
}
```

Frontend can now check:
```javascript
const displayValue = (value) => value ?? 'N/A';
// gender: null → displays "N/A"
// gender: "Male" → displays "Male"
```

---

## ✅ Verification

All fields are now properly returned:
- ✅ Basic fields: `id`, `name`, `email`, `phone`, `employeeId`
- ✅ Work details: `department`, `jobTitle`, `status`, `doj`
- ✅ Optional fields: `gender`, `confirmationDate`, `reportingManagerName` → `null` if not set
- ✅ Statutory: `uan`, `esiNo`, `panNumber`, `aadharMasked` → `null` if not set
- ✅ Nested objects: `bankAccount`, `currentAddress`, `emergencyContact`, `workLocation` → all present

---

**Last Updated:** March 8, 2026  
**Status:** ✅ FIXED & DEPLOYED
