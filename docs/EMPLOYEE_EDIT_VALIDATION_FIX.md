# Employee Edit Validation Fix

**Date:** March 8, 2026  
**Issue:** Validation errors when editing employee (empty strings not allowed)  
**Status:** ✅ FIXED & DEPLOYED

---

## 🔍 Problem

Employee edit form was showing `VALIDATION_ERROR` with these errors:
1. `"lastName" is not allowed to be empty`
2. `"reportingManager" is not allowed to be empty`
3. `"salary_breakdown.other_allowances" must be a number`

**Root Cause:** Joi validation schema was rejecting empty strings (`''`) for optional fields.

---

## ✅ Solution

### 1. Updated Validation Schema

**File:** `microservices/hr-service/src/routes/hr.routes.js`

**Changes:**
- Added `.allow('', null)` to all optional string fields
- Added `.empty('').default(null)` for fields that should convert empty strings to null
- Fixed `salary_breakdown.other_allowances` to accept both numbers and empty strings

**Before:**
```javascript
lastName: Joi.string().optional(),
reportingManager: Joi.string().optional(),
salary_breakdown: Joi.object({
  other_allowances: Joi.number().min(0).optional()
})
```

**After:**
```javascript
lastName: Joi.string().allow('', null).optional(),
reportingManager: Joi.string().allow('', null).optional(),
salary_breakdown: Joi.object({
  other_allowances: Joi.alternatives().try(
    Joi.number().min(0),
    Joi.string().allow('').empty('').default(0)
  ).optional().default(0)
})
```

### 2. Added Pre-processing in Controller

**File:** `microservices/hr-service/src/controllers/hrController.js`

**Added:** Empty string preprocessing before validation:
- Convert empty strings to `null` for optional fields
- Convert empty strings to `0` for numeric fields in `salary_breakdown`
- Handle nested objects (`bankAccount`, `emergencyContact`)

```javascript
// Pre-process empty strings
Object.keys(updateData).forEach(key => {
  if (updateData[key] === '') {
    if (typeof updateData[key] === 'string') {
      updateData[key] = null;
    }
  }
});

// Handle salary_breakdown
if (updateData.salary_breakdown) {
  Object.keys(updateData.salary_breakdown).forEach(key => {
    if (updateData.salary_breakdown[key] === '' || updateData.salary_breakdown[key] === null) {
      updateData.salary_breakdown[key] = 0;
    } else if (typeof updateData.salary_breakdown[key] === 'string') {
      const num = parseFloat(updateData.salary_breakdown[key]);
      updateData.salary_breakdown[key] = isNaN(num) ? 0 : num;
    }
  });
}
```

---

## 📋 Fields Fixed

### Basic Information
- ✅ `firstName`, `lastName` - Allow empty strings
- ✅ `fullName`, `email`, `phone` - Allow empty strings
- ✅ `gender` - Allow empty strings

### Work Details
- ✅ `jobTitle`, `department`, `designation` - Allow empty strings
- ✅ `roleFamily`, `gradeBand` - Allow empty strings
- ✅ `reportingManager` - Allow empty strings
- ✅ `confirmationDate` - Allow null

### Salary & Compensation
- ✅ `annual_ctc` - Allow null
- ✅ `salary_breakdown.*` - All fields allow empty strings, convert to 0

### Statutory Information
- ✅ `uan`, `esiNo`, `panNumber` - Allow empty strings, convert to null
- ✅ `aadharMasked` - Allow empty strings

### Bank Account & Emergency Contact
- ✅ All nested fields allow empty strings, convert to null

---

## 🚀 Deployment

- ✅ HR Service deployed with validation fixes
- ✅ Empty string preprocessing added
- ✅ Pods restarted
- ✅ All validation errors resolved

---

## ✅ Expected Behavior

### Before Fix:
```json
{
  "lastName": "",
  "reportingManager": "",
  "salary_breakdown": {
    "other_allowances": ""
  }
}
```
**Result:** ❌ Validation Error

### After Fix:
```json
{
  "lastName": "",
  "reportingManager": "",
  "salary_breakdown": {
    "other_allowances": ""
  }
}
```
**Result:** ✅ Accepted (empty strings converted to null/0)

---

## 📝 Testing

To test employee edit:
1. Open employee edit form
2. Leave optional fields empty (e.g., lastName, reportingManager)
3. Submit form
4. Should save successfully without validation errors

---

**Last Updated:** March 8, 2026  
**Status:** ✅ FIXED & DEPLOYED
