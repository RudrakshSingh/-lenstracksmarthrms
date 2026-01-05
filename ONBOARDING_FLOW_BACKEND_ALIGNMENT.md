# Onboarding Flow - Backend Alignment Analysis

**Date**: 2026-01-04  
**Frontend Spec Version**: 1.0  
**Status**: ⚠️ **NEEDS FIXES**

---

## ✅ Step 1: Basic Information - FULLY ALIGNED

### Fields Supported

| Frontend Field | Backend Field | Status |
|----------------|---------------|--------|
| `employee_id` | `employeeId` | ✅ Supported |
| `code` | `code` | ✅ Supported |
| `name` | `fullName` / `name` | ✅ Supported |
| `email` | `email` | ✅ Supported |
| `phone` | `phone` | ✅ Supported |
| `date_of_birth` | `dob` | ✅ Supported |
| `father_name` | `fatherName` | ✅ Supported |
| `aadhar_number` | `aadharMasked` | ✅ Supported |
| `current_address.*` | `currentAddress.*` | ✅ Supported |

### API Endpoints

| Frontend Expects | Backend Provides | Status |
|-----------------|------------------|--------|
| `POST /api/hr/onboarding/draft` | ✅ `POST /api/hr/onboarding/draft` | ✅ **ALIGNED** |
| `POST /api/auth/register` | ✅ `POST /api/auth/register` | ✅ **ALIGNED** |

**Verdict**: ✅ **FULLY ALIGNED**

---

## ⚠️ Step 2: Work Details - NEEDS FIXES

### Fields Supported

| Frontend Field | Backend Field | Status |
|----------------|---------------|--------|
| `designation` | `designation` | ✅ Supported |
| `department` | `department` | ✅ Supported |
| `role_family` | `roleFamily` | ✅ Supported |
| `grade_band` | `gradeBand` | ✅ Supported |
| `joining_date` | `doj` | ✅ Supported |
| `confirmation_date` | `confirmationDate` | ✅ Supported |
| `work_location_city` | `workLocation.city` | ✅ Supported |
| `work_location_state` | `workLocation.state` | ✅ Supported |
| `work_location_pincode` | `workLocation.pincode` | ✅ Supported |
| `reporting_manager_id` | `reportingManager.id` | ✅ Supported |
| `reporting_manager_name` | `reportingManager.name` | ✅ Supported |
| `employee_status` | `status` | ✅ Supported |
| `category` | `category` | ✅ Supported |
| `base_salary` | `base_salary` | ✅ Supported |
| `target_sales` | `target_sales` | ✅ Supported |
| `pf_applicable` | `pf_applicable` | ✅ Supported |
| `esic_applicable` | `esic_applicable` | ✅ Supported |
| `pt_applicable` | `pt_applicable` | ✅ Supported |
| `tds_applicable` | `tds_applicable` | ✅ Supported |
| `pan_number` | `pan_number` | ✅ Supported |
| `tax_state` | `state` | ✅ Supported |
| `leave_entitlements.*` | `leave_entitlements.*` | ✅ Supported |
| `incentive_slabs` | `incentive_slabs` | ✅ Supported |

### ⚠️ CRITICAL ISSUE: Store ID Handling

**Frontend Can Send:**
- `"backoffice"` - Special value
- `"office"` - Special value
- `""` or `null` - No store
- `"actual_store_id"` - Real MongoDB ObjectId

**Backend Current Behavior:**
- ❌ **VALIDATES** `storeId` as MongoDB ObjectId
- ❌ **REJECTS** `"backoffice"`, `"office"`, `""`
- ❌ **THROWS ERROR** if store not found

**Backend Code:**
```javascript
// microservices/hr-service/src/services/hr.service.js (line 52-59)
if (storeId) {
  store = await Store.findById(storeId);
  if (!store) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Specified store not found');
  }
}
```

**Required Fix:**
```javascript
// Handle special store values
let store = null;
if (storeId && storeId !== 'backoffice' && storeId !== 'office' && storeId !== '') {
  store = await Store.findById(storeId);
  if (!store) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Specified store not found');
  }
}

// Store work location type
if (storeId === 'backoffice' || storeId === 'office') {
  employeeData.workLocation = {
    ...employeeData.workLocation,
    storeId: storeId, // Store as string, not ObjectId
    storeName: storeId === 'backoffice' ? 'Backoffice' : 'Office',
    type: storeId
  };
} else if (store) {
  employeeData.workLocation = {
    ...employeeData.workLocation,
    storeId: store._id.toString(),
    storeName: store.name,
    type: 'store'
  };
}
```

### API Endpoints

| Frontend Expects | Backend Provides | Status |
|-----------------|------------------|--------|
| `GET /api/hr/departments` | ✅ `GET /api/hr/departments` | ✅ **ALIGNED** |
| `GET /api/hr/employees?status=ACTIVE` | ✅ `GET /api/hr/employees?status=ACTIVE` | ✅ **ALIGNED** |
| `GET /api/hr/stores` | ✅ `GET /api/hr/stores` | ✅ **ALIGNED** |
| `POST /api/hr/employees` | ✅ `POST /api/hr/employees` | ⚠️ **NEEDS FIX** (store ID handling) |

**Verdict**: ⚠️ **NEEDS FIX** - Store ID handling for "backoffice", "office", ""

---

## ✅ Step 3: Statutory Information - FULLY ALIGNED

### Fields Supported

| Frontend Field | Backend Field | Status |
|----------------|---------------|--------|
| `uan` | `uan` | ✅ Supported |
| `esi_number` | `esiNo` | ✅ Supported (field name mapping needed) |
| `pan_number` | `pan_number` | ✅ Supported |
| `bank_account.account_number` | `bank_account.account_number` | ✅ Supported |
| `bank_account.ifsc_code` | `bank_account.ifsc_code` | ✅ Supported |
| `bank_account.bank_name` | `bank_account.bank_name` | ✅ Supported |
| `bank_account.branch_name` | `bank_account.branch_name` | ✅ Supported |
| `bank_account.account_type` | `bank_account.account_type` | ✅ Supported |
| `previous_employment.*` | `previous_employment.*` | ✅ Supported |
| `declaration.*` | `declaration.*` | ✅ Supported |

### API Endpoints

| Frontend Expects | Backend Provides | Status |
|-----------------|------------------|--------|
| `PUT /api/hr/employees/{employeeId}` | ✅ `PUT /api/hr/employees/:employeeId` | ✅ **ALIGNED** |
| `POST /api/hr/onboarding/statutory-info` | ✅ `POST /api/hr/onboarding/statutory-info` | ✅ **ALIGNED** |

**Note**: Field name mapping needed: `esi_number` (frontend) → `esiNo` (backend)

**Verdict**: ✅ **FULLY ALIGNED** (minor field name mapping)

---

## ✅ Step 4: Document Upload - FULLY ALIGNED

### API Endpoints

| Frontend Expects | Backend Provides | Status |
|-----------------|------------------|--------|
| `POST /api/documents/upload` | ✅ `POST /api/documents/upload` | ✅ **ALIGNED** |
| `POST /api/hr/documents/upload` | ✅ `POST /api/hr/documents/upload` | ✅ **ALIGNED** |

### Document Type Mapping

**Frontend → Backend:**
- `'Aadhar Card'` → `'AADHAR'` ✅
- `'PAN Card'` → `'PAN'` ✅
- `'Bank Passbook/Statement'` → `'BANK_STATEMENT'` ✅
- `'Educational Certificates'` → `'EDUCATION'` ✅
- `'Experience Letters'` → `'EXPERIENCE'` ✅
- `'Passport Size Photo'` → `'PHOTO'` ✅
- `'Passport'` → `'PASSPORT'` ✅
- `'Driving License'` → `'DRIVING_LICENSE'` ✅

### File Validation

- **Max Size**: 5MB ✅ (backend supports)
- **Formats**: PDF, JPG, JPEG, PNG ✅ (backend supports)

**Verdict**: ✅ **FULLY ALIGNED**

---

## ⚠️ Step 5: Review & Submit - NEEDS FIXES

### Role Mapping Issue

**Frontend Roles:**
- `"super-admin"`, `"tenant-admin"`, `"sub-admin"`, `"hr-head"`, `"sales-head"`, etc.

**Backend Accepts:**
- `"superadmin"`, `"admin"`, `"hr"`, `"manager"`, `"employee"`, `"accountant"`, `"store_manager"`, `"sales"`, `"optometrist"`

**Current Mapping (Frontend):**
```typescript
// Frontend maps roles before sending to backend
- "super-admin" → "superadmin" ✅
- "tenant-admin" → "admin" ✅
- "hr-head" → "hr" ✅
- "store-manager" → "store_manager" or "manager" ⚠️
- "sales-manager" → "sales" or "manager" ⚠️
- "asm" → "manager" ✅
- "employee" → "employee" ✅
```

**Backend Validation:**
- Backend validates role against enum: `['admin', 'hr', 'manager', 'employee', 'superadmin', 'accountant', 'store_manager', 'sales', 'optometrist']`
- ✅ Most roles are supported
- ⚠️ Need to verify all frontend role mappings work

### API Endpoints

| Frontend Expects | Backend Provides | Status |
|-----------------|------------------|--------|
| `POST /api/auth/register` | ✅ `POST /api/auth/register` | ✅ **ALIGNED** |
| `POST /api/hr/employees` | ✅ `POST /api/hr/employees` | ⚠️ **NEEDS FIX** (store ID) |
| `PUT /api/hr/employees/{employeeId}` | ✅ `PUT /api/hr/employees/:employeeId` | ✅ **ALIGNED** |
| `POST /api/documents/upload` | ✅ `POST /api/documents/upload` | ✅ **ALIGNED** |
| `POST /api/hr/employees/{employeeId}/assign-role` | ✅ `POST /api/hr/employees/:employeeId/assign-role` | ✅ **ALIGNED** |
| `PATCH /api/hr/employees/{employeeId}/status` | ✅ `PATCH /api/hr/employees/:employeeId/status` | ✅ **ALIGNED** |

**Verdict**: ⚠️ **NEEDS FIX** - Store ID handling, role mapping verification

---

## 🔧 Required Fixes

### 1. Store ID Handling (CRITICAL) ⚠️

**File**: `microservices/hr-service/src/services/hr.service.js`

**Current Code:**
```javascript
// Line 52-59
if (storeId) {
  store = await Store.findById(storeId);
  if (!store) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Specified store not found');
  }
}
```

**Required Fix:**
```javascript
// Handle special store values: "backoffice", "office", "", or actual store ID
let store = null;
let workLocationType = null;

if (storeId) {
  if (storeId === 'backoffice' || storeId === 'office') {
    // Special work location types - don't validate as ObjectId
    workLocationType = storeId;
    store = null; // No actual store object
  } else if (storeId !== '') {
    // Actual store ID - validate
    store = await Store.findById(storeId);
    if (!store) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Specified store not found');
    }
    workLocationType = 'store';
  }
}

// Set work location
if (workLocationType) {
  employeeData.workLocation = {
    ...employeeData.workLocation,
    storeId: storeId, // Can be "backoffice", "office", "", or actual store ID
    storeName: storeId === 'backoffice' ? 'Backoffice' : 
               storeId === 'office' ? 'Office' : 
               store?.name || '',
    type: workLocationType,
    city: employeeData.workLocation?.city || employeeData.work_location_city,
    state: employeeData.workLocation?.state || employeeData.work_location_state,
    pincode: employeeData.workLocation?.pincode || employeeData.work_location_pincode
  };
}
```

### 2. Field Name Mapping (MINOR) ⚠️

**File**: `microservices/hr-service/src/services/onboarding.service.js`

**Required Fix:**
```javascript
// Map frontend field names to backend
const statutoryData = {
  uan: req.body.uan,
  esiNo: req.body.esi_number || req.body.esiNo, // Support both
  pan_number: req.body.pan_number,
  bank_account: req.body.bank_account,
  // ... other fields
};
```

### 3. Role Mapping Verification (MINOR) ⚠️

**Action**: Verify all frontend role mappings work with backend enum:
- ✅ `"superadmin"` - Supported
- ✅ `"admin"` - Supported
- ✅ `"hr"` - Supported
- ✅ `"manager"` - Supported
- ✅ `"employee"` - Supported
- ✅ `"store_manager"` - Supported
- ✅ `"sales"` - Supported
- ✅ `"accountant"` - Supported
- ✅ `"optometrist"` - Supported

**Status**: ✅ All roles are supported, frontend mapping should work

---

## 📊 Alignment Summary

### ✅ Fully Aligned (80%)
- Step 1: Basic Information
- Step 3: Statutory Information
- Step 4: Document Upload
- Most of Step 2: Work Details
- Most of Step 5: Review & Submit

### ⚠️ Needs Fixes (20%)
- **CRITICAL**: Store ID handling (`"backoffice"`, `"office"`, `""`)
- **MINOR**: Field name mapping (`esi_number` → `esiNo`)
- **MINOR**: Role mapping verification (should work, but verify)

---

## 🎯 Priority Fixes

### High Priority:
1. ⚠️ **Store ID Handling** - Must accept `"backoffice"`, `"office"`, `""`, or actual store ID

### Medium Priority:
2. ⚠️ **Field Name Mapping** - Support both `esi_number` and `esiNo`

### Low Priority:
3. ⚠️ **Role Mapping Verification** - Test all frontend role mappings

---

**Status**: Backend is **80% aligned** with onboarding flow. Critical fix needed for store ID handling.

